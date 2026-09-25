import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const LIMITE_BYTES = 10 * 1024 * 1024;
const LIMITE_TEXTO = 40_000;

export const enviarDocumentoCerebro = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        ofertaId: z.string().uuid().nullable(),
        nome: z.string().min(1).max(200),
        base64: z.string().min(1),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: adm } = await context.supabase.rpc("is_adm");
    if (!adm) throw new Error("Apenas o ADM pode enviar arquivos ao cérebro.");

    const bytes = Uint8Array.from(Buffer.from(data.base64, "base64"));
    if (bytes.byteLength > LIMITE_BYTES) throw new Error("Arquivo maior que 10 MB.");
    const ext = data.nome.toLowerCase().split(".").pop() ?? "";

    let texto = "";
    let erro: string | null = null;
    try {
      const { extrairTexto } = await import("./documentos.server");
      texto = await extrairTexto(bytes, ext);
    } catch (e) {
      erro = e instanceof Error ? e.message : "Não foi possível ler o arquivo.";
    }
    texto = texto.replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
    if (!erro && texto.length < 20) {
      erro =
        ext === "pdf"
          ? "Não encontramos texto neste PDF. Ele parece ser escaneado (só imagem)."
          : "O arquivo está vazio ou ilegível.";
    }

    const { error } = await context.supabase.from("documentos_cerebro").insert({
      oferta_id: data.ofertaId,
      nome: data.nome,
      tipo: ext,
      tamanho: texto.length,
      texto: erro ? "" : texto.slice(0, LIMITE_TEXTO),
      status: erro ? "erro" : "lido",
      erro,
    });
    if (error) throw new Error("Não foi possível salvar o arquivo.");
    const { limparCacheCerebro } = await import("./cerebro.server");
    limparCacheCerebro();
    return { ok: !erro, erro, caracteres: Math.min(texto.length, LIMITE_TEXTO), cortado: texto.length > LIMITE_TEXTO };
  });

export const removerDocumentoCerebro = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("documentos_cerebro").delete().eq("id", data.id);
    if (error) throw new Error("Não foi possível remover o arquivo.");
    const { limparCacheCerebro } = await import("./cerebro.server");
    limparCacheCerebro();
    return { ok: true };
  });
