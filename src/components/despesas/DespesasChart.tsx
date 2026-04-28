import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList } from 'recharts';
import { TrendingUp } from 'lucide-react';
import { Despesa } from '@/types';
import { useMemo } from 'react';
import { format, subMonths, startOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { formatCurrency, formatCurrencyCompact } from '@/lib/utils';

interface DespesasChartProps {
  despesas: Despesa[];
  loading: boolean;
  anoSelecionado: number;
}

export function DespesasChart({ despesas, loading, anoSelecionado }: DespesasChartProps) {
  const chartData = useMemo(() => {
    if (!despesas || despesas.length === 0) return [];

    // Criar mapa de todos os 12 meses do ano selecionado
    const mesesDoAno: { [mesAno: string]: number } = {};
    
    // Inicializar todos os meses do ano selecionado com 0
    for (let mes = 0; mes < 12; mes++) {
      const chave = `${anoSelecionado}-${String(mes + 1).padStart(2, '0')}`;
      mesesDoAno[chave] = 0;
    }

    // Agrupar despesas APENAS do ano selecionado
    despesas.forEach(despesa => {
      const dataDespesa = new Date(despesa.dataDespesa);
      const anoDespesa = dataDespesa.getFullYear();
      
      // Ignorar despesas de outros anos
      if (anoDespesa !== anoSelecionado) return;
      
      const mes = dataDespesa.getMonth(); // 0-11
      const chave = `${anoSelecionado}-${String(mes + 1).padStart(2, '0')}`;
      
      mesesDoAno[chave] += despesa.valor;
    });

    // Converter para array e FILTRAR apenas meses com valor > 0
    return Object.entries(mesesDoAno)
      .map(([chave, total]) => {
        const [ano, mes] = chave.split('-');
        const data = new Date(parseInt(ano), parseInt(mes) - 1, 1);
        
        return {
          mes: format(data, 'MMM/yy', { locale: ptBR }),
          mesCompleto: format(data, 'MMMM/yyyy', { locale: ptBR }),
          total: Number(total.toFixed(2)),
          ordem: parseInt(mes)
        };
      })
      .filter(item => item.total > 0) // Exibir apenas meses com despesas
      .sort((a, b) => a.ordem - b.ordem); // Ordenar jan->dez
  }, [despesas, anoSelecionado]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border border-border rounded-lg shadow-lg p-3">
          <p className="text-sm font-medium">{payload[0].payload.mesCompleto}</p>
          <p className="text-lg font-bold text-primary">
            {formatCurrency(payload[0].value)}
          </p>
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Evolução das Despesas Mensais
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[400px] flex items-center justify-center">
            <p className="text-muted-foreground">Carregando gráfico...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Evolução das Despesas Mensais
          </CardTitle>
          <CardDescription>Últimos 12 meses</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[400px] flex items-center justify-center">
            <p className="text-muted-foreground">Nenhuma despesa registrada</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Evolução das Despesas Mensais
        </CardTitle>
        <CardDescription>Despesas do ano de {anoSelecionado} (apenas meses com valores)</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis 
              dataKey="mes" 
              className="text-xs"
              tick={{ fill: 'hsl(var(--foreground))' }}
            />
            <YAxis 
              className="text-xs"
              tick={{ fill: 'hsl(var(--foreground))' }}
              tickFormatter={(value) => formatCurrencyCompact(value)}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar 
              dataKey="total" 
              fill="hsl(var(--primary))" 
              radius={[8, 8, 0, 0]}
            >
              <LabelList 
                dataKey="total" 
                position="top" 
                formatter={(value: number) => formatCurrency(value)}
                style={{ fill: 'hsl(var(--foreground))', fontSize: '11px', fontWeight: '600' }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
