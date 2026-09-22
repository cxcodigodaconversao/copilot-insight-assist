import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  CircleHelp,
  History,
  Mic,
  MicOff,
  RefreshCw,
  Radio,
  Square,
} from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useTranscricao, suportaCapturaDeAba, type Falante } from "@/hooks/useTranscricao";
import {
  obterTokenDeepgram,
  obterCerebroDaCall,
  registrarFala,
  gerarResumoCall,
} from "@/lib/copiloto.functions";
import { cn } from "@/lib/utils";
import { PROTOCOLO_COPILOTO } from "@/lib/fluxo-sdr";


export const Route = createFileRoute("/call/$callId")({
  head: () => ({
    meta: [
      { title: "Call ao vivo — Copiloto CX" },
      { name: "description", content: "Transcrição ao vivo e sugestões do copiloto durante a reunião." },
      { property: "og:title", content: "Call ao vivo — Copiloto CX" },
      { property: "og:description", content: "Transcrição ao vivo e sugestões durante a reunião." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CallAoVivo,
});

type Sugestao = {
  acao?: string;
  leitura?: string;
  perfil_disc?: { tipo?: string; confianca?: number };
  etapa_spin?: string;
  etapa_qualificacao?: string;
  pontuacao_qualificacao?: number;
  resultado_sugerido?: string;
  temperatura?: string;
  sinal?: string;
  proxima_pergunta?: string;
  fala?: string;
  intencao?: string;
  objetivo_roteiro?: string | null;
  objetivo_texto?: string | null;
  itens_cobertos?: string[];
  itens_concluidos?: string[];
  manter_atual?: boolean;
  porque?: string;
  alerta?: string | null;
  lembrete_etapa_pulada?: string | null;
};

type Linha = { id: string; falante: Falante; texto: string; parcial?: boolean };
type IdentidadeCerebro = {
  oferta_id: string;
  produto: string;
  cerebro_versao: string;
  request_id: string;
  protocolo: string;
};

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-secondary px-3 py-1 text-xs uppercase tracking-wide text-muted-foreground">
      {children}
    </span>
  );
}

function Medidor({ rotulo, nivel }: { rotulo: string; nivel: number }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-14 uppercase tracking-widest text-muted-foreground">{rotulo}</span>
      <div className="h-2 w-28 overflow-hidden rounded-full bg-secondary">
        <div
          className="h-full rounded-full bg-primary transition-all duration-150"
          style={{ width: `${Math.round(Math.min(1, nivel) * 100)}%` }}
        />
      </div>
    </div>
  );
}


function CallAoVivo() {
  const { callId } = Route.useParams();
  const navigate = useNavigate();
  const chamarToken = useServerFn(obterTokenDeepgram);
  const carregarCerebroDaCall = useServerFn(obterCerebroDaCall);
  const chamarFala = useServerFn(registrarFala);
  const chamarResumo = useServerFn(gerarResumoCall);

  const [linhas, setLinhas] = useState<Linha[]>([]);
  const [sugestao, setSugestao] = useState<Sugestao | null>(null);
  const [historico, setHistorico] = useState<Sugestao[]>([]);
  const [verHistorico, setVerHistorico] = useState(false);
  const [pensando, setPensando] = useState(false);
  const [perguntaParcial, setPerguntaParcial] = useState("");
  const [encerrando, setEncerrando] = useState(false);
  const [segundos, setSegundos] = useState(0);
  const [falha, setFalha] = useState<string | null>(null);
  const [comoFunciona, setComoFunciona] = useState(false);
  const [iniciando, setIniciando] = useState(false);
  const [semSomDoCliente, setSemSomDoCliente] = useState(false);

  const fimRef = useRef<HTMLDivElement>(null);
  const debounceClienteRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const falaClientePendenteRef = useRef("");
  const requisicaoRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);

  const { data: call } = useQuery({
    queryKey: ["call", callId],
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

  const ehSdr = call?.tipo === "sdr";
  const ondeFalaOCliente = ehSdr ? "do Clint (onde está a ligação)" : "do Google Meet";
  const [navegadorOk, setNavegadorOk] = useState(true);
  useEffect(() => setNavegadorOk(suportaCapturaDeAba()), []);



  const { data: cerebroSdr } = useQuery({
    queryKey: ["cerebro-estrito-da-call", callId, call?.oferta_id ?? "sem-produto"],
    enabled: !!call,
    queryFn: () => carregarCerebroDaCall({ data: { callId } }),
  });
  const perguntas = cerebroSdr?.perguntas ?? [];
  const cerebroSdrCompleto = !ehSdr || cerebroSdr?.completo === true;

  useEffect(() => {
    if (debounceClienteRef.current) clearTimeout(debounceClienteRef.current);
    abortRef.current?.abort();
    falaClientePendenteRef.current = "";
    requisicaoRef.current += 1;
    setSugestao(null);
    setHistorico([]);
    setPerguntaParcial("");
  }, [call?.oferta_id]);

  useEffect(
    () => () => {
      if (debounceClienteRef.current) clearTimeout(debounceClienteRef.current);
      abortRef.current?.abort();
    },
    [],
  );

  const { data: config } = useQuery({
    queryKey: ["config_api"],
    queryFn: async () => {
      const { data } = await supabase.from("config_api").select("chave, valor");
      return Object.fromEntries((data ?? []).map((c) => [c.chave, c.valor]));
    },
  });


  const onParcial = useCallback((falante: Falante, texto: string) => {
    setLinhas((prev) => {
      const semParcial = prev.filter((l) => !(l.parcial && l.falante === falante));
      return [...semParcial, { id: `p-${falante}`, falante, texto, parcial: true }];
    });
  }, []);

  const analisarFalaCliente = useCallback(
    async (texto: string) => {
      const ofertaId = cerebroSdr?.ofertaId;
      const versao = cerebroSdr?.versao;
      if (ehSdr && (!ofertaId || !versao)) return;
      const numero = requisicaoRef.current + 1;
      requisicaoRef.current = numero;
      const requestId = `${callId}-${numero}-${Date.now()}`;
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setPensando(true);
      setPerguntaParcial("");
      try {
        const { data: sessao } = await supabase.auth.getSession();
        const token = sessao.session?.access_token;
        if (!token) throw new Error("Sua sessão expirou. Entre de novo.");
        const res = await fetch("/api/sugestao", {
          method: "POST",
          headers: { "content-type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            callId,
            texto,
            ofertaId,
            cerebroVersao: versao,
            requestId,
            turno: Date.now() * 100 + (numero % 100),
            protocolo: PROTOCOLO_COPILOTO,
          }),
          signal: controller.signal,
        });
        if (!res.ok) {
          const mensagem = await res.text();
          throw new Error(mensagem || "Falha ao gerar a sugestão.");
        }
        if (!res.body) throw new Error("Falha ao gerar a sugestão.");

        const leitor = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        for (;;) {
          const { done, value } = await leitor.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const linhasNdjson = buffer.split("\n");
          buffer = linhasNdjson.pop() ?? "";
          for (const l of linhasNdjson) {
            if (!l.trim() || numero !== requisicaoRef.current) continue;
            const evento = JSON.parse(l) as {
              tipo: string;
              proxima_pergunta?: string;
              resposta?: Sugestao;
              mensagem?: string;
              identidade?: IdentidadeCerebro;
            };
            if (evento.tipo === "final") {
              const identidadeOk =
                evento.identidade?.oferta_id === ofertaId &&
                evento.identidade?.cerebro_versao === versao &&
                evento.identidade?.request_id === requestId &&
                evento.identidade?.protocolo === PROTOCOLO_COPILOTO;
              if (!identidadeOk) continue;
              const resposta = evento.resposta;
              if (resposta?.proxima_pergunta) {
                setSugestao(resposta);
                setHistorico((h) => [resposta, ...h]);
              }
            } else if (evento.tipo === "erro") {
              toast.error(evento.mensagem ?? "Falha ao gerar a sugestão.");
            }
          }
        }
      } catch (e) {
        if (!(e instanceof DOMException && e.name === "AbortError")) {
          toast.error(e instanceof Error ? e.message : "Falha ao gerar a sugestão.");
        }
      } finally {
        if (numero === requisicaoRef.current) {
          setPensando(false);
          setPerguntaParcial("");
        }
      }
    },
    [callId, cerebroSdr?.ofertaId, cerebroSdr?.versao, ehSdr],
  );

  const onFinal = useCallback(
    (falante: Falante, texto: string) => {
      setLinhas((prev) => [
        ...prev.filter((l) => !(l.parcial && l.falante === falante)),
        { id: `${Date.now()}-${Math.random()}`, falante, texto },
      ]);
      if (falante === "vendedor") {
        void chamarFala({ data: { callId, falante: "vendedor", texto } }).catch(() => {});
        return;
      }
      setPensando(true);
      setPerguntaParcial("");
      falaClientePendenteRef.current = [falaClientePendenteRef.current, texto]
        .filter(Boolean)
        .join(" ");
      if (debounceClienteRef.current) clearTimeout(debounceClienteRef.current);
      debounceClienteRef.current = setTimeout(() => {
        const falaAgrupada = falaClientePendenteRef.current.trim();
        falaClientePendenteRef.current = "";
        if (falaAgrupada) {
          abortRef.current?.abort();
          void analisarFalaCliente(falaAgrupada);
        }
      }, 200);
    },
    [analisarFalaCliente, callId, chamarFala],
  );

  const transcricao = useTranscricao({
    idioma: config?.["idioma"] ?? "pt-BR",
    onParcial,
    onFinal,
    onErro: (m) => toast.error(m),
  });

  useEffect(() => {
    if (!transcricao.ativo) return;
    const t = setInterval(() => setSegundos((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [transcricao.ativo]);

  const nivelClienteRef = useRef(0);
  nivelClienteRef.current = Math.max(nivelClienteRef.current, transcricao.nivelCliente);
  useEffect(() => {
    if (!transcricao.ativo) {
      nivelClienteRef.current = 0;
      setSemSomDoCliente(false);
      return;
    }
    const t = setTimeout(() => setSemSomDoCliente(nivelClienteRef.current < 0.02), 15000);
    return () => clearTimeout(t);
  }, [transcricao.ativo]);


  useEffect(() => {
    fimRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [linhas]);

  const pararRef = useRef(transcricao.parar);
  pararRef.current = transcricao.parar;
  useEffect(() => () => pararRef.current(), []);

  async function iniciarEscuta() {
    if (ehSdr && !cerebroSdrCompleto) {
      setFalha(`O cérebro SDR de ${call?.ofertas?.nome ?? "este produto"} está incompleto. Peça ao administrador para completar o cadastro antes de gravar.`);
      return;
    }
    setFalha(null);
    setIniciando(true);
    try {
      const token = await chamarToken({ data: undefined });
      const motivo = await transcricao.iniciar(token.access_token);
      if (motivo === "sem-audio-da-aba") {
        setFalha(
          `Faltou marcar “Compartilhar áudio da aba”. Sem isso a voz do cliente não é captada. Escolha de novo a aba ${ondeFalaOCliente} e marque essa opção.`,
        );
      } else if (motivo === "mic-negado") {
        setFalha(
          "O microfone está bloqueado. Clique no cadeado ao lado do endereço do site, permita o microfone e tente de novo.",
        );
      } else if (motivo === "sem-suporte") {
        setFalha("Use o Google Chrome ou o Microsoft Edge para gravar a conversa.");
      } else if (motivo === "cancelado") {
        setFalha(`Você fechou a janela de escolha. Clique de novo e escolha a aba ${ondeFalaOCliente}.`);
      } else if (motivo) {
        setFalha("Não foi possível começar a gravar. Tente de novo.");
      }
    } catch (e) {
      setFalha(e instanceof Error ? e.message : "Não foi possível liberar a transcrição.");
    } finally {
      setIniciando(false);
    }
  }


  async function encerrar() {
    setEncerrando(true);
    if (debounceClienteRef.current) clearTimeout(debounceClienteRef.current);
    falaClientePendenteRef.current = "";
    requisicaoRef.current += 1;
    abortRef.current?.abort();
    transcricao.parar();
    try {
      await chamarResumo({ data: { callId } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "A call foi encerrada, mas o resumo falhou.");
      await supabase
        .from("calls")
        .update({ encerrada_em: new Date().toISOString() })
        .eq("id", callId);
    }
    navigate({ to: "/pos-call/$callId", params: { callId } });
  }

  async function corrigirFalante(index: number) {
    setLinhas((prev) =>
      prev.map((l, i) =>
        i === index ? { ...l, falante: l.falante === "cliente" ? "vendedor" : "cliente" } : l,
      ),
    );
  }

  const mm = String(Math.floor(segundos / 60)).padStart(2, "0");
  const ss = String(segundos % 60).padStart(2, "0");

  return (
    <AppShell>
      <div className="card-cx mb-4 flex flex-wrap items-center gap-4 p-4">
        <div>
          <p className="text-[10px] uppercase tracking-widest text-primary">
            {ehSdr ? "Ligação de qualificação (SDR)" : "Call de negociação (Closer)"}
          </p>
          <p className="font-display text-lg">
            {call?.nome_lead?.trim() || (ehSdr ? "Lead sem nome ainda" : "Call")}
          </p>
          <p className="text-xs text-muted-foreground">{call?.ofertas?.nome ?? ""}</p>
        </div>

        <span className="rounded-md bg-secondary px-3 py-1 font-mono text-lg text-primary">
          {mm}:{ss}
        </span>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Button variant="ghost" onClick={() => setComoFunciona(true)}>
            <CircleHelp className="size-4" /> Como funciona
          </Button>
          {transcricao.ativo && (
            <Button
              variant="secondary"
              onClick={() => {
                if (!transcricao.emPausa) {
                  if (debounceClienteRef.current) clearTimeout(debounceClienteRef.current);
                  falaClientePendenteRef.current = "";
                  requisicaoRef.current += 1;
                  abortRef.current?.abort();
                  setPensando(false);
                  setPerguntaParcial("");
                }
                transcricao.alternarPausa();
              }}
            >
              {transcricao.emPausa ? <Mic className="size-4" /> : <MicOff className="size-4" />}
              {transcricao.emPausa ? "Retomar gravação" : "Pausar gravação"}
            </Button>
          )}
          <Button variant="outline" onClick={() => setVerHistorico((v) => !v)}>
            <History className="size-4" /> Histórico
          </Button>
          <Button variant="destructive" onClick={encerrar} disabled={encerrando}>
            <Square className="size-4" /> {encerrando ? "Encerrando…" : "Encerrar call"}
          </Button>
        </div>
      </div>

      {!transcricao.ativo && (
        <div className="card-cx mb-4 flex flex-col items-center gap-3 p-8">
          {navegadorOk ? (
            <>
              <Button
                size="lg"
                className="h-16 px-10 text-lg glow-gold"
                onClick={iniciarEscuta}
                disabled={iniciando || (ehSdr && !cerebroSdrCompleto)}
              >
                <Radio className="size-5" /> {iniciando ? "Preparando…" : "Começar a gravar"}
              </Button>
              <p className="text-xs text-muted-foreground">
                Escolha a aba {ondeFalaOCliente} e marque “Compartilhar áudio da aba”.
              </p>
            </>
          ) : (
            <p className="text-sm text-warning">
              Este navegador não consegue captar o som da conversa. Abra o Copiloto CX no Google
              Chrome ou no Microsoft Edge.
            </p>
          )}
          {falha && (
            <div className="flex w-full max-w-xl items-start gap-3 rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm text-foreground">
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" />
              <div className="flex-1">
                <p>{falha}</p>
                {navegadorOk && (
                  <Button className="mt-3" variant="secondary" onClick={iniciarEscuta}>
                    <RefreshCw className="size-4" /> Tentar de novo
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {transcricao.ativo && (
        <div className="card-cx mb-4 flex flex-wrap items-center gap-6 p-4 text-xs">
          <Medidor rotulo="Você" nivel={transcricao.nivelVendedor} />
          <Medidor rotulo="Cliente" nivel={transcricao.nivelCliente} />
          {semSomDoCliente && (
            <div className="flex items-center gap-3 text-warning">
              <AlertTriangle className="size-4" />
              <span>
                Não estou ouvindo o cliente. Provavelmente a aba escolhida foi a errada ou faltou
                marcar “Compartilhar áudio da aba”.
              </span>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  transcricao.parar();
                  setSemSomDoCliente(false);
                }}
              >
                <RefreshCw className="size-4" /> Escolher a aba de novo
              </Button>
            </div>
          )}
        </div>
      )}

      <Dialog open={comoFunciona} onOpenChange={setComoFunciona}>
        <DialogContent className="max-h-[80vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Como o Copiloto grava a conversa</DialogTitle>
            <DialogDescription>
              {ehSdr
                ? "Na ligação pelo Clint, dentro do Chrome."
                : "Na reunião pelo Google Meet, dentro do Chrome."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 text-sm text-muted-foreground">
            <p>
              Como você usa fone de ouvido, o seu microfone só escuta você. A voz do cliente existe
              apenas dentro da aba {ondeFalaOCliente}. Por isso o Copiloto usa duas fontes de som:
              o seu microfone (sua voz) e o som daquela aba (a voz do cliente).
            </p>
            <div>
              <p className="mb-1 font-semibold text-foreground">O que acontece quando você clica</p>
              <ol className="list-decimal space-y-1 pl-5">
                <li>O Chrome pede permissão para usar o microfone. Clique em permitir.</li>
                <li>
                  Abre uma janelinha do Chrome. Vá na parte “Guia do Chrome” e escolha a aba
                  {ehSdr ? " do Clint" : " do Meet"}.
                </li>
                <li>
                  Marque <strong className="text-primary">“Compartilhar áudio da aba”</strong> e
                  confirme. É essa marcação que traz a voz do cliente.
                </li>
                <li>Pronto: a transcrição começa e as sugestões aparecem sozinhas.</li>
              </ol>
            </div>
            <div>
              <p className="mb-1 font-semibold text-foreground">Dúvidas comuns</p>
              <ul className="list-disc space-y-1 pl-5">
                <li>
                  <strong className="text-foreground">O cliente vê alguma coisa?</strong> Não. Quem
                  compartilha é o navegador, não {ehSdr ? "o Clint" : "o Meet"}. Nada aparece para
                  ele.
                </li>
                <li>
                  <strong className="text-foreground">Precisa ser a mesma conta?</strong> Não. Não
                  importa a conta Google nem o login.
                </li>
                <li>
                  <strong className="text-foreground">Precisa ser a mesma página?</strong> Não. Só
                  precisa estar na mesma janela do Chrome, em outra aba.
                </li>
                <li>
                  <strong className="text-foreground">E a imagem da tela?</strong> É descartada na
                  hora. O Copiloto usa só o som.
                </li>
                <li>
                  <strong className="text-foreground">Como sei que está funcionando?</strong> As
                  barrinhas “Você” e “Cliente” se mexem enquanto cada um fala.
                </li>
              </ul>
            </div>
          </div>
        </DialogContent>
      </Dialog>



      <div className="grid gap-4 lg:grid-cols-[2fr_3fr]">
        <div className="card-cx flex h-[70vh] flex-col p-4">
          <p className="mb-3 text-xs uppercase tracking-widest text-muted-foreground">
            Transcrição
          </p>
          <div className="flex-1 space-y-3 overflow-y-auto pr-2">
            {linhas.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Nada por aqui ainda. A transcrição aparece assim que a gravação começar.
              </p>
            )}
            {linhas.map((l, i) => (
              <div key={l.id} className="group">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "text-xs font-semibold uppercase",
                      l.falante === "cliente" ? "text-primary" : "text-info",
                    )}
                  >
                    {l.falante}
                  </span>
                  {!l.parcial && (
                    <button
                      onClick={() => corrigirFalante(i)}
                      className="hidden text-[10px] text-muted-foreground underline group-hover:inline"
                    >
                      trocar falante
                    </button>
                  )}
                </div>
                <p className={cn("text-sm", l.parcial ? "text-muted-foreground italic" : "")}>
                  {l.texto}
                </p>
              </div>
            ))}
            <div ref={fimRef} />
          </div>
          {ehSdr && (
            <div className="mt-3 max-h-40 overflow-y-auto border-t border-border pt-3">
              <p className="mb-2 text-xs uppercase tracking-widest text-muted-foreground">
                Roteiro de qualificação
                {call?.oferta_id && cerebroSdrCompleto ? (
                  <span className="ml-2 normal-case tracking-normal text-primary">
                    {call.ofertas?.nome}
                  </span>
                ) : (
                  <span className="ml-2 normal-case tracking-normal text-destructive">
                    cérebro exclusivo incompleto
                  </span>
                )}
              </p>
              <ul className="space-y-1 text-xs text-muted-foreground">
                {perguntas.map((p) => (
                  <li key={p.id}>
                    <span className="text-primary">[{p.categoria}]</span> {p.pergunta}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>


        <div className="card-cx flex h-[70vh] flex-col p-6">
          {ehSdr && call?.ofertas?.nome && (
            <p className="mb-4 text-xs uppercase tracking-widest text-primary">
              Cérebro ativo · {call.ofertas.nome}
              {cerebroSdr?.versao ? ` · versão ${cerebroSdr.versao}` : ""}
            </p>
          )}
          {sugestao?.alerta && (
            <div className="mb-4 flex items-center gap-2 rounded-md bg-destructive px-4 py-3 text-sm text-destructive-foreground">
              <AlertTriangle className="size-4 shrink-0" />
              {sugestao.alerta}
            </div>
          )}

          {!sugestao && !perguntaParcial && (
            <p className="text-muted-foreground">
              {pensando ? "Analisando a fala do cliente…" : "Aguardando a primeira fala do cliente."}
            </p>
          )}

          {sugestao && (
            <div className="flex flex-1 flex-col">
              {pensando && <p className="text-base text-muted-foreground">Analisando a nova fala…</p>}
              <p className="mt-6 font-display text-3xl leading-snug text-primary">
                {sugestao.proxima_pergunta}
              </p>
              <div className="mt-auto flex flex-wrap gap-2 pt-6">
                {call?.tipo === "sdr" ? (
                  <>
                    <Chip>Etapa {(sugestao.etapa_qualificacao ?? "—").replaceAll("_", " ")}</Chip>
                    <Chip>{(sugestao.resultado_sugerido ?? "—").replaceAll("_", " ")}</Chip>
                  </>
                ) : (
                  <>
                    <Chip>
                      DISC {sugestao.perfil_disc?.tipo ?? "—"}
                      {sugestao.perfil_disc?.confianca != null &&
                        ` · ${Math.round(sugestao.perfil_disc.confianca * 100)}%`}
                    </Chip>
                    <Chip>SPIN {sugestao.etapa_spin ?? "—"}</Chip>
                    <Chip>{sugestao.temperatura ?? "—"}</Chip>
                    <Chip>{(sugestao.sinal ?? "nenhum").replaceAll("_", " ")}</Chip>
                  </>
                )}
                {pensando && <Chip>analisando…</Chip>}
              </div>
            </div>
          )}

          {verHistorico && (
            <div className="mt-6 max-h-48 space-y-3 overflow-y-auto border-t border-border pt-4">
              {historico.slice(1).map((s, i) => (
                <div key={i} className="text-sm">
                  <p className="text-foreground">{s.proxima_pergunta}</p>
                  <p className="text-xs text-muted-foreground">{s.leitura}</p>
                </div>
              ))}
              {historico.length <= 1 && (
                <p className="text-sm text-muted-foreground">Sem sugestões anteriores.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
