import { format, subDays, getDay, differenceInDays, subWeeks, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Venda } from '@/types';

export interface DayAnalytics {
  data: string;
  date: Date;
  vendas: number;
  faturamento: number;
  clientes: number;
  variacaoDiaAnterior: number | null;
  variacaoMesmoDiaSemanaAnterior: number | null;
  mediaFaturamento: number;
  // Novos campos para clientes
  clientesSemanaAnterior: number;
  variacaoClientesSemanaAnterior: number | null;
}

export interface MonthAnalytics {
  mes: string;
  date: Date;
  vendas: number;
  faturamento: number;
  variacaoMesAnterior: number;
  mediaFaturamento: number;
}

export interface HourAnalytics {
  hora: string;
  atendimentos: number;
  faturamento: number;
}

export interface DayOfWeekAnalytics {
  diaSemana: string;
  atendimentos: number;
  faturamento: number;
  percentual: number;
}

// Interface para filtros de mix
export interface MixFilterOptions {
  servicosSelecionados: string[];
  produtosSelecionados: string[];
}

/**
 * Calcula o faturamento de uma venda considerando filtros de mix
 * Se filtros estiverem ativos, soma apenas os itens que correspondem ao filtro
 */
const calcularFaturamentoComFiltro = (venda: Venda, mixFilter?: MixFilterOptions, saldoPendenteMap?: Map<string, number>): number => {
  const saldoPendente = saldoPendenteMap?.get(venda.id) || 0;

  // Se não houver filtro de mix, retornar o total da venda menos saldo pendente
  if (!mixFilter || (mixFilter.servicosSelecionados.length === 0 && mixFilter.produtosSelecionados.length === 0)) {
    return Math.max(0, venda.total - saldoPendente);
  }

  // Somar apenas os itens que correspondem aos filtros
  const totalFiltrado = venda.itens.reduce((sum, item) => {
    if (item.tipo === 'servico' && mixFilter.servicosSelecionados.includes(item.itemId)) {
      return sum + item.subtotal;
    }
    if (item.tipo === 'produto' && mixFilter.produtosSelecionados.includes(item.itemId)) {
      return sum + item.subtotal;
    }
    return sum;
  }, 0);
  return Math.max(0, totalFiltrado - saldoPendente);
};

/**
 * Calcula analytics por dia com comparações corretas vs semana anterior
 * @param todasVendas - Array completo de vendas (para buscar semana anterior)
 * @param vendasFiltradas - Array filtrado pelo período selecionado (para exibição)
 * @param dataInicio - Data início do período
 * @param dataFim - Data fim do período
 * @param mixFilter - Filtros de serviços e produtos selecionados (opcional)
 */
export const calculateDayAnalytics = (
  todasVendas: Venda[], 
  vendasFiltradas: Venda[],
  dataInicio: Date, 
  dataFim: Date,
  mixFilter?: MixFilterOptions,
  saldoPendenteMap?: Map<string, number>
): DayAnalytics[] => {
  const result: DayAnalytics[] = [];
  const totalDias = differenceInDays(dataFim, dataInicio) + 1;
  
  // Calcular média de faturamento do período filtrado (considerando mix)
  const faturamentoTotal = vendasFiltradas.reduce((sum, v) => sum + calcularFaturamentoComFiltro(v, mixFilter, saldoPendenteMap), 0);
  const mediaFaturamento = faturamentoTotal / totalDias;

  for (let i = 0; i < totalDias; i++) {
    const data = new Date(dataInicio);
    data.setDate(data.getDate() + i);
    const dataString = format(data, 'dd/MM', { locale: ptBR });
    
    // Vendas do dia atual (do array filtrado)
    const vendasDia = vendasFiltradas.filter(v => {
      const vendaData = new Date(v.dataVenda);
      return vendaData.toDateString() === data.toDateString();
    });
    
    const clientesUnicosDia = new Set(vendasDia.map(v => v.clienteId)).size;
    // Calcular faturamento considerando filtro de mix
    const faturamentoDia = vendasDia.reduce((sum, v) => sum + calcularFaturamentoComFiltro(v, mixFilter, saldoPendenteMap), 0);
    
    // Calcular variação vs dia anterior (buscar D-1 no array COMPLETO, não apenas no período)
    let variacaoDiaAnterior: number | null = null;
    const diaAnterior = subDays(data, 1);
    const vendasDiaAnterior = todasVendas.filter(v => {
      const vendaData = new Date(v.dataVenda);
      return vendaData.toDateString() === diaAnterior.toDateString() && v.status === 'pago';
    });
    const faturamentoDiaAnterior = vendasDiaAnterior.reduce((sum, v) => sum + calcularFaturamentoComFiltro(v, mixFilter, saldoPendenteMap), 0);
    
    if (faturamentoDiaAnterior > 0) {
      variacaoDiaAnterior = ((faturamentoDia - faturamentoDiaAnterior) / faturamentoDiaAnterior) * 100;
    } else if (faturamentoDia > 0) {
      variacaoDiaAnterior = Infinity; // Crescimento de 0 para algo
    }
    // Se ambos forem 0, mantém null (N/A)
    
    // Calcular variação vs MESMO DIA da semana anterior (D - 7 dias)
    // Buscar no array COMPLETO de vendas (não filtrado)
    const mesmoDiaSemanaAnterior = subWeeks(data, 1);
    const vendasMesmoDiaSemanaAnterior = todasVendas.filter(v => {
      const vendaData = new Date(v.dataVenda);
      return vendaData.toDateString() === mesmoDiaSemanaAnterior.toDateString();
    });
    // Calcular faturamento da semana anterior também com filtro de mix
    const faturamentoMesmoDiaSemanaAnterior = vendasMesmoDiaSemanaAnterior.reduce((sum, v) => sum + calcularFaturamentoComFiltro(v, mixFilter, saldoPendenteMap), 0);
    const clientesMesmoDiaSemanaAnterior = new Set(vendasMesmoDiaSemanaAnterior.map(v => v.clienteId)).size;
    
    // Calcular variação de faturamento vs semana anterior
    let variacaoMesmoDiaSemanaAnterior: number | null = null;
    if (faturamentoMesmoDiaSemanaAnterior > 0) {
      variacaoMesmoDiaSemanaAnterior = ((faturamentoDia - faturamentoMesmoDiaSemanaAnterior) / faturamentoMesmoDiaSemanaAnterior) * 100;
    } else if (faturamentoDia > 0) {
      variacaoMesmoDiaSemanaAnterior = Infinity; // Não havia vendas na semana anterior, mas há agora
    }
    // Se ambos forem 0, mantém null (N/A)
    
    // Calcular variação de CLIENTES vs semana anterior
    let variacaoClientesSemanaAnterior: number | null = null;
    if (clientesMesmoDiaSemanaAnterior > 0) {
      variacaoClientesSemanaAnterior = ((clientesUnicosDia - clientesMesmoDiaSemanaAnterior) / clientesMesmoDiaSemanaAnterior) * 100;
    } else if (clientesUnicosDia > 0) {
      variacaoClientesSemanaAnterior = Infinity; // Crescimento de 0 para algo
    }
    
    result.push({
      data: dataString,
      date: data,
      vendas: vendasDia.length,
      faturamento: faturamentoDia,
      clientes: clientesUnicosDia,
      variacaoDiaAnterior,
      variacaoMesmoDiaSemanaAnterior,
      mediaFaturamento,
      clientesSemanaAnterior: clientesMesmoDiaSemanaAnterior,
      variacaoClientesSemanaAnterior
    });
  }
  
  return result;
};

/**
 * Calcula analytics por mês com comparação cross-year (busca mês anterior mesmo se for do ano passado)
 * @param todasVendas - Array completo de vendas para buscar dados históricos
 * @param vendasPorMes - Array de meses a exibir (já filtrado/agregado)
 * @param mixFilter - Filtros de serviços e produtos selecionados (opcional)
 */
export const calculateMonthAnalytics = (
  todasVendas: Venda[], 
  vendasPorMes: any[],
  mixFilter?: MixFilterOptions,
  saldoPendenteMap?: Map<string, number>
): MonthAnalytics[] => {
  // Calcular média de faturamento do período
  const faturamentoTotal = vendasPorMes.reduce((sum, m) => sum + m.faturamento, 0);
  const mediaFaturamento = vendasPorMes.length > 0 ? faturamentoTotal / vendasPorMes.length : 0;
  
  return vendasPorMes.map((mes, index) => {
    // Calcular variação vs mês anterior
    let variacaoMesAnterior = 0;
    
    if (index > 0) {
      // Mês anterior está no array
      const faturamentoMesAnterior = vendasPorMes[index - 1]?.faturamento || 0;
      if (faturamentoMesAnterior > 0) {
        variacaoMesAnterior = ((mes.faturamento - faturamentoMesAnterior) / faturamentoMesAnterior) * 100;
      } else if (mes.faturamento > 0) {
        variacaoMesAnterior = Infinity; // Crescimento de 0 para algo
      }
    } else {
      // index === 0: Buscar mês anterior do ano passado (ex: Dez/2025 para Jan/2026)
      // Extrair mês/ano do label (ex: "jan/26" ou "Jan/2026")
      const mesKey = mes.key; // Formato: "2026-01"
      if (mesKey) {
        const [ano, mesNum] = mesKey.split('-').map(Number);
        const mesAnteriorDate = subMonths(new Date(ano, mesNum - 1, 1), 1);
        const mesAnteriorKey = `${mesAnteriorDate.getFullYear()}-${String(mesAnteriorDate.getMonth() + 1).padStart(2, '0')}`;
        
        // Buscar vendas do mês anterior no array completo
        const vendasMesAnterior = todasVendas.filter(v => {
          if (v.status !== 'pago') return false;
          const dataVenda = new Date(v.dataVenda);
          const vendaKey = `${dataVenda.getFullYear()}-${String(dataVenda.getMonth() + 1).padStart(2, '0')}`;
          return vendaKey === mesAnteriorKey;
        });
        
        const faturamentoMesAnterior = vendasMesAnterior.reduce((sum, v) => sum + calcularFaturamentoComFiltro(v, mixFilter, saldoPendenteMap), 0);
        
        if (faturamentoMesAnterior > 0) {
          variacaoMesAnterior = ((mes.faturamento - faturamentoMesAnterior) / faturamentoMesAnterior) * 100;
        } else if (mes.faturamento > 0) {
          variacaoMesAnterior = Infinity; // Crescimento de 0 para algo
        }
      }
    }
    
    return {
      mes: mes.mes,
      date: new Date(), // Placeholder
      vendas: mes.vendas,
      faturamento: mes.faturamento,
      variacaoMesAnterior,
      mediaFaturamento
    };
  });
};

/**
 * Calcula analytics por hora com suporte a filtro de mix
 */
export const calculateHourAnalytics = (vendas: Venda[], mixFilter?: MixFilterOptions, saldoPendenteMap?: Map<string, number>): HourAnalytics[] => {
  const hourMap = new Map<number, { atendimentos: number; faturamento: number }>();
  
  vendas.forEach(venda => {
    const hora = new Date(venda.horarioAtendimento || venda.dataVenda).getHours();
    const current = hourMap.get(hora) || { atendimentos: 0, faturamento: 0 };
    const faturamentoVenda = calcularFaturamentoComFiltro(venda, mixFilter, saldoPendenteMap);
    hourMap.set(hora, {
      atendimentos: current.atendimentos + 1,
      faturamento: current.faturamento + faturamentoVenda
    });
  });
  
  const result: HourAnalytics[] = [];
  for (let hora = 8; hora <= 20; hora++) {
    const data = hourMap.get(hora) || { atendimentos: 0, faturamento: 0 };
    result.push({
      hora: `${hora.toString().padStart(2, '0')}:00`,
      atendimentos: data.atendimentos,
      faturamento: data.faturamento
    });
  }
  
  return result.sort((a, b) => b.atendimentos - a.atendimentos);
};

/**
 * Calcula analytics por dia da semana com suporte a filtro de mix
 */
export const calculateDayOfWeekAnalytics = (vendas: Venda[], mixFilter?: MixFilterOptions, saldoPendenteMap?: Map<string, number>): DayOfWeekAnalytics[] => {
  const dayNames = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
  const dayMap = new Map<number, { atendimentos: number; faturamento: number }>();
  
  vendas.forEach(venda => {
    const dayOfWeek = getDay(new Date(venda.dataVenda));
    const current = dayMap.get(dayOfWeek) || { atendimentos: 0, faturamento: 0 };
    const faturamentoVenda = calcularFaturamentoComFiltro(venda, mixFilter, saldoPendenteMap);
    dayMap.set(dayOfWeek, {
      atendimentos: current.atendimentos + 1,
      faturamento: current.faturamento + faturamentoVenda
    });
  });
  
  const totalAtendimentos = vendas.length;
  
  return dayNames.map((nome, index) => {
    const data = dayMap.get(index) || { atendimentos: 0, faturamento: 0 };
    return {
      diaSemana: nome,
      atendimentos: data.atendimentos,
      faturamento: data.faturamento,
      percentual: totalAtendimentos > 0 ? (data.atendimentos / totalAtendimentos) * 100 : 0
    };
  }).sort((a, b) => b.atendimentos - a.atendimentos);
};
