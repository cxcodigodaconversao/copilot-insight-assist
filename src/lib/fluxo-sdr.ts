export const PROTOCOLO_COPILOTO = "sdr-consultivo-v5";

export const ETAPAS_SDR = [
  "apresentacao",
  "motivo",
  "diagnostico",
  "dor_implicacao",
  "interesse",
  "agendamento",
  "validacao",
  "compromisso",
  "encerramento",
] as const;

export type EtapaSdr = (typeof ETAPAS_SDR)[number];

export const ROTULOS_ETAPAS_SDR: Record<EtapaSdr, string> = {
  apresentacao: "Apresentação",
  motivo: "Motivo da ligação",
  diagnostico: "Diagnóstico",
  dor_implicacao: "Dor e implicação",
  interesse: "Interesse e prontidão",
  agendamento: "Agendamento",
  validacao: "Validação",
  compromisso: "Compromisso",
  encerramento: "Encerramento",
};

export const INTENCOES_COPILOTO = [
  "responder_duvida",
  "reagir_e_conectar",
  "aprofundar",
  "avancar_roteiro",
  "contornar_objecao",
  "fechar_proximo_passo",
] as const;

export type IntencaoCopiloto = (typeof INTENCOES_COPILOTO)[number];

export const ROTULOS_INTENCOES: Record<IntencaoCopiloto, string> = {
  responder_duvida: "respondendo a dúvida",
  reagir_e_conectar: "reagindo e conectando",
  aprofundar: "aprofundando",
  avancar_roteiro: "avançando no roteiro",
  contornar_objecao: "contornando objeção",
  fechar_proximo_passo: "fechando o próximo passo",
};

export function intencaoValida(valor: unknown): valor is IntencaoCopiloto {
  return typeof valor === "string" && INTENCOES_COPILOTO.includes(valor as IntencaoCopiloto);
}

export function etapaSdrValida(valor: string): valor is EtapaSdr {
  return ETAPAS_SDR.includes(valor as EtapaSdr);
}

export function indiceEtapaSdr(etapa: string): number {
  const indice = ETAPAS_SDR.indexOf(etapa as EtapaSdr);
  return indice < 0 ? 0 : indice;
}

/** Texto comparável: sem acentos, sem pontuação, em minúsculas. */
export function normalizarFala(texto: string): string {
  return texto
    .toLocaleLowerCase("pt-BR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\W+/g, " ")
    .trim();
}

/** Semelhança simples por palavras compartilhadas (0 a 1). */
export function semelhanca(a: string, b: string): number {
  const pa = normalizarFala(a).split(" ").filter(Boolean);
  const pb = normalizarFala(b).split(" ").filter(Boolean);
  if (!pa.length || !pb.length) return 0;
  const restante = [...pb];
  let iguais = 0;
  for (const palavra of pa) {
    const i = restante.indexOf(palavra);
    if (i >= 0) {
      iguais++;
      restante.splice(i, 1);
    }
  }
  return (2 * iguais) / (pa.length + pb.length);
}

/** Verdadeiro quando a fala do vendedor é, na prática, eco do som da aba. */
export function ehEcoDoCliente(
  texto: string,
  recentesDoCliente: Array<{ texto: string; em: number }>,
  agora = Date.now(),
  janelaMs = 5000,
): boolean {
  return recentesDoCliente.some(
    (f) => agora - f.em <= janelaMs && semelhanca(texto, f.texto) > 0.85,
  );
}
