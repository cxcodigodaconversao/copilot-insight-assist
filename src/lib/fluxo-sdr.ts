export const PROTOCOLO_COPILOTO = "sdr-sequencial-v2";

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

export function etapaSdrValida(valor: string): valor is EtapaSdr {
  return ETAPAS_SDR.includes(valor as EtapaSdr);
}

export function indiceEtapaSdr(etapa: string): number {
  const indice = ETAPAS_SDR.indexOf(etapa as EtapaSdr);
  return indice < 0 ? 0 : indice;
}