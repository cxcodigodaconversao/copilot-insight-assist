import { useCallback, useEffect, useRef, useState } from "react";
import { ehEcoDoCliente } from "@/lib/fluxo-sdr";

export type Falante = "cliente" | "vendedor";

export type MotivoFalha = "sem-suporte" | "mic-negado" | "sem-audio-da-aba" | "cancelado" | "outro";

type Opcoes = {
  idioma: string;
  /** Silêncio (ms) para considerar que a pessoa terminou de falar. */
  pausaMs?: number;
  onParcial: (falante: Falante, texto: string) => void;
  onFinal: (falante: Falante, texto: string, fimDaFala: boolean) => void;
  onErro: (mensagem: string) => void;
};

type Canal = {
  ws: WebSocket;
  ctx: AudioContext;
  node: ScriptProcessorNode;
  source: MediaStreamAudioSourceNode;
  stream: MediaStream;
};

function floatParaPcm16(input: Float32Array): ArrayBuffer {
  const buffer = new ArrayBuffer(input.length * 2);
  const view = new DataView(buffer);
  for (let i = 0; i < input.length; i++) {
    const s = Math.max(-1, Math.min(1, input[i] ?? 0));
    view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return buffer;
}

export function suportaCapturaDeAba() {
  return (
    typeof navigator !== "undefined" &&
    typeof navigator.mediaDevices?.getDisplayMedia === "function" &&
    /Chrome|Edg/.test(navigator.userAgent) &&
    !/Firefox/.test(navigator.userAgent)
  );
}

export function useTranscricao({ idioma, pausaMs = 800, onParcial, onFinal, onErro }: Opcoes) {
  const canais = useRef<Canal[]>([]);
  const falasDoCliente = useRef<Array<{ texto: string; em: number }>>([]);
  const pausado = useRef(false);
  const niveis = useRef<{ vendedor: number; cliente: number }>({ vendedor: 0, cliente: 0 });
  const [ativo, setAtivo] = useState(false);
  const [emPausa, setEmPausa] = useState(false);
  const [nivelVendedor, setNivelVendedor] = useState(0);
  const [nivelCliente, setNivelCliente] = useState(0);

  useEffect(() => {
    if (!ativo) return;
    const t = setInterval(() => {
      setNivelVendedor(niveis.current.vendedor);
      setNivelCliente(niveis.current.cliente);
    }, 150);
    return () => clearInterval(t);
  }, [ativo]);

  const abrirCanal = useCallback(
    async (stream: MediaStream, falante: Falante, token: string) => {
      const url = new URL("wss://api.deepgram.com/v1/listen");
      url.searchParams.set("model", "nova-3");
      url.searchParams.set("language", idioma || "pt-BR");
      url.searchParams.set("interim_results", "true");
      url.searchParams.set("smart_format", "true");
      url.searchParams.set("endpointing", String(Math.round(pausaMs)));
      url.searchParams.set("encoding", "linear16");
      url.searchParams.set("sample_rate", "16000");
      url.searchParams.set("channels", "1");

      const ws = new WebSocket(url.toString(), ["bearer", token]);
      ws.binaryType = "arraybuffer";

      const ctx = new AudioContext({ sampleRate: 16000 });
      const source = ctx.createMediaStreamSource(stream);
      const node = ctx.createScriptProcessor(4096, 1, 1);
      node.onaudioprocess = (e) => {
        const dados = e.inputBuffer.getChannelData(0);
        let soma = 0;
        for (let i = 0; i < dados.length; i++) soma += (dados[i] ?? 0) * (dados[i] ?? 0);
        const rms = Math.sqrt(soma / dados.length);
        niveis.current[falante] = Math.min(1, rms * 8);
        if (pausado.current || ws.readyState !== WebSocket.OPEN) return;
        ws.send(floatParaPcm16(dados));
      };
      source.connect(node);
      const mudo = ctx.createGain();
      mudo.gain.value = 0;
      node.connect(mudo);
      mudo.connect(ctx.destination);

      ws.onmessage = (evt) => {
        try {
          const msg = JSON.parse(String(evt.data)) as {
            channel?: { alternatives?: Array<{ transcript?: string }> };
            is_final?: boolean;
            speech_final?: boolean;
          };
          const texto = msg.channel?.alternatives?.[0]?.transcript?.trim();
          if (!texto) return;
          // O microfone às vezes capta o som que sai da aba: isso é eco, não fala do vendedor.
          if (falante === "vendedor" && ehEcoDoCliente(texto, falasDoCliente.current)) return;
          if (falante === "cliente") {
            falasDoCliente.current = [
              ...falasDoCliente.current.filter((f) => Date.now() - f.em < 8000),
              { texto, em: Date.now() },
            ];
          }
          if (msg.speech_final || msg.is_final) onFinal(falante, texto, msg.speech_final === true);
          else onParcial(falante, texto);
        } catch {
          /* ignora mensagens de controle */
        }
      };
      ws.onerror = () => onErro("A transcrição caiu. Encerre e inicie a escuta de novo.");

      canais.current.push({ ws, ctx, node, source, stream });
    },
    [idioma, pausaMs, onFinal, onParcial, onErro],
  );

  const parar = useCallback(() => {
    for (const c of canais.current) {
      try {
        c.ws.readyState === WebSocket.OPEN && c.ws.send(JSON.stringify({ type: "CloseStream" }));
        c.ws.close();
      } catch {
        /* noop */
      }
      c.node.disconnect();
      c.source.disconnect();
      c.stream.getTracks().forEach((t) => t.stop());
      void c.ctx.close();
    }
    canais.current = [];
    falasDoCliente.current = [];
    niveis.current = { vendedor: 0, cliente: 0 };
    setNivelVendedor(0);
    setNivelCliente(0);
    setAtivo(false);
    setEmPausa(false);
    pausado.current = false;
  }, []);

  /** Retorna null quando deu certo, ou o motivo da falha. */
  const iniciar = useCallback(
    async (token: string): Promise<MotivoFalha | null> => {
      if (!suportaCapturaDeAba()) return "sem-suporte";

      let mic: MediaStream;
      try {
        mic = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true },
        });
      } catch {
        return "mic-negado";
      }

      let tela: MediaStream;
      try {
        tela = await navigator.mediaDevices.getDisplayMedia({
          audio: true,
          video: true,
          // @ts-expect-error opções específicas do Chrome
          preferCurrentTab: false,
          selfBrowserSurface: "exclude",
          systemAudio: "include",
        });
      } catch {
        mic.getTracks().forEach((t) => t.stop());
        return "cancelado";
      }

      tela.getVideoTracks().forEach((t) => t.stop());
      if (tela.getAudioTracks().length === 0) {
        mic.getTracks().forEach((t) => t.stop());
        return "sem-audio-da-aba";
      }

      try {
        const somDaAba = new MediaStream(tela.getAudioTracks());
        await abrirCanal(mic, "vendedor", token);
        await abrirCanal(somDaAba, "cliente", token);
        setAtivo(true);
        return null;
      } catch {
        mic.getTracks().forEach((t) => t.stop());
        tela.getTracks().forEach((t) => t.stop());
        return "outro";
      }
    },
    [abrirCanal],
  );

  const alternarPausa = useCallback(() => {
    pausado.current = !pausado.current;
    setEmPausa(pausado.current);
  }, []);

  return { iniciar, parar, alternarPausa, ativo, emPausa, nivelVendedor, nivelCliente };
}
