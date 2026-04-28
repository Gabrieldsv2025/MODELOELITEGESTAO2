import { useState, useEffect, useCallback, useRef } from 'react';
import { Cliente, Barbeiro, Servico, Produto, Venda, ConfiguracaoComissao } from '@/types';
import { 
  supabaseClienteStorage,
  supabaseBarbeiroStorage,
  supabaseServicoStorage,
  supabaseProdutoStorage,
  supabaseVendaStorage,
  supabaseComissaoStorage
} from '@/utils/supabaseStorage';
import { supabase } from '@/integrations/supabase/client';

export const useSupabaseData = () => {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [barbeiros, setBarbeiros] = useState<Barbeiro[]>([]);
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [vendas, setVendas] = useState<Venda[]>([]);
  const [comissoes, setComissoes] = useState<ConfiguracaoComissao[]>([]);
  const [loading, setLoading] = useState(true);
  const isLoadingRef = useRef(false);
  const channelsRef = useRef<any[]>([]);
  const channelInstanceIdRef = useRef(crypto.randomUUID());

  // Carregamento otimizado em fases
  const loadDataOptimized = useCallback(async () => {
    if (isLoadingRef.current) return;
    
    try {
      isLoadingRef.current = true;
      setLoading(true);
      
      // Fase 1: Carregar dados essenciais rapidamente (dados pequenos)
      console.log('🚀 Carregando dados essenciais...');
      const [barbeirosData, servicosData] = await Promise.all([
        supabaseBarbeiroStorage.getAll(),
        supabaseServicoStorage.getAll()
      ]);
      
      setBarbeiros(barbeirosData);
      setServicos(servicosData);
      
      // Fase 2: Carregar dados médios
      console.log('📋 Carregando clientes e produtos...');
      const [clientesData, produtosData, comissoesData] = await Promise.all([
        supabaseClienteStorage.getAll(),
        supabaseProdutoStorage.getAll(), 
        supabaseComissaoStorage.getAll()
      ]);
      
      setClientes(clientesData);
      setProdutos(produtosData);
      setComissoes(comissoesData);
      
      // Fase 3: Carregar vendas por último (mais pesado)
      console.log('💳 Carregando vendas...');
      const vendasData = await supabaseVendaStorage.getAll();
      setVendas(vendasData);
      
      console.log('✅ Todos os dados carregados com sucesso!');
    } catch (error) {
      console.error('❌ Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
      isLoadingRef.current = false;
    }
  }, []);

  // Função para recarregar dados específicos
  const reloadSpecificData = useCallback(async (dataType: string) => {
    try {
      console.log(`🔄 Recarregando ${dataType}...`);
      switch (dataType) {
        case 'vendas':
          const vendasData = await supabaseVendaStorage.getAll();
          setVendas(vendasData);
          break;
        case 'barbeiros':
          const barbeirosData = await supabaseBarbeiroStorage.getAll();
          setBarbeiros(barbeirosData);
          break;
        case 'clientes':
          const clientesData = await supabaseClienteStorage.getAll();
          setClientes(clientesData);
          break;
        case 'produtos':
          const produtosData = await supabaseProdutoStorage.getAll();
          setProdutos(produtosData);
          break;
        case 'comissoes':
          const comissoesData = await supabaseComissaoStorage.getAll();
          setComissoes(comissoesData);
          break;
      }
    } catch (error) {
      console.error(`❌ Erro ao recarregar ${dataType}:`, error);
    }
  }, []);

  // Cleanup function para remover canais
  const cleanupChannels = useCallback(() => {
    channelsRef.current.forEach(channel => {
      supabase.removeChannel(channel);
    });
    channelsRef.current = [];
  }, []);

  // Sistema otimizado de listeners em tempo real
  useEffect(() => {
    // Limpeza inicial de canais existentes
    cleanupChannels();
    
    // Carregar dados otimizados
    loadDataOptimized();

    const channelSuffix = channelInstanceIdRef.current;

    // Setup listeners otimizados com debounce
    const vendasChannel = supabase
      .channel(`vendas-optimized-${channelSuffix}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'vendas'
      }, () => reloadSpecificData('vendas'))
      .subscribe();

    const barbeirosChannel = supabase
      .channel(`barbeiros-optimized-${channelSuffix}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'barbeiros'
      }, () => reloadSpecificData('barbeiros'))
      .subscribe();

    const clientesChannel = supabase
      .channel(`clientes-optimized-${channelSuffix}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'clientes'
      }, () => reloadSpecificData('clientes'))
      .subscribe();

    const produtosChannel = supabase
      .channel(`produtos-optimized-${channelSuffix}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'produtos'
      }, () => reloadSpecificData('produtos'))
      .subscribe();

    const comissoesChannel = supabase
      .channel(`comissoes-optimized-${channelSuffix}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'configuracoes_comissao'
      }, () => reloadSpecificData('comissoes'))
      .subscribe();

    // Armazenar referências dos canais
    channelsRef.current = [
      vendasChannel,
      barbeirosChannel, 
      clientesChannel,
      produtosChannel,
      comissoesChannel
    ];

    return () => {
      cleanupChannels();
    };
  }, [loadDataOptimized, reloadSpecificData, cleanupChannels]);

  return {
    clientes,
    barbeiros,
    servicos,
    produtos,
    vendas,
    comissoes,
    loading,
    refreshData: loadDataOptimized
  };
};