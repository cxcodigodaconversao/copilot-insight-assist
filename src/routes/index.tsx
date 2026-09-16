import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Headphones } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
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
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (!carregando && session) navigate({ to: "/calls" });
  }, [carregando, session, navigate]);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setEnviando(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
      if (error) throw error;
      navigate({ to: "/calls" });
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
            {enviando ? "Aguarde…" : "Entrar"}
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            O acesso é criado por convite do administrador.
          </p>
        </form>
      </div>
    </div>
  );
}
