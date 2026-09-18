import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Trash2, Mail } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { convidarMembro } from "@/lib/equipe.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type TabelaCadastro =
  | "times"
  | "origens"
  | "funis"
  | "clientes"
  | "closers_cadastro"
  | "sdrs_cadastro";

export const CADASTROS: Array<{ tabela: TabelaCadastro; titulo: string; ajuda: string }> = [
  { tabela: "clientes", titulo: "Clientes", ajuda: "Clientes/empresas donas da oferta." },
  { tabela: "times", titulo: "Times", ajuda: "Times comerciais responsáveis pelas calls." },
  { tabela: "funis", titulo: "Funis", ajuda: "Funis de captação." },
  { tabela: "origens", titulo: "Origens", ajuda: "De onde o lead veio." },
  {
    tabela: "closers_cadastro",
    titulo: "Closers",
    ajuda: "Nomes que aparecem no campo Closer da nova call.",
  },
  {
    tabela: "sdrs_cadastro",
    titulo: "SDRs",
    ajuda: "Nomes que aparecem no campo SDR das ligações.",
  },
];


type Item = { id: string; nome: string; ativo: boolean; ordem: number };

export function useCadastro(tabela: TabelaCadastro, somenteAtivos = true) {
  return useQuery({
    queryKey: ["cadastro", tabela, somenteAtivos],
    queryFn: async () => {
      let q = supabase.from(tabela).select("id, nome, ativo, ordem");
      if (somenteAtivos) q = q.eq("ativo", true);
      const { data, error } = await q.order("ordem").order("nome");
      if (error) throw error;
      return (data ?? []) as Item[];
    },
  });
}

export function useOfertasAtivas() {
  return useQuery({
    queryKey: ["ofertas-ativas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ofertas")
        .select("id, nome, cliente_id")
        .eq("ativo", true)
        .order("nome");
      if (error) throw error;
      return data ?? [];
    },
  });
}

/** Cria um item de cadastro (ou uma oferta) e devolve o registro criado. */
export async function criarCadastro(tabela: TabelaCadastro | "ofertas", nome: string) {
  if (tabela === "ofertas") {
    const { data, error } = await supabase
      .from("ofertas")
      .insert({ nome })
      .select("id, nome")
      .single();
    if (error) throw error;
    return data;
  }
  const { data, error } = await supabase
    .from(tabela)
    .insert({ nome })
    .select("id, nome")
    .single();
  if (error) throw error;
  return data;
}

export function ListaCadastro({
  tabela,
  titulo,
  ajuda,
}: {
  tabela: TabelaCadastro;
  titulo: string;
  ajuda: string;
}) {
  const qc = useQueryClient();
  const { data } = useCadastro(tabela, false);
  const [novo, setNovo] = useState("");

  function recarregar() {
    qc.invalidateQueries({ queryKey: ["cadastro", tabela] });
  }

  async function criar() {
    if (!novo.trim()) return;
    const ordem = (data ?? []).length + 1;
    const { error } = await supabase.from(tabela).insert({ nome: novo.trim(), ordem });
    if (error) {
      toast.error("Não foi possível salvar.");
      return;
    }
    setNovo("");
    recarregar();
  }

  async function atualizar(id: string, campos: Partial<Item>) {
    const { error } = await supabase.from(tabela).update(campos).eq("id", id);
    if (error) toast.error("Não foi possível salvar.");
    else recarregar();
  }

  async function remover(id: string) {
    const { error } = await supabase.from(tabela).delete().eq("id", id);
    if (error) toast.error("Não foi possível remover.");
    else recarregar();
  }

  return (
    <div className="card-cx space-y-3 p-5">
      <div>
        <h3 className="text-lg">{titulo}</h3>
        <p className="text-xs text-muted-foreground">{ajuda}</p>
      </div>
      <div className="flex gap-2">
        <Input
          value={novo}
          placeholder={`Adicionar em ${titulo.toLowerCase()}…`}
          onChange={(e) => setNovo(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              criar();
            }
          }}
        />
        <Button type="button" onClick={criar}>
          <Plus className="size-4" />
        </Button>
      </div>
      <div className="space-y-2">
        {(data ?? []).map((item) => (
          <div key={item.id} className="flex items-center gap-2">
            <Input
              defaultValue={item.nome}
              onBlur={(e) => {
                if (e.target.value !== item.nome) atualizar(item.id, { nome: e.target.value });
              }}
            />
            <Input
              type="number"
              defaultValue={item.ordem}
              className="w-20"
              onBlur={(e) => {
                const v = Number(e.target.value);
                if (v !== item.ordem) atualizar(item.id, { ordem: v });
              }}
            />
            <label className="flex items-center gap-1 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={item.ativo}
                onChange={(e) => atualizar(item.id, { ativo: e.target.checked })}
              />
              ativo
            </label>
            <Button type="button" variant="ghost" size="icon" onClick={() => remover(item.id)}>
              <Trash2 className="size-4" />
            </Button>
          </div>
        ))}
        {!data?.length && <p className="text-sm text-muted-foreground">Nada cadastrado ainda.</p>}
      </div>
    </div>
  );
}

export function ListaProdutos() {
  const qc = useQueryClient();
  const [novo, setNovo] = useState("");
  const clientes = useCadastro("clientes", false).data;
  const { data } = useQuery({
    queryKey: ["ofertas-todas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ofertas")
        .select("id, nome, ativo, cliente_id")
        .order("nome");
      if (error) throw error;
      return data ?? [];
    },
  });

  function recarregar() {
    qc.invalidateQueries({ queryKey: ["ofertas-todas"] });
    qc.invalidateQueries({ queryKey: ["ofertas-ativas"] });
  }

  async function criar() {
    if (!novo.trim()) return;
    const { error } = await supabase.from("ofertas").insert({ nome: novo.trim() });
    if (error) {
      toast.error("Não foi possível salvar.");
      return;
    }
    setNovo("");
    recarregar();
  }

  async function atualizar(
    id: string,
    campos: { nome?: string; ativo?: boolean; cliente_id?: string | null },
  ) {
    const { error } = await supabase.from("ofertas").update(campos).eq("id", id);
    if (error) toast.error("Não foi possível salvar.");
    else recarregar();
  }

  return (
    <div className="card-cx space-y-3 p-5">
      <div>
        <h3 className="text-lg">Produtos / ofertas</h3>
        <p className="text-xs text-muted-foreground">
          Crie aqui o nome do produto. Os detalhes (preço, garantia, diferenciais) ficam na aba
          Ofertas.
        </p>
      </div>
      <div className="flex gap-2">
        <Input
          value={novo}
          placeholder="Adicionar produto…"
          onChange={(e) => setNovo(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              criar();
            }
          }}
        />
        <Button type="button" onClick={criar}>
          <Plus className="size-4" />
        </Button>
      </div>
      <div className="space-y-2">
        {(data ?? []).map((o) => (
          <div key={o.id} className="flex items-center gap-2">
            <Input
              defaultValue={o.nome}
              onBlur={(e) => {
                if (e.target.value !== o.nome) atualizar(o.id, { nome: e.target.value });
              }}
            />
            <select
              value={o.cliente_id ?? ""}
              onChange={(e) => atualizar(o.id, { cliente_id: e.target.value || null })}
              className="h-10 w-48 rounded-md border border-input bg-input px-2 text-sm"
            >
              <option value="">Sem cliente</option>
              {(clientes ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </select>
            <label className="flex items-center gap-1 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={o.ativo}
                onChange={(e) => atualizar(o.id, { ativo: e.target.checked })}
              />
              ativo
            </label>
          </div>
        ))}
        {!data?.length && <p className="text-sm text-muted-foreground">Nada cadastrado ainda.</p>}
      </div>
    </div>
  );
}

function Equipe() {
  const qc = useQueryClient();
  const [form, setForm] = useState({ nome: "", email: "", role: "closer" });

  const { data: pessoas } = useQuery({
    queryKey: ["equipe-com-papel"],
    queryFn: async () => {
      const [{ data: profiles, error: e1 }, { data: papeis, error: e2 }] = await Promise.all([
        supabase.from("profiles").select("id, nome").order("nome"),
        supabase.from("user_roles").select("user_id, role"),
      ]);
      if (e1) throw e1;
      if (e2) throw e2;
      return (profiles ?? []).map((p) => ({
        ...p,
        role: (papeis ?? []).find((r) => r.user_id === p.id)?.role ?? "—",
      }));
    },
  });

  const { data: convites } = useQuery({
    queryKey: ["convites"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("convites")
        .select("id, nome, email, role, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const convidar = useMutation({
    mutationFn: async () =>
      convidarMembro({
        data: {
          nome: form.nome.trim(),
          email: form.email.trim(),
          role: form.role as "lider" | "closer" | "sdr",
          redirectTo: window.location.origin,
        },
      }),
    onSuccess: () => {
      toast.success("Convite enviado por e-mail.");
      setForm({ nome: "", email: "", role: "closer" });
      qc.invalidateQueries({ queryKey: ["convites"] });
    },
    onError: (e: Error) => toast.error(e.message || "Não foi possível enviar o convite."),
  });

  return (
    <div className="card-cx space-y-4 p-5 lg:col-span-2">
      <div>
        <h3 className="text-lg">Equipe</h3>
        <p className="text-xs text-muted-foreground">
          Convide por e-mail. A pessoa cria a senha e passa a aparecer nos campos Closer e SDR da
          nova call. Somente o administrador pode convidar.
        </p>
      </div>

      <form
        className="grid gap-3 sm:grid-cols-[1fr_1fr_auto_auto] sm:items-end"
        onSubmit={(e) => {
          e.preventDefault();
          if (!form.nome.trim() || !form.email.trim()) return;
          convidar.mutate();
        }}
      >
        <div className="space-y-1">
          <Label htmlFor="convite-nome">Nome</Label>
          <Input
            id="convite-nome"
            value={form.nome}
            onChange={(e) => setForm({ ...form, nome: e.target.value })}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="convite-email">E-mail</Label>
          <Input
            id="convite-email"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="convite-papel">Papel</Label>
          <select
            id="convite-papel"
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
            className="h-10 w-full rounded-md border border-input bg-input px-3 text-sm"
          >
            <option value="lider">Líder</option>
            <option value="closer">Closer</option>
            <option value="sdr">SDR</option>
          </select>
        </div>
        <Button type="submit" disabled={convidar.isPending}>
          <Mail className="mr-2 size-4" />
          {convidar.isPending ? "Enviando…" : "Convidar"}
        </Button>
      </form>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <p className="mb-2 text-xs uppercase tracking-widest text-muted-foreground">Com acesso</p>
          <ul className="space-y-1 text-sm">
            {(pessoas ?? []).map((p) => (
              <li key={p.id} className="flex justify-between border-b border-border/40 py-1">
                <span>{p.nome}</span>
                <span className="text-muted-foreground">{p.role}</span>
              </li>
            ))}
            {!pessoas?.length && <li className="text-muted-foreground">Ninguém ainda.</li>}
          </ul>
        </div>
        <div>
          <p className="mb-2 text-xs uppercase tracking-widest text-muted-foreground">
            Convites enviados
          </p>
          <ul className="space-y-1 text-sm">
            {(convites ?? []).map((c) => (
              <li key={c.id} className="flex justify-between border-b border-border/40 py-1">
                <span>{c.email}</span>
                <span className="text-muted-foreground">{c.role}</span>
              </li>
            ))}
            {!convites?.length && <li className="text-muted-foreground">Nenhum convite ainda.</li>}
          </ul>
        </div>
      </div>
    </div>
  );
}

const CATEGORIAS_QUALIFICACAO = [
  { valor: "momento", rotulo: "Momento" },
  { valor: "autoridade", rotulo: "Autoridade" },
  { valor: "dor", rotulo: "Dor" },
  { valor: "orcamento", rotulo: "Orçamento" },
  { valor: "fit", rotulo: "Fit" },
  { valor: "urgencia", rotulo: "Urgência" },
] as const;

const selectClass = "h-10 w-full rounded-md border border-input bg-input px-3 text-sm";

type Heranca = {
  id: string;
  oferta_id: string | null;
  oculto: boolean;
  base_id: string | null;
};

// Itens gerais (oferta_id null) servem de base; o produto pode personalizar ou ocultar cada um.
function mesclarHeranca<T extends Heranca>(linhas: T[], ofertaId: string | null) {
  const doProduto = ofertaId ? linhas.filter((l) => l.oferta_id === ofertaId) : [];
  const substituidos = new Set(doProduto.map((l) => l.base_id).filter(Boolean) as string[]);
  const globais = linhas.filter((l) => l.oferta_id === null && !substituidos.has(l.id));
  return [...globais, ...doProduto];
}

function Etiqueta({ proprio }: { proprio: boolean }) {
  return proprio ? (
    <span className="rounded border border-primary/40 bg-primary/10 px-2 py-0.5 text-[11px] text-primary">
      Personalizado deste produto
    </span>
  ) : (
    <span className="rounded border border-border bg-secondary px-2 py-0.5 text-[11px] text-muted-foreground">
      Padrão
    </span>
  );
}

type PerguntaQualificacao = Heranca & {
  categoria: string;
  pergunta: string;
  o_que_identificar: string;
  pergunta_followup: string | null;
  ativo: boolean;
  ordem: number;
};

function PerguntasQualificacao({ ofertaId }: { ofertaId: string | null }) {
  const qc = useQueryClient();
  const [nova, setNova] = useState({ categoria: "momento", pergunta: "" });
  const { data } = useQuery({
    queryKey: ["perguntas-qualificacao"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("perguntas_qualificacao")
        .select("*")
        .order("ordem")
        .order("pergunta");
      if (error) throw error;
      return (data ?? []) as PerguntaQualificacao[];
    },
  });

  const lista = mesclarHeranca(data ?? [], ofertaId);

  function recarregar() {
    qc.invalidateQueries({ queryKey: ["perguntas-qualificacao"] });
  }

  async function criar() {
    if (!nova.pergunta.trim()) return;
    const ordem = lista.length + 1;
    const { error } = await supabase.from("perguntas_qualificacao").insert({
      categoria: nova.categoria,
      pergunta: nova.pergunta.trim(),
      ordem,
      oferta_id: ofertaId,
    });
    if (error) {
      toast.error("Não foi possível salvar.");
      return;
    }
    setNova({ categoria: "momento", pergunta: "" });
    recarregar();
  }

  // Ao editar um item padrão dentro de um produto, cria-se uma cópia exclusiva do produto.
  async function atualizar(p: PerguntaQualificacao, campos: Partial<PerguntaQualificacao>) {
    if (ofertaId && p.oferta_id === null) {
      const { id, ...resto } = p;
      const { error } = await supabase
        .from("perguntas_qualificacao")
        .insert({ ...resto, ...campos, oferta_id: ofertaId, base_id: id, oculto: false });
      if (error) toast.error("Não foi possível salvar.");
      else recarregar();
      return;
    }
    const { error } = await supabase
      .from("perguntas_qualificacao")
      .update(campos)
      .eq("id", p.id);
    if (error) toast.error("Não foi possível salvar.");
    else recarregar();
  }

  async function remover(p: PerguntaQualificacao) {
    if (ofertaId && p.oferta_id === null) {
      const { id, ...resto } = p;
      const { error } = await supabase
        .from("perguntas_qualificacao")
        .insert({ ...resto, oferta_id: ofertaId, base_id: id, oculto: true });
      if (error) toast.error("Não foi possível remover.");
      else recarregar();
      return;
    }
    const { error } = await supabase.from("perguntas_qualificacao").delete().eq("id", p.id);
    if (error) toast.error("Não foi possível remover.");
    else recarregar();
  }

  async function voltarAoPadrao(p: PerguntaQualificacao) {
    const { error } = await supabase.from("perguntas_qualificacao").delete().eq("id", p.id);
    if (error) toast.error("Não foi possível restaurar.");
    else recarregar();
  }

  return (
    <div className="card-cx space-y-3 p-5 lg:col-span-2">
      <div>
        <h3 className="text-lg">Perguntas de qualificação</h3>
        <p className="text-xs text-muted-foreground">
          Perguntas que o SDR faz para qualificar o lead, agrupadas por categoria.
        </p>
      </div>
      <div className="flex gap-2">
        <select
          value={nova.categoria}
          onChange={(e) => setNova({ ...nova, categoria: e.target.value })}
          className={`${selectClass} w-44`}
        >
          {CATEGORIAS_QUALIFICACAO.map((c) => (
            <option key={c.valor} value={c.valor}>
              {c.rotulo}
            </option>
          ))}
        </select>
        <Input
          value={nova.pergunta}
          placeholder="Adicionar pergunta…"
          onChange={(e) => setNova({ ...nova, pergunta: e.target.value })}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              criar();
            }
          }}
        />
        <Button type="button" onClick={criar}>
          <Plus className="size-4" />
        </Button>
      </div>
      <div className="space-y-3">
        {lista.map((p) =>
          p.oculto ? (
            <div
              key={p.id}
              className="flex items-center gap-3 rounded-md bg-secondary/20 p-3 text-sm text-muted-foreground"
            >
              <span className="line-through">{p.pergunta}</span>
              <span className="text-xs">removida neste produto</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="ml-auto"
                onClick={() => voltarAoPadrao(p)}
              >
                Restaurar
              </Button>
            </div>
          ) : (
            <div key={p.id} className="space-y-2 rounded-md bg-secondary/40 p-3">
              {ofertaId && (
                <div className="flex items-center gap-2">
                  <Etiqueta proprio={p.oferta_id !== null} />
                  {p.base_id && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => voltarAoPadrao(p)}
                    >
                      Voltar ao padrão
                    </Button>
                  )}
                </div>
              )}
              <div className="flex items-center gap-2">
                <select
                  value={p.categoria}
                  onChange={(e) => atualizar(p, { categoria: e.target.value })}
                  className={`${selectClass} w-40`}
                >
                  {CATEGORIAS_QUALIFICACAO.map((c) => (
                    <option key={c.valor} value={c.valor}>
                      {c.rotulo}
                    </option>
                  ))}
                </select>
                <Input
                  defaultValue={p.pergunta}
                  onBlur={(e) => {
                    if (e.target.value !== p.pergunta) atualizar(p, { pergunta: e.target.value });
                  }}
                />
                <Input
                  type="number"
                  defaultValue={p.ordem}
                  className="w-20"
                  onBlur={(e) => {
                    const v = Number(e.target.value);
                    if (v !== p.ordem) atualizar(p, { ordem: v });
                  }}
                />
                <label className="flex items-center gap-1 text-xs text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={p.ativo}
                    onChange={(e) => atualizar(p, { ativo: e.target.checked })}
                  />
                  ativo
                </label>
                <Button type="button" variant="ghost" size="icon" onClick={() => remover(p)}>
                  <Trash2 className="size-4" />
                </Button>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <Input
                  defaultValue={p.o_que_identificar}
                  placeholder="O que identificar com a resposta…"
                  onBlur={(e) => {
                    if (e.target.value !== p.o_que_identificar)
                      atualizar(p, { o_que_identificar: e.target.value });
                  }}
                />
                <Input
                  defaultValue={p.pergunta_followup ?? ""}
                  placeholder="Pergunta de follow-up (opcional)…"
                  onBlur={(e) => {
                    if (e.target.value !== (p.pergunta_followup ?? ""))
                      atualizar(p, { pergunta_followup: e.target.value || null });
                  }}
                />
              </div>
            </div>
          ),
        )}
        {!lista.length && <p className="text-sm text-muted-foreground">Nada cadastrado ainda.</p>}
      </div>
    </div>
  );
}

type CriterioQualificacao = Heranca & {
  criterio: string;
  como_identificar: string;
  peso: number;
  ativo: boolean;
};

function CriteriosQualificacao({ ofertaId }: { ofertaId: string | null }) {
  const qc = useQueryClient();
  const [novo, setNovo] = useState("");
  const { data } = useQuery({
    queryKey: ["criterios-qualificacao"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("criterios_qualificacao")
        .select("*")
        .order("peso", { ascending: false })
        .order("criterio");
      if (error) throw error;
      return (data ?? []) as CriterioQualificacao[];
    },
  });

  const lista = mesclarHeranca(data ?? [], ofertaId);

  function recarregar() {
    qc.invalidateQueries({ queryKey: ["criterios-qualificacao"] });
  }

  async function criar() {
    if (!novo.trim()) return;
    const { error } = await supabase
      .from("criterios_qualificacao")
      .insert({ criterio: novo.trim(), oferta_id: ofertaId });
    if (error) {
      toast.error("Não foi possível salvar.");
      return;
    }
    setNovo("");
    recarregar();
  }

  async function atualizar(c: CriterioQualificacao, campos: Partial<CriterioQualificacao>) {
    if (ofertaId && c.oferta_id === null) {
      const { id, ...resto } = c;
      const { error } = await supabase
        .from("criterios_qualificacao")
        .insert({ ...resto, ...campos, oferta_id: ofertaId, base_id: id, oculto: false });
      if (error) toast.error("Não foi possível salvar.");
      else recarregar();
      return;
    }
    const { error } = await supabase.from("criterios_qualificacao").update(campos).eq("id", c.id);
    if (error) toast.error("Não foi possível salvar.");
    else recarregar();
  }

  async function remover(c: CriterioQualificacao) {
    if (ofertaId && c.oferta_id === null) {
      const { id, ...resto } = c;
      const { error } = await supabase
        .from("criterios_qualificacao")
        .insert({ ...resto, oferta_id: ofertaId, base_id: id, oculto: true });
      if (error) toast.error("Não foi possível remover.");
      else recarregar();
      return;
    }
    const { error } = await supabase.from("criterios_qualificacao").delete().eq("id", c.id);
    if (error) toast.error("Não foi possível remover.");
    else recarregar();
  }

  async function voltarAoPadrao(c: CriterioQualificacao) {
    const { error } = await supabase.from("criterios_qualificacao").delete().eq("id", c.id);
    if (error) toast.error("Não foi possível restaurar.");
    else recarregar();
  }

  return (
    <div className="card-cx space-y-3 p-5 lg:col-span-2">
      <div>
        <h3 className="text-lg">Critérios de qualificação</h3>
        <p className="text-xs text-muted-foreground">
          O que define um lead qualificado. O peso indica a importância de cada critério.
        </p>
      </div>
      <div className="flex gap-2">
        <Input
          value={novo}
          placeholder="Adicionar critério…"
          onChange={(e) => setNovo(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              criar();
            }
          }}
        />
        <Button type="button" onClick={criar}>
          <Plus className="size-4" />
        </Button>
      </div>
      <div className="space-y-3">
        {lista.map((c) =>
          c.oculto ? (
            <div
              key={c.id}
              className="flex items-center gap-3 rounded-md bg-secondary/20 p-3 text-sm text-muted-foreground"
            >
              <span className="line-through">{c.criterio}</span>
              <span className="text-xs">removido neste produto</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="ml-auto"
                onClick={() => voltarAoPadrao(c)}
              >
                Restaurar
              </Button>
            </div>
          ) : (
            <div key={c.id} className="space-y-2 rounded-md bg-secondary/40 p-3">
              {ofertaId && (
                <div className="flex items-center gap-2">
                  <Etiqueta proprio={c.oferta_id !== null} />
                  {c.base_id && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => voltarAoPadrao(c)}
                    >
                      Voltar ao padrão
                    </Button>
                  )}
                </div>
              )}
              <div className="flex items-center gap-2">
                <Input
                  defaultValue={c.criterio}
                  onBlur={(e) => {
                    if (e.target.value !== c.criterio) atualizar(c, { criterio: e.target.value });
                  }}
                />
                <Input
                  type="number"
                  defaultValue={c.peso}
                  className="w-20"
                  title="Peso"
                  onBlur={(e) => {
                    const v = Number(e.target.value);
                    if (v !== c.peso) atualizar(c, { peso: v });
                  }}
                />
                <label className="flex items-center gap-1 text-xs text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={c.ativo}
                    onChange={(e) => atualizar(c, { ativo: e.target.checked })}
                  />
                  ativo
                </label>
                <Button type="button" variant="ghost" size="icon" onClick={() => remover(c)}>
                  <Trash2 className="size-4" />
                </Button>
              </div>
              <Input
                defaultValue={c.como_identificar}
                placeholder="Como identificar na conversa…"
                onBlur={(e) => {
                  if (e.target.value !== c.como_identificar)
                    atualizar(c, { como_identificar: e.target.value });
                }}
              />
            </div>
          ),
        )}
        {!lista.length && <p className="text-sm text-muted-foreground">Nada cadastrado ainda.</p>}
      </div>
    </div>
  );
}

export function Qualificacao({ ofertaId = null }: { ofertaId?: string | null }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <PerguntasQualificacao ofertaId={ofertaId} />
      <CriteriosQualificacao ofertaId={ofertaId} />
    </div>
  );
}

export function Cadastros() {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {CADASTROS.map((c) => (
        <ListaCadastro key={c.tabela} {...c} />
      ))}
      <ListaProdutos />
      <Equipe />
    </div>
  );
}
