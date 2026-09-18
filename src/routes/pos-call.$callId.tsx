import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Copy, Download } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

import { AppShell } from "@/components/AppShell";
import { ExcluirCall } from "@/components/ExcluirCall";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

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

type CallResultado = {
  id: string;
  tipo: string;
  status_reuniao: string;
  resultado: string;
  resultado_sdr: string | null;
  call_origem_id: string | null;
  data_reuniao_agendada: string | null;
  valor_vendido: number;
  valor_coletado: number;
  valor_pendente: number;
  forma_pagamento: string | null;
  observacoes: string;
};


const selectClass = "h-10 w-full rounded-md border border-input bg-input px-3 text-sm";

type CamposCall = Database["public"]["Tables"]["calls"]["Update"];

function useSalvarResultado(callId: string) {
  const qc = useQueryClient();
  const [salvando, setSalvando] = useState(false);
  async function salvar(campos: CamposCall) {
    setSalvando(true);
    const { error } = await supabase.from("calls").update(campos).eq("id", callId);

    setSalvando(false);
    if (error) {
      toast.error("Não foi possível salvar o resultado.");
      return;
    }
    toast.success("Resultado salvo.");
    qc.invalidateQueries({ queryKey: ["call-resumo", callId] });
    qc.invalidateQueries({ queryKey: ["calls"] });
    qc.invalidateQueries({ queryKey: ["ligacoes-sdr"] });
  }
  return { salvar, salvando };
}

/** Resultado de uma ligação de qualificação (SDR). */
function ResultadoSdr({ call }: { call: CallResultado }) {
  const { salvar, salvando } = useSalvarResultado(call.id);
  const [r, setR] = useState({
    resultado_sdr: call.resultado_sdr ?? "",
    data_reuniao_agendada: call.data_reuniao_agendada
      ? new Date(call.data_reuniao_agendada).toISOString().slice(0, 16)
      : "",
    observacoes: call.observacoes ?? "",
  });

  return (
    <div className="card-cx mb-4 space-y-4 p-5">
      <h2 className="text-sm uppercase tracking-widest text-muted-foreground">
        Resultado da ligação
      </h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="resultado-sdr">Resultado</Label>
          <select
            id="resultado-sdr"
            value={r.resultado_sdr}
            onChange={(e) => setR({ ...r, resultado_sdr: e.target.value })}
            className={selectClass}
          >
            <option value="">—</option>
            <option value="agendado">Agendado</option>
            <option value="nao_qualificado">Não qualificado</option>
            <option value="remarcar">Remarcar</option>
            <option value="sem_resposta">Sem resposta</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="agendada-sdr">Reunião agendada para</Label>
          <Input
            id="agendada-sdr"
            type="datetime-local"
            value={r.data_reuniao_agendada}
            onChange={(e) => setR({ ...r, data_reuniao_agendada: e.target.value })}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="obs-sdr">Observações</Label>
        <Textarea
          id="obs-sdr"
          rows={3}
          value={r.observacoes}
          onChange={(e) => setR({ ...r, observacoes: e.target.value })}
        />
      </div>
      <Button
        disabled={salvando}
        onClick={() =>
          salvar({
            resultado_sdr: r.resultado_sdr || null,
            data_reuniao_agendada: r.data_reuniao_agendada
              ? new Date(r.data_reuniao_agendada).toISOString()
              : null,
            observacoes: r.observacoes,
          })
        }
      >
        {salvando ? "Salvando…" : "Salvar resultado"}
      </Button>
    </div>
  );
}

/** Resultado de uma call de negociação (closer). */
function ResultadoCloser({ call }: { call: CallResultado }) {
  const { salvar, salvando } = useSalvarResultado(call.id);
  const [r, setR] = useState({
    status_reuniao: call.status_reuniao,
    resultado: call.resultado,
    call_origem_id: call.call_origem_id ?? "",
    valor_vendido: String(call.valor_vendido ?? 0),
    valor_coletado: String(call.valor_coletado ?? 0),
    valor_pendente: String(call.valor_pendente ?? 0),
    forma_pagamento: call.forma_pagamento ?? "",
    observacoes: call.observacoes ?? "",
  });

  const { data: ligacoesSdr } = useQuery({
    queryKey: ["ligacoes-sdr-origem"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("calls")
        .select("id, nome_lead, iniciada_em")
        .eq("tipo", "sdr")
        .order("iniciada_em", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data ?? [];
    },
  });

  // Pendente = vendido - coletado, ajustável à mão depois.
  useEffect(() => {
    const pendente = Number(r.valor_vendido || 0) - Number(r.valor_coletado || 0);
    setR((atual) => ({ ...atual, valor_pendente: String(pendente > 0 ? pendente : 0) }));
  }, [r.valor_vendido, r.valor_coletado]);

  return (
    <div className="card-cx mb-4 space-y-4 p-5">
      <h2 className="text-sm uppercase tracking-widest text-muted-foreground">Resultado</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-2">
          <Label htmlFor="status">Status da reunião</Label>
          <select
            id="status"
            value={r.status_reuniao}
            onChange={(e) => setR({ ...r, status_reuniao: e.target.value })}
            className={selectClass}
          >
            <option value="agendada">Agendada</option>
            <option value="no_show">No-show</option>
            <option value="realizada">Realizada</option>
            <option value="remarcada">Remarcada</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="resultado">Resultado</Label>
          <select
            id="resultado"
            value={r.resultado}
            onChange={(e) => setR({ ...r, resultado: e.target.value })}
            className={selectClass}
          >
            <option value="indefinido">Indefinido</option>
            <option value="venda">Venda</option>
            <option value="nao_venda">Não venda</option>
            <option value="follow_up">Follow-up</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="call-origem">Ligação de origem (SDR)</Label>
          <select
            id="call-origem"
            value={r.call_origem_id}
            onChange={(e) => setR({ ...r, call_origem_id: e.target.value })}
            className={selectClass}
          >
            <option value="">Nenhuma</option>
            {(ligacoesSdr ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome_lead} — {new Date(c.iniciada_em).toLocaleDateString("pt-BR")}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="vendido">Valor vendido</Label>
          <Input
            id="vendido"
            type="number"
            step="0.01"
            value={r.valor_vendido}
            onChange={(e) => setR({ ...r, valor_vendido: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="coletado">Valor coletado</Label>
          <Input
            id="coletado"
            type="number"
            step="0.01"
            value={r.valor_coletado}
            onChange={(e) => setR({ ...r, valor_coletado: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="pendente">Valor pendente</Label>
          <Input
            id="pendente"
            type="number"
            step="0.01"
            value={r.valor_pendente}
            onChange={(e) => setR({ ...r, valor_pendente: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="pagamento">Forma de pagamento</Label>
          <Input
            id="pagamento"
            value={r.forma_pagamento}
            onChange={(e) => setR({ ...r, forma_pagamento: e.target.value })}
            placeholder="Pix, cartão, boleto…"
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="observacoes">Observações</Label>
        <Textarea
          id="observacoes"
          rows={3}
          value={r.observacoes}
          onChange={(e) => setR({ ...r, observacoes: e.target.value })}
        />
      </div>
      <Button
        disabled={salvando}
        onClick={() =>
          salvar({
            status_reuniao: r.status_reuniao,
            resultado: r.resultado,
            call_origem_id: r.call_origem_id || null,
            valor_vendido: Number(r.valor_vendido || 0),
            valor_coletado: Number(r.valor_coletado || 0),
            valor_pendente: Number(r.valor_pendente || 0),
            forma_pagamento: r.forma_pagamento || null,
            observacoes: r.observacoes,
          })
        }
      >
        {salvando ? "Salvando…" : "Salvar resultado"}
      </Button>
    </div>
  );
}

function BlocoResultado({ call }: { call: CallResultado }) {
  return call.tipo === "sdr" ? <ResultadoSdr call={call} /> : <ResultadoCloser call={call} />;
}


function PosCall() {
  const { callId } = Route.useParams();
  const navigate = useNavigate();
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
        {call && (
          <ExcluirCall
            callId={callId}
            nomeLead={call.nome_lead}
            rotulo={call.tipo === "sdr" ? "ligação" : "call"}
            comTexto
            onExcluida={() => void navigate({ to: call.tipo === "sdr" ? "/ligacoes" : "/calls" })}
          />
        )}
      </div>

      {call && <BlocoResultado call={call as unknown as CallResultado} />}

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
