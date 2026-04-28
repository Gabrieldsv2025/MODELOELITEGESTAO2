import type { Venda } from "@/types";

const EPS = 0.01;

const toNumber = (value: unknown): number => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

/**
 * Fonte única de verdade para valores exibidos de uma venda.
 *
 * Regra:
 * - Valor Original: soma de (preço * quantidade) dos itens
 * - Valor Líquido:
 *   - se os itens já carregam desconto (subtotal < original), usar soma dos subtotais
 *   - caso contrário, usar (original - desconto da venda)
 *   - se saldoDevedor informado, subtrair do líquido (inadimplência pendente)
 * - Desconto: derivado do cenário acima (nunca negativo)
 */
export function getVendaValores(venda: Venda, saldoDevedor?: number): {
  original: number;
  desconto: number;
  liquido: number;
} {
  const descontoVenda = Math.max(0, toNumber(venda.desconto));
  const pendente = saldoDevedor && saldoDevedor > 0 ? saldoDevedor : 0;

  const itens = venda.itens ?? [];
  const totalOriginalItens = itens.reduce(
    (sum, item) => sum + toNumber(item.preco) * Math.max(0, toNumber(item.quantidade)),
    0
  );
  const totalSubtotaisItens = itens.reduce((sum, item) => sum + toNumber(item.subtotal), 0);

  // Caso 1: temos itens suficientes para derivar tudo de forma confiável
  if (totalOriginalItens > 0) {
    const itensJaComDesconto = totalSubtotaisItens < totalOriginalItens - EPS;

    if (itensJaComDesconto) {
      const liquido = Math.max(0, totalSubtotaisItens - pendente);
      const desconto = Math.max(0, totalOriginalItens - totalSubtotaisItens);
      return { original: totalOriginalItens, desconto, liquido };
    }

    // Caso 1b: subtotais ~ original, então o desconto está no nível da venda
    const desconto = Math.min(descontoVenda, totalOriginalItens);
    const liquido = Math.max(0, totalOriginalItens - desconto - pendente);
    return { original: totalOriginalItens, desconto, liquido };
  }

  // Caso 2 (fallback): sem itens → usar venda.total como base
  const total = Math.max(0, toNumber(venda.total));

  // Se total parece ser líquido (ex.: total=15, desconto=15), reconstruir o original
  const original = descontoVenda > 0 && total > 0 && total <= descontoVenda + EPS ? total + descontoVenda : total;
  const desconto = Math.min(descontoVenda, original);
  const liquido = Math.max(0, original - desconto - pendente);

  return { original, desconto, liquido };
}
