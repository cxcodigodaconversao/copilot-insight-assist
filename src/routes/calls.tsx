import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppShell } from "@/components/AppShell";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/calls")({
  head: () => ({
    meta: [
      { title: "Minhas calls — Copiloto CX" },
      { name: "description", content: "Histórico de reuniões, resumos e temperatura final." },
      { property: "og:title", content: "Minhas calls — Copiloto CX" },
      { property: "og:description", content: "Histórico de reuniões e resumos de cada call." },
    ],
  }),
  component: Calls,
});

type ResumoFinal = { temperatura_final?: string } | null;

function Calls() {
  const { papel } = useAuth();
  const [busca, setBusca] = useState("");
  const [oferta, setOferta] = useState("");
  const [temperatura, setTemperatura] = useState("");

  const { data: calls, isLoading } = useQuery({
    queryKey: ["calls"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("calls")
        .select("*, ofertas(nome), profiles:vendedor_id(nome)")
        .order("iniciada_em", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const filtradas = useMemo(() => {
    return (calls ?? []).filter((c) => {
      const resumo = c.resumo_final as ResumoFinal;
      const temp = resumo?.temperatura_final ?? "";
      return (
        (!busca || c.nome_lead.toLowerCase().includes(busca.toLowerCase())) &&
        (!oferta || c.ofertas?.nome === oferta) &&
        (!temperatura || temp === temperatura)
      );
    });
  }, [calls, busca, oferta, temperatura]);

  const ofertas = Array.from(new Set((calls ?? []).map((c) => c.ofertas?.nome).filter(Boolean)));

  return (
    <AppShell>
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <h1 className="mr-auto text-2xl">{papel === "lider" ? "Todas as calls" : "Minhas calls"}</h1>
        <Input
          placeholder="Buscar lead…"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="w-48"
        />
        <select
          value={oferta}
          onChange={(e) => setOferta(e.target.value)}
          className="h-10 rounded-md border border-input bg-input px-3 text-sm"
        >
          <option value="">Todas as ofertas</option>
          {ofertas.map((o) => (
            <option key={o} value={o!}>
              {o}
            </option>
          ))}
        </select>
        <select
          value={temperatura}
          onChange={(e) => setTemperatura(e.target.value)}
          className="h-10 rounded-md border border-input bg-input px-3 text-sm"
        >
          <option value="">Qualquer temperatura</option>
          <option value="frio">Frio</option>
          <option value="morno">Morno</option>
          <option value="quente">Quente</option>
        </select>
      </div>

      {isLoading && <p className="text-muted-foreground">Carregando…</p>}
      {!isLoading && filtradas.length === 0 && (
        <div className="card-cx p-10 text-center text-muted-foreground">
          Nenhuma call por aqui ainda.{" "}
          <Link to="/nova-call" className="text-primary hover:underline">
            Começar uma agora
          </Link>
          .
        </div>
      )}

      <div className="grid gap-3">
        {filtradas.map((c) => {
          const resumo = c.resumo_final as ResumoFinal;
          const temp = resumo?.temperatura_final;
          return (
            <Link
              key={c.id}
              to={c.encerrada_em ? "/pos-call/$callId" : "/call/$callId"}
              params={{ callId: c.id }}
              className="card-cx flex flex-wrap items-center gap-4 p-4 transition-colors hover:border-primary/50"
            >
              <div className="min-w-48">
                <p className="font-medium">{c.nome_lead || "Sem nome"}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(c.iniciada_em).toLocaleString("pt-BR")}
                </p>
              </div>
              <span className="text-sm text-muted-foreground">{c.ofertas?.nome ?? "—"}</span>
              <span className="text-sm text-muted-foreground">{c.profiles?.nome ?? ""}</span>
              <span className="ml-auto flex items-center gap-2 text-xs">
                {temp && (
                  <span className="rounded-full bg-secondary px-3 py-1 uppercase text-primary">
                    {temp}
                  </span>
                )}
                <span className="rounded-full bg-secondary px-3 py-1 text-muted-foreground">
                  {c.encerrada_em ? "encerrada" : "em andamento"}
                </span>
              </span>
            </Link>
          );
        })}
      </div>
    </AppShell>
  );
}
