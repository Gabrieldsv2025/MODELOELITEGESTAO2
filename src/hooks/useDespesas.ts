import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Despesa, ResumoDespesas } from '@/types';
import { toast } from 'sonner';

export const useDespesas = () => {
  const [despesas, setDespesas] = useState<Despesa[]>([]);
  const [loading, setLoading] = useState(true);

  const loadDespesas = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('despesas')
        .select('*')
        .order('data_despesa', { ascending: false });

      if (error) throw error;

      const despesasFormatadas = (data || []).map(d => ({
        id: d.id,
        descricao: d.descricao,
        categoria: d.categoria as Despesa['categoria'],
        valor: Number(d.valor),
        dataDespesa: d.data_despesa,
        formaPagamento: d.forma_pagamento as Despesa['formaPagamento'],
        fornecedor: d.fornecedor || undefined,
        observacao: d.observacao || undefined,
        status: d.status as 'ativo' | 'inativo',
        statusPagamento: (d.status_pagamento as 'pendente' | 'pago') || 'pendente',
        dataPagamento: d.data_pagamento || undefined,
        barbeiroId: d.barbeiro_id || undefined,
        isRecurring: d.is_recurring || false,
        recurringGroupId: d.recurring_group_id || undefined,
        recurrenceEndDate: d.recurrence_end_date || undefined,
        createdAt: d.created_at,
        updatedAt: d.updated_at,
      }));

      setDespesas(despesasFormatadas);
    } catch (error) {
      console.error('Erro ao carregar despesas:', error);
      toast.error('Erro ao carregar despesas');
    } finally {
      setLoading(false);
    }
  };

  const adicionarDespesa = async (despesa: Omit<Despesa, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      // Se NÃO for recorrente, inserção única normal
      if (!despesa.isRecurring) {
        const { data, error } = await supabase
          .from('despesas')
          .insert([{
            descricao: despesa.descricao,
            categoria: despesa.categoria,
            valor: despesa.valor,
            data_despesa: despesa.dataDespesa,
            forma_pagamento: despesa.formaPagamento,
            fornecedor: despesa.fornecedor,
            observacao: despesa.observacao,
            status: despesa.status,
            barbeiro_id: despesa.barbeiroId,
            is_recurring: false,
            status_pagamento: 'pendente',
            data_pagamento: null
          }])
          .select()
          .single();

        if (error) throw error;
        toast.success('Despesa adicionada com sucesso!');
        await loadDespesas();
        return true;
      }

      // Se FOR recorrente, criar despesa original + 12 projeções
      const groupId = crypto.randomUUID();
      const baseDate = new Date(despesa.dataDespesa);
      const despesasParaInserir = [];

      // Função auxiliar para adicionar meses mantendo o dia
      const adicionarMeses = (data: Date, meses: number): Date => {
        const resultado = new Date(data);
        resultado.setMonth(resultado.getMonth() + meses);
        
        // Ajustar se o dia não existe no mês (ex: 31 em fevereiro)
        if (resultado.getDate() !== data.getDate()) {
          resultado.setDate(0); // Último dia do mês anterior
        }
        return resultado;
      };

      // Função para formatar data como YYYY-MM-DD
      const formatarData = (data: Date): string => {
        return data.toISOString().split('T')[0];
      };

      // Calcular data final da recorrência (12 meses após a data base)
      const dataFinal = formatarData(adicionarMeses(baseDate, 12));

      // 1. Despesa original
      despesasParaInserir.push({
        descricao: despesa.descricao,
        categoria: despesa.categoria,
        valor: despesa.valor,
        data_despesa: despesa.dataDespesa,
        forma_pagamento: despesa.formaPagamento,
        fornecedor: despesa.fornecedor,
        observacao: despesa.observacao,
        status: despesa.status,
        barbeiro_id: despesa.barbeiroId,
        is_recurring: true,
        recurring_group_id: groupId,
        recurrence_end_date: dataFinal,
        status_pagamento: 'pendente',
        data_pagamento: null
      });

      // 2. Criar 12 projeções futuras
      for (let i = 1; i <= 12; i++) {
        const novaData = adicionarMeses(baseDate, i);
        despesasParaInserir.push({
          descricao: despesa.descricao,
          categoria: despesa.categoria,
          valor: despesa.valor,
          data_despesa: formatarData(novaData),
          forma_pagamento: despesa.formaPagamento,
          fornecedor: despesa.fornecedor,
          observacao: despesa.observacao,
          status: despesa.status,
          barbeiro_id: despesa.barbeiroId,
          is_recurring: true,
          recurring_group_id: groupId,
          recurrence_end_date: dataFinal,
          status_pagamento: 'pendente',
          data_pagamento: null
        });
      }

      // Inserir todas em lote
      const { error } = await supabase.from('despesas').insert(despesasParaInserir);
      if (error) throw error;

      toast.success('Despesa recorrente criada! 13 registros gerados (1 atual + 12 projeções)');
      await loadDespesas();
      return true;
    } catch (error) {
      console.error('Erro ao adicionar despesa:', error);
      toast.error('Erro ao adicionar despesa');
      return false;
    }
  };

  const editarDespesa = async (id: string, despesa: Partial<Despesa>) => {
    try {
      // 1. Buscar a despesa original para verificar se é recorrente
      const { data: despesaOriginal, error: fetchError } = await supabase
        .from('despesas')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      // 2. Se NÃO for recorrente e NÃO está sendo marcada como recorrente
      if (!despesaOriginal.is_recurring && despesa.isRecurring !== true) {
        const { error } = await supabase
          .from('despesas')
          .update({
            descricao: despesa.descricao,
            categoria: despesa.categoria,
            valor: despesa.valor,
            data_despesa: despesa.dataDespesa,
            forma_pagamento: despesa.formaPagamento,
            fornecedor: despesa.fornecedor,
            observacao: despesa.observacao,
            status: despesa.status,
            barbeiro_id: despesa.barbeiroId,
            is_recurring: false
          })
          .eq('id', id);

        if (error) throw error;
        toast.success('Despesa atualizada com sucesso!');
        await loadDespesas();
        return true;
      }

      // 3. Se NÃO era recorrente e AGORA É (mudança de status)
      if (!despesaOriginal.is_recurring && despesa.isRecurring === true) {
        const groupId = crypto.randomUUID();
        const baseDate = new Date(despesa.dataDespesa || despesaOriginal.data_despesa);
        
        const adicionarMeses = (data: Date, meses: number): Date => {
          const resultado = new Date(data);
          resultado.setMonth(resultado.getMonth() + meses);
          if (resultado.getDate() !== data.getDate()) {
            resultado.setDate(0);
          }
          return resultado;
        };

        const formatarData = (data: Date): string => {
          return data.toISOString().split('T')[0];
        };

        const dataFinal = formatarData(adicionarMeses(baseDate, 12));

        // Atualizar a despesa atual
        const { error: updateError } = await supabase.from('despesas').update({
          descricao: despesa.descricao,
          categoria: despesa.categoria,
          valor: despesa.valor,
          data_despesa: despesa.dataDespesa,
          forma_pagamento: despesa.formaPagamento,
          fornecedor: despesa.fornecedor,
          observacao: despesa.observacao,
          status: despesa.status,
          barbeiro_id: despesa.barbeiroId,
          is_recurring: true,
          recurring_group_id: groupId,
          recurrence_end_date: dataFinal
        }).eq('id', id);

        if (updateError) throw updateError;

        // Criar 12 projeções futuras
        const despesasParaInserir = [];
        for (let i = 1; i <= 12; i++) {
          const novaData = adicionarMeses(baseDate, i);
          despesasParaInserir.push({
            descricao: despesa.descricao,
            categoria: despesa.categoria,
            valor: despesa.valor,
            data_despesa: formatarData(novaData),
            forma_pagamento: despesa.formaPagamento,
            fornecedor: despesa.fornecedor,
            observacao: despesa.observacao,
            status: despesa.status,
            barbeiro_id: despesa.barbeiroId,
            is_recurring: true,
            recurring_group_id: groupId,
            recurrence_end_date: dataFinal
          });
        }

        const { error: insertError } = await supabase.from('despesas').insert(despesasParaInserir);
        if (insertError) throw insertError;

        toast.success('Despesa convertida para recorrente! 12 projeções criadas.');
        await loadDespesas();
        return true;
      }

      // 4. Se ERA recorrente e AGORA NÃO É (mudança de status)
      if (despesaOriginal.is_recurring && despesa.isRecurring === false) {
        const dataAtual = new Date();
        dataAtual.setHours(0, 0, 0, 0);

        // Atualizar a despesa atual para não recorrente
        const { error: updateError } = await supabase.from('despesas').update({
          descricao: despesa.descricao,
          categoria: despesa.categoria,
          valor: despesa.valor,
          data_despesa: despesa.dataDespesa,
          forma_pagamento: despesa.formaPagamento,
          fornecedor: despesa.fornecedor,
          observacao: despesa.observacao,
          status: despesa.status,
          barbeiro_id: despesa.barbeiroId,
          is_recurring: false,
          recurring_group_id: null,
          recurrence_end_date: null
        }).eq('id', id);

        if (updateError) throw updateError;

        // Excluir APENAS as projeções futuras
        const { error: deleteError } = await supabase
          .from('despesas')
          .delete()
          .eq('recurring_group_id', despesaOriginal.recurring_group_id)
          .gt('data_despesa', dataAtual.toISOString().split('T')[0])
          .neq('id', id);

        if (deleteError) throw deleteError;

        toast.success('Recorrência removida. Projeções futuras excluídas.');
        await loadDespesas();
        return true;
      }

      // 5. Se É recorrente e CONTINUA recorrente (edição de valor/descrição)
      if (despesaOriginal.is_recurring && despesa.isRecurring !== false) {
        const dataAtual = new Date();
        dataAtual.setHours(0, 0, 0, 0);
        const dataDespesa = new Date(despesaOriginal.data_despesa);
        dataDespesa.setHours(0, 0, 0, 0);

        // Atualizar a despesa atual
        const { error: updateError } = await supabase.from('despesas').update({
          descricao: despesa.descricao,
          categoria: despesa.categoria,
          valor: despesa.valor,
          data_despesa: despesa.dataDespesa,
          forma_pagamento: despesa.formaPagamento,
          fornecedor: despesa.fornecedor,
          observacao: despesa.observacao,
          status: despesa.status,
          barbeiro_id: despesa.barbeiroId
        }).eq('id', id);

        if (updateError) throw updateError;

        // REGRA: Preservar histórico - Atualizar APENAS projeções futuras
        const { error: updateFutureError } = await supabase
          .from('despesas')
          .update({
            descricao: despesa.descricao,
            categoria: despesa.categoria,
            valor: despesa.valor,
            forma_pagamento: despesa.formaPagamento,
            fornecedor: despesa.fornecedor,
            observacao: despesa.observacao,
            status: despesa.status
          })
          .eq('recurring_group_id', despesaOriginal.recurring_group_id)
          .gt('data_despesa', dataAtual.toISOString().split('T')[0])
          .neq('id', id);

        if (updateFutureError) throw updateFutureError;

        toast.success('Despesa atualizada! Valores propagados para meses futuros.');
        await loadDespesas();
        return true;
      }

      toast.success('Despesa atualizada com sucesso!');
      await loadDespesas();
      return true;
    } catch (error) {
      console.error('Erro ao editar despesa:', error);
      toast.error('Erro ao editar despesa');
      return false;
    }
  };

  const excluirDespesa = async (id: string) => {
    try {
      // Verificar se a despesa é recorrente
      const { data: despesa, error: fetchError } = await supabase
        .from('despesas')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      if (!despesa.is_recurring) {
        // Lógica atual - deletar apenas este registro
        const { error } = await supabase.from('despesas').delete().eq('id', id);
        if (error) throw error;
        toast.success('Despesa excluída com sucesso!');
      } else {
        // Se for recorrente, deletar apenas esta despesa
        const { error } = await supabase.from('despesas').delete().eq('id', id);
        if (error) throw error;
        toast.success('Despesa recorrente excluída.');
      }

      await loadDespesas();
      return true;
    } catch (error) {
      console.error('Erro ao excluir despesa:', error);
      toast.error('Erro ao excluir despesa');
      return false;
    }
  };

  const marcarComoPago = async (id: string, dataPagamento: string) => {
    try {
      // Validar se a despesa já não está paga
      const { data: despesa, error: fetchError } = await supabase
        .from('despesas')
        .select('status_pagamento')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      if (despesa?.status_pagamento === 'pago') {
        toast.error('Esta despesa já foi marcada como paga');
        return false;
      }

      const { error } = await supabase
        .from('despesas')
        .update({
          status_pagamento: 'pago',
          data_pagamento: dataPagamento
        })
        .eq('id', id);

      if (error) throw error;
      
      toast.success('Despesa marcada como paga!');
      await loadDespesas();
      return true;
    } catch (error) {
      console.error('Erro ao marcar despesa como paga:', error);
      toast.error('Erro ao marcar despesa como paga');
      return false;
    }
  };

  const calcularResumoDespesas = (despesasFiltradas: Despesa[]): ResumoDespesas => {
    const totalGeral = despesasFiltradas.reduce((sum, d) => sum + d.valor, 0);
    
    const porCategoria: { [key: string]: number } = {};
    const porFormaPagamento: { [key: string]: number } = {};
    
    despesasFiltradas.forEach(d => {
      porCategoria[d.categoria] = (porCategoria[d.categoria] || 0) + d.valor;
      porFormaPagamento[d.formaPagamento] = (porFormaPagamento[d.formaPagamento] || 0) + d.valor;
    });

    const diasUnicos = new Set(despesasFiltradas.map(d => d.dataDespesa)).size;
    const mediaDiaria = diasUnicos > 0 ? totalGeral / diasUnicos : 0;
    
    const mesesUnicos = new Set(
      despesasFiltradas.map(d => {
        const data = new Date(d.dataDespesa);
        return `${data.getFullYear()}-${data.getMonth()}`;
      })
    ).size;
    const mediaMensal = mesesUnicos > 0 ? totalGeral / mesesUnicos : 0;

    return {
      totalGeral,
      porCategoria,
      porFormaPagamento,
      mediaDiaria,
      mediaMensal
    };
  };

  useEffect(() => {
    loadDespesas();

    const channel = supabase
      .channel('despesas-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'despesas' }, () => {
        loadDespesas();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return {
    despesas,
    loading,
    adicionarDespesa,
    editarDespesa,
    excluirDespesa,
    marcarComoPago,
    calcularResumoDespesas,
    refreshDespesas: loadDespesas
  };
};
