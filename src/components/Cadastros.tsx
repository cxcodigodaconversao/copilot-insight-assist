import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Trash2, Mail } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { convidarMembro } from "@/lib/equipe.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type TabelaCadastro = "times" | "origens" | "funis" | "clientes";

export const CADASTROS: Array<{ tabela: TabelaCadastro; titulo: string; ajuda: string }> = [
  { tabela: "clientes", titulo: "Clientes", ajuda: "Clientes/empresas donas da oferta." },
  { tabela: "times", titulo: "Times", ajuda: "Times comerciais responsáveis pelas calls." },
  { tabela: "funis", titulo: "Funis", ajuda: "Funis de captação." },
  { tabela: "origens", titulo: "Origens", ajuda: "De onde o lead veio." },
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
        .select("id, nome")
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

function ListaCadastro({
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

function ListaProdutos() {
  const qc = useQueryClient();
  const [novo, setNovo] = useState("");
  const { data } = useQuery({
    queryKey: ["ofertas-todas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ofertas")
        .select("id, nome, ativo")
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

  async function atualizar(id: string, campos: { nome?: string; ativo?: boolean }) {
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
