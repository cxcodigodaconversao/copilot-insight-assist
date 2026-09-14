// Server-only: monta o system prompt do Copiloto CX e fala com a API da Anthropic.
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

type DB = SupabaseClient<Database>;

export type Oferta = Database["public"]["Tables"]["ofertas"]["Row"];
export type Objecao = Database["public"]["Tables"]["objecoes"]["Row"];
export type PerfilDisc = Database["public"]["Tables"]["perfis_disc"]["Row"];

export type CerebroContexto = {
  oferta: Oferta | null;
  objecoes: Objecao[];
  perfis: PerfilDisc[];
  regras: Record<string, string>;
  config: Record<string, string>;
};

export async function carregarCerebro(supabase: DB, ofertaId: string | null): Promise<CerebroContexto> {
  const [ofertaRes, objecoesRes, perfisRes, regrasRes, configRes] = await Promise.all([
    ofertaId
      ? supabase.from("ofertas").select("*").eq("id", ofertaId).maybeSingle()
      : Promise.resolve({ data: null, error: null } as const),
    supabase.from("objecoes").select("*").eq("ativo", true).order("ordem", { ascending: true }),
    supabase.from("perfis_disc").select("*").order("tipo", { ascending: true }),
    supabase.from("regras_copiloto").select("*"),
    supabase.from("config_api").select("*"),
  ]);

  const objecoes = (objecoesRes.data ?? []).filter(
    (o) => o.oferta_id === null || o.oferta_id === ofertaId,
  );

  const regras: Record<string, string> = {};
  for (const r of regrasRes.data ?? []) regras[r.chave] = r.valor ?? "";
  const config: Record<string, string> = {};
  for (const c of configRes.data ?? []) config[c.chave] = c.valor ?? "";

  return {
    oferta: (ofertaRes.data as Oferta | null) ?? null,
    objecoes,
    perfis: perfisRes.data ?? [],
    regras,
    config,
  };
}

export function montarSystemPrompt(ctx: CerebroContexto): string {
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
  "leitura": "1 frase: o que o cliente acabou de revelar (fato, não interpretação)",
  "perfil_disc": {"tipo": "D|I|S|C|indefinido", "confianca": 0.0},
  "etapa_spin": "situacao | problema | implicacao | necessidade | fechamento",
  "temperatura": "frio | morno | quente",
  "sinal": "objecao_preco | objecao_tempo | objecao_confianca | objecao_autoridade | objecao_necessidade | objecao_concorrente | sinal_compra | duvida_produto | desvio | nenhum",
  "objecao_usada": "id da objeção cadastrada que você usou, ou null",
  "proxima_pergunta": "a pergunta exata que o vendedor deve fazer agora, em linguagem falada",
  "porque": "1 frase curta explicando a escolha",
  "alerta": "só preencha se o vendedor cometeu um erro ou está perdendo o cliente. 1 frase. Senão null"
}
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
