import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { HelpCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCadastro } from "@/components/Cadastros";
import { NovoCadastroRapido } from "@/components/NovoCadastroRapido";
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

const selectClass = "h-10 w-full rounded-md border border-input bg-input px-3 text-sm";

function NovaCall() {
  const { user, nome } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    cliente: "",
    oferta_id: "",
    time: "",
    closer_nome: "",
    sdr_nome: "",
    call_origem_id: "",
    funil: "",
    origem_lead: "",
    data_reuniao_agendada: "",
    nome_lead: "",
    telefone_lead: "",
    email_lead: "",
    notas_crm: "",
    objetivo: "",
  });
  const [salvando, setSalvando] = useState(false);
  const [ajudaAberto, setAjudaAberto] = useState(false);

  const { data: ofertas } = useQuery({
    queryKey: ["ofertas-ativas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ofertas")
        .select("id, nome, cliente_id")
        .eq("ativo", true)
        .order("nome");
      if (error) throw error;
      return data;
    },
  });

  // Ligações de SDR que podem ter gerado esta reunião.
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

  const times = useCadastro("times").data;
  const origens = useCadastro("origens").data;
  const funis = useCadastro("funis").data;
  const clientes = useCadastro("clientes").data;
  const closers = useCadastro("closers_cadastro").data;
  const sdrs = useCadastro("sdrs_cadastro").data;

  const clienteSelecionado = (clientes ?? []).find((c) => c.nome === form.cliente);
  const ofertasFiltradas = clienteSelecionado
    ? (ofertas ?? []).filter((o) => o.cliente_id === clienteSelecionado.id)
    : (ofertas ?? []);

  // O closer da call já vem preenchido com quem está logado.
  useEffect(() => {
    if (nome) setForm((f) => (f.closer_nome ? f : { ...f, closer_nome: nome }));
  }, [nome]);

  async function iniciar(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSalvando(true);
    const { data, error } = await supabase
      .from("calls")
      .insert({
        vendedor_id: user.id,
        tipo: "closer",
        closer_id: user.id,
        closer_nome: form.closer_nome,
        sdr_nome: form.sdr_nome,
        call_origem_id: form.call_origem_id || null,
        oferta_id: form.oferta_id || null,
        cliente: form.cliente,
        time: form.time,
        funil: form.funil,
        origem_lead: form.origem_lead,
        data_reuniao_agendada: form.data_reuniao_agendada
          ? new Date(form.data_reuniao_agendada).toISOString()
          : null,
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
      toast.error("Não foi possível iniciar a call.");
      return;
    }
    navigate({ to: "/call/$callId", params: { callId: data.id } });
  }


  return (
    <AppShell>
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="text-2xl">Nova call (Closer)</h1>
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
                  Preencha este formulário: identificação (cliente, oferta, time, closer, SDR, funil, origem e data agendada) e os dados do lead. Depois clique em <strong>Iniciar</strong>.
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
                    <strong>Esquerda (40%):</strong> transcrição rolando, com sua fala e a do cliente em cores diferentes.
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
                  Ao clicar em <strong>Encerrar call</strong>, o sistema gera o resumo automático e você preenche o bloco <strong>Resultado</strong> (status da reunião, resultado, valores, forma de pagamento e observações).
                </p>
              </section>

              <section className="rounded-lg border border-warning/30 bg-warning/10 p-4 text-foreground">
                <h3 className="mb-1 text-base font-semibold">Importante: use Chrome ou Edge</h3>
                <p>
                  A captura do áudio da aba do Meet só funciona no Chrome e no Edge. Firefox e Safari não oferecem essa opção, então use um desses navegadores para calls ao vivo.
                </p>
              </section>
            </div>
          </DialogContent>
        </Dialog>
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
                  onChange={(e) => setForm({ ...form, oferta_id: e.target.value })}
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
              <Label htmlFor="closer">Closer</Label>
              <div className="flex gap-2">
                <select
                  id="closer"
                  value={form.closer_nome}
                  onChange={(e) => setForm({ ...form, closer_nome: e.target.value })}
                  className={selectClass}
                >
                  <option value="">—</option>
                  {nome && !(closers ?? []).some((c) => c.nome === nome) && (
                    <option value={nome}>{nome}</option>
                  )}
                  {(closers ?? []).map((p) => (
                    <option key={p.id} value={p.nome}>
                      {p.nome}
                    </option>
                  ))}
                </select>
                <NovoCadastroRapido
                  tabela="closers_cadastro"
                  titulo="Closer"
                  onCriado={(i) => setForm((f) => ({ ...f, closer_nome: i.nome }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="sdr">SDR que agendou</Label>
              <div className="flex gap-2">
                <select
                  id="sdr"
                  value={form.sdr_nome}
                  onChange={(e) => setForm({ ...form, sdr_nome: e.target.value })}
                  className={selectClass}
                >
                  <option value="">—</option>
                  {(sdrs ?? []).map((p) => (
                    <option key={p.id} value={p.nome}>
                      {p.nome}
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
            <div className="space-y-2">
              <Label htmlFor="agendada">Data/hora agendada</Label>
              <Input
                id="agendada"
                type="datetime-local"
                value={form.data_reuniao_agendada}
                onChange={(e) => setForm({ ...form, data_reuniao_agendada: e.target.value })}
              />
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
            <Label htmlFor="objetivo">Objetivo desta call</Label>
            <Textarea
              id="objetivo"
              rows={2}
              value={form.objetivo}
              onChange={(e) => setForm({ ...form, objetivo: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="origem-ligacao">Ligação de origem (SDR)</Label>
            <select
              id="origem-ligacao"
              value={form.call_origem_id}
              onChange={(e) => setForm({ ...form, call_origem_id: e.target.value })}
              className={selectClass}
            >
              <option value="">Nenhuma</option>
              {(ligacoesSdr ?? []).map((l) => (
                <option key={l.id} value={l.id}>
                  {l.nome_lead} — {new Date(l.iniciada_em).toLocaleDateString("pt-BR")}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground">
              Vincule a ligação do SDR que agendou esta reunião.
            </p>
          </div>

        </section>

        <Button type="submit" size="lg" disabled={salvando}>
          {salvando ? "Criando…" : "Iniciar"}
        </Button>
      </form>
    </AppShell>
  );
}
