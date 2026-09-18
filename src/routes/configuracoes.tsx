import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { KeyRound, Mail, Trash2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CADASTROS, ListaCadastro, ListaProdutos } from "@/components/Cadastros";
import {
  alterarPapel,
  alternarAtivo,
  convidarMembro,
  criarUsuario,
  definirSenha,
  excluirUsuario,
} from "@/lib/equipe.functions";

export const Route = createFileRoute("/configuracoes")({
  head: () => ({
    meta: [
      { title: "Configurações — Copiloto CX" },
      {
        name: "description",
        content: "Cadastro de usuários, clientes, produtos, times, closers, SDRs e origens.",
      },
      { property: "og:title", content: "Configurações — Copiloto CX" },
      {
        property: "og:description",
        content: "Gerencie acessos e todos os cadastros do Copiloto CX.",
      },
    ],
  }),
  component: Configuracoes,
});

type Papel = "adm" | "lider" | "closer" | "sdr";

const PAPEIS: Array<{ valor: Papel; rotulo: string }> = [
  { valor: "adm", rotulo: "Administrador" },
  { valor: "lider", rotulo: "Líder" },
  { valor: "closer", rotulo: "Closer" },
  { valor: "sdr", rotulo: "SDR" },
];

const selectClass = "h-10 rounded-md border border-input bg-input px-3 text-sm";

function Usuarios() {
  const qc = useQueryClient();
  const [form, setForm] = useState({ nome: "", email: "", senha: "", role: "closer" as Papel });
  const [novaSenha, setNovaSenha] = useState<{ id: string; valor: string } | null>(null);

  const { data: pessoas } = useQuery({
    queryKey: ["usuarios-com-papel"],
    queryFn: async () => {
      const [{ data: profiles, error: e1 }, { data: papeis, error: e2 }] = await Promise.all([
        supabase.from("profiles").select("id, nome, email, ativo").order("nome"),
        supabase.from("user_roles").select("user_id, role"),
      ]);
      if (e1) throw e1;
      if (e2) throw e2;
      return (profiles ?? []).map((p) => ({
        ...p,
        role: ((papeis ?? []).find((r) => r.user_id === p.id)?.role ?? "closer") as Papel,
      }));
    },
  });

  function recarregar() {
    qc.invalidateQueries({ queryKey: ["usuarios-com-papel"] });
  }

  const criar = useMutation({
    mutationFn: async () =>
      criarUsuario({
        data: {
          nome: form.nome.trim(),
          email: form.email.trim(),
          senha: form.senha,
          role: form.role,
        },
      }),
    onSuccess: () => {
      toast.success("Usuário criado. Informe a senha à pessoa.");
      setForm({ nome: "", email: "", senha: "", role: "closer" });
      recarregar();
    },
    onError: (e: Error) => toast.error(e.message || "Não foi possível criar o usuário."),
  });

  const convidar = useMutation({
    mutationFn: async () =>
      convidarMembro({
        data: {
          nome: form.nome.trim(),
          email: form.email.trim(),
          role: form.role,
          redirectTo: window.location.origin,
        },
      }),
    onSuccess: () => {
      toast.success("Convite enviado por e-mail.");
      setForm({ nome: "", email: "", senha: "", role: "closer" });
    },
    onError: (e: Error) => toast.error(e.message || "Não foi possível enviar o convite."),
  });

  async function trocarPapel(userId: string, role: Papel) {
    try {
      await alterarPapel({ data: { userId, role } });
      toast.success("Permissão alterada.");
      recarregar();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function trocarAtivo(userId: string, ativo: boolean) {
    try {
      await alternarAtivo({ data: { userId, ativo } });
      recarregar();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function salvarSenha() {
    if (!novaSenha || novaSenha.valor.length < 6) {
      toast.error("A senha precisa ter ao menos 6 caracteres.");
      return;
    }
    try {
      await definirSenha({ data: { userId: novaSenha.id, senha: novaSenha.valor } });
      toast.success("Senha redefinida.");
      setNovaSenha(null);
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function remover(userId: string, nome: string) {
    if (!confirm(`Excluir o acesso de ${nome}? Esta ação não pode ser desfeita.`)) return;
    try {
      await excluirUsuario({ data: { userId } });
      toast.success("Acesso removido.");
      recarregar();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  return (
    <div className="space-y-4">
      <div className="card-cx space-y-4 p-5">
        <div>
          <h3 className="text-lg">Novo usuário</h3>
          <p className="text-xs text-muted-foreground">
            Defina a senha na hora ou envie um convite por e-mail para a pessoa criar a dela.
          </p>
        </div>
        <form
          className="grid gap-3 sm:grid-cols-[1fr_1fr_1fr_auto_auto_auto] sm:items-end"
          onSubmit={(e) => {
            e.preventDefault();
            if (!form.nome.trim() || !form.email.trim() || form.senha.length < 6) {
              toast.error("Preencha nome, e-mail e uma senha de ao menos 6 caracteres.");
              return;
            }
            criar.mutate();
          }}
        >
          <div className="space-y-1">
            <Label htmlFor="u-nome">Nome</Label>
            <Input
              id="u-nome"
              value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="u-email">E-mail</Label>
            <Input
              id="u-email"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="u-senha">Senha</Label>
            <Input
              id="u-senha"
              type="text"
              value={form.senha}
              placeholder="mín. 6 caracteres"
              onChange={(e) => setForm({ ...form, senha: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="u-papel">Papel</Label>
            <select
              id="u-papel"
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value as Papel })}
              className={`${selectClass} w-full`}
            >
              {PAPEIS.map((p) => (
                <option key={p.valor} value={p.valor}>
                  {p.rotulo}
                </option>
              ))}
            </select>
          </div>
          <Button type="submit" disabled={criar.isPending}>
            <UserPlus className="mr-2 size-4" />
            {criar.isPending ? "Criando…" : "Criar"}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={convidar.isPending}
            onClick={() => {
              if (!form.nome.trim() || !form.email.trim()) {
                toast.error("Preencha nome e e-mail.");
                return;
              }
              convidar.mutate();
            }}
          >
            <Mail className="mr-2 size-4" />
            Convidar
          </Button>
        </form>
      </div>

      <div className="card-cx space-y-3 p-5">
        <h3 className="text-lg">Pessoas com acesso</h3>
        <div className="space-y-2">
          {(pessoas ?? []).map((p) => (
            <div
              key={p.id}
              className="flex flex-wrap items-center gap-3 border-b border-border/40 py-2 text-sm"
            >
              <div className="min-w-48 flex-1">
                <p>{p.nome || "(sem nome)"}</p>
                <p className="text-xs text-muted-foreground">{p.email}</p>
              </div>
              <select
                value={p.role}
                onChange={(e) => trocarPapel(p.id, e.target.value as Papel)}
                className={selectClass}
              >
                {PAPEIS.map((o) => (
                  <option key={o.valor} value={o.valor}>
                    {o.rotulo}
                  </option>
                ))}
              </select>
              <label className="flex items-center gap-1 text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  checked={p.ativo}
                  onChange={(e) => trocarAtivo(p.id, e.target.checked)}
                />
                ativo
              </label>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                title="Redefinir senha"
                onClick={() => setNovaSenha({ id: p.id, valor: "" })}
              >
                <KeyRound className="size-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                title="Excluir acesso"
                onClick={() => remover(p.id, p.nome)}
              >
                <Trash2 className="size-4" />
              </Button>
              {novaSenha?.id === p.id && (
                <div className="flex w-full gap-2">
                  <Input
                    autoFocus
                    value={novaSenha.valor}
                    placeholder="Nova senha (mín. 6)"
                    onChange={(e) => setNovaSenha({ id: p.id, valor: e.target.value })}
                  />
                  <Button type="button" onClick={salvarSenha}>
                    Salvar senha
                  </Button>
                  <Button type="button" variant="ghost" onClick={() => setNovaSenha(null)}>
                    Cancelar
                  </Button>
                </div>
              )}
            </div>
          ))}
          {!pessoas?.length && <p className="text-sm text-muted-foreground">Ninguém ainda.</p>}
        </div>
      </div>
    </div>
  );
}

function Configuracoes() {
  const { ehAdm } = useAuth();

  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="font-display text-3xl">Configurações</h1>
        <p className="text-sm text-muted-foreground">
          Gerencie acessos, clientes, produtos, times, closers, SDRs, funis e origens.
        </p>
      </div>

      {!ehAdm ? (
        <div className="card-cx p-6 text-sm text-muted-foreground">
          Esta área é exclusiva do administrador.
        </div>
      ) : (
        <Tabs defaultValue="usuarios" className="space-y-4">
          <TabsList className="flex flex-wrap">
            <TabsTrigger value="usuarios">Usuários</TabsTrigger>
            <TabsTrigger value="clientes">Clientes</TabsTrigger>
            <TabsTrigger value="produtos">Produtos</TabsTrigger>
            <TabsTrigger value="times">Times</TabsTrigger>
            <TabsTrigger value="closers_cadastro">Closers</TabsTrigger>
            <TabsTrigger value="sdrs_cadastro">SDRs</TabsTrigger>
            <TabsTrigger value="funis">Funis</TabsTrigger>
            <TabsTrigger value="origens">Origens</TabsTrigger>
          </TabsList>

          <TabsContent value="usuarios">
            <Usuarios />
          </TabsContent>
          <TabsContent value="produtos">
            <ListaProdutos />
          </TabsContent>
          {CADASTROS.map((c) => (
            <TabsContent key={c.tabela} value={c.tabela}>
              <ListaCadastro {...c} />
            </TabsContent>
          ))}
        </Tabs>
      )}
    </AppShell>
  );
}
