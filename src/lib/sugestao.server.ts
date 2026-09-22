// Server-only: gera a sugestão do copiloto em tempo real (streaming) durante a call.
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import {
  carregarCerebro,
  chamarClaudeStream,
  extrairJson,
  montarSystemPrompt,
} from "./cerebro.server";

type Json = string | number | boolean | null | Json[] | { [k: string]: Json };
type Saida = { [k: string]: Json };

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
  };
  const callId = body.callId ?? "";
  const texto = (body.texto ?? "").trim();
  if (!callId || !texto) return new Response("Requisição inválida", { status: 400 });

  const inicio = Date.now();

  const { data: call } = await supabase.from("calls").select("*").eq("id", callId).maybeSingle();
  if (!call) return new Response("Call não encontrada", { status: 404 });
  if (call.tipo === "sdr" && (!call.oferta_id || body.ofertaId !== call.oferta_id)) {
    return new Response("O produto da ligação mudou. Reabra a ligação antes de continuar.", {
      status: 409,
    });
  }

  const ctx = await carregarCerebro(supabase, call.oferta_id);
  if (call.tipo === "sdr" && body.cerebroVersao !== ctx.versao) {
    return new Response("O cérebro deste produto foi atualizado. Reabra a ligação.", { status: 409 });
  }
  if (call.tipo === "sdr" && !ctx.completoSdr) {
    return new Response("O cérebro SDR deste produto está incompleto.", { status: 409 });
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
  const minPalavras = Number(ctx.config["min_palavras_para_analisar"] ?? 6);

  const codificador = new TextEncoder();
  const linha = (obj: unknown) => codificador.encode(`${JSON.stringify(obj)}\n`);

  if (texto.split(/\s+/).length < minPalavras) {
    return new Response(linha({ tipo: "final", resposta: { acao: "manter" } }), {
      headers: { "content-type": "application/x-ndjson", "cache-control": "no-store" },
    });
  }

  const ultimas = (falasRes.data ?? []).slice(0, 10).reverse();
  const minutos = Math.max(
    0,
    Math.round((Date.now() - new Date(call.iniciada_em).getTime()) / 60000),
  );

  const userMessage = `CONTEXTO DO LEAD
Nome: ${call.nome_lead || "(ainda não cadastrado)"}
Origem: ${call.origem_lead}
O que já sabemos: ${call.notas_crm}

VENDEDOR: ${call.tipo}
OBJETIVO DESTA CALL: ${call.objetivo}
TEMPO DECORRIDO: ${minutos} min

TRANSCRIÇÃO RECENTE (mais recente por último)
${ultimas.map((f) => `${f.falante === "cliente" ? "CLIENTE" : "VENDEDOR"}: ${f.texto}`).join("\n")}

ÚLTIMA FALA DO CLIENTE
${texto}`;

  const system = montarSystemPrompt(ctx, call.tipo === "sdr" ? "sdr" : "closer");
  const model =
    ctx.config["modelo_claude_rapido"] ||
    ctx.config["modelo_claude"] ||
    "claude-haiku-4-5-20251001";
  const maxTokens = Number(ctx.config["max_tokens_ao_vivo"] ?? 260);

  const stream = new ReadableStream({
    async start(controller) {
      let ultimaParcial = "";
      let primeiraPerguntaMs: number | null = null;
      try {
        const bruto = await chamarClaudeStream({
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
              controller.enqueue(linha({ tipo: "parcial", proxima_pergunta: parcial }));
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

        const latencia = Date.now() - inicio;
        const identidade = {
          oferta_id: call.oferta_id,
          produto: ctx.oferta?.nome ?? "",
          cerebro_versao: ctx.versao,
          request_id: body.requestId ?? "",
          primeira_pergunta_ms: primeiraPerguntaMs,
        };
        controller.enqueue(linha({ tipo: "final", resposta, latencia_ms: latencia, identidade }));

        await supabase.from("sugestoes").insert({
          call_id: callId,
          fala_id: falaRes.data?.id ?? null,
          resposta: { ...resposta, _cerebro: identidade } as never,
          latencia_ms: latencia,
        });
      } catch (e) {
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
