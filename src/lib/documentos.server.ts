// Server-only: extrai texto de PDF, Word e planilhas.
export async function extrairTexto(bytes: Uint8Array, ext: string): Promise<string> {
  if (ext === "pdf") {
    const { extractText, getDocumentProxy } = await import("unpdf");
    const pdf = await getDocumentProxy(bytes);
    const { text } = await extractText(pdf, { mergePages: true });
    return Array.isArray(text) ? text.join("\n") : text;
  }
  if (ext === "docx") {
    const mammoth = await import("mammoth");
    const r = await mammoth.extractRawText({ buffer: Buffer.from(bytes) } as never);
    return r.value;
  }
  if (ext === "xlsx" || ext === "xls" || ext === "csv") {
    const XLSX = await import("xlsx");
    const wb =
      ext === "csv"
        ? XLSX.read(new TextDecoder("utf-8").decode(bytes), { type: "string" })
        : XLSX.read(bytes, { type: "array" });
    return wb.SheetNames.map((n) => {
      const sheet = wb.Sheets[n];
      return sheet ? `# ${n}\n${XLSX.utils.sheet_to_csv(sheet, { blankrows: false })}` : "";
    }).join("\n\n");
  }
  throw new Error("Formato não suportado. Use PDF, Word (.docx), Excel (.xlsx) ou .csv.");
}
