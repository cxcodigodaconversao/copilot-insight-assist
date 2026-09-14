import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Headphones } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Entrar — Copiloto CX" },
      {
        name: "description",
        content: "Acesse o Copiloto CX da Comercial 10X para conduzir suas reuniões de vendas.",
      },
      { property: "og:title", content: "Entrar — Copiloto CX" },
      {
        property: "og:description",
        content: "Acesse o Copiloto CX da Comercial 10X para conduzir suas reuniões de vendas.",
      },
    ],
  }),
  component: Login,
});

function Login() {
  const { session, carregando } = useAuth();
  const navigate = useNavigate();
  const [modo, setModo] = useState<"entrar" | "criar">("entrar");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [nome, setNome] = useState("");
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (!carregando && session) navigate({ to: "/calls" });
  }, [carregando, session, navigate]);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setEnviando(true);
    try {
      if (modo === "entrar") {
        const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
        if (error) throw error;
        navigate({ to: "/calls" });
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password: senha,
          options: {
            data: { nome },
            emailRedirectTo: `${window.location.origin}/calls`,
          },
        });
        if (error) throw error;
        if (data.session) navigate({ to: "/calls" });
        else toast.success("Conta criada. Confirme o e-mail para entrar.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível entrar.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <div className="flex size-12 items-center justify-center rounded-xl bg-secondary glow-gold">
            <Headphones className="size-6 text-primary" />
          </div>
          <h1 className="text-3xl">
            Copiloto <span className="text-primary">CX</span>
          </h1>
          <p className="text-sm text-muted-foreground">Comercial 10X · Código da Conversão</p>
        </div>

        <form onSubmit={enviar} className="card-cx space-y-4 p-6">
          {modo === "criar" && (
            <div className="space-y-2">
              <Label htmlFor="nome">Nome</Label>
              <Input id="nome" value={nome} onChange={(e) => setNome(e.target.value)} required />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="senha">Senha</Label>
            <Input
              id="senha"
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              required
              minLength={6}
            />
          </div>
          <Button type="submit" className="w-full" disabled={enviando}>
            {enviando ? "Aguarde…" : modo === "entrar" ? "Entrar" : "Criar conta"}
          </Button>
          <button
            type="button"
            onClick={() => setModo(modo === "entrar" ? "criar" : "entrar")}
            className="w-full text-center text-sm text-muted-foreground hover:text-primary"
          >
            {modo === "entrar" ? "Criar uma conta" : "Já tenho conta"}
          </button>
        </form>
      </div>
    </div>
  );
}
