import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Copy, Download } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/pos-call/$callId")({
  head: () => ({
    meta: [
      { title: "Resumo da call — Copiloto CX" },
      { name: "description", content: "Resumo, perfil DISC final, objeções e próximos passos." },
      { property: "og:title", content: "Resumo da call — Copiloto CX" },
      { property: "og:description", content: "Resumo, objeções tratadas e próximos passos." },
    ],
  }),
  component: PosCall,
});

type Resumo = {
  resumo?: string;
  perfil_disc_final?: string;
  objecoes_surgidas?: Array<{ objecao?: string; como_foi_tratada?: string }>;
  pontos_fortes_vendedor?: string[];
  pontos_a_melhorar?: string[];
  proximos_passos?: string[];
  temperatura_final?: string;
};

function Bloco({ titulo, itens }: { titulo: string; itens?: string[] | undefined }) {
  if (!itens?.length) return null;
  return (
    <div className="card-cx p-5">
      <h2 className="mb-3 text-sm uppercase tracking-widest text-muted-foreground">{titulo}</h2>
      <ul className="list-disc space-y-1 pl-5 text-sm">
        {itens.map((i, k) => (
          <li key={k}>{i}</li>
        ))}
      </ul>
    </div>
  );
}

function PosCall() {
  const { callId } = Route.useParams();
  const { data: call, isLoading } = useQuery({
    queryKey: ["call-resumo", callId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("calls")
        .select("*, ofertas(nome)")
        .eq("id", callId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const resumo = (call?.resumo_final ?? null) as Resumo | null;

  function copiar() {
    navigator.clipboard.writeText(JSON.stringify(resumo, null, 2));
    toast.success("Resumo copiado.");
  }

  function exportar() {
    const blob = new Blob([JSON.stringify(resumo, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `call-${callId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <AppShell>
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="mr-auto">
          <h1 className="text-2xl">{call?.nome_lead ?? "Resumo da call"}</h1>
          <p className="text-sm text-muted-foreground">{call?.ofertas?.nome}</p>
        </div>
        <Button variant="secondary" onClick={copiar} disabled={!resumo}>
          <Copy className="size-4" /> Copiar
        </Button>
        <Button variant="outline" onClick={exportar} disabled={!resumo}>
          <Download className="size-4" /> Exportar JSON
        </Button>
      </div>

      {isLoading && <p className="text-muted-foreground">Carregando…</p>}

      {!isLoading && !resumo && (
        <div className="card-cx p-10 text-center text-muted-foreground">
          Esta call ainda não tem resumo.{" "}
          <Link to="/calls" className="text-primary hover:underline">
            Voltar para a lista
          </Link>
        </div>
      )}

      {resumo && (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="card-cx p-5 lg:col-span-2">
            <h2 className="mb-3 text-sm uppercase tracking-widest text-muted-foreground">Resumo</h2>
            <p className="whitespace-pre-line text-sm">{resumo.resumo}</p>
            <div className="mt-4 flex gap-2">
              <span className="rounded-full bg-secondary px-3 py-1 text-xs uppercase text-primary">
                DISC {resumo.perfil_disc_final ?? "—"}
              </span>
              <span className="rounded-full bg-secondary px-3 py-1 text-xs uppercase text-primary">
                {resumo.temperatura_final ?? "—"}
              </span>
            </div>
          </div>

          {!!resumo.objecoes_surgidas?.length && (
            <div className="card-cx p-5 lg:col-span-2">
              <h2 className="mb-3 text-sm uppercase tracking-widest text-muted-foreground">
                Objeções que surgiram
              </h2>
              <div className="space-y-3">
                {resumo.objecoes_surgidas.map((o, k) => (
                  <div key={k} className="rounded-md bg-secondary/60 p-3 text-sm">
                    <p className="font-medium">{o.objecao}</p>
                    <p className="text-muted-foreground">{o.como_foi_tratada}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <Bloco titulo="O que funcionou" itens={resumo.pontos_fortes_vendedor} />
          <Bloco titulo="Pontos a melhorar" itens={resumo.pontos_a_melhorar} />
          <Bloco titulo="Próximos passos" itens={resumo.proximos_passos} />
        </div>
      )}
    </AppShell>
  );
}
