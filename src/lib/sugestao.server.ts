// Server-only: gera a sugestão do copiloto em tempo real (streaming) durante a call.
import { createClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/integrations/supabase/types";
import {
  carregarCerebro,
  chamarClaudeStream,
  extrairJson,
  montarSystemPrompt,
} from "./cerebro.server";
import {
  ETAPAS_SDR,
  PROTOCOLO_COPILOTO,
  ROTULOS_ETAPAS_SDR,
  etapaSdrValida,
  indiceEtapaSdr,
  type EtapaSdr,
} from "./fluxo-sdr";

type Saida = { [k: string]: Json };

type EstadoQualificacao = {
  etapa_atual: string;
  etapas_concluidas: string[];
  perguntas_respondidas: string[];
  criterios_atendidos: string[];
  respostas_coletadas: Record<string, string>;
  ultima_orientacao: string;
  lembrete: string | null;
  pergunta_pendente_id: string | null;
  perguntas_puladas: string[];
  oferta_id?: string;
  cerebro_versao?: string;
  turno?: number;
};

function textoArray(valor: Json | undefined): string[] {
  if (!Array.isArray(valor)) return [];
  return valor.filter((item): item is string => typeof item === "string");
}

function estadoInicial(valor: Json, ofertaId: string, versao: string): EstadoQualificacao {
  const bruto = valor && typeof valor === "object" && !Array.isArray(valor) ? valor : {};
  return {
    etapa_atual: typeof bruto["etapa_atual"] === "string" ? bruto["etapa_atual"] : "apresentacao",
    etapas_concluidas: textoArray(bruto["etapas_concluidas"]),
    perguntas_respondidas: textoArray(bruto["perguntas_respondidas"]),
    criterios_atendidos: textoArray(bruto["criterios_atendidos"]),
    respostas_coletadas:
      bruto["respostas_coletadas"] && typeof bruto["respostas_coletadas"] === "object" && !Array.isArray(bruto["respostas_coletadas"])
        ? (bruto["respostas_coletadas"] as Record<string, string>)
        : {},
    ultima_orientacao: typeof bruto["ultima_orientacao"] === "string" ? bruto["ultima_orientacao"] : "",
    lembrete: typeof bruto["lembrete"] === "string" ? bruto["lembrete"] : null,
    pergunta_pendente_id:
      typeof bruto["pergunta_pendente_id"] === "string" ? bruto["pergunta_pendente_id"] : null,
    perguntas_puladas: textoArray(bruto["perguntas_puladas"]),
    oferta_id: ofertaId,
    cerebro_versao: versao,
    turno: typeof bruto["turno"] === "number" ? bruto["turno"] : 0,
  };
}

function normalizar(texto: string): string {
  return texto.toLocaleLowerCase("pt-BR").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\W+/g, " ").trim();
}

function pareceComentarioTecnico(texto: string): boolean {
  const t = normalizar(texto);
  return [
    "copiloto",
    "inteligencia artificial",
    "esta travando",
    "nao esta indo",
    "mesma mensagem",
    "na tela",
    "tirar print",
    "conseguir printar",
    "respeitando o roteiro",
    "proximas perguntas",
  ].some((trecho) => t.includes(trecho));
}

type PerguntaFluxo = {
  id: string;
  ordem: number;
  etapa: string;
  pergunta: string;
  pergunta_followup: string | null;
  o_que_identificar: string;
  obrigatoria: boolean;
};

function etapaDaPergunta(pergunta: PerguntaFluxo | undefined): EtapaSdr {
  if (pergunta && etapaSdrValida(pergunta.etapa)) return pergunta.etapa;
  return "encerramento";
}

function idsDoModelo(valor: Json | undefined, validos: Set<string>): string[] {
  return textoArray(valor).filter((id) => validos.has(id));
}

function clienteComToken(token: string) {
  const url = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
  if (!url || !key) throw new Error("Backend não configurado.");
  return createClient<Database>(url, key, {
    global: {
      fetch: (input, init) => {
        const headers = new Headers(init?.headers);
        if (headers.get("Authorization") === `Bearer ${key}`) headers.delete("Authorization");
        headers.set("apikey", key);
        headers.set("Authorization", `Bearer ${token}`);
        return fetch(input, { ...init, headers });
      },
    },
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
}

/** Extrai o valor de "proxima_pergunta" de um JSON ainda incompleto. */
function perguntaParcial(texto: string): string | null {
  const i = texto.indexOf('"proxima_pergunta"');
  if (i < 0) return null;
  const aspas = texto.indexOf('"', texto.indexOf(":", i) + 1);
  if (aspas < 0) return null;
  let saida = "";
  for (let k = aspas + 1; k < texto.length; k++) {
    const c = texto[k];
    if (c === "\\") {
      const prox = texto[k + 1];
      saida += prox === "n" ? " " : (prox ?? "");
      k++;
      continue;
    }
    if (c === '"') break;
    saida += c;
  }
  return saida.trim() || null;
}

export async function responderSugestao(request: Request): Promise<Response> {
  const auth = request.headers.get("authorization") ?? "";
  if (!auth.startsWith("Bearer ")) return new Response("Unauthorized", { status: 401 });
  const token = auth.slice(7);
  if (token.split(".").length !== 3) return new Response("Unauthorized", { status: 401 });

  const supabase = clienteComToken(token);
  const { data: claims, error: erroClaims } = await supabase.auth.getClaims(token);
  if (erroClaims || !claims?.claims?.sub) return new Response("Unauthorized", { status: 401 });

  const body = (await request.json()) as {
    callId?: string;
    texto?: string;
    ofertaId?: string;
    cerebroVersao?: string;
    requestId?: string;
    turno?: number;
    protocolo?: string;
  };
  const callId = body.callId ?? "";
  const texto = (body.texto ?? "").trim();
  if (!callId || !texto) return new Response("Requisição inválida", { status: 400 });
  if (body.protocolo !== PROTOCOLO_COPILOTO) {
    return new Response("O Copiloto foi atualizado. Recarregue esta página antes de continuar.", {
      status: 409,
    });
  }

  const inicio = Date.now();

  const { data: call } = await supabase
    .from("calls")
    .select("id, tipo, oferta_id, nome_lead, origem_lead, notas_crm, objetivo, iniciada_em, estado_qualificacao")
    .eq("id", callId)
    .maybeSingle();
  if (!call) return new Response("Call não encontrada", { status: 404 });
  if (call.tipo === "sdr" && (!call.oferta_id || body.ofertaId !== call.oferta_id)) {
    return new Response("O produto da ligação mudou. Reabra a ligação antes de continuar.", {
      status: 409,
    });
  }

  const ctx = await carregarCerebro(supabase, call.oferta_id, true);
  if (call.tipo === "sdr" && body.cerebroVersao !== ctx.versao) {
    return new Response("O cérebro deste produto foi atualizado. Reabra a ligação.", { status: 409 });
  }
  if (call.tipo === "sdr" && !ctx.completoSdr) {
    return new Response("O cérebro SDR deste produto está incompleto.", { status: 409 });
  }
  const turno = Number(body.turno ?? 0);
  if (call.tipo === "sdr" && (!Number.isSafeInteger(turno) || turno <= 0)) {
    return new Response("Turno inválido", { status: 400 });
  }
  let estado = estadoInicial(call.estado_qualificacao, call.oferta_id ?? "", ctx.versao);
  if (call.tipo === "sdr") {
    const { data: estadoIniciado, error: erroTurno } = await supabase.rpc("iniciar_turno_copiloto", {
      _call_id: callId,
      _turno: turno,
      _oferta_id: call.oferta_id ?? "",
      _cerebro_versao: ctx.versao,
    });
    if (erroTurno) return new Response("Não foi possível iniciar a análise.", { status: 500 });
    if (!estadoIniciado) return new Response("Esta fala já foi substituída por uma mais recente.", { status: 409 });
    estado = estadoInicial(estadoIniciado, call.oferta_id ?? "", ctx.versao);
  }
  const [falaRes, falasRes] = await Promise.all([
    supabase
      .from("falas")
      .insert({ call_id: callId, falante: "cliente", texto })
      .select("id")
      .single(),
    supabase
      .from("falas")
      .select("falante, texto, created_at")
      .eq("call_id", callId)
      .order("created_at", { ascending: false })
      .limit(10),
  ]);
  if (falaRes.error) return new Response("Não foi possível registrar a fala.", { status: 500 });
  if (falasRes.error) {
    return new Response("Não foi possível carregar o contexto recente.", { status: 500 });
  }
  const minPalavras = Number(ctx.config["min_palavras_para_analisar"] ?? 6);

  const codificador = new TextEncoder();
  const linha = (obj: unknown) => codificador.encode(`${JSON.stringify(obj)}\n`);

  if (call.tipo !== "sdr" && texto.split(/\s+/).length < minPalavras) {
    return new Response(linha({ tipo: "final", resposta: { acao: "manter" } }), {
      headers: { "content-type": "application/x-ndjson", "cache-control": "no-store" },
    });
  }

  const ultimas = (falasRes.data ?? []).slice(0, 10).reverse();
  const perguntasDisponiveis: PerguntaFluxo[] = ctx.perguntas.map((p) => ({
    id: p.id,
    ordem: p.ordem,
    etapa: p.etapa,
    pergunta: p.pergunta,
    pergunta_followup: p.pergunta_followup,
    o_que_identificar: p.o_que_identificar,
    obrigatoria: p.obrigatoria,
  }));
  const respondidasAntes = new Set(estado.perguntas_respondidas);
  const pendente =
    perguntasDisponiveis.find((p) => p.id === estado.pergunta_pendente_id) ??
    perguntasDisponiveis.find((p) => !respondidasAntes.has(p.id));
  const candidatas = perguntasDisponiveis.filter((p) => !respondidasAntes.has(p.id)).slice(0, 5);
  const comentarioTecnico = call.tipo === "sdr" && pareceComentarioTecnico(texto);
  const userMessageSdr = `PERGUNTA QUE ESTAVA PENDENTE
${JSON.stringify(pendente ?? null)}

PRÓXIMAS PERGUNTAS POSSÍVEIS
${JSON.stringify(candidatas)}

CONTEXTO IMEDIATO
${ultimas.slice(-6).map((f) => `${f.falante === "cliente" ? "CLIENTE" : "VENDEDOR"}: ${f.texto}`).join("\n")}

FALA A CLASSIFICAR
${texto}`;
  const systemSdr = `Você é um classificador de respostas de uma ligação SDR.
Sua única tarefa é identificar quais perguntas cadastradas a FALA A CLASSIFICAR respondeu de forma útil.
Use somente IDs presentes em PRÓXIMAS PERGUNTAS POSSÍVEIS.
Compare cada informação da fala com TODAS as próximas perguntas, não apenas com a pergunta pendente.
Uma fala pode responder várias perguntas, inclusive perguntas que ainda não foram feitas. Marque todos os IDs cobertos.
"Sim", "correto" e equivalentes respondem a uma confirmação pendente.
Não escolha a próxima pergunta e não escreva orientação comercial.
Responda somente JSON válido e curto, exatamente: {"ids_respondidos":["id"],"resposta_vaga":false}.
Se nada foi respondido, use {"ids_respondidos":[],"resposta_vaga":true}.`;
  const minutos = Math.max(0, Math.round((Date.now() - new Date(call.iniciada_em).getTime()) / 60000));
  const userMessageCloser = `CONTEXTO DO LEAD
Nome: ${call.nome_lead || "(ainda não cadastrado)"}
Origem: ${call.origem_lead}
O que já sabemos: ${call.notas_crm}
OBJETIVO DESTA CALL: ${call.objetivo}
TEMPO DECORRIDO: ${minutos} min
TRANSCRIÇÃO RECENTE
${ultimas.map((f) => `${f.falante === "cliente" ? "CLIENTE" : "VENDEDOR"}: ${f.texto}`).join("\n")}
ÚLTIMA FALA DO CLIENTE
${texto}`;
  const system = call.tipo === "sdr" ? systemSdr : montarSystemPrompt(ctx, "closer");
  const userMessage = call.tipo === "sdr" ? userMessageSdr : userMessageCloser;
  const model =
    ctx.config["modelo_claude_rapido"] ||
    ctx.config["modelo_claude"] ||
    "claude-haiku-4-5-20251001";
  const maxTokens = call.tipo === "sdr" ? 100 : Number(ctx.config["max_tokens_ao_vivo"] ?? 260);

  const stream = new ReadableStream({
    async start(controller) {
      let ultimaParcial = "";
      let primeiraPerguntaMs: number | null = null;
      try {
        const bruto = comentarioTecnico
          ? '{"ids_respondidos":[],"resposta_vaga":true}'
          : await chamarClaudeStream({
              system,
              model,
              maxTokens,
              messages: [{ role: "user", content: userMessage }],
              signal: request.signal,
              onTexto: (_p, acumulado) => {
                const parcial = perguntaParcial(acumulado);
                if (parcial && parcial !== ultimaParcial) {
                  if (primeiraPerguntaMs === null) primeiraPerguntaMs = Date.now() - inicio;
                  ultimaParcial = parcial;
                }
              },
            });

        let resposta: Saida;
        try {
          resposta = extrairJson(bruto) as Saida;
        } catch {
          resposta = ultimaParcial
            ? { acao: "orientar", proxima_pergunta: ultimaParcial }
            : { acao: "manter" };
        }

        if (call.tipo === "sdr") {
          const idsValidos = new Set(perguntasDisponiveis.map((p) => p.id));
          const novasRespondidas = comentarioTecnico
            ? []
            : idsDoModelo(resposta["ids_respondidos"], idsValidos);
          const perguntasRespondidas = [...new Set([...estado.perguntas_respondidas, ...novasRespondidas])];
          const ordensNovas = perguntasDisponiveis
            .filter((p) => novasRespondidas.includes(p.id))
            .map((p) => p.ordem);
          const maiorOrdemNova = ordensNovas.length ? Math.max(...ordensNovas) : null;
          const puladasNesteTurno = maiorOrdemNova == null
            ? []
            : perguntasDisponiveis.filter(
                (p) =>
                  p.obrigatoria &&
                  p.ordem < maiorOrdemNova &&
                  !perguntasRespondidas.includes(p.id) &&
                  !estado.perguntas_puladas.includes(p.id),
              );
          const perguntasPuladas = [
            ...new Set([...estado.perguntas_puladas, ...puladasNesteTurno.map((p) => p.id)]),
          ].filter((id) => !novasRespondidas.includes(id));
          const idsEncerrados = new Set([...perguntasRespondidas, ...perguntasPuladas]);
          const proxima = perguntasDisponiveis.find((p) => !idsEncerrados.has(p.id));
          const respostaVaga = resposta["resposta_vaga"] === true;
          const pendenteJaOrientada =
            pendente && normalizar(estado.ultima_orientacao) === normalizar(pendente.pergunta);
          const orientacao = comentarioTecnico
            ? ""
            : respostaVaga && pendenteJaOrientada && pendente.pergunta_followup
              ? pendente.pergunta_followup
              : proxima?.pergunta ?? "Confirme o agendamento e o compromisso do lead.";
          const etapaFinal = proxima ? etapaDaPergunta(proxima) : "compromisso";
          const etapaPulada = puladasNesteTurno[0] ? etapaDaPergunta(puladasNesteTurno[0]) : null;
          const lembrete = etapaPulada
            ? `Você pulou a etapa de ${ROTULOS_ETAPAS_SDR[etapaPulada].toLocaleLowerCase("pt-BR")}.`
            : null;
          const indiceFinal = indiceEtapaSdr(etapaFinal);
          const concluidas = ETAPAS_SDR.slice(0, indiceFinal);
          estado = {
            ...estado,
            etapa_atual: etapaFinal,
            etapas_concluidas: [...new Set([...estado.etapas_concluidas, ...concluidas])],
            perguntas_respondidas: perguntasRespondidas,
            perguntas_puladas: perguntasPuladas,
            pergunta_pendente_id: proxima?.id ?? null,
            respostas_coletadas: novasRespondidas.reduce(
              (coletadas, id) => ({ ...coletadas, [id]: texto }),
              estado.respostas_coletadas,
            ),
            ultima_orientacao: orientacao || estado.ultima_orientacao,
            lembrete,
            turno,
          };
          resposta = {
            acao: orientacao ? "orientar" : "manter",
            etapa_qualificacao: etapaFinal,
            proxima_pergunta: orientacao,
            alerta: lembrete,
            resultado_sugerido: proxima ? "seguir_qualificando" : "agendar_agora",
            perguntas_respondidas_neste_turno: novasRespondidas,
          };
          const { data: concluido } = await supabase.rpc("concluir_turno_copiloto", {
            _call_id: callId,
            _turno: turno,
            _estado: estado as never,
          });
          if (!concluido || request.signal.aborted) return;
        }

        const latencia = Date.now() - inicio;
        const identidade = {
          oferta_id: call.oferta_id,
          produto: ctx.oferta?.nome ?? "",
          cerebro_versao: ctx.versao,
          request_id: body.requestId ?? "",
          primeira_pergunta_ms: primeiraPerguntaMs,
          protocolo: PROTOCOLO_COPILOTO,
        };
        const { error: erroSugestao } = await supabase.from("sugestoes").insert({
          call_id: callId,
          fala_id: falaRes.data?.id ?? null,
          resposta: { ...resposta, _cerebro: identidade } as never,
          latencia_ms: latencia,
        });
        if (erroSugestao || request.signal.aborted) return;
        controller.enqueue(linha({ tipo: "final", resposta, latencia_ms: latencia, identidade }));
      } catch (e) {
        if (request.signal.aborted || (e instanceof DOMException && e.name === "AbortError")) return;
        console.error("[copiloto] falha ao gerar sugestão", e);
        controller.enqueue(
          linha({ tipo: "erro", mensagem: "Não foi possível gerar a sugestão agora." }),
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "content-type": "application/x-ndjson", "cache-control": "no-store" },
  });
}
