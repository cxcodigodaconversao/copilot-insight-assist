// Server-only: monta o system prompt do Copiloto CX e fala com a API da Anthropic.
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { resolverPorProduto, temConteudoProprio } from "./qualificacao";

type DB = SupabaseClient<Database>;

export type Oferta = Database["public"]["Tables"]["ofertas"]["Row"];
export type Objecao = Database["public"]["Tables"]["objecoes"]["Row"];
export type PerfilDisc = Database["public"]["Tables"]["perfis_disc"]["Row"];
export type PerguntaQualificacao = Database["public"]["Tables"]["perguntas_qualificacao"]["Row"];
export type CriterioQualificacao = Database["public"]["Tables"]["criterios_qualificacao"]["Row"];

export type TipoCall = "closer" | "sdr";

export type CerebroContexto = {
  oferta: Oferta | null;
  objecoes: Objecao[];
  perfis: PerfilDisc[];
  perguntas: PerguntaQualificacao[];
  criterios: CriterioQualificacao[];
  regras: Record<string, string>;
  config: Record<string, string>;
};

// Cache curto por produto: durante uma ligação o cérebro não muda,
// e montá-lo custa 7 consultas ao banco a cada fala do cliente.
const cache = new Map<string, { em: number; ctx: CerebroContexto }>();
const CACHE_MS = 60_000;

export function limparCacheCerebro() {
  cache.clear();
}

export async function carregarCerebro(
  supabase: DB,
  ofertaId: string | null,
  usarCache = false,
): Promise<CerebroContexto> {
  const chaveCache = ofertaId ?? "geral";
  if (usarCache) {
    const guardado = cache.get(chaveCache);
    if (guardado && Date.now() - guardado.em < CACHE_MS) return guardado.ctx;
  }
  const ctx = await montarCerebro(supabase, ofertaId);
  cache.set(chaveCache, { em: Date.now(), ctx });
  return ctx;
}

async function montarCerebro(supabase: DB, ofertaId: string | null): Promise<CerebroContexto> {
  const [ofertaRes, objecoesRes, perfisRes, regrasRes, configRes, perguntasRes, criteriosRes] =
    await Promise.all([
      ofertaId
        ? supabase.from("ofertas").select("*").eq("id", ofertaId).maybeSingle()
        : Promise.resolve({ data: null, error: null } as const),
      supabase.from("objecoes").select("*").eq("ativo", true).order("ordem", { ascending: true }),
      supabase.from("perfis_disc").select("*").order("tipo", { ascending: true }),
      supabase.from("regras_copiloto").select("*"),
      supabase.from("config_api").select("*"),
      supabase
        .from("perguntas_qualificacao")
        .select("*")
        .eq("ativo", true)
        .order("ordem", { ascending: true }),
      supabase
        .from("criterios_qualificacao")
        .select("*")
        .eq("ativo", true)
        .order("peso", { ascending: false }),
    ]);

  const todasObjecoes = objecoesRes.data ?? [];
  const objecoes = temConteudoProprio(todasObjecoes, ofertaId)
    ? todasObjecoes.filter((o) => o.oferta_id === ofertaId)
    : todasObjecoes.filter((o) => o.oferta_id === null);

  // Regras: o valor cadastrado no produto sobrescreve o valor geral da mesma chave.
  const regras: Record<string, string> = {};
  for (const r of regrasRes.data ?? []) if (r.oferta_id === null) regras[r.chave] = r.valor ?? "";
  if (ofertaId) {
    for (const r of regrasRes.data ?? [])
      if (r.oferta_id === ofertaId) regras[r.chave] = r.valor ?? "";
  }

  const config: Record<string, string> = {};
  for (const c of configRes.data ?? []) config[c.chave] = c.valor ?? "";

  return {
    oferta: (ofertaRes.data as Oferta | null) ?? null,
    objecoes,
    perfis: perfisRes.data ?? [],
    perguntas: resolverPorProduto(perguntasRes.data ?? [], ofertaId),
    criterios: resolverPorProduto(criteriosRes.data ?? [], ofertaId),
    regras,
    config,
  };
}

function textoPerfis(ctx: CerebroContexto): string {
  return ctx.perfis
    .map(
      (p) =>
        `Perfil ${p.tipo}\n  Como identificar: ${p.como_identificar}\n  Como conduzir: ${p.como_conduzir}\n  Evitar: ${p.evitar}`,
    )
    .join("\n");
}

function montarSystemPromptSdr(ctx: CerebroContexto): string {
  const perguntas = ctx.perguntas
    .map(
      (p) =>
        `[${p.categoria}] ${p.pergunta}\n  O que identificar: ${p.o_que_identificar}\n  Se a resposta for vaga: ${p.pergunta_followup ?? ""}`,
    )
    .join("\n");

  const criterios = ctx.criterios
    .map((c) => `${c.criterio} (peso ${c.peso}) — como identificar: ${c.como_identificar}`)
    .join("\n");

  return `${ctx.regras["persona_sdr"] ?? ""}

Você aplica a etapa de qualificação do método CX — Código da Conversão: leitura comportamental (DISC) e condução por perguntas estratégicas, com um único objetivo final: agendar o diagnóstico com o especialista.

=== REGRAS DE CONDUTA ===
${ctx.regras["regras_conduta_sdr"] ?? ""}

=== ROTEIRO / ETAPAS DE QUALIFICAÇÃO ===
${
  ctx.regras["roteiro_sdr"]?.trim()
    ? ctx.regras["roteiro_sdr"]
    : `Abertura: gerar rapport rápido e contextualizar por que está ligando.
Diagnóstico rápido: passar pelas perguntas de qualificação cadastradas, identificando momento, autoridade, dor e urgência.
Pontuação: cruzar as respostas com os critérios de qualificação.
Agendamento: se qualificado, conduzir para marcar a call com o especialista, com data e horário fechados na própria ligação.
Encerramento: se desqualificado, encerrar com respeito, sem insistir.`
}

=== PERGUNTAS DE QUALIFICAÇÃO CADASTRADAS ===
${perguntas}

=== CRITÉRIOS DE QUALIFICAÇÃO ===
${criterios}

=== PERFIS DISC ===
${textoPerfis(ctx)}

=== INSTRUÇÕES ADICIONAIS DO LÍDER ===
${ctx.regras["instrucoes_livres"] ?? ""}

=== FORMATO DE RESPOSTA ===
Responda SOMENTE com JSON válido, sem markdown, sem texto antes ou depois:
{
  "acao": "manter | orientar | alerta",
  "proxima_pergunta": "a pergunta exata que o SDR deve fazer agora, em linguagem falada",
  "leitura": "1 frase: o que o lead acabou de revelar",
  "perfil_disc": {"tipo": "D|I|S|C|indefinido", "confianca": 0.0},
  "etapa_qualificacao": "abertura | diagnostico | pontuacao | agendamento | encerramento",
  "temperatura": "frio | morno | quente",
  "pontuacao_qualificacao": 0,
  "sinal": "objecao_agenda | lead_desqualificado | sinal_agendamento | duvida_fora_do_escopo | desvio | nenhum",
  "porque": "1 frase curta",
  "resultado_sugerido": "seguir_qualificando | agendar_agora | desqualificar",
  "alerta": "só preencha se o SDR estiver perdendo o lead ou pulando etapa, senão null"
}
Escreva os campos exatamente nessa ordem, começando por "acao" e "proxima_pergunta". Seja direto: frases curtas.
Quando "acao" for "manter", envie apenas {"acao": "manter"}.
${ctx.regras["formato_saida_extra"] ?? ""}`;
}

export function montarSystemPrompt(ctx: CerebroContexto, tipo: TipoCall = "closer"): string {
  if (tipo === "sdr") return montarSystemPromptSdr(ctx);
  const o = ctx.oferta;
  const objecoes = ctx.objecoes
    .map(
      (obj) =>
        `[${obj.categoria}] (id: ${obj.id}) Gatilho: ${obj.gatilho}\n  Como quebrar: ${obj.como_quebrar}\n  Pergunta pronta: ${obj.pergunta_pronta}`,
    )
    .join("\n");

  const perfis = ctx.perfis
    .map(
      (p) =>
        `Perfil ${p.tipo}\n  Como identificar: ${p.como_identificar}\n  Como conduzir: ${p.como_conduzir}\n  Evitar: ${p.evitar}`,
    )
    .join("\n");

  return `${ctx.regras["persona"] ?? ""}

Você aplica o método CX — Código da Conversão: leitura comportamental (DISC), condução por perguntas (SPIN) e avanço para o fechamento.

=== REGRAS DE CONDUTA ===
${ctx.regras["regras_conduta"] ?? ""}

=== ETAPAS SPIN ===
${ctx.regras["etapas_spin"] ?? ""}

=== OFERTA EM NEGOCIAÇÃO ===
Nome: ${o?.nome ?? ""}
Descrição: ${o?.descricao ?? ""}
Preço e condições: ${o?.preco_condicoes ?? ""}
Garantia: ${o?.garantia ?? ""}
Diferenciais: ${o?.diferenciais ?? ""}
Público ideal: ${o?.publico_ideal ?? ""}
Você só pode afirmar sobre a oferta o que está acima. Se o cliente perguntar algo fora disso, oriente o vendedor a responder com o que ele sabe, e nunca invente.

=== QUEBRAS DE OBJEÇÃO CADASTRADAS ===
Quando a fala do cliente bater com um gatilho abaixo, use a orientação e a pergunta pronta correspondentes, adaptando ao perfil DISC. Se nenhuma bater, construa a orientação com base no método.
${objecoes}

=== PERFIS DISC ===
${perfis}

=== INSTRUÇÕES ADICIONAIS DO LÍDER ===
${ctx.regras["instrucoes_livres"] ?? ""}

=== FORMATO DE RESPOSTA ===
Responda SOMENTE com JSON válido, sem markdown, sem texto antes ou depois:
{
  "acao": "manter | orientar | alerta",
  "proxima_pergunta": "a pergunta exata que o vendedor deve fazer agora, em linguagem falada",
  "leitura": "1 frase: o que o cliente acabou de revelar (fato, não interpretação)",
  "perfil_disc": {"tipo": "D|I|S|C|indefinido", "confianca": 0.0},
  "etapa_spin": "situacao | problema | implicacao | necessidade | fechamento",
  "temperatura": "frio | morno | quente",
  "sinal": "objecao_preco | objecao_tempo | objecao_confianca | objecao_autoridade | objecao_necessidade | objecao_concorrente | sinal_compra | duvida_produto | desvio | nenhum",
  "objecao_usada": "id da objeção cadastrada que você usou, ou null",
  "porque": "1 frase curta explicando a escolha",
  "alerta": "só preencha se o vendedor cometeu um erro ou está perdendo o cliente. 1 frase. Senão null"
}
Escreva os campos exatamente nessa ordem, começando por "acao" e "proxima_pergunta". Seja direto: frases curtas.
Quando "acao" for "manter", envie apenas {"acao": "manter"}.
${ctx.regras["formato_saida_extra"] ?? ""}`;
}

export function extrairJson(texto: string): unknown {
  const limpo = texto
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();
  try {
    return JSON.parse(limpo);
  } catch {
    const inicio = limpo.indexOf("{");
    const fim = limpo.lastIndexOf("}");
    if (inicio >= 0 && fim > inicio) {
      return JSON.parse(limpo.slice(inicio, fim + 1));
    }
    throw new Error("Resposta não é JSON válido");
  }
}

type AnthropicMsg = { role: "user" | "assistant"; content: string };

export async function chamarClaude(opts: {
  system: string;
  messages: AnthropicMsg[];
  model: string;
  maxTokens: number;
}): Promise<string> {
  const apiKey = process.env["ANTHROPIC_API_KEY"];
  if (!apiKey) {
    throw new Error(
      "A chave da Anthropic ainda não foi configurada. Peça ao administrador para cadastrá-la.",
    );
  }

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: opts.model,
      max_tokens: opts.maxTokens,
      system: [{ type: "text", text: opts.system, cache_control: { type: "ephemeral" } }],
      messages: opts.messages,
    }),
  });

  if (!res.ok) {
    const detalhe = await res.text().catch(() => "");
    throw new Error(`Falha na API da Anthropic (${res.status}): ${detalhe.slice(0, 400)}`);
  }

  const json = (await res.json()) as { content?: Array<{ type: string; text?: string }> };
  return (json.content ?? [])
    .filter((c) => c.type === "text")
    .map((c) => c.text ?? "")
    .join("\n");
}

/** Igual ao chamarClaude, mas entrega o texto aos pedaços, conforme é gerado. */
export async function chamarClaudeStream(opts: {
  system: string;
  messages: AnthropicMsg[];
  model: string;
  maxTokens: number;
  onTexto: (pedaco: string, acumulado: string) => void;
}): Promise<string> {
  const apiKey = process.env["ANTHROPIC_API_KEY"];
  if (!apiKey) {
    throw new Error(
      "A chave da Anthropic ainda não foi configurada. Peça ao administrador para cadastrá-la.",
    );
  }

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: opts.model,
      max_tokens: opts.maxTokens,
      stream: true,
      system: [{ type: "text", text: opts.system, cache_control: { type: "ephemeral" } }],
      messages: opts.messages,
    }),
  });

  if (!res.ok || !res.body) {
    const detalhe = await res.text().catch(() => "");
    throw new Error(`Falha na API da Anthropic (${res.status}): ${detalhe.slice(0, 400)}`);
  }

  const leitor = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let texto = "";

  for (;;) {
    const { done, value } = await leitor.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const linhas = buffer.split("\n");
    buffer = linhas.pop() ?? "";
    for (const linha of linhas) {
      if (!linha.startsWith("data:")) continue;
      const bruto = linha.slice(5).trim();
      if (!bruto || bruto === "[DONE]") continue;
      try {
        const evento = JSON.parse(bruto) as {
          type?: string;
          delta?: { type?: string; text?: string };
        };
        if (evento.type === "content_block_delta" && evento.delta?.text) {
          texto += evento.delta.text;
          opts.onTexto(evento.delta.text, texto);
        }
      } catch {
        /* evento de controle */
      }
    }
  }

  return texto;
}
