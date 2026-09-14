import { useCallback, useRef, useState } from "react";

export type Falante = "cliente" | "vendedor";

type Opcoes = {
  idioma: string;
  onParcial: (falante: Falante, texto: string) => void;
  onFinal: (falante: Falante, texto: string) => void;
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

export function useTranscricao({ idioma, onParcial, onFinal, onErro }: Opcoes) {
  const canais = useRef<Canal[]>([]);
  const pausado = useRef(false);
  const [ativo, setAtivo] = useState(false);
  const [emPausa, setEmPausa] = useState(false);

  const abrirCanal = useCallback(
    async (stream: MediaStream, falante: Falante, token: string) => {
      const url = new URL("wss://api.deepgram.com/v1/listen");
      url.searchParams.set("model", "nova-3");
      url.searchParams.set("language", idioma || "pt-BR");
      url.searchParams.set("interim_results", "true");
      url.searchParams.set("smart_format", "true");
      url.searchParams.set("endpointing", "400");
      url.searchParams.set("encoding", "linear16");
      url.searchParams.set("sample_rate", "16000");
      url.searchParams.set("channels", "1");

      const ws = new WebSocket(url.toString(), ["bearer", token]);
      ws.binaryType = "arraybuffer";

      const ctx = new AudioContext({ sampleRate: 16000 });
      const source = ctx.createMediaStreamSource(stream);
      const node = ctx.createScriptProcessor(4096, 1, 1);
      node.onaudioprocess = (e) => {
        if (pausado.current || ws.readyState !== WebSocket.OPEN) return;
        ws.send(floatParaPcm16(e.inputBuffer.getChannelData(0)));
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
          if (msg.speech_final || msg.is_final) onFinal(falante, texto);
          else onParcial(falante, texto);
        } catch {
          /* ignora mensagens de controle */
        }
      };
      ws.onerror = () => onErro("A transcrição caiu. Encerre e inicie a escuta de novo.");

      canais.current.push({ ws, ctx, node, source, stream });
    },
    [idioma, onFinal, onParcial, onErro],
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
    setAtivo(false);
    setEmPausa(false);
    pausado.current = false;
  }, []);

  const iniciar = useCallback(
    async (token: string) => {
      if (!suportaCapturaDeAba()) {
        onErro("Use o Google Chrome ou o Microsoft Edge para capturar o áudio da reunião.");
        return false;
      }
      try {
        const mic = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true },
        });
        const tela = await navigator.mediaDevices.getDisplayMedia({ audio: true, video: true });
        tela.getVideoTracks().forEach((t) => t.stop());
        if (tela.getAudioTracks().length === 0) {
          mic.getTracks().forEach((t) => t.stop());
          onErro('Você não marcou "Compartilhar áudio da aba". Tente de novo.');
          return false;
        }
        const somDaAba = new MediaStream(tela.getAudioTracks());
        await abrirCanal(mic, "vendedor", token);
        await abrirCanal(somDaAba, "cliente", token);
        setAtivo(true);
        return true;
      } catch (e) {
        onErro(e instanceof Error ? e.message : "Não foi possível acessar o áudio.");
        return false;
      }
    },
    [abrirCanal, onErro],
  );

  const alternarPausa = useCallback(() => {
    pausado.current = !pausado.current;
    setEmPausa(pausado.current);
  }, []);

  return { iniciar, parar, alternarPausa, ativo, emPausa };
}
