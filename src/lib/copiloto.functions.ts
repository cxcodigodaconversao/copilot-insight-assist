import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Json = string | number | boolean | null | Json[] | { [k: string]: Json };
type Saida = { [k: string]: Json };

const SugestaoInput = z.object({
  callId: z.string().uuid(),
  texto: z.string().min(1),
});

const TesteInput = z.object({
  ofertaId: z.string().uuid().nullable(),
  fala: z.string().min(1),
  tipo: z.enum(["closer", "sdr"]).default("closer"),
});

const ResumoInput = z.object({ callId: z.string().uuid() });

export const obterCerebroDaCall = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ callId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { carregarCerebro } = await import("./cerebro.server");
    const { data: call, error } = await context.supabase
      .from("calls")
      .select("id, tipo, oferta_id, ofertas(nome)")
      .eq("id", data.callId)
      .maybeSingle();
    if (error || !call) throw new Error("Ligação não encontrada.");
    const ctx = await carregarCerebro(context.supabase, call.oferta_id);
    if (call.tipo === "sdr" && !call.oferta_id) {
      throw new Error("Esta ligação não tem um produto definido.");
    }
    return {
      ofertaId: call.oferta_id,
      produto: call.ofertas?.nome ?? ctx.oferta?.nome ?? "",
      versao: ctx.versao,
      completo: call.tipo !== "sdr" || ctx.completoSdr,
      perguntas: ctx.perguntas.map((p) => ({ id: p.id, categoria: p.categoria, pergunta: p.pergunta })),
    };
  });

/** Gera a sugestão do Copiloto a partir da última fala do cliente. */
export const gerarSugestao = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => SugestaoInput.parse(d))
  .handler(async ({ data, context }) => {
    const { carregarCerebro, montarSystemPrompt, chamarClaude, extrairJson } = await import(
      "./cerebro.server"
    );
    const supabase = context.supabase;
    const inicio = Date.now();

    const { data: call, error: callErr } = await supabase
      .from("calls")
      .select("*")
      .eq("id", data.callId)
      .maybeSingle();
    if (callErr || !call) throw new Error("Call não encontrada");

    const { data: fala } = await supabase
      .from("falas")
      .insert({ call_id: call.id, falante: "cliente", texto: data.texto })
      .select("*")
      .single();

    const ctx = await carregarCerebro(supabase, call.oferta_id);
    const minPalavras = Number(ctx.config["min_palavras_para_analisar"] ?? 6);
    if (data.texto.trim().split(/\s+/).length < minPalavras) {
      return { resposta: { acao: "manter" }, latencia_ms: Date.now() - inicio, pulou: true };
    }

    const { data: falas } = await supabase
      .from("falas")
      .select("falante, texto, created_at")
      .eq("call_id", call.id)
      .order("created_at", { ascending: false })
      .limit(30);
    const ultimas = (falas ?? []).slice().reverse();

    const { data: perfil } = await supabase
      .from("profiles")
      .select("nome")
      .eq("id", call.vendedor_id)
      .maybeSingle();

    const minutos = Math.max(
      0,
      Math.round((Date.now() - new Date(call.iniciada_em).getTime()) / 60000),
    );

    const userMessage = `CONTEXTO DO LEAD
Nome: ${call.nome_lead}
Origem: ${call.origem_lead}
O que já sabemos: ${call.notas_crm}

VENDEDOR: ${perfil?.nome ?? ""} (${call.tipo})
OBJETIVO DESTA CALL: ${call.objetivo}
TEMPO DECORRIDO: ${minutos} min

RESUMO DO INÍCIO DA CALL (se houver)
${call.resumo_falas_antigas ?? ""}

TRANSCRIÇÃO RECENTE (mais recente por último)
${ultimas.map((f) => `${f.falante === "cliente" ? "CLIENTE" : "VENDEDOR"}: ${f.texto}`).join("\n")}

ÚLTIMA FALA DO CLIENTE
${data.texto}`;

    const system = montarSystemPrompt(ctx, call.tipo === "sdr" ? "sdr" : "closer");
    const model = ctx.config["modelo_claude"] || "claude-sonnet-4-6";
    const maxTokens = Number(ctx.config["max_tokens"] ?? 600);

    let resposta: Saida;
    try {
      const texto = await chamarClaude({
        system,
        model,
        maxTokens,
        messages: [{ role: "user", content: userMessage }],
      });
      try {
        resposta = extrairJson(texto) as Saida;
      } catch {
        const retry = await chamarClaude({
          system,
          model,
          maxTokens,
          messages: [
            { role: "user", content: userMessage },
            { role: "assistant", content: texto },
            {
              role: "user",
              content: "Sua resposta anterior não era JSON válido. Reenvie apenas o JSON válido.",
            },
          ],
        });
        resposta = extrairJson(retry) as Saida;
      }
    } catch (e) {
      console.error("[copiloto] falha ao gerar sugestão", e);
      resposta = { acao: "manter" };
    }

    const latencia = Date.now() - inicio;
    const { data: salva } = await supabase
      .from("sugestoes")
      .insert({
        call_id: call.id,
        fala_id: fala?.id ?? null,
        resposta: resposta as never,
        latencia_ms: latencia,
      })
      .select("*")
      .single();

    return { resposta, latencia_ms: latencia, id: salva?.id ?? null, pulou: false };
  });

/** Registra uma fala (do vendedor ou correção de falante) sem acionar o Claude. */
export const registrarFala = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        callId: z.string().uuid(),
        falante: z.enum(["cliente", "vendedor"]),
        texto: z.string().min(1),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: fala, error } = await context.supabase
      .from("falas")
      .insert({ call_id: data.callId, falante: data.falante, texto: data.texto })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return fala;
  });

/** Testar o cérebro: simula uma fala de cliente sem estar numa call. */
export const testarCerebro = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => TesteInput.parse(d))
  .handler(async ({ data, context }) => {
    const { carregarCerebro, montarSystemPrompt, chamarClaude, extrairJson } = await import(
      "./cerebro.server"
    );
    const inicio = Date.now();
    const ctx = await carregarCerebro(context.supabase, data.ofertaId);
    const system = montarSystemPrompt(ctx, data.tipo);
    const texto = await chamarClaude({
      system,
      model: ctx.config["modelo_claude"] || "claude-sonnet-4-6",
      maxTokens: Number(ctx.config["max_tokens"] ?? 600),
      messages: [
        {
          role: "user",
          content: `CONTEXTO DO LEAD
Nome: Lead de teste
Origem: teste no painel
O que já sabemos: (simulação do líder para calibrar o cérebro)

VENDEDOR: (teste) (${data.tipo})
OBJETIVO DESTA CALL: calibrar as respostas do copiloto
TEMPO DECORRIDO: 5 min

RESUMO DO INÍCIO DA CALL (se houver)

TRANSCRIÇÃO RECENTE (mais recente por último)
CLIENTE: ${data.fala}

ÚLTIMA FALA DO CLIENTE
${data.fala}`,
        },
      ],
    });
    let resposta: Saida;
    try {
      resposta = extrairJson(texto) as Saida;
    } catch {
      const corrigida = await chamarClaude({
        system,
        model: ctx.config["modelo_claude"] || "claude-sonnet-4-6",
        maxTokens: Number(ctx.config["max_tokens"] ?? 600),
        messages: [
          {
            role: "user",
            content: `A resposta abaixo foi cortada ou não pôde ser lida. Reenvie uma versão curta e completa, somente no formato JSON solicitado, sem markdown:\n\n${texto}`,
          },
        ],
      });
      try {
        resposta = extrairJson(corrigida) as Saida;
      } catch {
        throw new Error("A resposta do copiloto ficou incompleta. Tente novamente.");
      }
    }
    return { resposta, system, latencia_ms: Date.now() - inicio };
  });

/** Resumo pós-call. */
export const gerarResumoCall = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ResumoInput.parse(d))
  .handler(async ({ data, context }) => {
    const { carregarCerebro, montarSystemPrompt, chamarClaude, extrairJson } = await import(
      "./cerebro.server"
    );
    const supabase = context.supabase;
    const { data: call } = await supabase
      .from("calls")
      .select("*")
      .eq("id", data.callId)
      .maybeSingle();
    if (!call) throw new Error("Call não encontrada");

    const { data: falas } = await supabase
      .from("falas")
      .select("falante, texto")
      .eq("call_id", call.id)
      .order("created_at", { ascending: true });

    const ctx = await carregarCerebro(supabase, call.oferta_id);
    const transcricao = (falas ?? [])
      .map((f) => `${f.falante === "cliente" ? "CLIENTE" : "VENDEDOR"}: ${f.texto}`)
      .join("\n");

    const texto = await chamarClaude({
      system: montarSystemPrompt(ctx, call.tipo === "sdr" ? "sdr" : "closer"),
      model: ctx.config["modelo_claude"] || "claude-sonnet-4-6",
      maxTokens: 1500,
      messages: [
        {
          role: "user",
          content: `A call terminou. Ignore o formato de resposta anterior e responda SOMENTE com este JSON:
{
  "resumo": "5 linhas sobre o que aconteceu na call",
  "perfil_disc_final": "D|I|S|C|indefinido",
  "objecoes_surgidas": [{"objecao": "...", "como_foi_tratada": "..."}],
  "pontos_fortes_vendedor": ["..."],
  "pontos_a_melhorar": ["..."],
  "proximos_passos": ["..."],
  "temperatura_final": "frio|morno|quente"
}

LEAD: ${call.nome_lead} (${call.origem_lead})
OBJETIVO: ${call.objetivo}

TRANSCRIÇÃO COMPLETA
${transcricao || "(sem falas registradas)"}`,
        },
      ],
    });

    let resumo: Saida;
    try {
      resumo = extrairJson(texto) as Saida;
    } catch {
      resumo = { resumo: texto };
    }

    await supabase
      .from("calls")
      .update({ resumo_final: resumo as never, encerrada_em: new Date().toISOString() })
      .eq("id", call.id);

    return resumo;
  });

/** Chave temporária da Deepgram para o navegador (a chave real nunca sai do servidor). */
export const obterTokenDeepgram = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const key = process.env["DEEPGRAM_API_KEY"];
    if (!key) {
      throw new Error(
        "A chave da Deepgram ainda não foi configurada. Peça ao administrador para cadastrá-la.",
      );
    }
    const res = await fetch("https://api.deepgram.com/v1/auth/grant", {
      method: "POST",
      headers: { Authorization: `Token ${key}`, "content-type": "application/json" },
      body: JSON.stringify({ ttl_seconds: 300 }),
    });
    if (!res.ok) {
      const corpo = await res.text();
      let categoria = "sem-categoria";
      try {
        const detalhe = JSON.parse(corpo) as { category?: string; err_code?: string };
        categoria = detalhe.category ?? detalhe.err_code ?? categoria;
      } catch {
        // A resposta pode não ser JSON. Nunca registramos a chave nem o corpo bruto.
      }
      console.error("Deepgram não liberou o acesso temporário", {
        status: res.status,
        categoria,
      });
      if (res.status === 403) {
        throw new Error(
          "A Deepgram recusou a liberação. A chave precisa ter permissão Member ou superior.",
        );
      }
      throw new Error(`Não foi possível liberar a transcrição (${res.status}).`);
    }
    const json = (await res.json()) as { access_token: string; expires_in: number };
    return json;
  });
