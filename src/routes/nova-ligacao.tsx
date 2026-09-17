import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PhoneCall } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCadastro, useOfertasAtivas } from "@/components/Cadastros";
import { NovoCadastroRapido } from "@/components/NovoCadastroRapido";

export const Route = createFileRoute("/nova-ligacao")({
  head: () => ({
    meta: [
      { title: "Nova ligação (SDR) — Copiloto CX" },
      {
        name: "description",
        content: "Abra uma ligação de qualificação e conduza o lead até o agendamento.",
      },
      { property: "og:title", content: "Nova ligação (SDR) — Copiloto CX" },
      { property: "og:description", content: "Ligação de qualificação com copiloto ao vivo." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: NovaLigacao,
});

const selectClass = "h-10 w-full rounded-md border border-input bg-input px-3 text-sm";

function NovaLigacao() {
  const { user, nome } = useAuth();
  const navigate = useNavigate();
  const [salvando, setSalvando] = useState(false);
  const [form, setForm] = useState({
    cliente: "",
    oferta_id: "",
    time: "",
    sdr_nome: "",
    funil: "",
    origem_lead: "",
    nome_lead: "",
    telefone_lead: "",
    email_lead: "",
    notas_crm: "",
    objetivo: "",
  });

  const { data: ofertas } = useOfertasAtivas();
  const times = useCadastro("times").data;
  const origens = useCadastro("origens").data;
  const funis = useCadastro("funis").data;
  const clientes = useCadastro("clientes").data;
  const sdrs = useCadastro("sdrs_cadastro").data;

  useEffect(() => {
    if (nome) setForm((f) => (f.sdr_nome ? f : { ...f, sdr_nome: nome }));
  }, [nome]);

  const clienteSelecionado = (clientes ?? []).find((c) => c.nome === form.cliente);
  const ofertasFiltradas = clienteSelecionado
    ? (ofertas ?? []).filter((o) => o.cliente_id === clienteSelecionado.id)
    : (ofertas ?? []);

  async function iniciar(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSalvando(true);
    const { data, error } = await supabase
      .from("calls")
      .insert({
        vendedor_id: user.id,
        tipo: "sdr",
        sdr_id: user.id,
        sdr_nome: form.sdr_nome,
        oferta_id: form.oferta_id || null,
        cliente: form.cliente,
        time: form.time,
        funil: form.funil,
        origem_lead: form.origem_lead,
        nome_lead: form.nome_lead,
        telefone_lead: form.telefone_lead,
        email_lead: form.email_lead,
        notas_crm: form.notas_crm,
        objetivo: form.objetivo,
      })
      .select("id")
      .single();
    setSalvando(false);
    if (error || !data) {
      toast.error("Não foi possível iniciar a ligação.");
      return;
    }
    navigate({ to: "/call/$callId", params: { callId: data.id } });
  }

  return (
    <AppShell>
      <div className="mb-6 flex items-center gap-3">
        <PhoneCall className="size-5 text-primary" />
        <h1 className="text-2xl">Nova ligação (SDR)</h1>
      </div>

      <form onSubmit={iniciar} className="max-w-3xl space-y-4">
        <section className="card-cx space-y-4 p-6">
          <h2 className="text-sm uppercase tracking-widest text-muted-foreground">Identificação</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="cliente">Cliente</Label>
              <div className="flex gap-2">
                <select
                  id="cliente"
                  value={form.cliente}
                  onChange={(e) => setForm({ ...form, cliente: e.target.value })}
                  className={selectClass}
                >
                  <option value="">Selecione…</option>
                  {(clientes ?? []).map((c) => (
                    <option key={c.id} value={c.nome}>
                      {c.nome}
                    </option>
                  ))}
                </select>
                <NovoCadastroRapido
                  tabela="clientes"
                  titulo="Cliente"
                  onCriado={(i) => setForm((f) => ({ ...f, cliente: i.nome }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="oferta">Produto / oferta</Label>
              <div className="flex gap-2">
                <select
                  id="oferta"
                  required
                  value={form.oferta_id}
                  onChange={(e) => {
                    const o = (ofertas ?? []).find((x) => x.id === e.target.value);
                    const dono = (clientes ?? []).find((c) => c.id === o?.cliente_id);
                    setForm((f) => ({
                      ...f,
                      oferta_id: e.target.value,
                      cliente: dono ? dono.nome : f.cliente,
                    }));
                  }}
                  className={selectClass}
                >
                  <option value="">Selecione…</option>
                  {ofertasFiltradas.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.nome}
                    </option>
                  ))}
                </select>
                <NovoCadastroRapido
                  tabela="ofertas"
                  titulo="Produto"
                  onCriado={(i) => setForm((f) => ({ ...f, oferta_id: i.id }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="time">Time</Label>
              <div className="flex gap-2">
                <select
                  id="time"
                  value={form.time}
                  onChange={(e) => setForm({ ...form, time: e.target.value })}
                  className={selectClass}
                >
                  <option value="">Selecione…</option>
                  {(times ?? []).map((t) => (
                    <option key={t.id} value={t.nome}>
                      {t.nome}
                    </option>
                  ))}
                </select>
                <NovoCadastroRapido
                  tabela="times"
                  titulo="Time"
                  onCriado={(i) => setForm((f) => ({ ...f, time: i.nome }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="sdr">SDR</Label>
              <div className="flex gap-2">
                <select
                  id="sdr"
                  value={form.sdr_nome}
                  onChange={(e) => setForm({ ...form, sdr_nome: e.target.value })}
                  className={selectClass}
                >
                  <option value="">Selecione…</option>
                  {nome && !(sdrs ?? []).some((s) => s.nome === nome) && (
                    <option value={nome}>{nome}</option>
                  )}
                  {(sdrs ?? []).map((s) => (
                    <option key={s.id} value={s.nome}>
                      {s.nome}
                    </option>
                  ))}
                </select>
                <NovoCadastroRapido
                  tabela="sdrs_cadastro"
                  titulo="SDR"
                  onCriado={(i) => setForm((f) => ({ ...f, sdr_nome: i.nome }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="funil">Funil</Label>
              <div className="flex gap-2">
                <select
                  id="funil"
                  value={form.funil}
                  onChange={(e) => setForm({ ...form, funil: e.target.value })}
                  className={selectClass}
                >
                  <option value="">Selecione…</option>
                  {(funis ?? []).map((f) => (
                    <option key={f.id} value={f.nome}>
                      {f.nome}
                    </option>
                  ))}
                </select>
                <NovoCadastroRapido
                  tabela="funis"
                  titulo="Funil"
                  onCriado={(i) => setForm((f) => ({ ...f, funil: i.nome }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="origem">Origem</Label>
              <div className="flex gap-2">
                <select
                  id="origem"
                  value={form.origem_lead}
                  onChange={(e) => setForm({ ...form, origem_lead: e.target.value })}
                  className={selectClass}
                >
                  <option value="">Selecione…</option>
                  {(origens ?? []).map((o) => (
                    <option key={o.id} value={o.nome}>
                      {o.nome}
                    </option>
                  ))}
                </select>
                <NovoCadastroRapido
                  tabela="origens"
                  titulo="Origem"
                  onCriado={(i) => setForm((f) => ({ ...f, origem_lead: i.nome }))}
                />
              </div>
            </div>
          </div>
        </section>

        <section className="card-cx space-y-4 p-6">
          <h2 className="text-sm uppercase tracking-widest text-muted-foreground">Lead</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="lead">Nome do lead</Label>
              <Input
                id="lead"
                required
                value={form.nome_lead}
                onChange={(e) => setForm({ ...form, nome_lead: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="telefone">Telefone</Label>
              <Input
                id="telefone"
                value={form.telefone_lead}
                onChange={(e) => setForm({ ...form, telefone_lead: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                value={form.email_lead}
                onChange={(e) => setForm({ ...form, email_lead: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="notas">Notas do CRM</Label>
            <Textarea
              id="notas"
              rows={4}
              value={form.notas_crm}
              onChange={(e) => setForm({ ...form, notas_crm: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="objetivo">Objetivo desta ligação</Label>
            <Textarea
              id="objetivo"
              rows={2}
              placeholder="Qualificar e agendar o diagnóstico com o especialista."
              value={form.objetivo}
              onChange={(e) => setForm({ ...form, objetivo: e.target.value })}
            />
          </div>
        </section>

        <Button type="submit" size="lg" disabled={salvando}>
          {salvando ? "Criando…" : "Iniciar ligação"}
        </Button>
      </form>
    </AppShell>
  );
}
