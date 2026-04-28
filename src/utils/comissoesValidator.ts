import { Barbeiro } from '@/types';

/**
 * Validação de segurança para comissões
 * Garante que barbeiros com comissão 0% nunca tenham valores calculados incorretamente
 */
export const validarComissaoBarbeiro = (
  barbeiro: Barbeiro,
  percentualCalculado: number,
  tipo: 'servico' | 'produto'
): { valido: boolean; percentualCorrigido: number; motivo?: string } => {
  // Verificar se barbeiro tem comissão global 0% para o tipo específico
  const comissaoPadrao = tipo === 'servico' ? barbeiro.comissaoServicos : barbeiro.comissaoProdutos;
  
  // Se barbeiro tem comissão 0% configurada mas está sendo calculado valor > 0
  if (comissaoPadrao === 0 && percentualCalculado > 0) {
    console.warn(
      `⚠️ CORREÇÃO AUTOMÁTICA: ${barbeiro.nome} tem comissão ${tipo} configurada como 0%, ` +
      `mas foi calculado ${percentualCalculado}%. Corrigindo para 0%.`
    );
    return { 
      valido: false, 
      percentualCorrigido: 0,
      motivo: `Barbeiro configurado com comissão de ${tipo}s = 0%`
    };
  }
  
  return { valido: true, percentualCorrigido: percentualCalculado };
};

/**
 * Valida e corrige o valor de comissão calculado
 */
export const validarValorComissao = (
  barbeiro: Barbeiro,
  valorCalculado: number,
  tipo: 'servico' | 'produto'
): number => {
  const comissaoPadrao = tipo === 'servico' ? barbeiro.comissaoServicos : barbeiro.comissaoProdutos;
  
  // Se comissão padrão é 0%, forçar valor 0
  if (comissaoPadrao === 0 && valorCalculado > 0) {
    console.warn(
      `⚠️ CORREÇÃO DE VALOR: ${barbeiro.nome} - valor R$ ${valorCalculado.toFixed(2)} corrigido para R$ 0,00`
    );
    return 0;
  }
  
  return valorCalculado;
};
