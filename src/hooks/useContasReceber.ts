import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ContaReceber, PagamentoVenda } from '@/types';
import { useToast } from '@/hooks/use-toast';

interface ContaReceberDetalhada extends ContaReceber {
  clienteNome?: string;
  barbeiroNome?: string;
  dataVenda?: string;
  itensVenda?: Array<{ nome: string; tipo: string; subtotal: number }>;
}

export function useContasReceber() {
  const [contasPendentes, setContasPendentes] = useState<ContaReceberDetalhada[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchContasPendentes = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('contas_receber')
        .select('*')
        .eq('status', 'pendente')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Enrich with client/barber names and sale items
      const enriched: ContaReceberDetalhada[] = [];
      for (const conta of data || []) {
        // Fetch client name
        const { data: cliente } = await supabase
          .from('clientes')
          .select('nome')
          .eq('id', conta.cliente_id)
          .single();

        // Fetch barber name
        const { data: barbeiro } = await supabase
          .from('barbeiros')
          .select('nome')
          .eq('id', conta.barbeiro_id)
          .single();

        // Fetch sale date and items
        const { data: venda } = await supabase
          .from('vendas')
          .select('data_venda')
          .eq('id', conta.venda_id)
          .single();

        const { data: itens } = await supabase
          .from('itens_venda')
          .select('nome, tipo, subtotal')
          .eq('venda_id', conta.venda_id);

        enriched.push({
          id: conta.id,
          vendaId: conta.venda_id,
          clienteId: conta.cliente_id,
          barbeiroId: conta.barbeiro_id,
          valorTotalVenda: conta.valor_total_venda,
          valorPago: conta.valor_pago,
          saldoDevedor: conta.saldo_devedor,
          status: conta.status as 'pendente' | 'quitado',
          dataQuitacao: conta.data_quitacao,
          empresaId: conta.empresa_id,
          createdAt: conta.created_at,
          updatedAt: conta.updated_at,
          clienteNome: cliente?.nome,
          barbeiroNome: barbeiro?.nome,
          dataVenda: venda?.data_venda,
          itensVenda: itens?.map(i => ({ nome: i.nome, tipo: i.tipo, subtotal: i.subtotal })) || [],
        });
      }

      setContasPendentes(enriched);
    } catch (error) {
      console.error('Erro ao buscar contas a receber:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchPendenciasPorCliente = useCallback(async (clienteId: string) => {
    try {
      const { data, error } = await supabase
        .from('contas_receber')
        .select('*')
        .eq('cliente_id', clienteId)
        .eq('status', 'pendente');

      if (error) throw error;
      if (!data || data.length === 0) return [];

      const enriched: ContaReceberDetalhada[] = [];
      for (const conta of data) {
        const { data: barbeiro } = await supabase
          .from('barbeiros')
          .select('nome')
          .eq('id', conta.barbeiro_id)
          .single();

        const { data: venda } = await supabase
          .from('vendas')
          .select('data_venda')
          .eq('id', conta.venda_id)
          .single();

        const { data: itens } = await supabase
          .from('itens_venda')
          .select('nome, tipo, subtotal')
          .eq('venda_id', conta.venda_id);

        enriched.push({
          id: conta.id,
          vendaId: conta.venda_id,
          clienteId: conta.cliente_id,
          barbeiroId: conta.barbeiro_id,
          valorTotalVenda: conta.valor_total_venda,
          valorPago: conta.valor_pago,
          saldoDevedor: conta.saldo_devedor,
          status: conta.status as 'pendente' | 'quitado',
          dataQuitacao: conta.data_quitacao,
          empresaId: conta.empresa_id,
          createdAt: conta.created_at,
          updatedAt: conta.updated_at,
          barbeiroNome: barbeiro?.nome,
          dataVenda: venda?.data_venda,
          itensVenda: itens?.map(i => ({ nome: i.nome, tipo: i.tipo, subtotal: i.subtotal })) || [],
        });
      }
      return enriched;
    } catch (error) {
      console.error('Erro ao buscar pendências do cliente:', error);
      return [];
    }
  }, []);

  const quitarConta = useCallback(async (contaId: string, formaPagamento: string) => {
    try {
      // Get conta details
      const { data: conta, error: fetchError } = await supabase
        .from('contas_receber')
        .select('*')
        .eq('id', contaId)
        .single();

      if (fetchError || !conta) throw fetchError || new Error('Conta não encontrada');

      // Update conta status
      const { error: updateError } = await supabase
        .from('contas_receber')
        .update({
          status: 'quitado',
          data_quitacao: new Date().toISOString(),
        })
        .eq('id', contaId);

      if (updateError) throw updateError;

      // Insert payment record
      const { error: payError } = await supabase
        .from('pagamentos_venda')
        .insert({
          venda_id: conta.venda_id,
          forma_pagamento: formaPagamento,
          valor: conta.saldo_devedor,
        });

      if (payError) throw payError;

      toast({
        title: 'Conta quitada',
        description: `Saldo de R$ ${conta.saldo_devedor.toFixed(2)} foi quitado com sucesso.`,
      });

      // Refresh
      await fetchContasPendentes();
    } catch (error) {
      console.error('Erro ao quitar conta:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível quitar a conta.',
        variant: 'destructive',
      });
    }
  }, [fetchContasPendentes, toast]);

  const registrarInadimplencia = useCallback(async (
    vendaId: string,
    clienteId: string,
    barbeiroId: string,
    valorTotalVenda: number,
    valorPago: number,
    pagamentos: PagamentoVenda[]
  ) => {
    try {
      const saldoDevedor = valorTotalVenda - valorPago;

      // Insert contas_receber
      const { error: contaError } = await supabase
        .from('contas_receber')
        .insert({
          venda_id: vendaId,
          cliente_id: clienteId,
          barbeiro_id: barbeiroId,
          valor_total_venda: valorTotalVenda,
          valor_pago: valorPago,
          saldo_devedor: saldoDevedor,
          status: 'pendente',
        });

      if (contaError) throw contaError;

      // Insert pagamentos_venda
      for (const pag of pagamentos) {
        if (pag.valor > 0) {
          const { error: pagError } = await supabase
            .from('pagamentos_venda')
            .insert({
              venda_id: vendaId,
              forma_pagamento: pag.formaPagamento,
              valor: pag.valor,
            });
          if (pagError) throw pagError;
        }
      }
    } catch (error) {
      console.error('Erro ao registrar inadimplência:', error);
      throw error;
    }
  }, []);

  const registrarPagamentosVenda = useCallback(async (
    vendaId: string,
    pagamentos: PagamentoVenda[]
  ) => {
    try {
      for (const pag of pagamentos) {
        if (pag.valor > 0) {
          const { error } = await supabase
            .from('pagamentos_venda')
            .insert({
              venda_id: vendaId,
              forma_pagamento: pag.formaPagamento,
              valor: pag.valor,
            });
          if (error) throw error;
        }
      }
    } catch (error) {
      console.error('Erro ao registrar pagamentos:', error);
      throw error;
    }
  }, []);

  useEffect(() => {
    fetchContasPendentes();

    const contasChannel = supabase
      .channel('contas-receber-realtime')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'contas_receber'
      }, () => fetchContasPendentes())
      .subscribe();

    const vendasChannel = supabase
      .channel('contas-vendas-realtime')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'vendas'
      }, () => fetchContasPendentes())
      .subscribe();

    return () => {
      supabase.removeChannel(contasChannel);
      supabase.removeChannel(vendasChannel);
    };
  }, [fetchContasPendentes]);

  return {
    contasPendentes,
    loading,
    fetchContasPendentes,
    fetchPendenciasPorCliente,
    quitarConta,
    registrarInadimplencia,
    registrarPagamentosVenda,
  };
}
