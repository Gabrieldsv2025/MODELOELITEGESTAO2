import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Insumo } from '@/types';
import { supabaseInsumoStorage } from '@/utils/supabaseInsumosStorage';

export const useInsumos = () => {
  const [insumos, setInsumos] = useState<Insumo[]>([]);
  const [loading, setLoading] = useState(true);
  const channelIdRef = useRef(crypto.randomUUID());

  const refresh = useCallback(async () => {
    try {
      const data = await supabaseInsumoStorage.list();
      setInsumos(data);
    } catch (err) {
      console.error('Erro ao carregar insumos:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Realtime
  useEffect(() => {
    const channel = supabase
      .channel(`insumos_realtime_${channelIdRef.current}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'insumos' }, () => {
        refresh();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [refresh]);

  const insumosMap = useMemo(() => {
    const map: Record<string, Insumo> = {};
    insumos.forEach(i => { map[i.id] = i; });
    return map;
  }, [insumos]);

  const insumosBaixoEstoque = useMemo(
    () => insumos.filter(i => i.ativo && i.quantidadeEstoque <= i.estoqueMinimoAlerta),
    [insumos]
  );

  return { insumos, insumosMap, insumosBaixoEstoque, loading, refresh };
};
