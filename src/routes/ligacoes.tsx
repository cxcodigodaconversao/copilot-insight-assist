import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCadastro } from "@/components/Cadastros";
import { ExcluirCall } from "@/components/ExcluirCall";

export const Route = createFileRoute("/ligacoes")({
  head: () => ({
    meta: [
      { title: "Ligações de qualificação — Copiloto CX" },
      {
        name: "description",
        content: "Ligações de SDR, taxa de agendamento e resultado de cada lead qualificado.",
      },
      { property: "og:title", content: "Ligações de qualificação — Copiloto CX" },
      { property: "og:description", content: "Ligações de SDR e taxa de agendamento." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Ligacoes,
});

const selectClass = "h-10 rounded-md border border-input bg-input px-3 text-sm";

const PERIODOS = [
  { valor: "", rotulo: "Qualquer período" },
  { valor: "hoje", rotulo: "Hoje" },
  { valor: "ontem", rotulo: "Ontem" },
  { valor: "7d", rotulo: "Últimos 7 dias" },
  { valor: "30d", rotulo: "Últimos 30 dias" },
  { valor: "mes", rotulo: "Mês atual" },
  { valor: "mes_anterior", rotulo: "Mês anterior" },
  { valor: "custom", rotulo: "Personalizado" },
];

function intervalo(periodo: string, de: string, ate: string): [Date, Date] | null {
  const agora = new Date();
  const inicioHoje = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
  const fimHoje = new Date(inicioHoje.getTime() + 86400000);
  switch (periodo) {
    case "hoje":
      return [inicioHoje, fimHoje];
    case "ontem":
      return [new Date(inicioHoje.getTime() - 86400000), inicioHoje];
    case "7d":
      return [new Date(inicioHoje.getTime() - 6 * 86400000), fimHoje];
    case "30d":
      return [new Date(inicioHoje.getTime() - 29 * 86400000), fimHoje];
    case "mes":
      return [
        new Date(agora.getFullYear(), agora.getMonth(), 1),
        new Date(agora.getFullYear(), agora.getMonth() + 1, 1),
      ];
    case "mes_anterior":
      return [
        new Date(agora.getFullYear(), agora.getMonth() - 1, 1),
        new Date(agora.getFullYear(), agora.getMonth(), 1),
      ];
    case "custom":
      if (!de && !ate) return null;
      return [
        de ? new Date(`${de}T00:00:00`) : new Date(0),
        ate ? new Date(new Date(`${ate}T00:00:00`).getTime() + 86400000) : new Date(8.64e15),
      ];
    default:
      return null;
  }
}

const RESULTADOS_SDR: Record<string, string> = {
  agendado: "Agendado",
  nao_qualificado: "Não qualificado",
  remarcar: "Remarcar",
  sem_resposta: "Sem resposta",
};

function Card({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="card-cx p-4">
      <p className="text-xs uppercase tracking-widest text-muted-foreground">{rotulo}</p>
      <p className="mt-2 text-2xl text-primary">{valor}</p>
    </div>
  );
}

const COLUNAS_CSV = [
  "time",
  "sdr",
  "cliente",
  "origem_lead",
  "produto",
  "funil",
  "nome_lead",
  "telefone_lead",
  "email_lead",
  "iniciada_em",
  "resultado_sdr",
  "observacoes",
] as const;

function Ligacoes() {
  const { podeVerTudo } = useAuth();
  const [busca, setBusca] = useState("");
  const [f, setF] = useState({
    time: "",
    sdr: "",
    cliente: "",
    origem: "",
    funil: "",
    resultado: "",
    periodo: "",
    de: "",
    ate: "",
  });

  const { data: ligacoes, isLoading } = useQuery({
    queryKey: ["ligacoes-sdr"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("calls")
        .select("*, ofertas(nome)")
        .eq("tipo", "sdr")
        .order("iniciada_em", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const times = useCadastro("times").data;
  const origens = useCadastro("origens").data;
  const funis = useCadastro("funis").data;
  const clientes = useCadastro("clientes").data;
  const sdrs = useCadastro("sdrs_cadastro").data;

  const filtradas = useMemo(() => {
    const faixa = intervalo(f.periodo, f.de, f.ate);
    return (ligacoes ?? []).filter((c) => {
      if (busca && !c.nome_lead.toLowerCase().includes(busca.toLowerCase())) return false;
      if (f.time && c.time !== f.time) return false;
      if (f.sdr && c.sdr_nome !== f.sdr) return false;
      if (f.cliente && c.cliente !== f.cliente) return false;
      if (f.origem && c.origem_lead !== f.origem) return false;
      if (f.funil && c.funil !== f.funil) return false;
      if (f.resultado && c.resultado_sdr !== f.resultado) return false;
      if (faixa) {
        const ref = new Date(c.iniciada_em);
        if (ref < faixa[0] || ref >= faixa[1]) return false;
      }
      return true;
    });
  }, [ligacoes, busca, f]);

  const kpis = useMemo(() => {
    const total = filtradas.length;
    const agendados = filtradas.filter((c) => c.resultado_sdr === "agendado").length;
    const desqualificados = filtradas.filter((c) => c.resultado_sdr === "nao_qualificado").length;
    const remarcar = filtradas.filter((c) => c.resultado_sdr === "remarcar").length;
    const pct = (n: number, d: number) => (d ? `${Math.round((n / d) * 100)}%` : "0%");
    return {
      total: String(total),
      agendados: String(agendados),
      taxa: pct(agendados, total),
      desqualificados: String(desqualificados),
      remarcar: String(remarcar),
    };
  }, [filtradas]);

  function exportarCsv() {
    const escapar = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const linhas = filtradas.map((c) =>
      [
        c.time,
        c.sdr_nome,
        c.cliente,
        c.origem_lead,
        c.ofertas?.nome ?? "",
        c.funil,
        c.nome_lead,
        c.telefone_lead,
        c.email_lead,
        c.iniciada_em,
        c.resultado_sdr ?? "",
        c.observacoes,
      ]
        .map(escapar)
        .join(","),
    );
    const csv = [COLUNAS_CSV.join(","), ...linhas].join("\n");
    const url = URL.createObjectURL(new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `ligacoes-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <AppShell>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h1 className="mr-auto text-2xl">
          {podeVerTudo ? "Todas as ligações (SDR)" : "Minhas ligações (SDR)"}
        </h1>
        <Button variant="outline" onClick={exportarCsv} disabled={!filtradas.length}>
          <Download className="size-4" /> Exportar CSV
        </Button>
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Card rotulo="Ligações" valor={kpis.total} />
        <Card rotulo="Agendadas" valor={kpis.agendados} />
        <Card rotulo="Taxa de agendamento" valor={kpis.taxa} />
        <Card rotulo="Não qualificados" valor={kpis.desqualificados} />
        <Card rotulo="A remarcar" valor={kpis.remarcar} />
      </div>

      <div className="mb-6 flex flex-wrap gap-3">
        <Input
          placeholder="Buscar lead…"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="w-44"
        />
        <select
          value={f.sdr}
          onChange={(e) => setF({ ...f, sdr: e.target.value })}
          className={selectClass}
        >
          <option value="">Todos os SDRs</option>
          {(sdrs ?? []).map((s) => (
            <option key={s.id} value={s.nome}>
              {s.nome}
            </option>
          ))}
        </select>
        <select
          value={f.time}
          onChange={(e) => setF({ ...f, time: e.target.value })}
          className={selectClass}
        >
          <option value="">Todos os times</option>
          {(times ?? []).map((t) => (
            <option key={t.id} value={t.nome}>
              {t.nome}
            </option>
          ))}
        </select>
        <select
          value={f.cliente}
          onChange={(e) => setF({ ...f, cliente: e.target.value })}
          className={selectClass}
        >
          <option value="">Todos os clientes</option>
          {(clientes ?? []).map((c) => (
            <option key={c.id} value={c.nome}>
              {c.nome}
            </option>
          ))}
        </select>
        <select
          value={f.origem}
          onChange={(e) => setF({ ...f, origem: e.target.value })}
          className={selectClass}
        >
          <option value="">Todas as origens</option>
          {(origens ?? []).map((o) => (
            <option key={o.id} value={o.nome}>
              {o.nome}
            </option>
          ))}
        </select>
        <select
          value={f.funil}
          onChange={(e) => setF({ ...f, funil: e.target.value })}
          className={selectClass}
        >
          <option value="">Todos os funis</option>
          {(funis ?? []).map((x) => (
            <option key={x.id} value={x.nome}>
              {x.nome}
            </option>
          ))}
        </select>
        <select
          value={f.resultado}
          onChange={(e) => setF({ ...f, resultado: e.target.value })}
          className={selectClass}
        >
          <option value="">Todos os resultados</option>
          {Object.entries(RESULTADOS_SDR).map(([v, r]) => (
            <option key={v} value={v}>
              {r}
            </option>
          ))}
        </select>
        <select
          value={f.periodo}
          onChange={(e) => setF({ ...f, periodo: e.target.value })}
          className={selectClass}
        >
          {PERIODOS.map((p) => (
            <option key={p.valor} value={p.valor}>
              {p.rotulo}
            </option>
          ))}
        </select>
        {f.periodo === "custom" && (
          <>
            <Input
              type="date"
              value={f.de}
              onChange={(e) => setF({ ...f, de: e.target.value })}
              className="w-40"
            />
            <Input
              type="date"
              value={f.ate}
              onChange={(e) => setF({ ...f, ate: e.target.value })}
              className="w-40"
            />
          </>
        )}
      </div>

      {isLoading && <p className="text-muted-foreground">Carregando…</p>}
      {!isLoading && filtradas.length === 0 && (
        <div className="card-cx p-10 text-center text-muted-foreground">
          Nenhuma ligação por aqui ainda.{" "}
          <Link to="/nova-ligacao" className="text-primary hover:underline">
            Começar uma agora
          </Link>
          .
        </div>
      )}

      <div className="grid gap-3">
        {filtradas.map((c) => (
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
            <span className="text-sm text-muted-foreground">{c.sdr_nome || "—"}</span>
            <span className="text-sm text-muted-foreground">{c.ofertas?.nome ?? "—"}</span>
            <span className="ml-auto flex flex-wrap items-center gap-2 text-xs">
              <span className="rounded-full bg-secondary px-3 py-1 text-primary">
                {c.resultado_sdr ? RESULTADOS_SDR[c.resultado_sdr] : "sem resultado"}
              </span>
              <span className="rounded-full bg-secondary px-3 py-1 text-muted-foreground">
                {c.encerrada_em ? "encerrada" : "em andamento"}
              </span>
            </span>
          </Link>
        ))}
      </div>
    </AppShell>
  );
}
