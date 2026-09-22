// Regra única de resolução do conteúdo do cérebro por produto.
// Se o produto tem itens próprios, apenas eles valem naquele produto.
// Sem itens próprios, valem os itens do padrão geral (oferta_id null).
export type ItemPorProduto = { oferta_id: string | null; oculto?: boolean };

export function temConteudoProprio<T extends ItemPorProduto>(
  linhas: T[],
  ofertaId: string | null,
): boolean {
  if (!ofertaId) return false;
  return linhas.some((l) => l.oferta_id === ofertaId);
}

export function resolverPorProduto<T extends ItemPorProduto>(
  linhas: T[],
  ofertaId: string | null,
): T[] {
  if (temConteudoProprio(linhas, ofertaId)) {
    return linhas.filter((l) => l.oferta_id === ofertaId && !l.oculto);
  }
  return linhas.filter((l) => l.oferta_id === null && !l.oculto);
}
