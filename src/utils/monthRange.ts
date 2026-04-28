import { startOfMonth, endOfMonth, addMonths, isBefore, isEqual, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export interface MonthBucket {
  key: string; // "2025-01"
  label: string; // "jan/25"
  labelLong: string; // "janeiro/2025"
  startOfMonth: Date;
  endOfMonth: Date;
  mesIndex: number;
  ano: number;
}

/**
 * Gera um array de "buckets" mensais baseado no range de datas.
 * Sempre inclui todos os meses dentro do range, mesmo que não tenham dados.
 * 
 * @param dataInicio - Data início do período
 * @param dataFim - Data fim do período
 * @returns Array de MonthBucket ordenado cronologicamente
 */
export const generateMonthRange = (dataInicio: Date, dataFim: Date): MonthBucket[] => {
  const result: MonthBucket[] = [];
  
  // Normalizar para início do mês
  let currentMonth = startOfMonth(dataInicio);
  const lastMonth = startOfMonth(dataFim);
  
  // Iterar mês a mês
  while (isBefore(currentMonth, lastMonth) || isEqual(currentMonth, lastMonth)) {
    const mesIndex = currentMonth.getMonth();
    const ano = currentMonth.getFullYear();
    
    result.push({
      key: format(currentMonth, 'yyyy-MM'),
      label: format(currentMonth, 'MMM/yy', { locale: ptBR }),
      labelLong: format(currentMonth, 'MMMM/yyyy', { locale: ptBR }),
      startOfMonth: startOfMonth(currentMonth),
      endOfMonth: endOfMonth(currentMonth),
      mesIndex,
      ano
    });
    
    currentMonth = addMonths(currentMonth, 1);
  }
  
  return result;
};

/**
 * Retorna a chave do mês (ex: "2025-01") para uma data específica.
 */
export const getMonthKey = (date: Date): string => {
  return format(date, 'yyyy-MM');
};
