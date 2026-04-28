import { Barbeiro } from '@/types';
import { supabase } from '@/integrations/supabase/client';

interface ComissaoPersonalizada {
  barbeiroId: string;
  servicos: { [servicoId: string]: number };
  produtos: { [produtoId: string]: number };
}

interface ComissaoHistorico {
  id: string;
  venda_id: string;
  barbeiro_id: string;
  item_id: string;
  item_tipo: string;
  percentual_comissao: number;
  valor_comissao: number;
  created_at: string;
}

export const getComissaoBarbeiro = async (
  barbeiroId: string, 
  itemId: string, 
  tipo: 'servico' | 'produto',
  barbeiro?: Barbeiro
): Promise<number> => {
  // Primeiro, verificar se existe configuração específica para este item
  const { data: configComissao } = await supabase
    .from('configuracoes_comissao')
    .select('percentual')
    .eq('barbeiro_id', barbeiroId)
    .eq('tipo', tipo)
    .eq(tipo === 'servico' ? 'servico_id' : 'produto_id', itemId)
    .single();

  if (configComissao) {
    return configComissao.percentual;
  }

  // Se não há configuração específica, usar a comissão padrão do barbeiro
  if (barbeiro) {
    return tipo === 'servico' ? barbeiro.comissaoServicos : barbeiro.comissaoProdutos;
  }
  
  return 0;
};

export const calcularComissaoVenda = async (
  barbeiroId: string,
  itens: Array<{
    id: string;
    tipo: 'servico' | 'produto';
    preco: number;
    quantidade: number;
    subtotal?: number; // Prefer subtotal if available (accounts for discounts)
  }>,
  barbeiro?: Barbeiro
): Promise<number> => {
  let comissaoTotal = 0;
  
  for (const item of itens) {
    const percentual = await getComissaoBarbeiro(barbeiroId, item.id, item.tipo, barbeiro);
    // Use subtotal if available (accounts for discounts), otherwise fall back to preco * quantidade
    const valorBase = item.subtotal ?? (item.preco * item.quantidade);
    const comissaoItem = (valorBase * percentual) / 100;
    comissaoTotal += comissaoItem;
  }
  
  return comissaoTotal;
};

// Nova função para obter comissões históricas de uma venda
export const getComissoesHistoricasVenda = async (vendaId: string): Promise<ComissaoHistorico[]> => {
  const { data, error } = await supabase
    .from('comissoes_historico')
    .select('*')
    .eq('venda_id', vendaId);

  if (error) {
    console.error('Erro ao buscar comissões históricas:', error);
    return [];
  }

  return data || [];
};

// Função para calcular o total de comissões de uma venda usando dados históricos
export const calcularComissaoVendaHistorica = async (vendaId: string): Promise<number> => {
  const comissoesHistoricas = await getComissoesHistoricasVenda(vendaId);
  return comissoesHistoricas.reduce((total, comissao) => total + Number(comissao.valor_comissao), 0);
};