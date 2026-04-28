import { supabase } from '@/integrations/supabase/client';
import { Insumo, ProdutoReceita, UnidadeMedidaInsumo } from '@/types';

// Converte unidade de compra para unidade base (g, ml, un)
export const converterParaUnidadeBase = (qtd: number, unidade: UnidadeMedidaInsumo): number => {
  if (unidade === 'kg' || unidade === 'l') return qtd * 1000;
  return qtd;
};

// Label amigável da unidade base
export const getUnidadeBase = (unidade: UnidadeMedidaInsumo): string => {
  if (unidade === 'kg' || unidade === 'g') return 'g';
  if (unidade === 'l' || unidade === 'ml') return 'ml';
  return 'un';
};

// Formata quantidade no estoque com unidade base
export const formatarEstoque = (qtd: number, unidade: UnidadeMedidaInsumo): string => {
  const base = getUnidadeBase(unidade);
  const qtdNum = Number(qtd) || 0;
  if ((base === 'g' || base === 'ml') && Math.abs(qtdNum) >= 1000) {
    return `${(qtdNum / 1000).toFixed(3)} ${base === 'g' ? 'kg' : 'l'}`;
  }
  return `${qtdNum.toFixed(base === 'un' ? 0 : 2)} ${base}`;
};

const fromDb = (data: any): Insumo => ({
  id: data.id,
  nome: data.nome,
  descricao: data.descricao,
  unidadeMedida: data.unidade_medida,
  quantidadeEstoque: Number(data.quantidade_estoque),
  custoTotalCompra: Number(data.custo_total_compra),
  quantidadeCompra: Number(data.quantidade_compra),
  custoUnitario: Number(data.custo_unitario),
  estoqueMinimoAlerta: Number(data.estoque_minimo_alerta),
  ativo: data.ativo,
  createdAt: data.created_at,
  updatedAt: data.updated_at
});

export const supabaseInsumoStorage = {
  list: async (): Promise<Insumo[]> => {
    const { data, error } = await supabase
      .from('insumos')
      .select('*')
      .order('nome');
    if (error) throw error;
    return (data || []).map(fromDb);
  },

  add: async (insumo: Omit<Insumo, 'id' | 'createdAt' | 'updatedAt' | 'custoUnitario'>): Promise<Insumo> => {
    const { data, error } = await supabase
      .from('insumos')
      .insert({
        nome: insumo.nome,
        descricao: insumo.descricao,
        unidade_medida: insumo.unidadeMedida,
        quantidade_estoque: insumo.quantidadeEstoque,
        custo_total_compra: insumo.custoTotalCompra,
        quantidade_compra: insumo.quantidadeCompra,
        estoque_minimo_alerta: insumo.estoqueMinimoAlerta,
        ativo: insumo.ativo
      })
      .select()
      .single();
    if (error) throw error;
    return fromDb(data);
  },

  update: async (id: string, insumo: Partial<Insumo>): Promise<void> => {
    const payload: any = {};
    if (insumo.nome !== undefined) payload.nome = insumo.nome;
    if (insumo.descricao !== undefined) payload.descricao = insumo.descricao;
    if (insumo.unidadeMedida !== undefined) payload.unidade_medida = insumo.unidadeMedida;
    if (insumo.quantidadeEstoque !== undefined) payload.quantidade_estoque = insumo.quantidadeEstoque;
    if (insumo.custoTotalCompra !== undefined) payload.custo_total_compra = insumo.custoTotalCompra;
    if (insumo.quantidadeCompra !== undefined) payload.quantidade_compra = insumo.quantidadeCompra;
    if (insumo.estoqueMinimoAlerta !== undefined) payload.estoque_minimo_alerta = insumo.estoqueMinimoAlerta;
    if (insumo.ativo !== undefined) payload.ativo = insumo.ativo;
    
    const { error } = await supabase.from('insumos').update(payload).eq('id', id);
    if (error) throw error;
  },

  delete: async (id: string): Promise<void> => {
    const { error } = await supabase.from('insumos').delete().eq('id', id);
    if (error) throw error;
  },

  // Registrar entrada de compra (acumula estoque, atualiza custo da última compra)
  registrarCompra: async (id: string, quantidadeCompra: number, custoTotalCompra: number, unidade: UnidadeMedidaInsumo): Promise<void> => {
    // Buscar estoque atual
    const { data: atual, error: errSel } = await supabase
      .from('insumos')
      .select('quantidade_estoque')
      .eq('id', id)
      .single();
    if (errSel) throw errSel;
    
    const qtdBase = converterParaUnidadeBase(quantidadeCompra, unidade);
    const novoEstoque = Number(atual?.quantidade_estoque || 0) + qtdBase;
    
    // Atualiza estoque + dados da última compra (trigger recalcula custo_unitario)
    const { error: errUp } = await supabase
      .from('insumos')
      .update({
        quantidade_estoque: novoEstoque,
        custo_total_compra: custoTotalCompra,
        quantidade_compra: quantidadeCompra
      })
      .eq('id', id);
    if (errUp) throw errUp;
    
    // Registrar movimentação
    await supabase.from('movimentacoes_insumos').insert({
      insumo_id: id,
      tipo: 'entrada',
      quantidade: qtdBase,
      motivo: 'Compra registrada'
    });
  }
};

// ===== Receitas (Ficha Técnica) =====
export const supabaseReceitaStorage = {
  getByProduto: async (produtoId: string): Promise<ProdutoReceita[]> => {
    const { data, error } = await supabase
      .from('produtos_receitas')
      .select('*, insumos!inner(*)')
      .eq('produto_id', produtoId);
    if (error) throw error;
    return (data || []).map((row: any) => ({
      id: row.id,
      produtoId: row.produto_id,
      insumoId: row.insumo_id,
      quantidadeUtilizada: Number(row.quantidade_utilizada),
      insumo: row.insumos ? fromDb(row.insumos) : undefined
    }));
  },

  // Substitui a receita inteira do produto
  setReceita: async (produtoId: string, itens: { insumoId: string; quantidadeUtilizada: number }[]): Promise<void> => {
    // Deletar receita atual
    const { error: errDel } = await supabase
      .from('produtos_receitas')
      .delete()
      .eq('produto_id', produtoId);
    if (errDel) throw errDel;
    
    if (itens.length === 0) return;
    
    const rows = itens.map(it => ({
      produto_id: produtoId,
      insumo_id: it.insumoId,
      quantidade_utilizada: it.quantidadeUtilizada
    }));
    
    const { error: errIns } = await supabase
      .from('produtos_receitas')
      .insert(rows);
    if (errIns) throw errIns;
  }
};

// Calcula custo de produção a partir de uma receita
export const calcularCustoProducao = (receita: ProdutoReceita[], insumosMap?: Record<string, Insumo>): number => {
  return receita.reduce((total, item) => {
    const insumo = item.insumo || (insumosMap ? insumosMap[item.insumoId] : undefined);
    if (!insumo) return total;
    return total + item.quantidadeUtilizada * insumo.custoUnitario;
  }, 0);
};
