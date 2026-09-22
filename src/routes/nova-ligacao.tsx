import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PhoneCall } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useCadastro, useOfertasAtivas } from "@/components/Cadastros";
import { NovoCadastroRapido } from "@/components/NovoCadastroRapido";

export const Route = createFileRoute("/nova-ligacao")({
  head: () => ({
    meta: [
      { title: "Nova ligação (SDR) — Copiloto CX" },
      {
        name: "description",
        content: "Escolha o produto e comece a discar. Os dados do lead você preenche depois.",
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
const CHAVE_MEMORIA = "cx_ultima_ligacao";

function NovaLigacao() {
  const { user, nome } = useAuth();
  const navigate = useNavigate();
  const [salvando, setSalvando] = useState(false);
  const [ofertaId, setOfertaId] = useState("");
  const [origem, setOrigem] = useState("");

  const { data: ofertas } = useOfertasAtivas();
  const origens = useCadastro("origens").data;
  const clientes = useCadastro("clientes").data;

  // Lembra apenas a origem. O produto sempre exige escolha explícita para nunca
  // abrir uma ligação com o cérebro usado na ligação anterior.
  useEffect(() => {
    try {
      const salvo = JSON.parse(localStorage.getItem(CHAVE_MEMORIA) ?? "{}") as {
        origem?: string;
      };
      if (salvo.origem) setOrigem(salvo.origem);
    } catch {
      /* primeira vez */
    }
  }, []);

  const oferta = (ofertas ?? []).find((o) => o.id === ofertaId);
  const cliente = (clientes ?? []).find((c) => c.id === oferta?.cliente_id);

  async function iniciar(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSalvando(true);
    localStorage.setItem(CHAVE_MEMORIA, JSON.stringify({ origem }));
    const { data, error } = await supabase
      .from("calls")
      .insert({
        vendedor_id: user.id,
        tipo: "sdr",
        sdr_id: user.id,
        sdr_nome: nome ?? "",
        oferta_id: ofertaId || null,
        cliente: cliente?.nome ?? "",
        origem_lead: origem,
        nome_lead: "",
        objetivo: "Qualificar e agendar o diagnóstico com o especialista.",
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

      <form onSubmit={iniciar} className="max-w-2xl space-y-4">
        <section className="card-cx space-y-4 p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="oferta">Produto</Label>
              <div className="flex gap-2">
                <select
                  id="oferta"
                  required
                  value={ofertaId}
                  onChange={(e) => setOfertaId(e.target.value)}
                  className={selectClass}
                >
                  <option value="">Selecione…</option>
                  {(ofertas ?? []).map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.nome}
                    </option>
                  ))}
                </select>
                <NovoCadastroRapido
                  tabela="ofertas"
                  titulo="Produto"
                  onCriado={(i) => setOfertaId(i.id)}
                />
              </div>
              {cliente && <p className="text-xs text-muted-foreground">Cliente: {cliente.nome}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="origem">Origem</Label>
              <div className="flex gap-2">
                <select
                  id="origem"
                  value={origem}
                  onChange={(e) => setOrigem(e.target.value)}
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
                  onCriado={(i) => setOrigem(i.nome)}
                />
              </div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Nome, telefone, e-mail e anotações do lead você preenche depois, na tela de resumo da
            ligação.
          </p>
        </section>

        <Button type="submit" size="lg" className="h-14 px-8 text-base glow-gold" disabled={salvando}>
          {salvando ? "Abrindo…" : "Começar a ligar"}
        </Button>
      </form>
    </AppShell>
  );
}
