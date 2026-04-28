import { useMemo, useState, useEffect } from "react";
import { format } from 'date-fns';
import { supabase } from "@/integrations/supabase/client";
import { ptBR } from 'date-fns/locale';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, LabelList, Legend } from "recharts";
import { Package, TrendingUp, Layers, ShoppingBag, CreditCard } from "lucide-react";
import { Venda, Servico, Produto } from '@/types';

// Cores padrão do sistema
const COLORS = {
  servicos: '#10B981',
  // Verde para serviços
  produtos: '#3B82F6' // Azul para produtos
};

// Cores para formas de pagamento
const PAYMENT_COLORS: Record<string, string> = {
  'pix': '#10B981',
  // Verde (popular no Brasil)
  'dinheiro': '#059669',
  // Verde escuro
  'debito': '#3B82F6',
  // Azul
  'credito': '#8B5CF6',
  // Roxo
  'transferencia': '#06B6D4',
  // Ciano
  'outros': '#6B7280' // Cinza
};

// Labels amigáveis para formas de pagamento
const PAYMENT_LABELS: Record<string, string> = {
  'pix': 'Pix',
  'dinheiro': 'Dinheiro',
  'debito': 'Débito',
  'credito': 'Crédito',
  'transferencia': 'Transferência',
  'outros': 'Outros'
};
interface MixAnalysisSectionProps {
  vendasFiltradas: Venda[];
  servicos: Servico[];
  produtos: Produto[];
}
export const MixAnalysisSection = ({
  vendasFiltradas,
  servicos,
  produtos
}: MixAnalysisSectionProps) => {
  // ========== VISUAL A: Share of Wallet (Rosca Serviços vs Produtos) ==========
  const shareOfWallet = useMemo(() => {
    let totalServicos = 0;
    let totalProdutos = 0;
    vendasFiltradas.filter(v => v.status === 'pago').forEach(venda => {
      venda.itens.forEach(item => {
        if (item.tipo === 'servico') {
          totalServicos += item.subtotal;
        } else if (item.tipo === 'produto') {
          totalProdutos += item.subtotal;
        }
      });
    });
    const total = totalServicos + totalProdutos;
    return [{
      name: 'Serviços',
      value: totalServicos,
      percentual: total > 0 ? totalServicos / total * 100 : 0,
      fill: COLORS.servicos
    }, {
      name: 'Produtos',
      value: totalProdutos,
      percentual: total > 0 ? totalProdutos / total * 100 : 0,
      fill: COLORS.produtos
    }];
  }, [vendasFiltradas]);

  // ========== VISUAL B: Top 10 Best-Sellers ==========
  const topBestSellers = useMemo(() => {
    const itensVendidos = new Map<string, {
      id: string;
      nome: string;
      tipo: 'servico' | 'produto';
      quantidade: number;
      receita: number;
    }>();
    vendasFiltradas.filter(v => v.status === 'pago').forEach(venda => {
      venda.itens.forEach(item => {
        const key = `${item.tipo}-${item.itemId}`;
        if (itensVendidos.has(key)) {
          const existing = itensVendidos.get(key)!;
          existing.quantidade += item.quantidade;
          existing.receita += item.subtotal;
        } else {
          itensVendidos.set(key, {
            id: item.itemId,
            nome: item.nome,
            tipo: item.tipo as 'servico' | 'produto',
            quantidade: item.quantidade,
            receita: item.subtotal
          });
        }
      });
    });
    return Array.from(itensVendidos.values()).sort((a, b) => b.quantidade - a.quantidade).slice(0, 10);
  }, [vendasFiltradas]);

  // ========== VISUAL C: Mapa de Calor (Item x Dia da Semana) ==========
  const heatmapData = useMemo(() => {
    const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const matriz: Record<string, Record<string, number>> = {};
    vendasFiltradas.filter(v => v.status === 'pago').forEach(venda => {
      const dataVenda = new Date(venda.dataVenda);
      const diaSemana = diasSemana[dataVenda.getDay()];
      venda.itens.forEach(item => {
        if (!matriz[item.nome]) {
          matriz[item.nome] = {};
          diasSemana.forEach(dia => matriz[item.nome][dia] = 0);
        }
        matriz[item.nome][diaSemana] += item.quantidade;
      });
    });

    // Calcular max global para intensidade
    let maxValue = 0;
    Object.values(matriz).forEach(dias => {
      Object.values(dias).forEach(val => {
        if (val > maxValue) maxValue = val;
      });
    });

    // Converter para array ordenado por total de vendas
    const diasSemanaKeys = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    return {
      data: Object.entries(matriz).map(([nome, dias]) => {
        const total = diasSemanaKeys.reduce((sum, dia) => sum + (dias[dia] || 0), 0);
        return {
          nome,
          ...dias,
          total
        };
      }).sort((a, b) => b.total - a.total).slice(0, 8),
      // Top 8 itens para não poluir
      maxValue,
      diasSemana: diasSemanaKeys
    };
  }, [vendasFiltradas]);

  // ========== VISUAL D: Ticket Médio por Tipo de Compra ==========
  const ticketPorCategoria = useMemo(() => {
    let vendasApenasServico = 0;
    let totalApenasServico = 0;
    let vendasServicoMaisProduto = 0;
    let totalServicoMaisProduto = 0;
    let vendasApenasProduto = 0;
    let totalApenasProduto = 0;
    vendasFiltradas.filter(v => v.status === 'pago').forEach(venda => {
      const temServico = venda.itens.some(i => i.tipo === 'servico');
      const temProduto = venda.itens.some(i => i.tipo === 'produto');
      if (temServico && temProduto) {
        vendasServicoMaisProduto++;
        totalServicoMaisProduto += venda.total;
      } else if (temServico) {
        vendasApenasServico++;
        totalApenasServico += venda.total;
      } else if (temProduto) {
        vendasApenasProduto++;
        totalApenasProduto += venda.total;
      }
    });
    return {
      apenasServico: {
        categoria: 'Apenas Serviço',
        ticketMedio: vendasApenasServico > 0 ? totalApenasServico / vendasApenasServico : 0,
        vendas: vendasApenasServico
      },
      servicoMaisProduto: {
        categoria: 'Serviço + Produto',
        ticketMedio: vendasServicoMaisProduto > 0 ? totalServicoMaisProduto / vendasServicoMaisProduto : 0,
        vendas: vendasServicoMaisProduto
      },
      apenasProduto: {
        categoria: 'Apenas Produto',
        ticketMedio: vendasApenasProduto > 0 ? totalApenasProduto / vendasApenasProduto : 0,
        vendas: vendasApenasProduto
      }
    };
  }, [vendasFiltradas]);

  // Calcular insight de cross-sell
  const crossSellInsight = useMemo(() => {
    if (ticketPorCategoria.apenasServico.ticketMedio > 0 && ticketPorCategoria.servicoMaisProduto.ticketMedio > 0) {
      const aumento = (ticketPorCategoria.servicoMaisProduto.ticketMedio / ticketPorCategoria.apenasServico.ticketMedio - 1) * 100;
      return aumento > 0 ? aumento : null;
    }
    return null;
  }, [ticketPorCategoria]);

  // ========== VISUAL E: Distribuição por Formas de Pagamento (from pagamentos_venda) ==========
  const [pagamentosDistribuicao, setPagamentosDistribuicao] = useState<Array<{
    forma: string;
    label: string;
    receita: number;
    vendas: number;
    percentual: number;
    fill: string;
  }>>([]);

  useEffect(() => {
    const vendasPagas = vendasFiltradas.filter(v => v.status === 'pago');
    if (vendasPagas.length === 0) {
      setPagamentosDistribuicao([]);
      return;
    }

    const vendaIds = vendasPagas.map(v => v.id);

    const fetchPagamentos = async () => {
      // Fetch split payment records from pagamentos_venda
      const { data: pagamentosRows, error } = await supabase
        .from('pagamentos_venda')
        .select('venda_id, forma_pagamento, valor')
        .in('venda_id', vendaIds);

      const agrupado = new Map<string, { receita: number; vendas: Set<string> }>();

      if (!error && pagamentosRows && pagamentosRows.length > 0) {
        // Track which sales have pagamentos_venda records
        const vendasComPagamentos = new Set(pagamentosRows.map(r => r.venda_id));

        // Aggregate from pagamentos_venda rows
        pagamentosRows.forEach(row => {
          const forma = row.forma_pagamento.toLowerCase();
          if (!agrupado.has(forma)) {
            agrupado.set(forma, { receita: 0, vendas: new Set() });
          }
          const entry = agrupado.get(forma)!;
          entry.receita += Number(row.valor);
          entry.vendas.add(row.venda_id);
        });

        // Fallback: sales without pagamentos_venda records (legacy data)
        vendasPagas.forEach(venda => {
          if (!vendasComPagamentos.has(venda.id)) {
            const forma = venda.formaPagamento.toLowerCase();
            if (!agrupado.has(forma)) {
              agrupado.set(forma, { receita: 0, vendas: new Set() });
            }
            const entry = agrupado.get(forma)!;
            entry.receita += venda.total;
            entry.vendas.add(venda.id);
          }
        });
      } else {
        // No pagamentos_venda at all — full fallback to venda.formaPagamento
        vendasPagas.forEach(venda => {
          const forma = venda.formaPagamento.toLowerCase();
          if (!agrupado.has(forma)) {
            agrupado.set(forma, { receita: 0, vendas: new Set() });
          }
          const entry = agrupado.get(forma)!;
          entry.receita += venda.total;
          entry.vendas.add(venda.id);
        });
      }

      const totalReceita = Array.from(agrupado.values()).reduce((sum, item) => sum + item.receita, 0);
      const resultado = Array.from(agrupado.entries()).map(([forma, dados]) => ({
        forma,
        label: PAYMENT_LABELS[forma] || forma.charAt(0).toUpperCase() + forma.slice(1),
        receita: dados.receita,
        vendas: dados.vendas.size,
        percentual: totalReceita > 0 ? (dados.receita / totalReceita) * 100 : 0,
        fill: PAYMENT_COLORS[forma] || PAYMENT_COLORS['outros']
      })).sort((a, b) => b.receita - a.receita);

      setPagamentosDistribuicao(resultado);
    };

    fetchPagamentos();
  }, [vendasFiltradas]);

  // Verificar se há dados para exibir
  const temDados = vendasFiltradas.filter(v => v.status === 'pago').length > 0;
  if (!temDados) {
    return <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            Análise de Mix de Vendas
          </CardTitle>
          <CardDescription>
            Distribuição e performance de serviços e produtos no período
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[200px] text-muted-foreground">
            Nenhuma venda encontrada no período selecionado
          </div>
        </CardContent>
      </Card>;
  }
  return <Card className="mt-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5 text-primary" />
          Análise de Mix de Vendas
        </CardTitle>
        <CardDescription>
          Distribuição e performance de serviços e produtos no período
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* VISUAL A: Share of Wallet (Gráfico de Rosca) */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Layers className="h-4 w-4" />
                Share of Wallet
              </CardTitle>
              <CardDescription className="text-xs">
                Receita: Serviços vs Produtos
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center">
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={shareOfWallet} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value" label={({
                    name,
                    percentual
                  }) => `${name}: ${percentual.toFixed(1)}%`} labelLine={false}>
                      {shareOfWallet.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.fill} />)}
                    </Pie>
                    <Tooltip formatter={(value: number) => [`R$ ${value.toFixed(2)}`, 'Receita']} contentStyle={{
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex gap-4 mt-2">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{
                    backgroundColor: COLORS.servicos
                  }} />
                    <span className="text-sm">Serviços</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{
                    backgroundColor: COLORS.produtos
                  }} />
                    <span className="text-sm">Produtos</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* VISUAL E: Distribuição por Formas de Pagamento */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Distribuição por Formas de Pagamento
              </CardTitle>
              <CardDescription className="text-xs">
                Faturamento por método de pagamento
              </CardDescription>
            </CardHeader>
            <CardContent>
              {pagamentosDistribuicao.length === 0 ? <div className="flex items-center justify-center h-[220px] text-muted-foreground">
                  Nenhum pagamento no período
                </div> : <div className="flex flex-col items-center">
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={pagamentosDistribuicao} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="receita" label={({
                    label,
                    percentual
                  }) => `${label}: ${percentual.toFixed(1)}%`} labelLine={false}>
                        {pagamentosDistribuicao.map((entry, index) => <Cell key={`cell-payment-${index}`} fill={entry.fill} />)}
                      </Pie>
                      <Tooltip content={({
                    active,
                    payload
                  }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return <div className="bg-background border rounded p-3 shadow-lg">
                                <p className="font-bold mb-1">{data.label}</p>
                                <p className="text-sm">Valor: <span className="font-semibold">R$ {data.receita.toFixed(2)}</span></p>
                                <p className="text-sm">Vendas: <span className="font-semibold">{data.vendas}</span></p>
                                <p className="text-sm">Participação: <span className="font-semibold">{data.percentual.toFixed(1)}%</span></p>
                              </div>;
                    }
                    return null;
                  }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex flex-wrap gap-3 mt-2 justify-center">
                    {pagamentosDistribuicao.map((item, idx) => <div key={idx} className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{
                    backgroundColor: item.fill
                  }} />
                        <span className="text-sm">{item.label}</span>
                      </div>)}
                  </div>
                </div>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <ShoppingBag className="h-4 w-4" />
                Ticket Médio por Tipo de Compra
              </CardTitle>
              <CardDescription className="text-xs">
                Comparativo de valor médio por tipo de venda
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="text-center p-4 border rounded-lg bg-muted/30">
                  <p className="text-xs text-muted-foreground mb-1">Apenas Serviço</p>
                  <p className="text-lg font-bold" style={{
                  color: COLORS.servicos
                }}>
                    R$ {ticketPorCategoria.apenasServico.ticketMedio.toFixed(2)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {ticketPorCategoria.apenasServico.vendas} vendas
                  </p>
                </div>
                <div className="text-center p-4 border rounded-lg bg-primary/5 border-primary/20">
                  <p className="text-xs text-muted-foreground mb-1">Serviço + Produto</p>
                  <p className="text-lg font-bold text-primary">
                    R$ {ticketPorCategoria.servicoMaisProduto.ticketMedio.toFixed(2)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {ticketPorCategoria.servicoMaisProduto.vendas} vendas
                  </p>
                </div>
                <div className="text-center p-4 border rounded-lg bg-muted/30">
                  <p className="text-xs text-muted-foreground mb-1">Apenas Produto</p>
                  <p className="text-lg font-bold" style={{
                  color: COLORS.produtos
                }}>
                    R$ {ticketPorCategoria.apenasProduto.ticketMedio.toFixed(2)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {ticketPorCategoria.apenasProduto.vendas} vendas
                  </p>
                </div>
              </div>
              {crossSellInsight && crossSellInsight > 0 && <div className="flex justify-center">
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800">
                    <TrendingUp className="h-3 w-3 mr-1" />
                    Cross-sell aumenta ticket em {crossSellInsight.toFixed(1)}%
                  </Badge>
                </div>}
            </CardContent>
          </Card>

          {/* VISUAL B: Top 10 Best-Sellers (Barras Horizontais) */}
          

          {/* VISUAL C: Mapa de Calor */}
          <Card className="lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Package className="h-4 w-4" />
                Mapa de Calor: Item x Dia da Semana
              </CardTitle>
              <CardDescription className="text-xs">
                Identifique padrões de demanda por dia da semana
              </CardDescription>
            </CardHeader>
            <CardContent>
              {heatmapData.data.length === 0 ? <div className="flex items-center justify-center h-[200px] text-muted-foreground">
                  Nenhum dado disponível para o mapa de calor
                </div> : <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr>
                        <th className="text-left p-2 font-medium min-w-[150px]">Item</th>
                        {heatmapData.diasSemana.map(dia => <th key={dia} className="text-center p-2 font-medium w-12">{dia}</th>)}
                        <th className="text-center p-2 font-medium w-16">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {heatmapData.data.map((item, idx) => <tr key={idx} className="border-t border-border">
                          <td className="p-2 font-medium truncate max-w-[150px]" title={item.nome}>
                            {item.nome}
                          </td>
                          {heatmapData.diasSemana.map(dia => {
                      const value = item[dia as keyof typeof item] as number || 0;
                      const intensity = heatmapData.maxValue > 0 ? value / heatmapData.maxValue : 0;
                      return <td key={dia} className="text-center p-2 transition-colors" style={{
                        backgroundColor: value > 0 ? `rgba(16, 185, 129, ${Math.max(0.1, intensity)})` : 'transparent',
                        color: intensity > 0.5 ? 'white' : 'inherit',
                        fontWeight: value > 0 ? '600' : '400'
                      }}>
                                {value > 0 ? value : '-'}
                              </td>;
                    })}
                          <td className="text-center p-2 font-bold bg-muted/50">
                            {item.total}
                          </td>
                        </tr>)}
                    </tbody>
                  </table>
                </div>}
            </CardContent>
          </Card>
        </div>
      </CardContent>
    </Card>;
};
export default MixAnalysisSection;