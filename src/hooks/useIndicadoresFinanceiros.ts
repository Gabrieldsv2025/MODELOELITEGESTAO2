import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { IndicadorFinanceiro } from '@/types';
import { toast } from 'sonner';

export const useIndicadoresFinanceiros = () => {
  const [indicadores, setIndicadores] = useState<IndicadorFinanceiro[]>([]);
  const [loading, setLoading] = useState(true);
  const reloadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadIndicadores = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('indicadores_financeiros')
        .select('*')
        .order('ano_referencia', { ascending: false })
        .order('mes_referencia', { ascending: false });

      if (error) throw error;

      const indicadoresFormatados = (data || []).map(ind => ({
        id: ind.id,
        mesReferencia: ind.mes_referencia,
        anoReferencia: ind.ano_referencia,
        faturamentoBruto: Number(ind.faturamento_bruto),
        faturamentoLiquido: Number(ind.faturamento_liquido),
        totalDespesas: Number(ind.total_despesas),
        custoProdutos: Number(ind.custo_produtos),
        lucroBruto: Number(ind.lucro_bruto),
        lucroLiquido: Number(ind.lucro_liquido),
        margemBruta: Number(ind.margem_bruta),
        margemLiquida: Number(ind.margem_liquida),
        totalComissoes: Number(ind.total_comissoes),
        numeroVendas: ind.numero_vendas,
        ticketMedio: Number(ind.ticket_medio),
        createdAt: ind.created_at,
        updatedAt: ind.updated_at,
      }));

      setIndicadores(indicadoresFormatados);
    } catch (error) {
      console.error('Erro ao carregar indicadores:', error);
      toast.error('Erro ao carregar indicadores financeiros');
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounce para evitar avalanche de reloads quando vários eventos disparam ao mesmo tempo
  const scheduleReload = useCallback(() => {
    if (reloadTimerRef.current) clearTimeout(reloadTimerRef.current);
    reloadTimerRef.current = setTimeout(() => {
      loadIndicadores();
    }, 500);
  }, [loadIndicadores]);

  const getIndicadorPorPeriodo = (mes: number, ano: number): IndicadorFinanceiro | undefined => {
    return indicadores.find(
      ind => ind.mesReferencia === mes && ind.anoReferencia === ano
    );
  };

  const recalcularIndicadores = async (mes: number, ano: number) => {
    try {
      const { error } = await supabase.rpc('recalcular_indicadores_mensais', {
        p_mes: mes,
        p_ano: ano
      });

      if (error) throw error;

      toast.success('Indicadores recalculados com sucesso!');
      await loadIndicadores();
      return true;
    } catch (error) {
      console.error('Erro ao recalcular indicadores:', error);
      toast.error('Erro ao recalcular indicadores');
      return false;
    }
  };

  useEffect(() => {
    setLoading(true);
    loadIndicadores();

    // Realtime: indicadores_financeiros + tabelas que afetam os indicadores
    const channel = supabase.channel(`indicadores-cross-${crypto.randomUUID()}`);
    channel
      .on('postgres_changes', { event: '*', schema: 'public', table: 'indicadores_financeiros' }, scheduleReload)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'vendas' }, scheduleReload)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'itens_venda' }, scheduleReload)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comissoes_historico' }, scheduleReload)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'despesas' }, scheduleReload)
      .subscribe();

    return () => {
      if (reloadTimerRef.current) clearTimeout(reloadTimerRef.current);
      supabase.removeChannel(channel);
    };
  }, [loadIndicadores, scheduleReload]);

  return {
    indicadores,
    loading,
    getIndicadorPorPeriodo,
    recalcularIndicadores,
    refreshIndicadores: loadIndicadores
  };
};
