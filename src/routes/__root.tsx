import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { Headphones } from "lucide-react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { AuthProvider } from "@/hooks/useAuth";
import { Toaster } from "@/components/ui/sonner";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-primary">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Página não encontrada</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          O endereço que você abriu não existe ou foi movido.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:opacity-90"
          >
            Voltar ao início
          </Link>
        </div>
      </div>
    </div>
  );
}

const CHAVE_RECARGA = "cx_recarga_versao";

function ehErroDeVersao(error: Error) {
  const texto = `${error?.name ?? ""} ${error?.message ?? ""}`.toLowerCase();
  return (
    texto.includes("dynamically imported module") ||
    texto.includes("failed to fetch dynamically") ||
    texto.includes("loading chunk") ||
    texto.includes("importing a module script failed") ||
    texto.includes("chunkloaderror")
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  const [verDetalhes, setVerDetalhes] = useState(false);

  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  // Versão nova publicada enquanto a página estava aberta: recarrega uma única vez.
  useEffect(() => {
    if (typeof window === "undefined" || !ehErroDeVersao(error)) return;
    if (sessionStorage.getItem(CHAVE_RECARGA)) return;
    sessionStorage.setItem(CHAVE_RECARGA, "1");
    window.location.reload();
  }, [error]);

  useEffect(() => {
    if (typeof window !== "undefined") sessionStorage.removeItem(CHAVE_RECARGA);
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="card-cx w-full max-w-md p-6 text-center">
        <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-xl bg-secondary glow-gold">
          <Headphones className="size-6 text-primary" />
        </div>
        <h1 className="font-display text-xl font-semibold tracking-tight text-foreground">
          Não foi possível carregar o Copiloto CX
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Recarregue a página. Se continuar assim, me envie os detalhes abaixo.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              if (typeof window !== "undefined") window.location.reload();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:opacity-90"
          >
            Recarregar
          </button>
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
          >
            Tentar de novo
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
          >
            Início
          </a>
        </div>
        <button
          onClick={() => setVerDetalhes((v) => !v)}
          className="mt-4 text-xs text-muted-foreground underline"
        >
          {verDetalhes ? "ocultar detalhes" : "ver detalhes"}
        </button>
        {verDetalhes && (
          <pre className="mt-3 max-h-48 overflow-auto rounded-md bg-secondary p-3 text-left text-xs text-muted-foreground">
            {error?.message ?? "Erro desconhecido"}
          </pre>
        )}
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Copiloto CX — Comercial 10X" },
      {
        name: "description",
        content:
          "Copiloto de vendas em tempo real: transcreve a reunião e sugere a próxima pergunta ao vendedor.",
      },
      { property: "og:title", content: "Copiloto CX — Comercial 10X" },
      {
        property: "og:description",
        content: "Sugestões ao vivo para closers e SDRs durante a reunião.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300..700&family=Outfit:wght@400;500;600;700&display=swap",
      },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR" className="dark">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
        <Outlet />
        <Toaster position="top-right" />
      </AuthProvider>
    </QueryClientProvider>
  );
}
