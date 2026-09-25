import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { FileText, Trash2, Upload, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { enviarDocumentoCerebro, removerDocumentoCerebro } from "@/lib/documentos.functions";

async function paraBase64(file: File): Promise<string> {
  const buf = new Uint8Array(await file.arrayBuffer());
  let bin = "";
  for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
  return btoa(bin);
}

export function ArquivosCerebro({ ofertaId, ehAdm }: { ofertaId: string | null; ehAdm: boolean }) {
  const qc = useQueryClient();
  const input = useRef<HTMLInputElement>(null);
  const [enviando, setEnviando] = useState(false);
  const enviar = useServerFn(enviarDocumentoCerebro);
  const remover = useServerFn(removerDocumentoCerebro);
  const chave = ["documentos_cerebro", ofertaId];

  const { data: docs = [] } = useQuery({
    queryKey: chave,
    queryFn: async () => {
      const q = supabase
        .from("documentos_cerebro")
        .select("id, nome, tipo, tamanho, status, erro, created_at")
        .order("created_at", { ascending: false });
      const { data, error } = ofertaId ? await q.eq("oferta_id", ofertaId) : await q.is("oferta_id", null);
      if (error) throw error;
      return data;
    },
  });

  async function aoEscolher(files: FileList | null) {
    if (!files?.length) return;
    setEnviando(true);
    for (const file of Array.from(files)) {
      try {
        if (file.size > 10 * 1024 * 1024) throw new Error("Arquivo maior que 10 MB.");
        const r = await enviar({ data: { ofertaId, nome: file.name, base64: await paraBase64(file) } });
        if (r.ok) toast.success(`${file.name}: lido e somado ao cérebro${r.cortado ? " (texto longo, foi resumido ao limite)" : ""}.`);
        else toast.error(`${file.name}: ${r.erro}`);
      } catch (e) {
        toast.error(`${file.name}: ${e instanceof Error ? e.message : "falha ao enviar"}`);
      }
    }
    setEnviando(false);
    if (input.current) input.current.value = "";
    void qc.invalidateQueries({ queryKey: chave });
  }

  async function aoRemover(id: string, nome: string) {
    if (!confirm(`Remover "${nome}" e o conteúdo dele do cérebro?`)) return;
    try {
      await remover({ data: { id } });
      toast.success("Arquivo removido do cérebro.");
      void qc.invalidateQueries({ queryKey: chave });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao remover");
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-dashed border-border p-6 text-center">
        <p className="text-sm text-muted-foreground">
          Envie PDF, Word (.docx), Excel (.xlsx) ou .csv. O conteúdo é <strong>somado</strong> ao cérebro deste
          produto; nada do que já está cadastrado é apagado.
        </p>
        <input
          ref={input}
          type="file"
          multiple
          accept=".pdf,.docx,.xlsx,.xls,.csv"
          className="hidden"
          onChange={(e) => void aoEscolher(e.target.files)}
        />
        <Button className="mt-4" disabled={!ehAdm || enviando} onClick={() => input.current?.click()}>
          <Upload className="mr-2 size-4" />
          {enviando ? "Lendo arquivo…" : "Enviar arquivos"}
        </Button>
        {!ehAdm && <p className="mt-2 text-xs text-muted-foreground">Somente o ADM pode enviar arquivos.</p>}
      </div>

      <ul className="divide-y divide-border rounded-lg border border-border">
        {docs.length === 0 && <li className="p-4 text-sm text-muted-foreground">Nenhum arquivo enviado ainda.</li>}
        {docs.map((d) => (
          <li key={d.id} className="flex items-center gap-3 p-3">
            {d.status === "lido" ? (
              <FileText className="size-4 text-primary" />
            ) : (
              <AlertTriangle className="size-4 text-destructive" />
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{d.nome}</p>
              <p className="text-xs text-muted-foreground">
                {new Date(d.created_at).toLocaleString("pt-BR")} ·{" "}
                {d.status === "lido" ? `Lido · ${d.tamanho.toLocaleString("pt-BR")} caracteres` : `Com problema: ${d.erro}`}
              </p>
            </div>
            {ehAdm && (
              <Button variant="ghost" size="icon" aria-label="Remover arquivo" onClick={() => void aoRemover(d.id, d.nome)}>
                <Trash2 className="size-4" />
              </Button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
