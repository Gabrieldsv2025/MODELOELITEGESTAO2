import { supabaseComissaoStorage } from './supabaseStorage';
import { supabase } from '@/integrations/supabase/client';
import { Barbeiro, Venda, ItemVenda } from '@/types';
import { validarComissaoBarbeiro, validarValorComissao } from './comissoesValidator';

export interface ComissaoCalculada {
  barbeiroId: string;
  barbeiroNome: string;
  servicosComissao: { itemId: string; nome: string; valor: number; percentual: number }[];
  produtosComissao: { itemId: string; nome: string; valor: number; percentual: number }[];
  totalServicos: number;
  totalProdutos: number;
  totalGeral: number;
}

/**
 * Busca comissões históricas salvas para vendas específicas
 */
export const buscarComissoesHistoricas = async (
  barbeiroId: string,
  vendaIds: string[]
): Promise<{ [vendaId: string]: { [itemId: string]: { percentual: number; valor: number } } }> => {
  try {
    // Forçar limpeza de cache sempre
    console.log(`🔍 Buscando comissões históricas para barbeiro ${barbeiroId}...`);
    
    const { data, error } = await supabase
      .from('comissoes_historico')
      .select('*')
      .eq('barbeiro_id', barbeiroId)
      .in('venda_id', vendaIds);
    
    if (error) throw error;
    
    console.log(`📊 Dados históricos encontrados:`, data);
    
    const historico: { [vendaId: string]: { [itemId: string]: { percentual: number; valor: number } } } = {};
    
    data?.forEach(registro => {
      if (!historico[registro.venda_id]) {
        historico[registro.venda_id] = {};
      }
      historico[registro.venda_id][registro.item_id] = {
        percentual: Number(registro.percentual_comissao),
        valor: Number(registro.valor_comissao)
      };
    });
    
    return historico;
  } catch (error) {
    console.error('Erro ao buscar comissões históricas:', error);
    return {};
  }
};

/**
 * Calcula as comissões de um barbeiro usando histórico para vendas existentes e configurações atuais para novas
 */
export const calcularComissoesBarbeiro = async (
  barbeiro: Barbeiro,
  vendas: Venda[]
): Promise<ComissaoCalculada> => {
  console.log(`🧮 Calculando comissões para ${barbeiro.nome}...`);
  
  // Filtrar vendas do barbeiro
  const vendasBarbeiro = vendas.filter(venda => venda.barbeiroId === barbeiro.id && venda.status === 'pago');
  const vendaIds = vendasBarbeiro.map(v => v.id);
  
  // Buscar comissões históricas para essas vendas
  const comissoesHistoricas = await buscarComissoesHistoricas(barbeiro.id, vendaIds);
  
  // Buscar configurações de comissão atuais do barbeiro (para vendas sem histórico)
  const configuracoes = await supabaseComissaoStorage.getByBarbeiro(barbeiro.id);
  
  console.log(`📋 Configurações encontradas:`, configuracoes);
  console.log(`🗂️ Histórico de comissões:`, comissoesHistoricas);
  
  // Criar mapa de comissões personalizadas atuais
  const comissoesServicos: { [servicoId: string]: number } = {};
  const comissoesProdutos: { [produtoId: string]: number } = {};
  
  configuracoes.forEach(config => {
    if (config.tipo === 'servico' && config.servicoId) {
      comissoesServicos[config.servicoId] = config.percentual;
    } else if (config.tipo === 'produto' && config.produtoId) {
      comissoesProdutos[config.produtoId] = config.percentual;
    }
  });
  
  console.log(`💰 Comissões personalizadas atuais:`, { comissoesServicos, comissoesProdutos });
  
  const servicosComissao: { itemId: string; nome: string; valor: number; percentual: number }[] = [];
  const produtosComissao: { itemId: string; nome: string; valor: number; percentual: number }[] = [];
  
  let totalServicos = 0;
  let totalProdutos = 0;
  
  // Calcular comissões para cada venda
  vendasBarbeiro.forEach(venda => {
    venda.itens.forEach(item => {
      let percentual: number;
      let valorComissao: number;
      
      // Verificar se existe comissão histórica para esta venda/item
      const historicoVenda = comissoesHistoricas[venda.id];
      const comissaoHistorica = historicoVenda?.[item.itemId];
      
      if (comissaoHistorica) {
        // Usar dados históricos (preserva comissão original)
        percentual = comissaoHistorica.percentual;
        valorComissao = comissaoHistorica.valor;
        console.log(`📚 Usando histórico para ${item.nome}: ${percentual}% = R$ ${valorComissao}`);
      } else {
        // Usar configurações atuais (para vendas sem histórico)
        // PRIORIDADE: 1. Config personalizada, 2. Comissão padrão do barbeiro
        if (item.tipo === 'servico') {
          percentual = comissoesServicos[item.itemId] ?? barbeiro.comissaoServicos;
        } else {
          percentual = comissoesProdutos[item.itemId] ?? barbeiro.comissaoProdutos;
        }
        
        // VALIDAÇÃO DE SEGURANÇA: Garantir que barbeiros com 0% nunca tenham comissão
        const validacao = validarComissaoBarbeiro(barbeiro, percentual, item.tipo);
        if (!validacao.valido) {
          percentual = validacao.percentualCorrigido;
        }
        
        valorComissao = (item.subtotal * percentual) / 100;
        
        // Segunda camada de validação no valor final
        valorComissao = validarValorComissao(barbeiro, valorComissao, item.tipo);
        
        console.log(`🆕 Usando config atual para ${item.nome}: ${percentual}% = R$ ${valorComissao}`);
      }
      
      if (item.tipo === 'servico') {
        servicosComissao.push({
          itemId: item.itemId,
          nome: item.nome,
          valor: valorComissao,
          percentual
        });
        totalServicos += valorComissao;
      } else if (item.tipo === 'produto') {
        produtosComissao.push({
          itemId: item.itemId,
          nome: item.nome,
          valor: valorComissao,
          percentual
        });
        totalProdutos += valorComissao;
      }
    });
  });
  
  const totalGeral = totalServicos + totalProdutos;
  
  console.log(`✅ RESULTADO FINAL - ${barbeiro.nome}:`, {
    totalServicos: totalServicos.toFixed(2),
    totalProdutos: totalProdutos.toFixed(2),
    totalGeral: totalGeral.toFixed(2)
  });
  
  return {
    barbeiroId: barbeiro.id,
    barbeiroNome: barbeiro.nome,
    servicosComissao,
    produtosComissao,
    totalServicos,
    totalProdutos,
    totalGeral
  };
};

/**
 * Calcula a comissão de um item específico com base nas configurações do barbeiro
 */
export const calcularComissaoItem = async (
  barbeiroId: string,
  item: ItemVenda,
  comissaoPadrao: number
): Promise<{ valor: number; percentual: number }> => {
  try {
    // Buscar configurações de comissão do barbeiro
    const configuracoes = await supabaseComissaoStorage.getByBarbeiro(barbeiroId);
    
    // Encontrar configuração específica para este item
    const configuracao = configuracoes.find(config => {
      if (item.tipo === 'servico') {
        return config.tipo === 'servico' && config.servicoId === item.itemId;
      } else {
        return config.tipo === 'produto' && config.produtoId === item.itemId;
      }
    });
    
    // Usar comissão personalizada se existir, senão usar padrão
    const percentual = configuracao?.percentual ?? comissaoPadrao;
    const valor = (item.subtotal * percentual) / 100;
    
    return { valor, percentual };
  } catch (error) {
    console.error('Erro ao calcular comissão do item:', error);
    // Em caso de erro, usar comissão padrão
    const valor = (item.subtotal * comissaoPadrao) / 100;
    return { valor, percentual: comissaoPadrao };
  }
};

/**
 * Obter percentual de comissão de um item específico para um barbeiro
 */
export const obterPercentualComissao = async (
  barbeiroId: string,
  itemId: string,
  tipo: 'servico' | 'produto',
  comissaoPadrao: number
): Promise<number> => {
  try {
    const configuracoes = await supabaseComissaoStorage.getByBarbeiro(barbeiroId);
    
    const configuracao = configuracoes.find(config => {
      if (tipo === 'servico') {
        return config.tipo === 'servico' && config.servicoId === itemId;
      } else {
        return config.tipo === 'produto' && config.produtoId === itemId;
      }
    });
    
    return configuracao?.percentual ?? comissaoPadrao;
  } catch (error) {
    console.error('Erro ao obter percentual de comissão:', error);
    return comissaoPadrao;
  }
};