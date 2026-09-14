import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { Brain, Headphones, List, LogOut, Plus } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

const itens = [
  { to: "/calls", label: "Calls", icon: List },
  { to: "/nova-call", label: "Nova call", icon: Plus },
  { to: "/cerebro", label: "Cérebro CX", icon: Brain, somenteLider: true },
];

export function AppShell({ children }: { children: ReactNode }) {
  const { session, carregando, papel, nome, sair } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (!carregando && !session) navigate({ to: "/" });
  }, [carregando, session, navigate]);

  if (carregando || !session) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        Carregando…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 border-b border-border bg-sidebar/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-4">
          <Link to="/calls" className="flex items-center gap-2">
            <Headphones className="size-5 text-primary" />
            <span className="font-display text-lg font-semibold">
              Copiloto <span className="text-primary">CX</span>
            </span>
          </Link>
          <nav className="flex items-center gap-1">
            {itens
              .filter((i) => !i.somenteLider || papel === "lider")
              .map((i) => (
                <Link
                  key={i.to}
                  to={i.to}
                  className={cn(
                    "flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground",
                    pathname.startsWith(i.to) && "bg-secondary text-primary",
                  )}
                >
                  <i.icon className="size-4" />
                  {i.label}
                </Link>
              ))}
          </nav>
          <div className="ml-auto flex items-center gap-3 text-sm">
            <span className="text-muted-foreground">
              {nome} · <span className="uppercase text-primary">{papel}</span>
            </span>
            <button
              onClick={() => sair().then(() => navigate({ to: "/" }))}
              className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-muted-foreground transition-colors hover:text-foreground"
            >
              <LogOut className="size-4" />
              Sair
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8">{children}</main>
    </div>
  );
}
