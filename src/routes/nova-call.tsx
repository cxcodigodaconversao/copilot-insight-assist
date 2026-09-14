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
  const [ajudaAberto, setAjudaAberto] = useState(false);

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
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="text-2xl">Nova call</h1>
        <Dialog open={ajudaAberto} onOpenChange={setAjudaAberto}>
          <DialogTrigger asChild>
            <Button type="button" variant="outline" size="sm">
              <HelpCircle className="mr-2 h-4 w-4" />
              Como usar
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Como usar o Copiloto CX no Meet</DialogTitle>
              <DialogDescription>
                Passo a passo completo para acompanhar calls ao vivo.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-5 text-sm leading-relaxed">
              <section>
                <h3 className="mb-1 text-base font-semibold text-primary">1. Antes da call</h3>
                <p>
                  Acesse <strong>Cérebro CX</strong> e cadastre ou revise a oferta, as quebras de objeção, os perfis DISC e as regras do copiloto. Essas informações são a base que o assistente usa para sugerir respostas em tempo real.
                </p>
              </section>

              <section>
                <h3 className="mb-1 text-base font-semibold text-primary">2. Iniciar a call</h3>
                <p>
                  Preencha este formulário: escolha a <strong>oferta</strong>, digite o nome do lead, a origem, as notas do CRM, o objetivo da conversa e o tipo (closer ou SDR). Depois clique em <strong>Iniciar</strong>.
                </p>
              </section>

              <section>
                <h3 className="mb-1 text-base font-semibold text-primary">3. Compartilhar o áudio do Meet</h3>
                <p className="mb-2">
                  O Copiloto CX separa o áudio de duas fontes para saber quem fala:
                </p>
                <ul className="list-disc space-y-1 pl-5">
                  <li>
                    <strong>Microfone do vendedor:</strong> permita o acesso quando o navegador pedir. Essa é a sua voz.
                  </li>
                  <li>
                    <strong>Áudio da aba do Meet:</strong> o navegador pedirá para escolher uma aba. Selecione a aba onde está o Google Meet e <strong>marque a opção "Compartilhar áudio da aba"</strong>. O vídeo é descartado; só o áudio do cliente importa.
                  </li>
                </ul>
              </section>

              <section>
                <h3 className="mb-1 text-base font-semibold text-primary">4. Durante a call</h3>
                <p className="mb-2">A tela da call ao vivo é dividida em duas partes:</p>
                <ul className="list-disc space-y-1 pl-5">
                  <li>
                    <strong>Esquerda (40%):</strong> transcrição rolando, com sua fale e a do cliente em cores diferentes.
                  </li>
                  <li>
                    <strong>Direita (60%):</strong> sugestão mais recente — leitura do momento, próxima pergunta em destaque, o porquê da sugestão e alertas em vermelho.
                  </li>
                </ul>
                <p className="mt-2">
                  No rodapé você vê chips com o perfil DISC detectado, a confiança, a etapa SPIN, a temperatura e o sinal da conversa. Se o app identificar o falante errado, use o botão para trocar entre cliente e vendedor.
                </p>
              </section>

              <section>
                <h3 className="mb-1 text-base font-semibold text-primary">5. Após a call</h3>
                <p>
                  Ao clicar em <strong>Encerrar call</strong>, o sistema gera automaticamente um resumo com: síntese da conversa, perfil DISC final, objeções que surgiram, pontos fortes e a melhorar, próximos passos e temperatura final. Você pode copiar o resumo ou exportar em JSON.
                </p>
              </section>

              <section className="rounded-lg border border-warning/30 bg-warning/10 p-4 text-warning-foreground">
                <h3 className="mb-1 text-base font-semibold">Importante: use Chrome ou Edge</h3>
                <p>
                  A captura do áudio da aba do Meet só funciona no Chrome e no Edge. Firefox e Safari não oferecem essa opção, então use um desses navegadores para calls ao vivo.
                </p>
              </section>
            </div>
          </DialogContent>
        </Dialog>
      </div>
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
