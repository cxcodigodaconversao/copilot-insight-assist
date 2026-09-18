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

const moeda = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

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
  "closer",
  "sdr",
  "cliente",
  "origem_lead",
  "produto",
  "funil",
  "nome_lead",
  "telefone_lead",
  "email_lead",
  "data_reuniao_agendada",
  "status_reuniao",
  "resultado",
  "valor_vendido",
  "valor_coletado",
  "valor_pendente",
  "forma_pagamento",
  "observacoes",
] as const;

function Calls() {
  const { podeVerTudo } = useAuth();
  const [busca, setBusca] = useState("");
  const [f, setF] = useState({
    time: "",
    closer: "",
    sdr: "",
    cliente: "",
    origem: "",
    produto: "",
    funil: "",
    periodo: "",
    de: "",
    ate: "",
  });

  const qc = useQueryClient();
  const { data: calls, isLoading } = useQuery({
    queryKey: ["calls"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("calls")
        .select("*, ofertas(nome)")
        .neq("tipo", "sdr")
        .order("iniciada_em", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const times = useCadastro("times").data;
  const origens = useCadastro("origens").data;
  const funis = useCadastro("funis").data;
  const clientes = useCadastro("clientes").data;
  const closers = useCadastro("closers_cadastro").data;
  const sdrs = useCadastro("sdrs_cadastro").data;


  const filtradas = useMemo(() => {
    const faixa = intervalo(f.periodo, f.de, f.ate);
    return (calls ?? []).filter((c) => {
      if (busca && !c.nome_lead.toLowerCase().includes(busca.toLowerCase())) return false;
      if (f.time && c.time !== f.time) return false;
      if (f.closer && c.closer_nome !== f.closer) return false;
      if (f.sdr && c.sdr_nome !== f.sdr) return false;

      if (f.cliente && c.cliente !== f.cliente) return false;
      if (f.origem && c.origem_lead !== f.origem) return false;
      if (f.produto && c.oferta_id !== f.produto) return false;
      if (f.funil && c.funil !== f.funil) return false;
      if (faixa) {
        const ref = new Date(c.data_reuniao_agendada ?? c.iniciada_em);
        if (ref < faixa[0] || ref >= faixa[1]) return false;
      }
      return true;
    });
  }, [calls, busca, f]);

  const ofertas = useMemo(
    () =>
      Array.from(
        new Map(
          (calls ?? [])
            .filter((c) => c.oferta_id)
            .map((c) => [c.oferta_id!, c.ofertas?.nome ?? "—"]),
        ),
      ),
    [calls],
  );

  const kpis = useMemo(() => {
    const total = filtradas.length;
    const noShow = filtradas.filter((c) => c.status_reuniao === "no_show").length;
    const realizadas = filtradas.filter((c) => c.status_reuniao === "realizada").length;
    const vendas = filtradas.filter((c) => c.resultado === "venda").length;
    const pct = (n: number, d: number) => (d ? `${Math.round((n / d) * 100)}%` : "0%");
    return {
      agendadas: String(total),
      noShow: `${noShow} (${pct(noShow, total)})`,
      realizadas: `${realizadas} (${pct(realizadas, total)})`,
      conversao: pct(vendas, realizadas),
      vendido: moeda(filtradas.reduce((s, c) => s + Number(c.valor_vendido ?? 0), 0)),
      coletado: moeda(filtradas.reduce((s, c) => s + Number(c.valor_coletado ?? 0), 0)),
    };
  }, [filtradas]);

  function exportarCsv() {
    const escapar = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const linhas = filtradas.map((c) =>
      [
        c.time,
        c.closer_nome,
        c.sdr_nome,

        c.cliente,
        c.origem_lead,
        c.ofertas?.nome ?? "",
        c.funil,
        c.nome_lead,
        c.telefone_lead,
        c.email_lead,
        c.data_reuniao_agendada ?? "",
        c.status_reuniao,
        c.resultado,
        c.valor_vendido,
        c.valor_coletado,
        c.valor_pendente,
        c.forma_pagamento ?? "",
        c.observacoes,
      ]
        .map(escapar)
        .join(","),
    );
    const csv = [COLUNAS_CSV.join(","), ...linhas].join("\n");
    const url = URL.createObjectURL(new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `calls-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <AppShell>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h1 className="mr-auto text-2xl">
          {podeVerTudo ? "Todas as calls (Closer)" : "Minhas calls (Closer)"}
        </h1>

        <Button variant="outline" onClick={exportarCsv} disabled={!filtradas.length}>
          <Download className="size-4" /> Exportar CSV
        </Button>
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        <Card rotulo="Reuniões agendadas" valor={kpis.agendadas} />
        <Card rotulo="No-show" valor={kpis.noShow} />
        <Card rotulo="Calls realizadas" valor={kpis.realizadas} />
        <Card rotulo="Taxa de conversão" valor={kpis.conversao} />
        <Card rotulo="Valor vendido" valor={kpis.vendido} />
        <Card rotulo="Valor coletado" valor={kpis.coletado} />
      </div>

      <div className="mb-6 flex flex-wrap gap-3">
        <Input
          placeholder="Buscar lead…"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="w-44"
        />
        <select value={f.time} onChange={(e) => setF({ ...f, time: e.target.value })} className={selectClass}>
          <option value="">Todos os times</option>
          {(times ?? []).map((t) => (
            <option key={t.id} value={t.nome}>{t.nome}</option>
          ))}
        </select>
        <select value={f.closer} onChange={(e) => setF({ ...f, closer: e.target.value })} className={selectClass}>
          <option value="">Todos os closers</option>
          {(closers ?? []).map((p) => (
            <option key={p.id} value={p.nome}>{p.nome}</option>
          ))}
        </select>
        <select value={f.sdr} onChange={(e) => setF({ ...f, sdr: e.target.value })} className={selectClass}>
          <option value="">Todos os SDRs</option>
          {(sdrs ?? []).map((p) => (
            <option key={p.id} value={p.nome}>{p.nome}</option>
          ))}
        </select>

        <select value={f.cliente} onChange={(e) => setF({ ...f, cliente: e.target.value })} className={selectClass}>
          <option value="">Todos os clientes</option>
          {(clientes ?? []).map((c) => (
            <option key={c.id} value={c.nome}>{c.nome}</option>
          ))}
        </select>
        <select value={f.origem} onChange={(e) => setF({ ...f, origem: e.target.value })} className={selectClass}>
          <option value="">Todas as origens</option>
          {(origens ?? []).map((o) => (
            <option key={o.id} value={o.nome}>{o.nome}</option>
          ))}
        </select>
        <select value={f.produto} onChange={(e) => setF({ ...f, produto: e.target.value })} className={selectClass}>
          <option value="">Todos os produtos</option>
          {ofertas.map(([id, nome]) => (
            <option key={id} value={id}>{nome}</option>
          ))}
        </select>
        <select value={f.funil} onChange={(e) => setF({ ...f, funil: e.target.value })} className={selectClass}>
          <option value="">Todos os funis</option>
          {(funis ?? []).map((x) => (
            <option key={x.id} value={x.nome}>{x.nome}</option>
          ))}
        </select>
        <select value={f.periodo} onChange={(e) => setF({ ...f, periodo: e.target.value })} className={selectClass}>
          {PERIODOS.map((p) => (
            <option key={p.valor} value={p.valor}>{p.rotulo}</option>
          ))}
        </select>
        {f.periodo === "custom" && (
          <>
            <Input type="date" value={f.de} onChange={(e) => setF({ ...f, de: e.target.value })} className="w-40" />
            <Input type="date" value={f.ate} onChange={(e) => setF({ ...f, ate: e.target.value })} className="w-40" />
          </>
        )}
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
                  {new Date(c.data_reuniao_agendada ?? c.iniciada_em).toLocaleString("pt-BR")}
                </p>
              </div>
              <span className="text-sm text-muted-foreground">{c.ofertas?.nome ?? "—"}</span>
              <span className="text-sm text-muted-foreground">{c.cliente || "—"}</span>
              <span className="ml-auto flex flex-wrap items-center gap-2 text-xs">
                {Number(c.valor_vendido) > 0 && (
                  <span className="rounded-full bg-secondary px-3 py-1 text-primary">
                    {moeda(Number(c.valor_vendido))}
                  </span>
                )}
                {temp && (
                  <span className="rounded-full bg-secondary px-3 py-1 uppercase text-primary">
                    {temp}
                  </span>
                )}
                <span className="rounded-full bg-secondary px-3 py-1 text-muted-foreground">
                  {c.status_reuniao}
                </span>
                <span className="rounded-full bg-secondary px-3 py-1 text-muted-foreground">
                  {c.encerrada_em ? "encerrada" : "em andamento"}
                </span>
              </span>
              <ExcluirCall
                callId={c.id}
                nomeLead={c.nome_lead}
                rotulo="call"
                onExcluida={() => void qc.invalidateQueries({ queryKey: ["calls"] })}
              />
            </Link>
          );
        })}
      </div>
    </AppShell>
  );
}
