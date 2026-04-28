import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Promocao {
  id: string;
  nome: string;
  descricao?: string;
  tipo: 'desconto' | 'acrescimo';
  percentual: number;
  diasSemana: number[]; // 0=domingo, 1=segunda, ..., 6=sábado
  ativo: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PromocaoProdutoServico {
  id: string;
  promocaoId: string;
  itemId: string;
  itemTipo: 'produto' | 'servico';
  precoOriginal: number;
  precoPromocional: number;
  ativo: boolean; // se está ativa hoje
  createdAt: string;
  updatedAt: string;
}

export const usePromocoes = () => {
  const [promocoes, setPromocoes] = useState<Promocao[]>([]);
  const [promocoesProdutosServicos, setPromocoesProdutosServicos] = useState<PromocaoProdutoServico[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const channelIdRef = useRef(crypto.randomUUID());

  // Carregar dados
  const loadData = async () => {
    try {
      setLoading(true);
      
      const [promocoesResult, promocoesProdutosResult] = await Promise.all([
        supabase.from('promocoes').select('*').order('created_at', { ascending: false }),
        supabase.from('promocoes_produtos_servicos').select('*')
      ]);

      if (promocoesResult.error) throw promocoesResult.error;
      if (promocoesProdutosResult.error) throw promocoesProdutosResult.error;

      setPromocoes((promocoesResult.data || []).map(convertFromSupabase.promocao));
      setPromocoesProdutosServicos((promocoesProdutosResult.data || []).map(convertFromSupabase.promocaoProdutoServico));
    } catch (error) {
      console.error('Erro ao carregar promoções:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as promoções",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Conversores
  const convertFromSupabase = {
    promocao: (data: any): Promocao => ({
      id: data.id,
      nome: data.nome,
      descricao: data.descricao,
      tipo: data.tipo,
      percentual: data.percentual,
      diasSemana: data.dias_semana || [],
      ativo: data.ativo,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    }),

    promocaoProdutoServico: (data: any): PromocaoProdutoServico => ({
      id: data.id,
      promocaoId: data.promocao_id,
      itemId: data.item_id,
      itemTipo: data.item_tipo,
      precoOriginal: data.preco_original,
      precoPromocional: data.preco_promocional,
      ativo: data.ativo,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    })
  };

  const convertToSupabase = {
    promocao: (promocao: Partial<Promocao>) => ({
      nome: promocao.nome,
      descricao: promocao.descricao,
      tipo: promocao.tipo,
      percentual: promocao.percentual,
      dias_semana: promocao.diasSemana,
      ativo: promocao.ativo
    }),

    promocaoProdutoServico: (item: Partial<PromocaoProdutoServico>) => ({
      promocao_id: item.promocaoId,
      item_id: item.itemId,
      item_tipo: item.itemTipo,
      preco_original: item.precoOriginal,
      preco_promocional: item.precoPromocional,
      ativo: item.ativo
    })
  };

  // Criar promoção para produto/serviço
  const criarPromocaoProdutoServico = async (
    itemId: string,
    itemTipo: 'produto' | 'servico',
    precoOriginal: number,
    percentual: number,
    tipo: 'desconto' | 'acrescimo',
    diasSemana: number[]
  ): Promise<void> => {
    try {
      // Calcular preço promocional
      const precoPromocional = tipo === 'desconto' 
        ? precoOriginal * (1 - percentual / 100)
        : precoOriginal * (1 + percentual / 100);

      // Verificar se hoje está nos dias selecionados
      const hoje = new Date().getDay();
      const ativoHoje = diasSemana.includes(hoje);

      // Criar promoção
      const { data: promocaoData, error: promocaoError } = await supabase
        .from('promocoes')
        .insert([convertToSupabase.promocao({
          nome: `Promoção ${itemTipo} ${percentual}%`,
          tipo,
          percentual,
          diasSemana,
          ativo: true
        })])
        .select()
        .single();

      if (promocaoError) throw promocaoError;

      // Criar vínculo produto/serviço
      const { error: vinculoError } = await supabase
        .from('promocoes_produtos_servicos')
        .insert([convertToSupabase.promocaoProdutoServico({
          promocaoId: promocaoData.id,
          itemId,
          itemTipo,
          precoOriginal,
          precoPromocional,
          ativo: ativoHoje
        })]);

      if (vinculoError) throw vinculoError;

      toast({
        title: "Sucesso",
        description: `Promoção criada com ${percentual}% de ${tipo}`,
      });

      await loadData();
    } catch (error) {
      console.error('Erro ao criar promoção:', error);
      toast({
        title: "Erro",
        description: "Não foi possível criar a promoção",
        variant: "destructive"
      });
    }
  };

  // Remover promoção
  const removerPromocao = async (itemId: string, itemTipo: 'produto' | 'servico'): Promise<void> => {
    try {
      // Buscar promoção ativa para este item
      const { data: promocaoItem } = await supabase
        .from('promocoes_produtos_servicos')
        .select('promocao_id')
        .eq('item_id', itemId)
        .eq('item_tipo', itemTipo)
        .single();

      if (promocaoItem) {
        // Remover vínculo
        await supabase
          .from('promocoes_produtos_servicos')
          .delete()
          .eq('item_id', itemId)
          .eq('item_tipo', itemTipo);

        // Remover promoção se não tiver mais vínculos
        const { data: outrosVinculos } = await supabase
          .from('promocoes_produtos_servicos')
          .select('id')
          .eq('promocao_id', promocaoItem.promocao_id);

        if (!outrosVinculos || outrosVinculos.length === 0) {
          await supabase
            .from('promocoes')
            .delete()
            .eq('id', promocaoItem.promocao_id);
        }
      }

      toast({
        title: "Sucesso",
        description: "Promoção removida com sucesso",
      });

      await loadData();
    } catch (error) {
      console.error('Erro ao remover promoção:', error);
      toast({
        title: "Erro",
        description: "Não foi possível remover a promoção",
        variant: "destructive"
      });
    }
  };

  // Obter preço promocional para um item
  const obterPrecoPromocional = (itemId: string, itemTipo: 'produto' | 'servico'): number | null => {
    const promocaoAtiva = promocoesProdutosServicos.find(
      p => p.itemId === itemId && p.itemTipo === itemTipo && p.ativo
    );
    return promocaoAtiva?.precoPromocional || null;
  };

  // Verificar se item tem promoção ativa
  const temPromocaoAtiva = (itemId: string, itemTipo: 'produto' | 'servico'): boolean => {
    return promocoesProdutosServicos.some(
      p => p.itemId === itemId && p.itemTipo === itemTipo && p.ativo
    );
  };

  // Obter informações da promoção ativa
  const obterInfoPromocao = (itemId: string, itemTipo: 'produto' | 'servico') => {
    const promocaoItem = promocoesProdutosServicos.find(
      p => p.itemId === itemId && p.itemTipo === itemTipo && p.ativo
    );
    
    if (!promocaoItem) return null;

    const promocao = promocoes.find(p => p.id === promocaoItem.promocaoId);
    return {
      percentual: promocao?.percentual || 0,
      tipo: promocao?.tipo || 'desconto',
      precoOriginal: promocaoItem.precoOriginal,
      precoPromocional: promocaoItem.precoPromocional
    };
  };

  // Setup realtime listeners
  useEffect(() => {
    loadData();

    const promocoesChannel = supabase
      .channel(`promocoes-realtime-${channelIdRef.current}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'promocoes' }, loadData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'promocoes_produtos_servicos' }, loadData)
      .subscribe();

    return () => {
      supabase.removeChannel(promocoesChannel);
    };
  }, []);

  return {
    promocoes,
    promocoesProdutosServicos,
    loading,
    criarPromocaoProdutoServico,
    removerPromocao,
    obterPrecoPromocional,
    temPromocaoAtiva,
    obterInfoPromocao,
    refreshData: loadData
  };
};