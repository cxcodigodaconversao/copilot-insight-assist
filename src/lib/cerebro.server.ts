// Server-only: monta o system prompt do Copiloto CX e fala com a API da Anthropic.
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { ETAPAS_SDR } from "./fluxo-sdr";

type DB = SupabaseClient<Database>;

export type Oferta = Database["public"]["Tables"]["ofertas"]["Row"];
export type Objecao = Database["public"]["Tables"]["objecoes"]["Row"];
export type PerfilDisc = Database["public"]["Tables"]["perfis_disc"]["Row"];
export type PerguntaQualificacao = Database["public"]["Tables"]["perguntas_qualificacao"]["Row"];
export type CriterioQualificacao = Database["public"]["Tables"]["criterios_qualificacao"]["Row"];

export type TipoCall = "closer" | "sdr";

export type CerebroContexto = {
  ofertaId: string | null;
  versao: string;
  oferta: Oferta | null;
  objecoes: Objecao[];
  perfis: PerfilDisc[];
  perguntas: PerguntaQualificacao[];
  criterios: CriterioQualificacao[];
  regras: Record<string, string>;
  config: Record<string, string>;
  completoSdr: boolean;
};

function versaoDoConteudo(partes: unknown[]): string {
  const texto = JSON.stringify(partes);
  let hash = 2166136261;
  for (let i = 0; i < texto.length; i++) {
    hash ^= texto.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash >>> 0).toString(36);
}

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
  const filtrarOferta = <T extends { eq: (coluna: string, valor: string) => T; is: (coluna: string, valor: null) => T }>(
    consulta: T,
  ) => (ofertaId ? consulta.eq("oferta_id", ofertaId) : consulta.is("oferta_id", null));

  const [ofertaRes, objecoesRes, perfisRes, regrasRes, configRes, perguntasRes, criteriosRes] =
    await Promise.all([
      ofertaId
        ? supabase.from("ofertas").select("*").eq("id", ofertaId).maybeSingle()
        : Promise.resolve({ data: null, error: null } as const),
      filtrarOferta(
        supabase.from("objecoes").select("*").eq("ativo", true),
      ).order("ordem", { ascending: true }),
      supabase.from("perfis_disc").select("*").order("tipo", { ascending: true }),
      filtrarOferta(supabase.from("regras_copiloto").select("*")),
      supabase.from("config_api").select("*"),
      filtrarOferta(
        supabase.from("perguntas_qualificacao").select("*").eq("ativo", true).eq("oculto", false),
      ).order("ordem", { ascending: true }),
      filtrarOferta(
        supabase.from("criterios_qualificacao").select("*").eq("ativo", true).eq("oculto", false),
      ).order("peso", { ascending: false }),
    ]);

  // Nunca misture regras entre produtos. O padrão geral só existe no cérebro geral.
  const regras: Record<string, string> = {};
  for (const r of regrasRes.data ?? []) regras[r.chave] = r.valor ?? "";

  const config: Record<string, string> = {};
  for (const c of configRes.data ?? []) config[c.chave] = c.valor ?? "";

  const versao = versaoDoConteudo([
    ofertaId,
    ofertaRes.data,
    objecoesRes.data,
    regrasRes.data,
    perguntasRes.data,
    criteriosRes.data,
  ]);

  return {
    ofertaId,
    versao,
    oferta: (ofertaRes.data as Oferta | null) ?? null,
    objecoes: objecoesRes.data ?? [],
    perfis: perfisRes.data ?? [],
    perguntas: perguntasRes.data ?? [],
    criterios: criteriosRes.data ?? [],
    regras,
    config,
    completoSdr:
      !ofertaId ||
      Boolean(
        regras["persona_sdr"]?.trim() &&
          regras["regras_conduta_sdr"]?.trim() &&
          regras["roteiro_sdr"]?.trim() &&
          perguntasRes.data?.length &&
          criteriosRes.data?.length,
      ),
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
  if (ctx.ofertaId && !ctx.completoSdr) {
    throw new Error(`O cérebro SDR do produto ${ctx.oferta?.nome ?? "selecionado"} está incompleto.`);
  }
  const perguntas = ctx.perguntas
    .map(
      (p) =>
        `[ID ${p.id}] [ETAPA ${p.etapa}] [${p.categoria}] ${p.pergunta}\n  O que identificar: ${p.o_que_identificar}\n  Se a resposta for vaga: ${p.pergunta_followup ?? ""}`,
    )
    .join("\n");

  const criterios = ctx.criterios
    .map((c) => `${c.criterio} (peso ${c.peso}) — como identificar: ${c.como_identificar}`)
    .join("\n");

  return `IDENTIDADE IMUTÁVEL DESTE CÉREBRO
Produto: ${ctx.oferta?.nome ?? ""}
ID do produto: ${ctx.ofertaId ?? ""}
Versão do cérebro: ${ctx.versao}
Use exclusivamente o conteúdo abaixo. Nunca cite, reutilize ou complete com informações de outro produto. Se a transcrição mencionar outro negócio, trate como desvio, não como contexto deste produto.

${ctx.regras["persona_sdr"] ?? ""}

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
  "etapa_qualificacao": "${ETAPAS_SDR.join(" | ")}",
  "perguntas_respondidas_neste_turno": ["IDs exatos das perguntas respondidas pela fala atual"],
  "proxima_pergunta": "uma única orientação pronta para o SDR falar agora",
  "resultado_sugerido": "seguir_qualificando | agendar_agora | desqualificar",
  "lembrete_etapa_pulada": "nome curto da etapa obrigatória pulada, ou null"
}
REGRAS INEGOCIÁVEIS DA RESPOSTA AO VIVO:
- Produza somente UMA orientação curta, com no máximo duas frases faladas e uma única pergunta.
- O ESTADO DA CONVERSA recebido na mensagem é a fonte de verdade. Nunca volte para etapa concluída e nunca repita pergunta já respondida.
- Se o lead adiantar uma resposta, marque os IDs correspondentes e avance para o ponto mais adiantado alcançado.
- Se uma etapa obrigatória foi pulada, continue no ponto atual e preencha lembrete_etapa_pulada. Nunca retroceda silenciosamente.
- Se a fala não trouxer informação comercial nova ou for comentário técnico sobre o próprio sistema, responda somente {"acao":"manter","etapa_qualificacao":"etapa atual","perguntas_respondidas_neste_turno":[],"proxima_pergunta":"","resultado_sugerido":"seguir_qualificando","lembrete_etapa_pulada":null}.
- Não escreva análise, justificativa, DISC, pontuação ou explicações na orientação ao vivo.
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
  signal?: AbortSignal;
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
    signal: opts.signal ?? null,
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
