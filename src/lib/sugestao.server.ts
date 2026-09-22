// Server-only: gera a sugestão do copiloto em tempo real (streaming) durante a call.
import { createClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/integrations/supabase/types";
import {
  carregarCerebro,
  chamarClaudeStream,
  extrairJson,
  montarSystemPrompt,
  textoCerebroProduto,
} from "./cerebro.server";
import {
  PROTOCOLO_COPILOTO,
  ehEcoDoCliente,
  etapaSdrValida,
  intencaoValida,
  normalizarFala,
  type EtapaSdr,
} from "./fluxo-sdr";

type Saida = { [k: string]: Json };

type EstadoQualificacao = {
  etapa_atual: string;
  etapas_concluidas: string[];
  perguntas_respondidas: string[];
  criterios_atendidos: string[];
  respostas_coletadas: Record<string, string>;
  fatos_do_lead: Record<string, string>;
  ultima_orientacao: string;
  ultima_intencao: string | null;
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

function mapaTexto(valor: Json | undefined): Record<string, string> {
  if (!valor || typeof valor !== "object" || Array.isArray(valor)) return {};
  const saida: Record<string, string> = {};
  for (const [chave, item] of Object.entries(valor)) {
    if (typeof item === "string") saida[chave] = item;
    else if (typeof item === "number" || typeof item === "boolean") saida[chave] = String(item);
  }
  return saida;
}

function estadoInicial(valor: Json, ofertaId: string, versao: string): EstadoQualificacao {
  const bruto = valor && typeof valor === "object" && !Array.isArray(valor) ? valor : {};
  return {
    etapa_atual: typeof bruto["etapa_atual"] === "string" ? bruto["etapa_atual"] : "apresentacao",
    etapas_concluidas: textoArray(bruto["etapas_concluidas"]),
    perguntas_respondidas: textoArray(bruto["perguntas_respondidas"]),
    criterios_atendidos: textoArray(bruto["criterios_atendidos"]),
    respostas_coletadas: mapaTexto(bruto["respostas_coletadas"]),
    fatos_do_lead: mapaTexto(bruto["fatos_do_lead"]),
    ultima_orientacao: typeof bruto["ultima_orientacao"] === "string" ? bruto["ultima_orientacao"] : "",
    ultima_intencao: typeof bruto["ultima_intencao"] === "string" ? bruto["ultima_intencao"] : null,
    lembrete: typeof bruto["lembrete"] === "string" ? bruto["lembrete"] : null,
    pergunta_pendente_id:
      typeof bruto["pergunta_pendente_id"] === "string" ? bruto["pergunta_pendente_id"] : null,
    perguntas_puladas: textoArray(bruto["perguntas_puladas"]),
    oferta_id: ofertaId,
    cerebro_versao: versao,
    turno: typeof bruto["turno"] === "number" ? bruto["turno"] : 0,
  };
}

type ItemRoteiro = {
  id: string;
  ordem: number;
  etapa: string;
  objetivo: string;
  pergunta_exemplo: string;
  obrigatoria: boolean;
};

function etapaDoItem(item: ItemRoteiro | undefined): EtapaSdr {
  if (item && etapaSdrValida(item.etapa)) return item.etapa;
  return "compromisso";
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

// Cache curto em memória: a mesma ligação dispara várias análises por minuto,
// e nem a sessão nem o cérebro do produto mudam nesse intervalo.
const claimsCache = new Map<string, { sub: string; ate: number }>();
const cerebroCache = new Map<string, { ctx: CtxCerebro; ate: number }>();
const TTL_CLAIMS_MS = 30_000;
const TTL_CEREBRO_MS = 15_000;

type CtxCerebro = Awaited<ReturnType<typeof carregarCerebro>>;

async function carregarCerebroComCache(
  supabase: ReturnType<typeof clienteComToken>,
  ofertaId: string | null,
): Promise<CtxCerebro> {
  const chave = ofertaId ?? "__sem_produto__";
  const emCache = cerebroCache.get(chave);
  if (emCache && emCache.ate > Date.now()) return emCache.ctx;
  const ctx = await carregarCerebro(supabase, ofertaId, true);
  cerebroCache.set(chave, { ctx, ate: Date.now() + TTL_CEREBRO_MS });
  return ctx;
}

/** Extrai o que já foi gerado do campo "fala" do JSON parcial, para streaming na tela. */
function falaParcial(acumulado: string): string {
  const chave = acumulado.indexOf('"fala"');
  if (chave < 0) return "";
  const abre = acumulado.indexOf('"', chave + 6);
  if (abre < 0) return "";
  let saida = "";
  for (let j = abre + 1; j < acumulado.length; j++) {
    const c = acumulado[j];
    if (c === "\\") {
      const proximo = acumulado[j + 1];
      if (proximo === undefined) break;
      if (proximo === "n") saida += " ";
      else if (proximo === '"' || proximo === "\\" || proximo === "/") saida += proximo;
      j++;
      continue;
    }
    if (c === '"') break;
    saida += c;
  }
  return saida;
}

const SYSTEM_COPILOTO_SDR = `Você é o copiloto de um vendedor (SDR) durante uma ligação ao vivo. Você ouve a conversa e escreve a PRÓXIMA FALA que o vendedor vai ler em voz alta, agora, para o lead.

Pense como o melhor vendedor consultivo do Brasil: interessado de verdade na pessoa, leve, caloroso, curioso, que escuta mais do que fala e conduz sem parecer que está conduzindo. A conversa é um bate-papo, não um interrogatório.

COMO DECIDIR A FALA (nesta ordem):
1. O lead fez uma pergunta ou dúvida? Responda primeiro, de forma curta e direta, usando SOMENTE o CÉREBRO DO PRODUTO. Depois faça uma ponte natural para uma pergunta do roteiro.
2. O lead demonstrou algo (entusiasmo, receio, pressa, uma conquista, uma dor)? Reaja a isso com humanidade antes de seguir.
3. O lead deu uma informação? Mostre que ouviu (cite algo que ele disse) e aprofunde ou avance.
4. Só então avance para o item pendente do ROTEIRO que se encaixa mais naturalmente agora, não necessariamente o próximo da lista.

REGRAS DA FALA:
- 1 a 3 frases, até 40 palavras. É para ser lida em voz alta em segundos.
- Português do Brasil falado: "pra", "você", "a gente", "né". Nada de linguagem de e-mail ou de robô.
- Termine, quase sempre, com UMA pergunta aberta. Nunca duas perguntas seguidas.
- Use o nome do lead às vezes, não em toda fala.
- Nunca repita uma pergunta que já foi respondida (veja FICHA DO LEAD).
- Nunca invente números, datas, preços, percentuais, prazos, certificações ou condições. Se a resposta não está no CÉREBRO DO PRODUTO, diga com naturalidade que vai confirmar/explicar em detalhe e conduza de volta (ex.: "isso eu te explico direitinho já já, mas antes me conta...").
- Não prometa o que não está cadastrado. Entusiasmo sim, mentira não.

ESTABILIDADE:
- Você recebe SUGESTAO_ATUAL (o que já está na tela). Se o que o lead acabou de dizer ainda é bem atendido por ela, devolva "manter_atual": true e repita a mesma fala.
- Só troque se a nova fala do lead mudar o que deveria ser dito.

MARCAÇÃO DO ROTEIRO:
- "itens_cobertos": só ids cuja informação o LEAD de fato deu nesta fala. Confirmações curtas ("isso", "sim") só valem para a pergunta que o vendedor acabou de fazer. Perguntas do lead não cobrem nada.

EXEMPLO
Lead: "Preenchi e queria entender melhor como funciona a bolsa."
RUIM: "E dentro dessa área, você tem pego casos de bruxismo ou de dor orofacial?"
BOM (com dados da bolsa no cérebro): "Que bom que você se inscreveu! A bolsa funciona assim: [resumo do cérebro]. Pra eu ver se faz sentido pro seu momento, me conta: hoje você atua em qual área?"
BOM (sem dados da bolsa no cérebro): "Que bom que você se interessou pela bolsa! Vou te explicar certinho como ela funciona. Antes, pra entender se encaixa pra você: hoje você atua em qual área?"

Responda SOMENTE com o JSON, exatamente neste formato:
{"manter_atual": false, "fala": "...", "intencao": "responder_duvida | reagir_e_conectar | aprofundar | avancar_roteiro | contornar_objecao | fechar_proximo_passo", "objetivo_roteiro": "id do item ou null", "itens_cobertos": ["ids"], "fatos_do_lead": {"chave": "valor"}}`;

export async function responderSugestao(request: Request): Promise<Response> {
  const auth = request.headers.get("authorization") ?? "";
  if (!auth.startsWith("Bearer ")) return new Response("Unauthorized", { status: 401 });
  const token = auth.slice(7);
  if (token.split(".").length !== 3) return new Response("Unauthorized", { status: 401 });

  const supabase = clienteComToken(token);
  const claimsEmCache = claimsCache.get(token);
  if (claimsEmCache && claimsEmCache.ate > Date.now()) {
    // sessão revalidada há poucos segundos: segue direto
  } else {
    const { data: claims, error: erroClaims } = await supabase.auth.getClaims(token);
    if (erroClaims || !claims?.claims?.sub) return new Response("Unauthorized", { status: 401 });
    claimsCache.set(token, { sub: claims.claims.sub, ate: Date.now() + TTL_CLAIMS_MS });
  }

  const body = (await request.json()) as {
    callId?: string;
    texto?: string;
    ofertaId?: string;
    cerebroVersao?: string;
    requestId?: string;
    turno?: number;
    protocolo?: string;
    sugestaoAtual?: string;
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

  const ctx = await carregarCerebroComCache(supabase, call.oferta_id);
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
      .limit(16),
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

  // Últimas trocas, já sem o eco do som da aba no canal do vendedor.
  const ordenadas = (falasRes.data ?? []).slice().reverse();
  const limpas: Array<{ falante: string; texto: string }> = [];
  for (const f of ordenadas) {
    if (f.falante !== "cliente") {
      const recentesCliente = ordenadas
        .filter((o) => o.falante === "cliente")
        .map((o) => ({ texto: o.texto, em: new Date(o.created_at).getTime() }));
      if (ehEcoDoCliente(f.texto, recentesCliente, new Date(f.created_at).getTime())) continue;
    }
    limpas.push({ falante: f.falante, texto: f.texto });
  }
  const ultimas = limpas.slice(-8);

  const roteiro: ItemRoteiro[] = ctx.perguntas.map((p) => ({
    id: p.id,
    ordem: p.ordem,
    etapa: p.etapa,
    objetivo: p.o_que_identificar || p.pergunta,
    pergunta_exemplo: p.pergunta,
    obrigatoria: p.obrigatoria,
  }));
  const cobertosAntes = new Set(estado.perguntas_respondidas);
  const pendentes = roteiro.filter((i) => !cobertosAntes.has(i.id));
  const sugestaoAtual = (body.sugestaoAtual ?? estado.ultima_orientacao ?? "").trim();

  const userMessageSdr = `CÉREBRO DO PRODUTO
${textoCerebroProduto(ctx)}

ROTEIRO (o que ainda precisamos coletar ou cumprir)
${
  pendentes.length
    ? pendentes
        .map((i) => `- id: ${i.id} | objetivo: ${i.objetivo} | exemplo de pergunta: ${i.pergunta_exemplo}${i.obrigatoria ? " | obrigatório" : ""}`)
        .join("\n")
    : "- tudo coletado: conduza para fechar o agendamento do diagnóstico."
}

JÁ COBERTO (nunca pergunte de novo)
${
  roteiro
    .filter((i) => cobertosAntes.has(i.id))
    .map((i) => `- ${i.pergunta_exemplo}`)
    .join("\n") || "- nada ainda"
}

FICHA DO LEAD
Nome: ${call.nome_lead || "(ainda não sabemos)"}
Origem: ${call.origem_lead || "(não informada)"}
${
  Object.entries(estado.fatos_do_lead)
    .map(([k, v]) => `${k}: ${v}`)
    .join("\n") || "(sem fatos coletados ainda)"
}

ÚLTIMAS TROCAS
${ultimas.map((f) => `${f.falante === "cliente" ? "LEAD" : "VENDEDOR"}: ${f.texto}`).join("\n")}

SUGESTAO_ATUAL
${sugestaoAtual || "(nenhuma ainda)"}

FALA ATUAL DO LEAD
${texto}`;

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

  const system = call.tipo === "sdr" ? SYSTEM_COPILOTO_SDR : montarSystemPrompt(ctx, "closer");
  const userMessage = call.tipo === "sdr" ? userMessageSdr : userMessageCloser;
  const model =
    ctx.config["modelo_claude_rapido"] ||
    ctx.config["modelo_claude"] ||
    "claude-haiku-4-5-20251001";
  const maxTokens = call.tipo === "sdr" ? 320 : Number(ctx.config["max_tokens_ao_vivo"] ?? 260);

  const stream = new ReadableStream({
    async start(controller) {
      let fechado = false;
      let entregou = false;
      const enviar = (evento: unknown) => {
        if (fechado || request.signal.aborted) return;
        controller.enqueue(linha(evento));
      };
      try {
        const chamada = chamarClaudeStream({
          system,
          model,
          maxTokens,
          ...(call.tipo === "sdr" ? { temperatura: 0.6 } : {}),
          messages: [{ role: "user", content: userMessage }],
          signal: request.signal,
          onTexto: () => {},
        });

        // Rede de segurança: se passar de 2,5 s, mantemos o que já está na tela
        // e a resposta definitiva chega logo depois, no mesmo stream.
        if (call.tipo === "sdr") {
          const fallback = new Promise<"lento">((resolve) => setTimeout(() => resolve("lento"), 2500));
          const corrida = await Promise.race([chamada.then(() => "pronto" as const), fallback]);
          if (corrida === "lento") {
            const proxima = pendentes[0];
            enviar({
              tipo: "final",
              parcial: true,
              resposta: {
                acao: sugestaoAtual || proxima ? "orientar" : "manter",
                fala: sugestaoAtual || proxima?.pergunta_exemplo || "",
                proxima_pergunta: sugestaoAtual || proxima?.pergunta_exemplo || "",
                intencao: sugestaoAtual ? "aprofundar" : "avancar_roteiro",
                objetivo_roteiro: proxima?.id ?? null,
                itens_cobertos: [],
                etapa_qualificacao: etapaDoItem(proxima),
                resultado_sugerido: pendentes.length ? "seguir_qualificando" : "agendar_agora",
              },
              latencia_ms: Date.now() - inicio,
              identidade: {
                oferta_id: call.oferta_id,
                produto: ctx.oferta?.nome ?? "",
                cerebro_versao: ctx.versao,
                request_id: body.requestId ?? "",
                primeira_pergunta_ms: null,
                protocolo: PROTOCOLO_COPILOTO,
              },
            });
            entregou = true;
          }
        }

        const bruto = await chamada;

        let resposta: Saida;
        try {
          resposta = extrairJson(bruto) as Saida;
        } catch {
          resposta = {};
        }

        if (call.tipo === "sdr") {
          const idsValidos = new Set(roteiro.map((i) => i.id));
          const falaModelo = typeof resposta["fala"] === "string" ? resposta["fala"].trim() : "";
          const manterAtual = resposta["manter_atual"] === true && Boolean(sugestaoAtual);
          const proximaPendente = pendentes[0];
          const fala = manterAtual
            ? sugestaoAtual
            : falaModelo || sugestaoAtual || proximaPendente?.pergunta_exemplo || "";
          if (!fala) {
            if (!entregou) enviar({ tipo: "final", resposta: { acao: "manter" } });
            return;
          }
          const cobertos = textoArray(resposta["itens_cobertos"]).filter((id) => idsValidos.has(id));
          const perguntasRespondidas = [...new Set([...estado.perguntas_respondidas, ...cobertos])];
          const fatosNovos = mapaTexto(resposta["fatos_do_lead"]);
          const objetivoBruto = resposta["objetivo_roteiro"];
          const objetivo =
            typeof objetivoBruto === "string" && idsValidos.has(objetivoBruto)
              ? objetivoBruto
              : (pendentes.find((i) => !cobertos.includes(i.id))?.id ?? null);
          const itemObjetivo = roteiro.find((i) => i.id === objetivo);
          const intencao = intencaoValida(resposta["intencao"])
            ? resposta["intencao"]
            : "avancar_roteiro";
          const restantes = roteiro.filter((i) => !perguntasRespondidas.includes(i.id));

          estado = {
            ...estado,
            etapa_atual: etapaDoItem(itemObjetivo ?? restantes[0]),
            perguntas_respondidas: perguntasRespondidas,
            pergunta_pendente_id: objetivo,
            respostas_coletadas: cobertos.reduce(
              (coletadas, id) => ({ ...coletadas, [id]: texto }),
              estado.respostas_coletadas,
            ),
            fatos_do_lead: { ...estado.fatos_do_lead, ...fatosNovos },
            ultima_orientacao: fala,
            ultima_intencao: intencao,
            lembrete: null,
            turno,
          };
          resposta = {
            acao: "orientar",
            manter_atual: manterAtual || normalizarFala(fala) === normalizarFala(sugestaoAtual),
            fala,
            proxima_pergunta: fala,
            intencao,
            objetivo_roteiro: objetivo,
            objetivo_texto: itemObjetivo?.pergunta_exemplo ?? null,
            itens_cobertos: cobertos,
            itens_concluidos: perguntasRespondidas,
            etapa_qualificacao: estado.etapa_atual,
            resultado_sugerido: restantes.length ? "seguir_qualificando" : "agendar_agora",
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
          primeira_pergunta_ms: null,
          protocolo: PROTOCOLO_COPILOTO,
        };
        console.info("[copiloto] latência", { callId, tipo: call.tipo, latencia });
        enviar({ tipo: "final", resposta, latencia_ms: latencia, identidade });
        await supabase.from("sugestoes").insert({
          call_id: callId,
          fala_id: falaRes.data?.id ?? null,
          resposta: { ...resposta, _cerebro: identidade } as never,
          latencia_ms: latencia,
        });
      } catch (e) {
        if (request.signal.aborted || (e instanceof DOMException && e.name === "AbortError")) return;
        console.error("[copiloto] falha ao gerar sugestão", e);
        if (!entregou) {
          enviar({ tipo: "erro", mensagem: "Não foi possível gerar a sugestão agora." });
        }
      } finally {
        fechado = true;
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "content-type": "application/x-ndjson", "cache-control": "no-store" },
  });
}
