import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { HelpCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/nova-call")({
  head: () => ({
    meta: [
      { title: "Nova call — Copiloto CX" },
      { name: "description", content: "Prepare o contexto do lead antes de iniciar a reunião." },
      { property: "og:title", content: "Nova call — Copiloto CX" },
      { property: "og:description", content: "Prepare o contexto do lead antes da reunião." },
    ],
  }),
  component: NovaCall,
});

function NovaCall() {
  const { user, papel } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    oferta_id: "",
    nome_lead: "",
    origem_lead: "",
    notas_crm: "",
    objetivo: "",
    tipo: "closer",
  });
  const [salvando, setSalvando] = useState(false);

  const { data: ofertas } = useQuery({
    queryKey: ["ofertas-ativas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ofertas")
        .select("id, nome")
        .eq("ativo", true)
        .order("nome");
      if (error) throw error;
      return data;
    },
  });

  async function iniciar(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSalvando(true);
    const { data, error } = await supabase
      .from("calls")
      .insert({
        vendedor_id: user.id,
        oferta_id: form.oferta_id || null,
        nome_lead: form.nome_lead,
        origem_lead: form.origem_lead,
        notas_crm: form.notas_crm,
        objetivo: form.objetivo,
        tipo: form.tipo,
      })
      .select("id")
      .single();
    setSalvando(false);
    if (error || !data) {
      toast.error("Não foi possível iniciar a call.");
      return;
    }
    navigate({ to: "/call/$callId", params: { callId: data.id } });
  }

  return (
    <AppShell>
      <h1 className="mb-6 text-2xl">Nova call</h1>
      <form onSubmit={iniciar} className="card-cx max-w-2xl space-y-5 p-6">
        <div className="space-y-2">
          <Label htmlFor="oferta">Oferta</Label>
          <select
            id="oferta"
            required
            value={form.oferta_id}
            onChange={(e) => setForm({ ...form, oferta_id: e.target.value })}
            className="h-10 w-full rounded-md border border-input bg-input px-3 text-sm"
          >
            <option value="">Selecione…</option>
            {(ofertas ?? []).map((o) => (
              <option key={o.id} value={o.id}>
                {o.nome}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
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
            <Label htmlFor="origem">Origem</Label>
            <Input
              id="origem"
              value={form.origem_lead}
              onChange={(e) => setForm({ ...form, origem_lead: e.target.value })}
              placeholder="Instagram, indicação, tráfego pago…"
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
          <Label htmlFor="objetivo">Objetivo desta call</Label>
          <Textarea
            id="objetivo"
            rows={2}
            value={form.objetivo}
            onChange={(e) => setForm({ ...form, objetivo: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="tipo">Tipo</Label>
          <select
            id="tipo"
            value={form.tipo}
            onChange={(e) => setForm({ ...form, tipo: e.target.value })}
            className="h-10 w-full rounded-md border border-input bg-input px-3 text-sm"
          >
            <option value="closer">Closer</option>
            <option value="sdr">SDR</option>
          </select>
          {papel && papel !== "lider" && (
            <p className="text-xs text-muted-foreground">Seu perfil de acesso: {papel}</p>
          )}
        </div>
        <Button type="submit" size="lg" disabled={salvando}>
          {salvando ? "Criando…" : "Iniciar"}
        </Button>
      </form>
    </AppShell>
  );
}
