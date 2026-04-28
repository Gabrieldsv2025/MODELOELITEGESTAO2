import { useMemo, useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList } from 'recharts';
import { format, startOfDay, endOfDay, startOfYear } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Barbeiro } from '@/types';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { generateMonthRange, getMonthKey, MonthBucket } from '@/utils/monthRange';
import { formatCurrency, formatCurrencyCompact } from '@/lib/utils';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';

interface ComissaoMensal {
  mes: string;
  total: number;
  mesCompleto: string;
  key: string;
  variacao: number | null; // % variation vs previous month
  variacaoValor: number | null; // absolute value variation
}

interface ComissoesChartProps {
  barbeiros: Barbeiro[];
  dataInicio: Date;
  dataFim: Date;
  vendas?: any[]; // Mantido para compatibilidade, mas não usado
}

export function ComissoesChart({ 
  barbeiros,
  dataFim,
  vendas
}: ComissoesChartProps) {
  const { usuario, canViewAllData } = useSupabaseAuth();
  const isAdmin = canViewAllData();
  const [barbeiroSelecionado, setBarbeiroSelecionado] = useState<string>('todos');
  const [dadosComComissoes, setDadosComComissoes] = useState<ComissaoMensal[]>([]);
  const [loading, setLoading] = useState(true);
  const [reloadTick, setReloadTick] = useState(0);
  const reloadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Force collaborator to only see their own data
  useEffect(() => {
    if (!isAdmin && usuario?.barbeiroId) {
      setBarbeiroSelecionado(usuario.barbeiroId);
    }
  }, [isAdmin, usuario?.barbeiroId]);

  // YTD: Always start from January 1st of the year being analyzed
  const dataInicioYTD = useMemo(() => startOfYear(dataFim), [dataFim]);
  
  // Generate month range based on YTD logic
  const monthBuckets = useMemo(() => generateMonthRange(dataInicioYTD, dataFim), [dataInicioYTD, dataFim]);

  // Realtime: recarregar somente quando snapshot/vendas mudarem
  // (configuracoes_comissao e barbeiros NÃO afetam vendas passadas)
  useEffect(() => {
    const scheduleReload = () => {
      if (reloadTimerRef.current) clearTimeout(reloadTimerRef.current);
      reloadTimerRef.current = setTimeout(() => setReloadTick(t => t + 1), 500);
    };
    const channel = supabase.channel(`comissoes-chart-${crypto.randomUUID()}`);
    channel
      .on('postgres_changes', { event: '*', schema: 'public', table: 'vendas' }, scheduleReload)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comissoes_historico' }, scheduleReload)
      .subscribe();
    return () => {
      if (reloadTimerRef.current) clearTimeout(reloadTimerRef.current);
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    const carregarDadosDiretos = async () => {
      setLoading(true);
      const startTime = performance.now();
      
      try {
        // Create structure with all months from January to current date
        const mesesDoPeriodo: ComissaoMensal[] = monthBuckets.map(bucket => ({
          mes: bucket.label,
          mesCompleto: bucket.labelLong,
          total: 0,
          key: bucket.key,
          variacao: null,
          variacaoValor: null
        }));

        // Preserva o fuso horário local ao consultar timestamptz no Supabase.
        // Sem ISO, vendas noturnas no Brasil podem cair no dia UTC seguinte e ficar fora do gráfico.
        const dataInicioStr = startOfDay(dataInicioYTD).toISOString();
        const dataFimStr = endOfDay(dataFim).toISOString();

        // ✅ SNAPSHOT IMUTÁVEL: somente comissoes_historico é a fonte de verdade
        // (sem fallback dinâmico para configuracoes_comissao atual)
        const PAGE_SIZE = 1000;
        let snapshotsAll: any[] = [];
        let hasMore = true;
        let page = 0;

        while (hasMore) {
          let q = supabase
            .from('comissoes_historico')
            .select(`
              valor_comissao,
              barbeiro_id,
              vendas!inner(data_venda, status, barbeiro_id)
            `)
            .gte('vendas.data_venda', dataInicioStr)
            .lte('vendas.data_venda', dataFimStr)
            .eq('vendas.status', 'pago')
            .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

          if (barbeiroSelecionado !== 'todos') {
            q = q.eq('vendas.barbeiro_id', barbeiroSelecionado);
          }

          const { data, error } = await q;
          if (error) {
            console.error('Erro na query de comissões (snapshot):', error);
            setDadosComComissoes(mesesDoPeriodo);
            setLoading(false);
            return;
          }

          if (data && data.length > 0) snapshotsAll = [...snapshotsAll, ...data];
          hasMore = (data?.length || 0) === PAGE_SIZE;
          page++;
        }

        // Agregar por mês usando exclusivamente o snapshot
        snapshotsAll.forEach((registro: any) => {
          const dataVenda = new Date(registro.vendas.data_venda);
          const monthKey = getMonthKey(dataVenda);
          const mesIndex = mesesDoPeriodo.findIndex(m => m.key === monthKey);
          if (mesIndex >= 0) {
            mesesDoPeriodo[mesIndex].total += Number(registro.valor_comissao) || 0;
          }
        });

        const allDataLen = snapshotsAll.length;

        // Calculate month-over-month variation
        for (let i = 0; i < mesesDoPeriodo.length; i++) {
          if (i === 0) {
            // First month (January) - no previous month in YTD view
            mesesDoPeriodo[i].variacao = null;
            mesesDoPeriodo[i].variacaoValor = null;
          } else {
            const valorAtual = mesesDoPeriodo[i].total;
            const valorAnterior = mesesDoPeriodo[i - 1].total;
            
            mesesDoPeriodo[i].variacaoValor = valorAtual - valorAnterior;
            
            if (valorAnterior > 0) {
              mesesDoPeriodo[i].variacao = ((valorAtual - valorAnterior) / valorAnterior) * 100;
            } else if (valorAtual > 0) {
              mesesDoPeriodo[i].variacao = Infinity; // "+∞"
            } else {
              mesesDoPeriodo[i].variacao = null; // N/A
            }
          }
        }

        setDadosComComissoes(mesesDoPeriodo);
        
        const endTime = performance.now();
        console.log(`⚡ Gráfico YTD carregado em ${(endTime - startTime).toFixed(0)}ms - ${allDataLen} vendas em ${page} página(s) (${format(dataInicioYTD, 'dd/MM/yyyy')} a ${format(dataFim, 'dd/MM/yyyy')})`);
      } catch (error) {
        console.error('Erro ao carregar dados do gráfico:', error);
      } finally {
        setLoading(false);
      }
    };
    
    carregarDadosDiretos();
  }, [barbeiros, barbeiroSelecionado, dataFim, dataInicioYTD, monthBuckets, vendas?.length, reloadTick]);

  const totalFiltrado = useMemo(() => {
    return dadosComComissoes.reduce((acc, item) => acc + item.total, 0);
  }, [dadosComComissoes]);

  // Format period for title (YTD)
  const anoAtual = dataFim.getFullYear();
  const periodoTitulo = `Acumulado ${anoAtual} (Jan - ${format(dataFim, 'MMM', { locale: ptBR })})`;

  // Custom tooltip component with variation
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;
    
    const data = payload[0].payload as ComissaoMensal;
    const variacao = data.variacao;
    const variacaoValor = data.variacaoValor;
    
    const getVariacaoDisplay = () => {
      if (variacao === null) return { text: 'N/A', color: 'text-muted-foreground' };
      if (variacao === Infinity) return { text: '+∞', color: 'text-emerald-600' };
      const prefix = variacao >= 0 ? '+' : '';
      const color = variacao >= 0 ? 'text-emerald-600' : 'text-red-500';
      return { text: `${prefix}${variacao.toFixed(1)}%`, color };
    };
    
    const getValorVariacaoDisplay = () => {
      if (variacaoValor === null) return { text: 'N/A', color: 'text-muted-foreground' };
      const prefix = variacaoValor >= 0 ? '+' : '';
      const color = variacaoValor >= 0 ? 'text-emerald-600' : 'text-red-500';
      return { text: `${prefix}${formatCurrency(variacaoValor)}`, color };
    };
    
    const variacaoDisplay = getVariacaoDisplay();
    const valorVariacaoDisplay = getValorVariacaoDisplay();
    
    return (
      <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
        <p className="font-semibold text-popover-foreground mb-2">{data.mesCompleto}</p>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-4">
            <span className="text-muted-foreground text-sm">Comissão Total:</span>
            <span className="font-medium text-popover-foreground">{formatCurrency(data.total)}</span>
          </div>
          <div className="border-t border-border pt-1.5 mt-1.5">
            <p className="text-xs text-muted-foreground mb-1">vs mês anterior:</p>
            <div className="flex items-center gap-2">
              {variacaoValor !== null && (
                variacaoValor >= 0 ? (
                  <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
                ) : (
                  <TrendingDown className="h-3.5 w-3.5 text-red-500" />
                )
              )}
              {variacaoValor === null && <Minus className="h-3.5 w-3.5 text-muted-foreground" />}
              <span className={`text-sm font-medium ${variacaoDisplay.color}`}>
                {variacaoDisplay.text}
              </span>
              <span className={`text-sm ${valorVariacaoDisplay.color}`}>
                ({valorVariacaoDisplay.text})
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            <CardTitle>Evolução Mensal das Comissões</CardTitle>
          </div>
          
          {isAdmin ? (
            <Select value={barbeiroSelecionado} onValueChange={setBarbeiroSelecionado}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filtrar por barbeiro" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os Barbeiros</SelectItem>
                {barbeiros
                  .sort((a, b) => a.nome.localeCompare(b.nome))
                  .map(barbeiro => (
                    <SelectItem key={barbeiro.id} value={barbeiro.id}>
                      {barbeiro.nome}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          ) : (
            <span className="text-sm text-muted-foreground">
              {usuario?.nome || 'Meus dados'}
            </span>
          )}
        </div>
        
        <p className="text-sm text-muted-foreground mt-2">
          Período: {periodoTitulo} | Total: <span className="font-semibold text-emerald-600">{formatCurrency(totalFiltrado)}</span>
        </p>
      </CardHeader>
      
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center h-[300px] text-muted-foreground">
            <p>Carregando dados...</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={dadosComComissoes} margin={{ top: 40, right: 10, left: 10, bottom: 5 }}>
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
                name="Comissão Total"
              >
                <LabelList 
                  dataKey="total" 
                  position="top"
                  offset={8}
                  formatter={(value: number) => formatCurrency(value)}
                  style={{ 
                    fontSize: dadosComComissoes.length <= 6 ? '11px' : dadosComComissoes.length <= 9 ? '9px' : '8px', 
                    fontWeight: 'bold',
                    fill: 'hsl(var(--foreground))'
                  }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
