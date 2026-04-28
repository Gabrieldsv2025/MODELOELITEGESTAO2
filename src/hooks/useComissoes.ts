import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { supabaseComissaoStorage } from '@/utils/supabaseStorage';
import { calcularComissoesBarbeiro, calcularComissaoItem, obterPercentualComissao } from '@/utils/comissoesCalculator';
import { ConfiguracaoComissao } from '@/types';

export interface ComissaoPersonalizada {
  barbeiroId: string;
  servicos: { [servicoId: string]: number }; // servicoId -> percentual
  produtos: { [produtoId: string]: number }; // produtoId -> percentual
}

export const useComissoes = () => {
  const [comissoes, setComissoes] = useState<ConfiguracaoComissao[]>([]);
  const [loading, setLoading] = useState(true);

  const loadComissoes = async () => {
    try {
      setLoading(true);
      const data = await supabaseComissaoStorage.getAll();
      setComissoes(data);
    } catch (error) {
      console.error('Erro ao carregar comissões:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadComissoes();

    // Realtime: configuracoes_comissao + barbeiros (mudanças no default refletem cálculos)
    const comissoesChannel = supabase.channel(`comissoes-changes-${crypto.randomUUID()}`);
    comissoesChannel
      .on('postgres_changes', { event: '*', schema: 'public', table: 'configuracoes_comissao' }, async () => {
        const data = await supabaseComissaoStorage.getAll();
        setComissoes(data);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'barbeiros' }, async () => {
        // Default % do barbeiro mudou — recarrega para recalcular fallbacks
        const data = await supabaseComissaoStorage.getAll();
        setComissoes(data);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(comissoesChannel);
    };
  }, []);

  const getComissoesBarbeiro = (barbeiroId: string): ComissaoPersonalizada => {
    const comissoesBarbeiro = comissoes.filter(c => c.barbeiroId === barbeiroId);
    
    const servicos: { [servicoId: string]: number } = {};
    const produtos: { [produtoId: string]: number } = {};

    comissoesBarbeiro.forEach(comissao => {
      if (comissao.tipo === 'servico' && comissao.servicoId) {
        servicos[comissao.servicoId] = comissao.percentual;
      } else if (comissao.tipo === 'produto' && comissao.produtoId) {
        produtos[comissao.produtoId] = comissao.percentual;
      }
    });

    return {
      barbeiroId,
      servicos,
      produtos
    };
  };

  const salvarComissoesBarbeiro = async (
    barbeiroId: string,
    servicos: { [servicoId: string]: number },
    produtos: { [produtoId: string]: number }
  ): Promise<boolean> => {
    try {
      await supabaseComissaoStorage.saveComissoesBarbeiro(barbeiroId, servicos, produtos);
      // O realtime irá atualizar automaticamente os dados
      return true;
    } catch (error) {
      console.error('Erro ao salvar comissões:', error);
      return false;
    }
  };

  const removerComissao = async (comissaoId: string): Promise<boolean> => {
    try {
      await supabaseComissaoStorage.deleteComissao(comissaoId);
      return true;
    } catch (error) {
      console.error('Erro ao remover comissão:', error);
      return false;
    }
  };

  return {
    comissoes,
    loading,
    getComissoesBarbeiro,
    salvarComissoesBarbeiro,
    removerComissao,
    refreshComissoes: loadComissoes,
    // Funções utilitárias para cálculo
    calcularComissoesBarbeiro,
    calcularComissaoItem,
    obterPercentualComissao
  };
};