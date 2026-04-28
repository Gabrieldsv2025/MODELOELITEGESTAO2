import { useState, useEffect, useMemo, useCallback } from "react";
import { format, subDays, startOfMonth, endOfMonth, subMonths, differenceInDays, formatDistanceToNow, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useSupabaseData } from '@/hooks/useSupabaseData';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { useIndicadoresFinanceiros } from '@/hooks/useIndicadoresFinanceiros';
import { useDespesas } from '@/hooks/useDespesas';
import { useComissoes } from '@/hooks/useComissoes';
import { useUserPermissions, RELATORIOS_TABS, RelatorioTabKey } from '@/hooks/useUserPermissions';
import { ResponsiveLayout } from "@/components/layout/ResponsiveLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, LabelList, AreaChart, Area, ComposedChart, Legend } from "recharts";
import { Download, TrendingUp, TrendingDown, Users, Scissors, Package, DollarSign, Calendar as CalendarIcon, Crown, Heart, Star, ChevronUp, ChevronDown, ChevronsUpDown, Wallet, TrendingDownIcon, Info } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { DetalhamentoVendasPaginado } from '@/components/relatorios/DetalhamentoVendasPaginado';
import { EnhancedDayTooltip, EnhancedMonthTooltip, EnhancedClientsTooltip } from '@/components/relatorios/EnhancedTooltips';
import { BusiestTimesAnalysis } from '@/components/relatorios/BusiestTimesAnalysis';
import { MixAnalysisSection } from '@/components/relatorios/MixAnalysisSection';
import { MixFilters } from '@/components/relatorios/MixFilters';
import { MemoriaCalculoModal } from '@/components/despesas/MemoriaCalculoModal';
import { supabase } from '@/integrations/supabase/client';
import { useContasReceber } from '@/hooks/useContasReceber';
import { AlertTriangle, CheckCircle } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Select as SelectUI } from '@/components/ui/select';
import { calculateDayAnalytics, calculateMonthAnalytics, calculateHourAnalytics, calculateDayOfWeekAnalytics, DayAnalytics, MonthAnalytics, MixFilterOptions } from '@/utils/analyticsCalculations';
import { Venda, Cliente, Produto, Servico, Barbeiro } from '@/types';
import { generateMonthRange, getMonthKey } from '@/utils/monthRange';

// Mapeamento de chaves de permissão para valores de aba
const TAB_PERMISSION_MAP: Record<RelatorioTabKey, string> = {
  'vendas_mes': 'vendas-mes',
  'detalhamento': 'detalhamento',
  'categorias': 'categorias',
  'clientes': 'clientes',
  'barbeiros': 'barbeiros',
  'rankings': 'ranking',
  'financeiro': 'financeiro'
};

// Paleta de cores moderna
const COLORS = {
  primary: '#059669',
  // Verde esmeralda (cor principal do sistema)
  success: '#10B981',
  // Verde
  warning: '#F59E0B',
  // Dourado/Laranja
  danger: '#EF4444',
  // Vermelho
  info: '#06B6D4',
  // Azul claro
  purple: '#8B5CF6',
  // Roxo
  indigo: '#6366F1',
  // Índigo
  emerald: '#059669' // Verde esmeralda
};

// Cor única para gráficos de barras - mantém visual limpo e profissional
const CHART_PRIMARY_COLOR = '#059669'; // Cor primária do sistema (emerald)

const CHART_COLORS = [COLORS.primary, COLORS.success, COLORS.warning, COLORS.danger, COLORS.info, COLORS.purple, COLORS.indigo, COLORS.emerald];

// Função para gerar cores para barbeiros (usado em gráficos de pizza/comparativos)
const getBarbeiroColor = (index: number) => CHART_COLORS[index % CHART_COLORS.length];
const Relatorios = () => {
  const {
    canViewAllData,
    getCurrentUserId
  } = useSupabaseAuth();
  const {
    vendas,
    produtos,
    servicos,
    barbeiros,
    clientes
  } = useSupabaseData();
  const {
    indicadores
  } = useIndicadoresFinanceiros();
  const {
    despesas
  } = useDespesas();
  const {
    comissoes
  } = useComissoes();
  const {
    hasReportTabPermission,
    loading: permissionsLoading
  } = useUserPermissions();
  const { contasPendentes, loading: loadingContas, quitarConta, fetchContasPendentes } = useContasReceber();

  // Mapa de saldo devedor pendente por vendaId
  const saldoPendenteMap = useMemo(() => {
    const map = new Map<string, number>();
    contasPendentes.forEach(conta => {
      map.set(conta.vendaId, (map.get(conta.vendaId) || 0) + conta.saldoDevedor);
    });
    return map;
  }, [contasPendentes]);

  // Helper: retorna valor efetivamente recebido da venda (total - saldo pendente)
  const getValorEfetivo = useCallback((venda: Venda) => {
    const saldo = saldoPendenteMap.get(venda.id) || 0;
    return Math.max(0, venda.total - saldo);
  }, [saldoPendenteMap]);

  // Mapa de pagamentos múltiplos por vendaId
  const [pagamentosVendaMap, setPagamentosVendaMap] = useState<Record<string, string[]>>({});
  useEffect(() => {
    const carregarPagamentos = async () => {
      const { data } = await supabase
        .from('pagamentos_venda')
        .select('venda_id, forma_pagamento');
      if (data) {
        const map: Record<string, string[]> = {};
        data.forEach(p => {
          if (!map[p.venda_id]) map[p.venda_id] = [];
          const label = p.forma_pagamento.replace('_', ' ');
          if (!map[p.venda_id].includes(label)) map[p.venda_id].push(label);
        });
        setPagamentosVendaMap(map);
      }
    };
    carregarPagamentos();
  }, [vendas]);

  // Estado para modal de quitação
  const [contaParaQuitar, setContaParaQuitar] = useState<any>(null);
  const [formaPagamentoQuitacao, setFormaPagamentoQuitacao] = useState('pix');

  // Estado para seletor de período
  const [periodoSelecionado, setPeriodoSelecionado] = useState<string>('mes_atual');
  const [dataInicio, setDataInicio] = useState<Date>(startOfMonth(new Date()));
  const [dataFim, setDataFim] = useState<Date>(new Date());

  // Handler para mudança de período
  const handlePeriodoChange = (value: string) => {
    setPeriodoSelecionado(value);
    const hoje = new Date();
    const anoAtual = hoje.getFullYear();
    switch (value) {
      case 'mes_atual':
        setDataInicio(startOfMonth(hoje));
        setDataFim(hoje);
        break;
      case 'mes_passado':
        setDataInicio(startOfMonth(subMonths(hoje, 1)));
        setDataFim(endOfMonth(subMonths(hoje, 1)));
        break;
      case 'janeiro':
        setDataInicio(new Date(anoAtual, 0, 1));
        setDataFim(endOfMonth(new Date(anoAtual, 0, 1)));
        break;
      case 'fevereiro':
        setDataInicio(new Date(anoAtual, 1, 1));
        setDataFim(endOfMonth(new Date(anoAtual, 1, 1)));
        break;
      case 'marco':
        setDataInicio(new Date(anoAtual, 2, 1));
        setDataFim(endOfMonth(new Date(anoAtual, 2, 1)));
        break;
      case 'abril':
        setDataInicio(new Date(anoAtual, 3, 1));
        setDataFim(endOfMonth(new Date(anoAtual, 3, 1)));
        break;
      case 'maio':
        setDataInicio(new Date(anoAtual, 4, 1));
        setDataFim(endOfMonth(new Date(anoAtual, 4, 1)));
        break;
      case 'junho':
        setDataInicio(new Date(anoAtual, 5, 1));
        setDataFim(endOfMonth(new Date(anoAtual, 5, 1)));
        break;
      case 'julho':
        setDataInicio(new Date(anoAtual, 6, 1));
        setDataFim(endOfMonth(new Date(anoAtual, 6, 1)));
        break;
      case 'agosto':
        setDataInicio(new Date(anoAtual, 7, 1));
        setDataFim(endOfMonth(new Date(anoAtual, 7, 1)));
        break;
      case 'setembro':
        setDataInicio(new Date(anoAtual, 8, 1));
        setDataFim(endOfMonth(new Date(anoAtual, 8, 1)));
        break;
      case 'outubro':
        setDataInicio(new Date(anoAtual, 9, 1));
        setDataFim(endOfMonth(new Date(anoAtual, 9, 1)));
        break;
      case 'novembro':
        setDataInicio(new Date(anoAtual, 10, 1));
        setDataFim(endOfMonth(new Date(anoAtual, 10, 1)));
        break;
      case 'dezembro':
        setDataInicio(new Date(anoAtual, 11, 1));
        setDataFim(endOfMonth(new Date(anoAtual, 11, 1)));
        break;
      case 'custom':
        // Mantém as datas atuais para seleção manual
        break;
    }
  };

  // Estado para tracking de atualizações em tempo real
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  // Detectar quando indicadores mudam (real-time)
  useEffect(() => {
    if (indicadores.length > 0) {
      setLastUpdate(new Date());
    }
  }, [indicadores]);

  // Estado para ordenação da tabela
  const [sortField, setSortField] = useState<string>('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Estado para filtro de barbeiro
  const [barbeiroSelecionado, setBarbeiroSelecionado] = useState<string>('todos');

  // Estados para filtros de Mix (serviços, produtos e clientes)
  const [servicosSelecionados, setServicosSelecionados] = useState<string[]>([]);
  const [produtosSelecionados, setProdutosSelecionados] = useState<string[]>([]);
  const [clientesSelecionados, setClientesSelecionados] = useState<string[]>([]);
  const [formasPagamentoSelecionadas, setFormasPagamentoSelecionadas] = useState<string[]>([]);

  // Estado para modal de memória de cálculo
  const [showMemoriaCalculo, setShowMemoriaCalculo] = useState(false);

  // Estados para próximas despesas
  const [mesSelecionadoDespesas, setMesSelecionadoDespesas] = useState(new Date().getMonth() + 1);
  const [anoSelecionadoDespesas, setAnoSelecionadoDespesas] = useState(new Date().getFullYear());

  // Filtrar abas de relatórios baseado em permissões do usuário
  const allowedTabs = useMemo(() => {
    // Administradores veem todas as abas
    if (canViewAllData()) {
      return RELATORIOS_TABS.map(tab => ({
        ...tab,
        value: TAB_PERMISSION_MAP[tab.key]
      }));
    }

    // Colaboradores: filtrar baseado em permissões
    return RELATORIOS_TABS.filter(tab => hasReportTabPermission(tab.key)).map(tab => ({
      ...tab,
      value: TAB_PERMISSION_MAP[tab.key]
    }));
  }, [canViewAllData, hasReportTabPermission, permissionsLoading]);

  // Definir aba padrão como a primeira aba permitida
  const defaultTab = useMemo(() => {
    if (allowedTabs.length === 0) return 'vendas-mes';
    return allowedTabs[0].value;
  }, [allowedTabs]);

  // Calcular indicadores do período selecionado
  const indicadoresPeriodo = useMemo(() => {
    return indicadores.filter(ind => {
      const indDate = new Date(ind.anoReferencia, ind.mesReferencia - 1);
      return indDate >= dataInicio && indDate <= dataFim;
    }).sort((a, b) => {
      if (a.anoReferencia !== b.anoReferencia) return a.anoReferencia - b.anoReferencia;
      return a.mesReferencia - b.mesReferencia;
    });
  }, [indicadores, dataInicio, dataFim]);

  // Somar totais do período (movido para o nível do componente)
  const totaisPeriodo = useMemo(() => {
    return indicadoresPeriodo.reduce((acc, ind) => ({
      faturamentoBruto: acc.faturamentoBruto + ind.faturamentoBruto,
      totalDespesas: acc.totalDespesas + ind.totalDespesas,
      custoProdutos: acc.custoProdutos + ind.custoProdutos,
      totalComissoes: acc.totalComissoes + ind.totalComissoes,
      lucroBruto: acc.lucroBruto + ind.lucroBruto,
      lucroLiquido: acc.lucroLiquido + ind.lucroLiquido,
      numeroVendas: acc.numeroVendas + ind.numeroVendas
    }), {
      faturamentoBruto: 0,
      totalDespesas: 0,
      custoProdutos: 0,
      totalComissoes: 0,
      lucroBruto: 0,
      lucroLiquido: 0,
      numeroVendas: 0
    });
  }, [indicadoresPeriodo]);

  // Ranking de despesas do período (ordenado do maior para o menor)
  const rankingDespesas = useMemo(() => {
    const despesasPeriodo = despesas.filter(d => {
      const dataDespesa = new Date(d.dataDespesa);
      return dataDespesa >= dataInicio && dataDespesa <= dataFim && d.status === 'ativo';
    });
    return despesasPeriodo.sort((a, b) => b.valor - a.valor).slice(0, 10); // Top 10
  }, [despesas, dataInicio, dataFim]);

  // Evolução de comissões mês a mês
  const evolucaoComissoes = useMemo(() => {
    return indicadoresPeriodo.map(ind => ({
      mes: `${String(ind.mesReferencia).padStart(2, '0')}/${ind.anoReferencia}`,
      comissoes: ind.totalComissoes,
      percentualFaturamento: ind.faturamentoBruto > 0 ? ind.totalComissoes / ind.faturamentoBruto * 100 : 0
    }));
  }, [indicadoresPeriodo]);

  // Próximas despesas (filtro independente)
  const proximasDespesas = useMemo(() => {
    return despesas.filter(d => {
      const dataDespesa = new Date(d.dataDespesa);
      return dataDespesa.getMonth() + 1 === mesSelecionadoDespesas && dataDespesa.getFullYear() === anoSelecionadoDespesas && dataDespesa > new Date() && d.status === 'ativo';
    }).sort((a, b) => new Date(a.dataDespesa).getTime() - new Date(b.dataDespesa).getTime());
  }, [despesas, mesSelecionadoDespesas, anoSelecionadoDespesas]);

  // Despesas por mês e categoria
  const despesasPorMesCategoria = useMemo(() => {
    const despesasPeriodo = despesas.filter(d => {
      const dataDespesa = new Date(d.dataDespesa);
      return dataDespesa >= dataInicio && dataDespesa <= dataFim && d.status === 'ativo';
    });

    // Agrupar por mês e categoria
    const agrupado = despesasPeriodo.reduce((acc, desp) => {
      const data = new Date(desp.dataDespesa);
      const chave = `${String(data.getMonth() + 1).padStart(2, '0')}/${data.getFullYear()}`;
      if (!acc[chave]) acc[chave] = {};
      acc[chave][desp.categoria] = (acc[chave][desp.categoria] || 0) + desp.valor;
      return acc;
    }, {} as Record<string, Record<string, number>>);

    // Converter para array
    return Object.entries(agrupado).map(([mes, categorias]) => ({
      mes,
      ...categorias
    }));
  }, [despesas, dataInicio, dataFim]);

  // Filtrar vendas por período selecionado E por barbeiro selecionado (FILTRO GLOBAL)
  const vendasFiltradas = useMemo(() => {
    return vendas.filter(venda => {
      // Verificar permissão de visualização
      if (!canViewAllData() && venda.barbeiroId !== getCurrentUserId()) {
        return false;
      }

      // FILTRO GLOBAL DE BARBEIRO - afeta todos os gráficos e KPIs
      if (barbeiroSelecionado !== 'todos' && venda.barbeiroId !== barbeiroSelecionado) {
        return false;
      }
      const dataVenda = new Date(venda.dataVenda);
      const dataInicioAjustada = new Date(dataInicio);
      dataInicioAjustada.setHours(0, 0, 0, 0);
      const dataFimAjustada = new Date(dataFim);
      dataFimAjustada.setHours(23, 59, 59, 999);
      return dataVenda >= dataInicioAjustada && dataVenda <= dataFimAjustada;
    });
  }, [vendas, canViewAllData, getCurrentUserId, barbeiroSelecionado, dataInicio, dataFim]);

  // ========== FILTROS DE MIX (Serviços e Produtos) ==========
  // Vendas filtradas por mix - afeta apenas a aba Vendas/Mês quando filtros estão ativos
  const vendasFiltradasPorMix = useMemo(() => {
    const mixAtivo = servicosSelecionados.length > 0 || produtosSelecionados.length > 0;
    const clienteAtivo = clientesSelecionados.length > 0;
    const pagamentoAtivo = formasPagamentoSelecionadas.length > 0;

    // Se nenhum filtro ativo, retornar vendasFiltradas normais
    if (!mixAtivo && !clienteAtivo && !pagamentoAtivo) {
      return vendasFiltradas;
    }

    return vendasFiltradas.filter(venda => {
      // Filtro de clientes
      if (clienteAtivo && !clientesSelecionados.includes(venda.clienteId)) {
        return false;
      }
      // Filtro de formas de pagamento
      if (pagamentoAtivo) {
        const formas = pagamentosVendaMap[venda.id];
        const formasVenda = (formas && formas.length > 0) ? formas : [venda.formaPagamento?.replace('_', ' ') || ''];
        if (!formasVenda.some(f => formasPagamentoSelecionadas.includes(f))) {
          return false;
        }
      }
      // Filtro de itens (serviços/produtos)
      if (mixAtivo) {
        return venda.itens.some(item => {
          if (item.tipo === 'servico' && servicosSelecionados.includes(item.itemId)) return true;
          if (item.tipo === 'produto' && produtosSelecionados.includes(item.itemId)) return true;
          return false;
        });
      }
      return true;
    });
  }, [vendasFiltradas, servicosSelecionados, produtosSelecionados, clientesSelecionados, formasPagamentoSelecionadas, pagamentosVendaMap]);

  // Faturamento filtrado por mix (apenas dos itens selecionados)
  const faturamentoFiltroPorMix = useMemo(() => {
    if (servicosSelecionados.length === 0 && produtosSelecionados.length === 0 && clientesSelecionados.length === 0 && formasPagamentoSelecionadas.length === 0) {
      return null; // null significa "usar faturamento total normal"
    }
    const itemFiltroAtivo = servicosSelecionados.length > 0 || produtosSelecionados.length > 0;
    return vendasFiltradasPorMix.filter(v => v.status === 'pago').reduce((total, venda) => {
      if (itemFiltroAtivo) {
        // Somar apenas os itens que correspondem aos filtros de serviço/produto
        const subtotalFiltrado = venda.itens.reduce((sum, item) => {
          if (item.tipo === 'servico' && servicosSelecionados.includes(item.itemId)) {
            return sum + item.subtotal;
          }
          if (item.tipo === 'produto' && produtosSelecionados.includes(item.itemId)) {
            return sum + item.subtotal;
          }
          return sum;
        }, 0);
        return total + subtotalFiltrado;
      }
      // Se só filtro de cliente ativo, somar total da venda
      return total + getValorEfetivo(venda);
    }, 0);
  }, [vendasFiltradasPorMix, servicosSelecionados, produtosSelecionados, clientesSelecionados, getValorEfetivo]);

  // Flag para indicar se filtro de mix está ativo
  const mixFiltroAtivo = servicosSelecionados.length > 0 || produtosSelecionados.length > 0 || clientesSelecionados.length > 0 || formasPagamentoSelecionadas.length > 0;

  // Alias para compatibilidade com código existente (usado no detalhamento)
  const vendasFiltradasPorBarbeiro = vendasFiltradas;

  // Vendas do mês anterior para comparação (sempre comparar com mês anterior)
  const mesAnteriorInicio = startOfMonth(subMonths(dataInicio, 1));
  const mesAnteriorFim = endOfMonth(subMonths(dataInicio, 1));
  const vendasMesAnterior = vendas.filter(venda => {
    if (!canViewAllData() && venda.barbeiroId !== getCurrentUserId()) {
      return false;
    }
    const dataVenda = new Date(venda.dataVenda);
    return dataVenda >= mesAnteriorInicio && dataVenda <= mesAnteriorFim;
  });

  // Calcular estatísticas
  const faturamentoTotal = vendasFiltradas.filter(v => v.status === 'pago').reduce((total, venda) => total + getValorEfetivo(venda), 0);

  // Calcular total de descontos aplicados
  const totalDescontos = vendasFiltradas.filter(v => v.status === 'pago').reduce((total, venda) => total + (venda.desconto || 0), 0);
  const numeroVendas = vendasFiltradas.length;
  const ticketMedio = numeroVendas > 0 ? faturamentoTotal / numeroVendas : 0;

  // Estatísticas do mês anterior
  const faturamentoMesAnterior = vendasMesAnterior.filter(v => v.status === 'pago').reduce((total, venda) => total + getValorEfetivo(venda), 0);
  const numeroVendasMesAnterior = vendasMesAnterior.length;

  // Clientes únicos
  const clientesUnicos = new Set(vendasFiltradas.map(v => v.clienteId)).size;
  const clientesUnicosMesAnterior = new Set(vendasMesAnterior.map(v => v.clienteId)).size;

  // Cálculos de variação vs mês anterior
  const variacaoFaturamento = faturamentoMesAnterior > 0 ? (faturamentoTotal - faturamentoMesAnterior) / faturamentoMesAnterior * 100 : 0;
  const variacaoVendas = numeroVendasMesAnterior > 0 ? (numeroVendas - numeroVendasMesAnterior) / numeroVendasMesAnterior * 100 : 0;
  const variacaoClientes = clientesUnicosMesAnterior > 0 ? (clientesUnicos - clientesUnicosMesAnterior) / clientesUnicosMesAnterior * 100 : 0;

  // Ticket médio por cliente único
  const ticketMedioCliente = clientesUnicos > 0 ? faturamentoTotal / clientesUnicos : 0;

  // ===== CÁLCULOS FINANCEIROS REAIS DO PERÍODO (fonte única de verdade) =====
  // Estes cálculos usam as mesmas vendas filtradas que os cards do topo

  // Calcular despesas do período
  const despesasPeriodoFiltrado = useMemo(() => {
    return despesas.filter(d => {
      const dataDespesa = new Date(d.dataDespesa);
      const dataInicioAjustada = new Date(dataInicio);
      dataInicioAjustada.setHours(0, 0, 0, 0);
      const dataFimAjustada = new Date(dataFim);
      dataFimAjustada.setHours(23, 59, 59, 999);
      return dataDespesa >= dataInicioAjustada && dataDespesa <= dataFimAjustada && d.status === 'ativo';
    });
  }, [despesas, dataInicio, dataFim]);
  const totalDespesasPeriodo = useMemo(() => {
    return despesasPeriodoFiltrado.reduce((total, d) => total + d.valor, 0);
  }, [despesasPeriodoFiltrado]);

  // Calcular CMV (Custo de Produtos e Insumos) vendidos no período
  // Usa custo_cmv (snapshot da venda) com fallback para preco_compra (vendas antigas)
  const custoProdutosPeriodo = useMemo(() => {
    let custo = 0;
    vendasFiltradas.filter(v => v.status === 'pago').forEach(venda => {
      venda.itens.forEach(item => {
        if (item.tipo === 'produto') {
          if (item.custoCmv != null && item.custoCmv > 0) {
            custo += item.custoCmv;
          } else {
            const produto = produtos.find(p => p.id === item.itemId);
            if (produto) {
              custo += item.quantidade * produto.precoCompra;
            }
          }
        }
      });
    });
    return custo;
  }, [vendasFiltradas, produtos]);

  // ✅ Calcular comissões do período usando histórico real (snapshotting)
  const [totalComissoesPeriodo, setTotalComissoesPeriodo] = useState(0);
  const [comissoesHistoricoPorBarbeiro, setComissoesHistoricoPorBarbeiro] = useState<Record<string, number>>({});

  useEffect(() => {
    const carregarComissoesHistorico = async () => {
      // Preserva o fuso horário local ao consultar timestamptz no Supabase.
      // Sem ISO, vendas noturnas no Brasil podem cair no dia UTC seguinte e ficar fora da memória de cálculo.
      const dataInicioStr = startOfDay(dataInicio).toISOString();
      const dataFimStr = endOfDay(dataFim).toISOString();

      // Query paginada ao comissoes_historico com inner join em vendas (mesma lógica do ComissoesChart)
      const PAGE_SIZE = 1000;
      let allData: any[] = [];
      let hasMore = true;
      let page = 0;

      while (hasMore) {
        let query = supabase
          .from('comissoes_historico')
          .select(`valor_comissao, barbeiro_id, vendas!inner(data_venda, status, barbeiro_id)`)
          .gte('vendas.data_venda', dataInicioStr)
          .lte('vendas.data_venda', dataFimStr)
          .eq('vendas.status', 'pago')
          .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

        // Filtro global de barbeiro
        if (barbeiroSelecionado !== 'todos') {
          query = query.eq('vendas.barbeiro_id', barbeiroSelecionado);
        }

        const { data, error } = await query;
        if (error) {
          console.error('Erro ao buscar comissões históricas:', error);
          break;
        }
        if (data && data.length > 0) {
          allData = [...allData, ...data];
        }
        hasMore = data?.length === PAGE_SIZE;
        page++;
      }

      // Agregar total e por barbeiro
      let total = 0;
      const porBarbeiro: Record<string, number> = {};
      allData.forEach((registro: any) => {
        const valor = Number(registro.valor_comissao) || 0;
        total += valor;
        const bId = registro.barbeiro_id;
        porBarbeiro[bId] = (porBarbeiro[bId] || 0) + valor;
      });

      setTotalComissoesPeriodo(total);
      setComissoesHistoricoPorBarbeiro(porBarbeiro);
    };

    carregarComissoesHistorico();
  }, [dataInicio, dataFim, barbeiroSelecionado, vendas.length]);

  // Calcular indicadores financeiros reais
  const indicadoresFinanceirosReais = useMemo(() => {
    const lucroBruto = faturamentoTotal - custoProdutosPeriodo - totalComissoesPeriodo;
    const lucroLiquido = lucroBruto - totalDespesasPeriodo;
    const margemBruta = faturamentoTotal > 0 ? lucroBruto / faturamentoTotal * 100 : 0;
    const margemLiquida = faturamentoTotal > 0 ? lucroLiquido / faturamentoTotal * 100 : 0;
    return {
      faturamentoBruto: faturamentoTotal,
      totalDespesas: totalDespesasPeriodo,
      custoProdutos: custoProdutosPeriodo,
      totalComissoes: totalComissoesPeriodo,
      lucroBruto,
      lucroLiquido,
      margemBruta,
      margemLiquida,
      numeroVendas: vendasFiltradas.filter(v => v.status === 'pago').length
    };
  }, [faturamentoTotal, custoProdutosPeriodo, totalComissoesPeriodo, totalDespesasPeriodo, vendasFiltradas]);
  // ===== FIM DOS CÁLCULOS FINANCEIROS REAIS =====

  // Análise de representatividade (Despesa vs Faturamento) - USANDO DADOS REAIS
  const representatividadeDespesas = useMemo(() => {
    const totalFaturamento = indicadoresFinanceirosReais.faturamentoBruto;
    const totalDespesas = indicadoresFinanceirosReais.totalDespesas;
    const percentual = totalFaturamento > 0 ? totalDespesas / totalFaturamento * 100 : 0;
    return {
      percentual,
      faturamento: totalFaturamento,
      despesas: totalDespesas,
      restante: totalFaturamento - totalDespesas
    };
  }, [indicadoresFinanceirosReais]);

  // ✅ Comissões por barbeiro usando histórico real (snapshotting)
  const comissoesPorBarbeiroRelatorio = comissoesHistoricoPorBarbeiro;
  const vendasPorBarbeiro = barbeiros.map(barbeiro => {
    const vendasBarbeiro = vendasFiltradas.filter(v => v.barbeiroId === barbeiro.id);
    const totalVendas = vendasBarbeiro.reduce((sum, v) => sum + getValorEfetivo(v), 0);
    const comissaoTotal = comissoesPorBarbeiroRelatorio[barbeiro.id] || 0;
    return {
      nome: barbeiro.nome,
      vendas: vendasBarbeiro.length,
      faturamento: totalVendas,
      comissao: comissaoTotal
    };
  }).filter(b => b.vendas > 0);

  // Vendas por mês - NOVA LÓGICA com suporte a filtro de Mix:
  // 1. Agrupa por MÊS COMPLETO (ignora o dia/período exato)
  // 2. Mostra APENAS meses que têm vendas (faturamento > 0)
  // 3. Quando filtro de mix ativo, calcula apenas itens selecionados
  const vendasPorMes = useMemo(() => {
    // Usar vendas filtradas por mix quando filtro ativo, senão vendas filtradas normais
    const vendasParaUsar = mixFiltroAtivo ? vendasFiltradasPorMix : vendasFiltradas;
    const vendsPorMesMap = new Map<string, {
      mes: string;
      vendas: number;
      faturamento: number;
    }>();
    vendasParaUsar.filter(v => v.status === 'pago').forEach(venda => {
      const dataVenda = new Date(venda.dataVenda);
      const monthKey = getMonthKey(dataVenda);
      const mesLabel = format(dataVenda, 'MMM/yy', {
        locale: ptBR
      });
      if (!vendsPorMesMap.has(monthKey)) {
        vendsPorMesMap.set(monthKey, {
          mes: mesLabel,
          vendas: 0,
          faturamento: 0
        });
      }
      const mesData = vendsPorMesMap.get(monthKey)!;
      mesData.vendas += 1;

      // Se filtro de mix ativo, somar apenas subtotal dos itens selecionados
      if (mixFiltroAtivo) {
        const subtotalFiltrado = venda.itens.reduce((sum, item) => {
          if (item.tipo === 'servico' && servicosSelecionados.includes(item.itemId)) {
            return sum + item.subtotal;
          }
          if (item.tipo === 'produto' && produtosSelecionados.includes(item.itemId)) {
            return sum + item.subtotal;
          }
          return sum;
        }, 0);
        mesData.faturamento += subtotalFiltrado;
      } else {
        mesData.faturamento += getValorEfetivo(venda);
      }
    });
    const resultado = Array.from(vendsPorMesMap.entries()).map(([key, data]) => ({
      key,
      ...data
    })).sort((a, b) => a.key.localeCompare(b.key));
    return resultado.filter(mes => mes.faturamento > 0);
  }, [vendasFiltradas, vendasFiltradasPorMix, mixFiltroAtivo, servicosSelecionados, produtosSelecionados, getValorEfetivo]);

  // ===== GRÁFICO YTD: Vendas por Mês (Year-to-Date) =====
  // SEMPRE mostra todos os meses do ano corrente: Jan até o mês atual
  // Independente do período selecionado nos filtros globais
  const vendasPorMesYTD = useMemo(() => {
    const hoje = new Date();
    const anoAtual = dataFim.getFullYear(); // Ano baseado na data fim do filtro
    const inicioAno = new Date(anoAtual, 0, 1); // 01/Jan do ano
    const fimPeriodo = dataFim; // Respeita a data fim selecionada
    
    // Gerar buckets de meses (Jan até o mês atual/selecionado)
    const buckets = generateMonthRange(inicioAno, fimPeriodo);
    
    // Filtrar vendas do ano (sem depender do filtro de período, mas respeitando barbeiro)
    const vendasAno = vendas.filter(v => {
      // Verificar permissão de visualização
      if (!canViewAllData() && v.barbeiroId !== getCurrentUserId()) {
        return false;
      }
      // Filtro de barbeiro
      if (barbeiroSelecionado !== 'todos' && v.barbeiroId !== barbeiroSelecionado) {
        return false;
      }
      // Filtro de clientes
      if (clientesSelecionados.length > 0 && !clientesSelecionados.includes(v.clienteId)) {
        return false;
      }
      // Vendas pagas do ano corrente
      const dataVenda = new Date(v.dataVenda);
      return dataVenda >= inicioAno && dataVenda <= fimPeriodo && v.status === 'pago';
    });
    
    // Criar mapa para agrupar faturamento por mês
    const faturamentoPorMes = new Map<string, { vendas: number; faturamento: number }>();
    
    // Inicializar todos os buckets com 0
    buckets.forEach(bucket => {
      faturamentoPorMes.set(bucket.key, { vendas: 0, faturamento: 0 });
    });
    
    // Agregar vendas nos buckets
    vendasAno.forEach(venda => {
      const dataVenda = new Date(venda.dataVenda);
      const monthKey = getMonthKey(dataVenda);
      
      const dados = faturamentoPorMes.get(monthKey);
      if (dados) {
        dados.vendas += 1;
        // Se filtro de mix ativo com itens específicos, calcular apenas itens selecionados
        const temFiltroItens = servicosSelecionados.length > 0 || produtosSelecionados.length > 0;
        if (temFiltroItens) {
          const subtotalFiltrado = venda.itens.reduce((sum, item) => {
            if (item.tipo === 'servico' && servicosSelecionados.includes(item.itemId)) {
              return sum + item.subtotal;
            }
            if (item.tipo === 'produto' && produtosSelecionados.includes(item.itemId)) {
              return sum + item.subtotal;
            }
            return sum;
          }, 0);
          dados.faturamento += subtotalFiltrado;
        } else {
          dados.faturamento += getValorEfetivo(venda);
        }
      }
    });
    
    // Converter para array ordenado cronologicamente
    return buckets.map(bucket => ({
      key: bucket.key,
      mes: bucket.label,
      mesLong: bucket.labelLong,
      vendas: faturamentoPorMes.get(bucket.key)?.vendas || 0,
      faturamento: faturamentoPorMes.get(bucket.key)?.faturamento || 0
    }));
  }, [vendas, dataFim, barbeiroSelecionado, canViewAllData, getCurrentUserId, mixFiltroAtivo, servicosSelecionados, produtosSelecionados, clientesSelecionados, getValorEfetivo]);

  // Cálculos aprimorados com analytics avançados (usando vendas com filtro de mix quando ativo)
  const vendasParaAnalytics = mixFiltroAtivo ? vendasFiltradasPorMix : vendasFiltradas;

  // Objeto de filtro de mix para passar às funções de analytics
  const mixFilterOptions: MixFilterOptions | undefined = mixFiltroAtivo ? {
    servicosSelecionados,
    produtosSelecionados
  } : undefined;

  // Passar mixFilterOptions para garantir que o faturamento seja calculado apenas dos itens filtrados
  const dayAnalytics = calculateDayAnalytics(vendas, vendasParaAnalytics, dataInicio, dataFim, mixFilterOptions, saldoPendenteMap);
  // Usar vendasPorMesYTD para o gráfico de barras (Year-to-Date) - passar vendas completas para buscar mês anterior cross-year
  const monthAnalyticsDataYTD = calculateMonthAnalytics(vendas, vendasPorMesYTD, mixFilterOptions, saldoPendenteMap);
  // Manter vendasPorMes para outras análises que dependem do período selecionado
  const monthAnalyticsData = calculateMonthAnalytics(vendas, vendasPorMes, mixFilterOptions, saldoPendenteMap);
  const hourAnalytics = calculateHourAnalytics(vendasParaAnalytics, mixFilterOptions, saldoPendenteMap);
  const dayOfWeekAnalytics = calculateDayOfWeekAnalytics(vendasParaAnalytics, mixFilterOptions, saldoPendenteMap);

  // Dados para os gráficos com variações calculadas
  const vendasPorDiaEnhanced = dayAnalytics;
  // Gráfico de barras usa YTD
  const vendasPorMesEnhanced = monthAnalyticsDataYTD;

  // Calcular dados para clientes atendidos por dia (agora com variações já calculadas no analyticsCalculations)
  const clientesPorDia = dayAnalytics.map((dia, index) => {
    // Calcular variação vs dia anterior para clientes
    let variacaoClientesDiaAnterior: number | null = null;
    if (index > 0) {
      const clientesDiaAnterior = dayAnalytics[index - 1]?.clientes || 0;
      if (clientesDiaAnterior > 0) {
        variacaoClientesDiaAnterior = (dia.clientes - clientesDiaAnterior) / clientesDiaAnterior * 100;
      } else if (dia.clientes > 0) {
        variacaoClientesDiaAnterior = Infinity;
      }
    }
    const totalClientes = dayAnalytics.reduce((sum, d) => sum + d.clientes, 0);
    const mediaClientes = totalClientes / dayAnalytics.length;
    return {
      ...dia,
      variacaoClientesDiaAnterior,
      // variacaoClientesSemanaAnterior já vem calculado do analyticsCalculations
      mediaClientes
    };
  });

  // Vendas por mês
  // Já calculado acima para usar nos analytics

  // Serviços mais vendidos
  const servicosVendidos = new Map();
  vendasFiltradas.forEach(venda => {
    venda.itens.forEach(item => {
      if (item.tipo === 'servico') {
        const key = item.itemId;
        if (servicosVendidos.has(key)) {
          servicosVendidos.set(key, servicosVendidos.get(key) + item.quantidade);
        } else {
          servicosVendidos.set(key, item.quantidade);
        }
      }
    });
  });
  const servicosMaisVendidos = Array.from(servicosVendidos.entries()).map(([servicoId, quantidade]) => {
    const servico = servicos.find(s => s.id === servicoId);
    return {
      nome: servico?.nome || 'Serviço não encontrado',
      quantidade,
      valor: (servico?.preco || 0) * quantidade
    };
  }).sort((a, b) => b.quantidade - a.quantidade);

  // Produtos mais vendidos
  const produtosVendidos = new Map();
  vendasFiltradas.forEach(venda => {
    venda.itens.forEach(item => {
      if (item.tipo === 'produto') {
        const key = item.itemId;
        if (produtosVendidos.has(key)) {
          produtosVendidos.set(key, produtosVendidos.get(key) + item.quantidade);
        } else {
          produtosVendidos.set(key, item.quantidade);
        }
      }
    });
  });
  const produtosMaisVendidos = Array.from(produtosVendidos.entries()).map(([produtoId, quantidade]) => {
    const produto = produtos.find(p => p.id === produtoId);
    return {
      nome: produto?.nome || 'Produto não encontrado',
      quantidade,
      valor: (produto?.precoVenda || 0) * quantidade
    };
  }).sort((a, b) => b.quantidade - a.quantidade);

  // Receita por categoria - apenas serviços com percentuais
  const receitaServicos = [];
  const categoriaServicos = new Map();
  vendasFiltradas.forEach(venda => {
    venda.itens.forEach(item => {
      if (item.tipo === 'servico') {
        const servico = servicos.find(s => s.id === item.itemId);
        const categoria = servico?.categoria || 'Outros';
        categoriaServicos.set(categoria, (categoriaServicos.get(categoria) || 0) + item.subtotal);
      }
    });
  });

  // Calcular total de receita de serviços para percentuais
  const totalReceitaServicos = Array.from(categoriaServicos.values()).reduce((a, b) => a + b, 0);

  // Converter para array com percentuais
  Array.from(categoriaServicos.entries()).forEach(([categoria, valor]) => {
    const percentual = totalReceitaServicos > 0 ? valor / totalReceitaServicos * 100 : 0;
    receitaServicos.push({
      name: categoria,
      value: valor,
      percentual: percentual
    });
  });

  // Ordenar por valor (maior primeiro)
  receitaServicos.sort((a, b) => b.value - a.value);

  // Análise de clientes
  const clientesAnalise = clientes.map(cliente => {
    const vendasCliente = vendasFiltradas.filter(v => v.clienteId === cliente.id);
    const totalGasto = vendasCliente.reduce((sum, v) => sum + v.total, 0);
    const totalVisitas = vendasCliente.length;
    return {
      id: cliente.id,
      nome: cliente.nome,
      totalGasto,
      totalVisitas,
      ultimaVisita: vendasCliente.length > 0 ? Math.max(...vendasCliente.map(v => new Date(v.dataVenda).getTime())) : 0
    };
  });

  // Clientes mais fiéis
  const clientesMaisFieis = clientesAnalise.filter(c => c.totalVisitas > 0).sort((a, b) => b.totalVisitas - a.totalVisitas).slice(0, 10);

  // Clientes que mais gastam
  const clientesQueGastamMais = clientesAnalise.filter(c => c.totalGasto > 0).sort((a, b) => b.totalGasto - a.totalGasto).slice(0, 10);

  // Novos clientes no período filtrado
  const novosClientesPeriodo = clientes.filter(cliente => {
    const dataCadastro = new Date(cliente.dataCadastro);
    const dataFimAjustada = new Date(dataFim);
    dataFimAjustada.setHours(23, 59, 59, 999);
    return dataCadastro >= dataInicio && dataCadastro <= dataFimAjustada;
  });

  // Novos clientes por mês (baseado no período filtrado, não apenas últimos 6 meses)
  const novosClientesPorMes = [];

  // Se o período for menor que 1 mês, mostrar por semana
  const diasPeriodo = differenceInDays(dataFim, dataInicio);
  if (diasPeriodo <= 31) {
    // Agrupar por semanas
    const totalSemanas = Math.ceil(diasPeriodo / 7);
    for (let i = 0; i < totalSemanas; i++) {
      const inicioSemana = new Date(dataInicio);
      inicioSemana.setDate(inicioSemana.getDate() + i * 7);
      const fimSemana = new Date(inicioSemana);
      fimSemana.setDate(fimSemana.getDate() + 6);
      if (fimSemana > dataFim) fimSemana.setTime(dataFim.getTime());
      const novosClientesSemana = novosClientesPeriodo.filter(cliente => {
        const dataCadastro = new Date(cliente.dataCadastro);
        return dataCadastro >= inicioSemana && dataCadastro <= fimSemana;
      });
      novosClientesPorMes.push({
        mes: `${format(inicioSemana, 'dd/MM', {
          locale: ptBR
        })} - ${format(fimSemana, 'dd/MM', {
          locale: ptBR
        })}`,
        quantidade: novosClientesSemana.length
      });
    }
  } else {
    // Agrupar por meses
    const mesInicio = new Date(dataInicio.getFullYear(), dataInicio.getMonth(), 1);
    const mesFim = new Date(dataFim.getFullYear(), dataFim.getMonth(), 1);
    let mesAtual = new Date(mesInicio);
    while (mesAtual <= mesFim) {
      const inicioMes = startOfMonth(mesAtual);
      const fimMes = endOfMonth(mesAtual);
      const novosClientesMes = novosClientesPeriodo.filter(cliente => {
        const dataCadastro = new Date(cliente.dataCadastro);
        return dataCadastro >= inicioMes && dataCadastro <= fimMes;
      });
      novosClientesPorMes.push({
        mes: format(mesAtual, 'MMM/yyyy', {
          locale: ptBR
        }),
        quantidade: novosClientesMes.length
      });
      mesAtual = new Date(mesAtual.setMonth(mesAtual.getMonth() + 1));
    }
  }

  // Função auxiliar para formatar telefone
  const formatarTelefone = (telefone: string) => {
    const digits = telefone.replace(/\D/g, '');
    if (digits.length === 11) {
      return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
    }
    return telefone;
  };

  // Função para ordenar dados
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Aplicar ordenação nas vendas
  const vendasOrdenadas = [...vendasFiltradas].sort((a, b) => {
    if (!sortField) return 0;
    let aValue: any;
    let bValue: any;
    switch (sortField) {
      case 'data':
        aValue = new Date(a.dataVenda).getTime();
        bValue = new Date(b.dataVenda).getTime();
        break;
      case 'cliente':
        const clienteA = clientes.find(c => c.id === a.clienteId);
        const clienteB = clientes.find(c => c.id === b.clienteId);
        aValue = clienteA?.nome || '';
        bValue = clienteB?.nome || '';
        break;
      case 'barbeiro':
        const barbeiroA = barbeiros.find(barbeiro => barbeiro.id === a.barbeiroId);
        const barbeiroB = barbeiros.find(barbeiro => barbeiro.id === b.barbeiroId);
        aValue = barbeiroA?.nome || '';
        bValue = barbeiroB?.nome || '';
        break;
      case 'formaPagamento':
        aValue = a.formaPagamento;
        bValue = b.formaPagamento;
        break;
      case 'status':
        aValue = a.status;
        bValue = b.status;
        break;
      case 'valor':
        aValue = a.total;
        bValue = b.total;
        break;
      default:
        return 0;
    }
    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return sortDirection === 'asc' ? aValue.localeCompare(bValue, 'pt-BR') : bValue.localeCompare(aValue, 'pt-BR');
    }
    if (typeof aValue === 'number' && typeof bValue === 'number') {
      return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
    }
    return 0;
  });

  // Componente para ícone de ordenação
  const SortIcon = ({
    field
  }: {
    field: string;
  }) => {
    if (sortField !== field) {
      return <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />;
    }
    return sortDirection === 'asc' ? <ChevronUp className="h-4 w-4 text-primary" /> : <ChevronDown className="h-4 w-4 text-primary" />;
  };
  const exportarRelatorio = () => {
    // Implementar exportação para Excel/PDF
    alert('Funcionalidade de exportação será implementada em breve!');
  };
  return <ResponsiveLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Relatórios Gerenciais</h1>
            <p className="text-muted-foreground">
              {canViewAllData() ? 'Análise completa de desempenho da barbearia' : 'Seus relatórios pessoais de desempenho'}
            </p>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {/* Seletor de Período */}
            <Select value={periodoSelecionado} onValueChange={handlePeriodoChange}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Selecionar período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mes_atual">Mês Atual</SelectItem>
                <SelectItem value="mes_passado">Mês Passado</SelectItem>
                <SelectItem value="custom">Personalizado</SelectItem>
                <div className="h-px bg-border my-1" />
                <SelectItem value="janeiro">Janeiro/{new Date().getFullYear()}</SelectItem>
                <SelectItem value="fevereiro">Fevereiro/{new Date().getFullYear()}</SelectItem>
                <SelectItem value="marco">Março/{new Date().getFullYear()}</SelectItem>
                <SelectItem value="abril">Abril/{new Date().getFullYear()}</SelectItem>
                <SelectItem value="maio">Maio/{new Date().getFullYear()}</SelectItem>
                <SelectItem value="junho">Junho/{new Date().getFullYear()}</SelectItem>
                <SelectItem value="julho">Julho/{new Date().getFullYear()}</SelectItem>
                <SelectItem value="agosto">Agosto/{new Date().getFullYear()}</SelectItem>
                <SelectItem value="setembro">Setembro/{new Date().getFullYear()}</SelectItem>
                <SelectItem value="outubro">Outubro/{new Date().getFullYear()}</SelectItem>
                <SelectItem value="novembro">Novembro/{new Date().getFullYear()}</SelectItem>
                <SelectItem value="dezembro">Dezembro/{new Date().getFullYear()}</SelectItem>
              </SelectContent>
            </Select>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-[200px] justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dataInicio ? format(dataInicio, "dd/MM/yyyy", {
                  locale: ptBR
                }) : "Data início"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={dataInicio} onSelect={date => {
                if (date) {
                  setDataInicio(date);
                  setPeriodoSelecionado('custom');
                }
              }} initialFocus className="pointer-events-auto" />
              </PopoverContent>
            </Popover>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-[200px] justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dataFim ? format(dataFim, "dd/MM/yyyy", {
                  locale: ptBR
                }) : "Data fim"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={dataFim} onSelect={date => {
                if (date) {
                  setDataFim(date);
                  setPeriodoSelecionado('custom');
                }
              }} initialFocus className="pointer-events-auto" />
              </PopoverContent>
            </Popover>
            
            {/* NOVO: Filtro Global de Barbeiro/Profissional */}
            <Select value={barbeiroSelecionado} onValueChange={setBarbeiroSelecionado}>
              <SelectTrigger className="w-[200px]">
                <Users className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Barbeiro" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os barbeiros</SelectItem>
                {barbeiros.filter(b => b.ativo).map(barbeiro => <SelectItem key={barbeiro.id} value={barbeiro.id}>
                    {barbeiro.nome}
                  </SelectItem>)}
              </SelectContent>
            </Select>
            
            
          </div>
        </div>
        
        {/* Badge indicador de filtro de barbeiro ativo */}
        {barbeiroSelecionado !== 'todos' && <div className="flex items-center gap-2">
            <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
              <Users className="h-3 w-3 mr-1" />
              Filtrando por: {barbeiros.find(b => b.id === barbeiroSelecionado)?.nome || 'Barbeiro'}
            </Badge>
            <Button variant="ghost" size="sm" onClick={() => setBarbeiroSelecionado('todos')} className="h-6 text-xs">
              Limpar filtro
            </Button>
          </div>}

        {/* Cards de Resumo */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Faturamento Total</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">R$ {faturamentoTotal.toFixed(2)}</div>
              <div className="flex items-center text-xs">
                {variacaoFaturamento >= 0 ? <TrendingUp className="h-3 w-3 text-green-500 mr-1" /> : <TrendingDown className="h-3 w-3 text-red-500 mr-1" />}
                <span className={variacaoFaturamento >= 0 ? "text-green-500" : "text-red-500"}>
                  {variacaoFaturamento.toFixed(1)}% vs mês anterior
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Número de Vendas</CardTitle>
              <Scissors className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{numeroVendas}</div>
              <div className="flex items-center text-xs">
                {variacaoVendas >= 0 ? <TrendingUp className="h-3 w-3 text-green-500 mr-1" /> : <TrendingDown className="h-3 w-3 text-red-500 mr-1" />}
                <span className={variacaoVendas >= 0 ? "text-green-500" : "text-red-500"}>
                  {variacaoVendas.toFixed(1)}% vs mês anterior
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ticket Médio</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">R$ {ticketMedio.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">
                Por venda realizada
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Clientes Únicos</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{clientesUnicos}</div>
              <div className="flex items-center text-xs">
                {variacaoClientes >= 0 ? <TrendingUp className="h-3 w-3 text-green-500 mr-1" /> : <TrendingDown className="h-3 w-3 text-red-500 mr-1" />}
                <span className={variacaoClientes >= 0 ? "text-green-500" : "text-red-500"}>
                  {variacaoClientes.toFixed(1)}% vs mês anterior
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Card de Total de Descontos - sempre visível */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Descontos</CardTitle>
              <TrendingDown className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">R$ {totalDescontos.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">
                {faturamentoTotal > 0 ? (totalDescontos / faturamentoTotal * 100).toFixed(1) : '0.0'}% do faturamento
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Gráficos e Tabelas */}
        <Tabs defaultValue={defaultTab} className="space-y-4">
          <TabsList className="w-full flex flex-wrap gap-1 h-auto">
            {allowedTabs.map(tab => <TabsTrigger key={tab.value} value={tab.value}>
                {tab.label}
              </TabsTrigger>)}
          </TabsList>

          {/* Mensagem quando não há abas disponíveis */}
          {allowedTabs.length === 0 && <Card>
              <CardContent className="py-8 text-center">
                <p className="text-muted-foreground">
                  Você não tem permissão para acessar nenhuma análise de relatórios.
                  <br />
                  Entre em contato com o administrador para solicitar acesso.
                </p>
              </CardContent>
            </Card>}

          <TabsContent value="vendas-mes" className="space-y-4">
            {/* Filtros de Mix (Serviços e Produtos) */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Filtrar por Itens Específicos
                </CardTitle>
                <CardDescription className="text-sm">
                  Selecione serviços ou produtos para análise granular do mix de vendas
                </CardDescription>
              </CardHeader>
              <CardContent>
                <MixFilters vendasFiltradas={vendasFiltradas} servicosSelecionados={servicosSelecionados} produtosSelecionados={produtosSelecionados} onServicosChange={setServicosSelecionados} onProdutosChange={setProdutosSelecionados} clientesSelecionados={clientesSelecionados} onClientesChange={setClientesSelecionados} clientes={clientes} formasPagamentoSelecionadas={formasPagamentoSelecionadas} onFormasPagamentoChange={setFormasPagamentoSelecionadas} pagamentosVendaMap={pagamentosVendaMap} />
                {mixFiltroAtivo && faturamentoFiltroPorMix !== null && <div className="mt-4 p-3 bg-primary/5 border border-primary/20 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Faturamento dos itens selecionados:</span>
                      <span className="text-lg font-bold text-primary">
                        R$ {faturamentoFiltroPorMix.toFixed(2)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {vendasFiltradasPorMix.filter(v => v.status === 'pago').length} venda(s) contendo os itens filtrados
                    </p>
                  </div>}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Vendas por Mês (Acumulado {dataFim.getFullYear()})</CardTitle>
                <CardDescription>
                  {mixFiltroAtivo 
                    ? 'Faturamento mensal dos itens selecionados (Jan até o mês atual)' 
                    : `Faturamento acumulado de Jan a ${format(dataFim, 'MMM', { locale: ptBR })}/${dataFim.getFullYear()}`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={vendasPorMesEnhanced} margin={{
                  top: 50,
                  right: 40,
                  left: 30,
                  bottom: 20
                }}>
                    <CartesianGrid strokeDasharray="2 2" stroke="hsl(var(--border))" opacity={0.6} horizontal={true} vertical={false} />
                    <XAxis dataKey="mes" tick={{
                    fontSize: 12,
                    fill: 'hsl(var(--foreground))'
                  }} axisLine={{
                    stroke: 'hsl(var(--foreground))',
                    strokeWidth: 2
                  }} tickLine={{
                    stroke: 'hsl(var(--foreground))',
                    strokeWidth: 1
                  }} />
                    <YAxis tick={{
                    fontSize: 12,
                    fill: 'hsl(var(--foreground))'
                  }} axisLine={{
                    stroke: 'hsl(var(--foreground))',
                    strokeWidth: 2
                  }} tickLine={{
                    stroke: 'hsl(var(--foreground))',
                    strokeWidth: 1
                  }} tickFormatter={value => `R$ ${value}`} />
                    <Tooltip content={<EnhancedMonthTooltip />} />
                    <Bar dataKey="faturamento" fill={CHART_PRIMARY_COLOR} radius={[8, 8, 0, 0]}>
                      {/* Cor única para todas as barras - visual limpo e profissional */}
                      <LabelList dataKey="faturamento" position="top" offset={10} content={({
                      x,
                      y,
                      value,
                      width
                    }) => <text x={Number(x) + Number(width) / 2} y={Number(y)} dy={-8} textAnchor="middle" fill="hsl(var(--foreground))" fontSize="12" fontWeight="700">
                            R${Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </text>} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Vendas por Dia</CardTitle>
                <CardDescription>
                  Evolução diária das vendas no período selecionado
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={350}>
                  <AreaChart data={vendasPorDiaEnhanced} margin={{
                  top: 30,
                  right: 40,
                  left: 30,
                  bottom: 30
                }}>
                    <defs>
                      <linearGradient id="colorFaturamento" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.1} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="2 2" stroke="hsl(var(--border))" opacity={0.3} horizontal={true} vertical={false} />
                    <XAxis dataKey="data" tick={{
                    fontSize: 12,
                    fill: 'hsl(var(--foreground))'
                  }} axisLine={{
                    stroke: 'hsl(var(--border))',
                    strokeWidth: 1
                  }} tickLine={false} angle={-45} textAnchor="end" height={70} />
                    <YAxis tick={{
                    fontSize: 12,
                    fill: 'hsl(var(--foreground))'
                  }} axisLine={{
                    stroke: 'hsl(var(--border))',
                    strokeWidth: 1
                  }} tickLine={false} tickFormatter={value => `R$ ${value}`} />
                    <Tooltip content={<EnhancedDayTooltip />} />
                    <Area type="monotone" dataKey="faturamento" stroke="#3B82F6" strokeWidth={3} fill="url(#colorFaturamento)" dot={{
                    fill: "#3B82F6",
                    strokeWidth: 0,
                    r: 5
                  }} activeDot={{
                    r: 7,
                    strokeWidth: 0
                  }}>
                      <LabelList dataKey="faturamento" position="top" offset={12} content={({
                      x,
                      y,
                      value
                    }) => <text x={Number(x)} y={Number(y)} dy={-8} textAnchor="middle" fill="hsl(var(--foreground))" fontSize="11" fontWeight="700">
                            R${Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </text>} />
                    </Area>
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Clientes Atendidos por Dia</CardTitle>
                <CardDescription>
                  Número de clientes únicos atendidos por dia no período
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={350}>
                  <AreaChart data={clientesPorDia} margin={{
                  top: 30,
                  right: 40,
                  left: 30,
                  bottom: 30
                }}>
                    <defs>
                      <linearGradient id="colorClientes" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#10B981" stopOpacity={0.1} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="2 2" stroke="hsl(var(--border))" opacity={0.3} horizontal={true} vertical={false} />
                    <XAxis dataKey="data" tick={{
                    fontSize: 12,
                    fill: 'hsl(var(--foreground))'
                  }} axisLine={{
                    stroke: 'hsl(var(--border))',
                    strokeWidth: 1
                  }} tickLine={false} angle={-45} textAnchor="end" height={70} />
                    <YAxis tick={{
                    fontSize: 12,
                    fill: 'hsl(var(--foreground))'
                  }} axisLine={{
                    stroke: 'hsl(var(--border))',
                    strokeWidth: 1
                  }} tickLine={false} />
                    <Tooltip content={<EnhancedClientsTooltip />} />
                    <Area type="monotone" dataKey="clientes" stroke="#10B981" strokeWidth={3} fill="url(#colorClientes)" dot={{
                    fill: "#10B981",
                    strokeWidth: 0,
                    r: 5
                  }} activeDot={{
                    r: 7,
                    strokeWidth: 0
                  }}>
                      <LabelList dataKey="clientes" position="top" offset={12} content={({
                      x,
                      y,
                      value
                    }) => <text x={Number(x)} y={Number(y)} dy={-8} textAnchor="middle" fill="hsl(var(--foreground))" fontSize="11" fontWeight="700">
                            {value}
                          </text>} />
                    </Area>
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Nova seção de Análise de Horários */}
            <BusiestTimesAnalysis hourAnalytics={hourAnalytics} dayOfWeekAnalytics={dayOfWeekAnalytics} />
            
            {/* Nova seção de Análise de Mix de Vendas */}
            <MixAnalysisSection vendasFiltradas={mixFiltroAtivo ? vendasFiltradasPorMix : vendasFiltradas} servicos={servicos} produtos={produtos} />
          </TabsContent>

          <TabsContent value="detalhamento" className="space-y-4">
            {/* Filtro por barbeiro */}
            <Card>
              <CardHeader>
                <CardTitle>Filtros</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <label className="text-sm font-medium">Barbeiro:</label>
                  <Select value={barbeiroSelecionado} onValueChange={setBarbeiroSelecionado}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Selecionar barbeiro" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos os barbeiros</SelectItem>
                      {barbeiros.map(barbeiro => <SelectItem key={barbeiro.id} value={barbeiro.id}>
                          {barbeiro.nome}
                        </SelectItem>)}
                    </SelectContent>
                  </Select>
                  {barbeiroSelecionado !== 'todos' && <Button variant="outline" size="sm" onClick={() => setBarbeiroSelecionado('todos')}>
                      Limpar filtro
                    </Button>}
                </div>
                <div className="mt-4">
                  <MixFilters vendasFiltradas={vendasFiltradas} servicosSelecionados={servicosSelecionados} produtosSelecionados={produtosSelecionados} onServicosChange={setServicosSelecionados} onProdutosChange={setProdutosSelecionados} clientesSelecionados={clientesSelecionados} onClientesChange={setClientesSelecionados} clientes={clientes} formasPagamentoSelecionadas={formasPagamentoSelecionadas} onFormasPagamentoChange={setFormasPagamentoSelecionadas} pagamentosVendaMap={pagamentosVendaMap} />
                </div>
              </CardContent>
            </Card>


            <DetalhamentoVendasPaginado vendas={vendasFiltradasPorMix.sort((a, b) => {
            if (!sortField) return 0;
            let aVal: any, bVal: any;
            switch (sortField) {
              case 'data':
                aVal = new Date(a.dataVenda);
                bVal = new Date(b.dataVenda);
                break;
              case 'cliente':
                const clienteA = clientes.find(c => c.id === a.clienteId);
                const clienteB = clientes.find(c => c.id === b.clienteId);
                aVal = clienteA?.nome || '';
                bVal = clienteB?.nome || '';
                break;
              case 'barbeiro':
                const barbeiroA = barbeiros.find(barb => barb.id === a.barbeiroId);
                const barbeiroB = barbeiros.find(barb => barb.id === b.barbeiroId);
                aVal = barbeiroA?.nome || '';
                bVal = barbeiroB?.nome || '';
                break;
              case 'valor':
                aVal = a.total;
                bVal = b.total;
                break;
              case 'formaPagamento':
                aVal = a.formaPagamento;
                bVal = b.formaPagamento;
                break;
              case 'status':
                aVal = a.status;
                bVal = b.status;
                break;
              default:
                return 0;
            }
            if (sortDirection === 'asc') {
              return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
            } else {
              return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
            }
          })} clientes={clientes} barbeiros={barbeiros} onSort={handleSort} sortField={sortField} sortDirection={sortDirection} SortIcon={SortIcon} canViewAllData={canViewAllData()} onVendaDeleted={() => window.location.reload()} saldoPendenteMap={saldoPendenteMap} pagamentosVendaMap={pagamentosVendaMap} />
          </TabsContent>

          <TabsContent value="categorias" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Receita por Categoria de Serviços</CardTitle>
                <CardDescription>
                  Distribuição percentual das categorias de serviços no período filtrado
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <ResponsiveContainer width="100%" height={400}>
                    <PieChart>
                      <Pie data={receitaServicos} cx="50%" cy="50%" labelLine={false} label={({
                      name,
                      percentual
                    }) => `${name}: ${percentual.toFixed(1)}%`} outerRadius={120} fill="#8884d8" dataKey="value">
                        {receitaServicos.map((entry, index) => <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(value, name, props) => [`R$ ${Number(value).toFixed(2)} (${props.payload.percentual.toFixed(1)}%)`, 'Receita']} />
                    </PieChart>
                  </ResponsiveContainer>
                  
                  <div className="space-y-4">
                    <h3 className="font-semibold text-lg">Detalhamento por Categoria</h3>
                    <div className="space-y-3">
                      {receitaServicos.map((categoria, index) => <div key={index} className="flex justify-between items-center p-3 rounded-lg border">
                          <div className="flex items-center gap-3">
                            <div className="w-4 h-4 rounded-full" style={{
                          backgroundColor: CHART_COLORS[index % CHART_COLORS.length]
                        }} />
                            <span className="font-medium">{categoria.name}</span>
                          </div>
                          <div className="text-right">
                            <div className="font-bold">R$ {categoria.value.toFixed(2)}</div>
                            <div className="text-sm text-muted-foreground">{categoria.percentual.toFixed(1)}%</div>
                          </div>
                        </div>)}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="clientes" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Heart className="h-5 w-5 text-red-500" />
                    Clientes Mais Fiéis
                  </CardTitle>
                  <CardDescription>Por número de visitas no período</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {clientesMaisFieis.slice(0, 5).map((cliente, index) => <div key={cliente.id} className="flex justify-between items-center">
                        <span className="text-sm">{index + 1}. {cliente.nome}</span>
                        <span className="text-sm font-bold">{cliente.totalVisitas} visitas</span>
                      </div>)}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-green-500" />
                    Maiores Gastadores
                  </CardTitle>
                  <CardDescription>Por valor total gasto no período</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {clientesQueGastamMais.slice(0, 5).map((cliente, index) => <div key={cliente.id} className="flex justify-between items-center">
                        <span className="text-sm">{index + 1}. {cliente.nome}</span>
                        <span className="text-sm font-bold">R$ {cliente.totalGasto.toFixed(2)}</span>
                      </div>)}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="col-span-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-6 w-6 text-blue-500" />
                  Novos Clientes no Período
                </CardTitle>
                <CardDescription>
                  {novosClientesPeriodo.length} cliente(s) cadastrado(s) entre {format(dataInicio, 'dd/MM/yyyy', {
                  locale: ptBR
                })} e {format(dataFim, 'dd/MM/yyyy', {
                  locale: ptBR
                })}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold mb-4 text-center text-3xl text-primary">
                      {novosClientesPeriodo.length}
                    </h4>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={novosClientesPorMes} margin={{
                      top: 30,
                      right: 30,
                      left: 20,
                      bottom: 60
                    }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                        <XAxis dataKey="mes" tick={{
                        fontSize: 11,
                        fill: 'hsl(var(--foreground))'
                      }} axisLine={{
                        stroke: 'hsl(var(--border))'
                      }} tickLine={{
                        stroke: 'hsl(var(--border))'
                      }} angle={-45} textAnchor="end" height={80} />
                        <YAxis tick={{
                        fontSize: 11,
                        fill: 'hsl(var(--foreground))'
                      }} axisLine={{
                        stroke: 'hsl(var(--border))'
                      }} tickLine={{
                        stroke: 'hsl(var(--border))'
                      }} />
                        <Tooltip formatter={value => [value, 'Novos clientes']} contentStyle={{
                        backgroundColor: 'hsl(var(--popover))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }} />
                        <Bar dataKey="quantidade" fill={COLORS.info} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  
                  <div className="space-y-3">
                    <h4 className="font-semibold">Lista de Novos Clientes</h4>
                    <div className="max-h-96 overflow-y-auto space-y-2">
                      {novosClientesPeriodo.map(cliente => <div key={cliente.id} className="flex justify-between items-center p-2 border rounded">
                          <span className="font-medium">{cliente.nome}</span>
                          <span className="text-sm text-muted-foreground">
                            {format(new Date(cliente.dataCadastro), 'dd/MM/yyyy', {
                          locale: ptBR
                        })}
                          </span>
                        </div>)}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Painel de Inadimplência */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                  Inadimplência
                </CardTitle>
                <CardDescription>Clientes com saldo devedor pendente</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingContas ? (
                  <div className="text-center py-4 text-muted-foreground">Carregando...</div>
                ) : contasPendentes.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground flex flex-col items-center gap-2">
                    <CheckCircle className="h-8 w-8 text-green-500" />
                    <p>Nenhuma pendência encontrada</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Data</TableHead>
                          <TableHead>Barbeiro</TableHead>
                          <TableHead>Cliente</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                          <TableHead className="text-right">Pago</TableHead>
                          <TableHead className="text-right">Saldo Devedor</TableHead>
                          <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {contasPendentes.map(conta => (
                          <TableRow key={conta.id}>
                            <TableCell className="text-sm">
                              {conta.dataVenda ? new Date(conta.dataVenda).toLocaleDateString('pt-BR') : '-'}
                            </TableCell>
                            <TableCell className="text-sm">{conta.barbeiroNome || '-'}</TableCell>
                            <TableCell className="text-sm font-medium">{conta.clienteNome || '-'}</TableCell>
                            <TableCell className="text-sm text-right">R$ {conta.valorTotalVenda.toFixed(2)}</TableCell>
                            <TableCell className="text-sm text-right">R$ {conta.valorPago.toFixed(2)}</TableCell>
                            <TableCell className="text-sm text-right font-bold text-amber-600">R$ {conta.saldoDevedor.toFixed(2)}</TableCell>
                            <TableCell className="text-right">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setContaParaQuitar(conta);
                                  setFormaPagamentoQuitacao('pix');
                                }}
                                className="text-green-600 border-green-300 hover:bg-green-50"
                              >
                                Quitar
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    <div className="mt-3 flex justify-between items-center p-3 bg-muted rounded">
                      <span className="font-medium">Total Inadimplente:</span>
                      <span className="font-bold text-amber-600">
                        R$ {contasPendentes.reduce((s, c) => s + c.saldoDevedor, 0).toFixed(2)}
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="barbeiros" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Scissors className="h-5 w-5 text-primary" />
                    Performance por Barbeiro
                  </CardTitle>
                  <CardDescription>Vendas e comissões no período</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {vendasPorBarbeiro.map((barbeiro, index) => <div key={barbeiro.nome} className="flex justify-between items-center p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">{barbeiro.nome}</p>
                          <p className="text-sm text-muted-foreground">{barbeiro.vendas} vendas</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold">R$ {barbeiro.faturamento.toFixed(2)}</p>
                          <p className="text-sm text-muted-foreground">Comissão: R$ {barbeiro.comissao.toFixed(2)}</p>
                        </div>
                      </div>)}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Crown className="h-5 w-5 text-yellow-500" />
                    Ranking por Receita
                  </CardTitle>
                  <CardDescription>Barbeiros com maior faturamento</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={vendasPorBarbeiro.sort((a, b) => b.faturamento - a.faturamento)} margin={{
                    top: 50,
                    right: 30,
                    left: 30,
                    bottom: 70
                  }}>
                      <CartesianGrid strokeDasharray="2 2" stroke="hsl(var(--border))" opacity={0.6} horizontal={true} vertical={false} />
                      <XAxis dataKey="nome" tick={{
                      fontSize: 12,
                      fill: 'hsl(var(--foreground))'
                    }} axisLine={{
                      stroke: 'hsl(var(--foreground))',
                      strokeWidth: 2
                    }} tickLine={{
                      stroke: 'hsl(var(--foreground))',
                      strokeWidth: 1
                    }} angle={0} textAnchor="middle" height={60} />
                      <YAxis tick={{
                      fontSize: 12,
                      fill: 'hsl(var(--foreground))'
                    }} axisLine={{
                      stroke: 'hsl(var(--foreground))',
                      strokeWidth: 2
                    }} tickLine={{
                      stroke: 'hsl(var(--foreground))',
                      strokeWidth: 1
                    }} tickFormatter={value => `R$ ${value}`} />
                      <Tooltip formatter={value => [`R$ ${Number(value).toFixed(2)}`, 'Faturamento']} contentStyle={{
                      backgroundColor: 'hsl(var(--popover))',
                      border: '2px solid hsl(var(--primary))',
                      borderRadius: '12px',
                      fontSize: '13px',
                      boxShadow: '0 8px 25px -5px rgb(0 0 0 / 0.2)',
                      padding: '12px'
                    }} />
                      <Bar dataKey="faturamento" radius={[8, 8, 0, 0]} barSize={60}>
                        {vendasPorBarbeiro.map((entry, index) => <Cell key={`cell-${index}`} fill={getBarbeiroColor(index)} />)}
                        <LabelList dataKey="faturamento" position="center" content={({
                        x,
                        y,
                        width,
                        height,
                        value
                      }) => <text x={Number(x) + Number(width) / 2} y={Number(y) + Number(height) / 2} dy={3} textAnchor="middle" fill="white" fontSize="12" fontWeight="700">
                              R${Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </text>} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="ranking" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Star className="h-5 w-5 text-yellow-500" />
                    Serviços Mais Vendidos
                  </CardTitle>
                  <CardDescription>Ranking por quantidade vendida</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {servicosMaisVendidos.slice(0, 10).map((servico, index) => <div key={index} className="flex justify-between items-center p-2 rounded-lg border">
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-lg text-muted-foreground">#{index + 1}</span>
                          <span className="font-medium">{servico.nome}</span>
                        </div>
                        <div className="text-right">
                          <div className="font-bold">{servico.quantidade}x</div>
                          <div className="text-sm text-muted-foreground">R$ {servico.valor.toFixed(2)}</div>
                        </div>
                      </div>)}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5 text-blue-500" />
                    Produtos Mais Vendidos
                  </CardTitle>
                  <CardDescription>Ranking por quantidade vendida</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {produtosMaisVendidos.slice(0, 10).map((produto, index) => <div key={index} className="flex justify-between items-center p-2 rounded-lg border">
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-lg text-muted-foreground">#{index + 1}</span>
                          <span className="font-medium">{produto.nome}</span>
                        </div>
                        <div className="text-right">
                          <div className="font-bold">{produto.quantidade}x</div>
                          <div className="text-sm text-muted-foreground">R$ {produto.valor.toFixed(2)}</div>
                        </div>
                      </div>)}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Aba de Análise Financeira */}
          <TabsContent value="financeiro" className="space-y-4">
            {(() => {
            // Calcular margens médias do período (usando dados filtrados por data)
            const margemBrutaMedia = indicadoresFinanceirosReais.margemBruta;
            const margemLiquidaMedia = indicadoresFinanceirosReais.margemLiquida;

            // Dados para gráfico de evolução - usar dados filtrados por data
            const dadosEvolucao = (() => {
              // Se o período cobre apenas 1 mês (parcial ou completo), usar dados reais filtrados
              if (indicadoresPeriodo.length <= 1) {
                return [{
                  mes: `${String(dataInicio.getMonth() + 1).padStart(2, '0')}/${dataInicio.getFullYear()}`,
                  faturamento: indicadoresFinanceirosReais.faturamentoBruto,
                  despesas: indicadoresFinanceirosReais.totalDespesas,
                  custoProdutos: indicadoresFinanceirosReais.custoProdutos,
                  comissoes: indicadoresFinanceirosReais.totalComissoes,
                  lucroBruto: indicadoresFinanceirosReais.lucroBruto,
                  lucroLiquido: indicadoresFinanceirosReais.lucroLiquido,
                  margemBruta: indicadoresFinanceirosReais.margemBruta,
                  margemLiquida: indicadoresFinanceirosReais.margemLiquida
                }];
              }
              // Múltiplos meses: usar indicadores do banco (agregados mensais completos)
              return indicadoresPeriodo.map(ind => ({
                mes: `${String(ind.mesReferencia).padStart(2, '0')}/${ind.anoReferencia}`,
                faturamento: ind.faturamentoBruto,
                despesas: ind.totalDespesas,
                custoProdutos: ind.custoProdutos,
                comissoes: ind.totalComissoes,
                lucroBruto: ind.lucroBruto,
                lucroLiquido: ind.lucroLiquido,
                margemBruta: ind.margemBruta,
                margemLiquida: ind.margemLiquida
              }));
            })();

            // Distribuição de despesas por categoria no período
            const despesasPeriodo = despesas.filter(d => {
              const dataDespesa = new Date(d.dataDespesa);
              return dataDespesa >= dataInicio && dataDespesa <= dataFim && d.status === 'ativo';
            });
            const despesasPorCategoria = despesasPeriodo.reduce((acc, desp) => {
              acc[desp.categoria] = (acc[desp.categoria] || 0) + desp.valor;
              return acc;
            }, {} as Record<string, number>);
            const dadosCategoriaDespesas = Object.entries(despesasPorCategoria).map(([categoria, valor]) => ({
              categoria: categoria.charAt(0).toUpperCase() + categoria.slice(1),
              valor: Number(valor)
            }));
            return <>
                  {/* Header da Aba Financeira com Badge AO VIVO */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <h2 className="text-2xl font-bold">Análise Financeira</h2>
                      <Badge variant="outline" className="animate-pulse bg-red-500/10 text-red-500 border-red-500">
                        🔴 AO VIVO
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Atualizado {formatDistanceToNow(lastUpdate, {
                    locale: ptBR,
                    addSuffix: true
                  })}
                    </div>
                  </div>
                  
                  {/* Cards de Indicadores Financeiros - USANDO DADOS REAIS */}
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Faturamento Bruto</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">
                          R$ {indicadoresFinanceirosReais.faturamentoBruto.toFixed(2)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {indicadoresFinanceirosReais.numeroVendas} vendas no período
                        </p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total de Despesas</CardTitle>
                        <Wallet className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-red-600">
                          R$ {indicadoresFinanceirosReais.totalDespesas.toFixed(2)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {despesasPeriodoFiltrado.length} despesas registradas
                        </p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-sm font-medium">Margem Bruta</CardTitle>
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setShowMemoriaCalculo(true)}>
                            <Info className="h-4 w-4" />
                          </Button>
                        </div>
                        {indicadoresFinanceirosReais.margemBruta >= 0 ? <TrendingUp className="h-4 w-4 text-green-500" /> : <TrendingDown className="h-4 w-4 text-red-500" />}
                      </CardHeader>
                      <CardContent>
                        <div className={`text-2xl font-bold ${indicadoresFinanceirosReais.margemBruta >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {indicadoresFinanceirosReais.margemBruta.toFixed(2)}%
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Lucro Bruto: R$ {indicadoresFinanceirosReais.lucroBruto.toFixed(2)}
                        </p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-sm font-medium">Margem Líquida</CardTitle>
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setShowMemoriaCalculo(true)}>
                            <Info className="h-4 w-4" />
                          </Button>
                        </div>
                        {indicadoresFinanceirosReais.margemLiquida >= 0 ? <TrendingUp className="h-4 w-4 text-green-500" /> : <TrendingDown className="h-4 w-4 text-red-500" />}
                      </CardHeader>
                      <CardContent>
                        <div className={`text-2xl font-bold ${indicadoresFinanceirosReais.margemLiquida >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {indicadoresFinanceirosReais.margemLiquida.toFixed(2)}%
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Lucro Líquido: R$ {indicadoresFinanceirosReais.lucroLiquido.toFixed(2)}
                        </p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Gráficos de Evolução das Margens e Lucros */}
                  <div className="grid gap-4 md:grid-cols-2">
                    {/* Evolução das Margens (%) */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Evolução das Margens (%)</CardTitle>
                        <CardDescription>Margem bruta e líquida ao longo do período</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                          <LineChart data={dadosEvolucao} margin={{
                        top: 25,
                        right: 10,
                        left: 10,
                        bottom: 5
                      }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                            <XAxis dataKey="mes" tick={{
                          fontSize: 11,
                          fill: 'hsl(var(--foreground))'
                        }} />
                            <YAxis tick={{
                          fontSize: 11,
                          fill: 'hsl(var(--foreground))'
                        }} tickFormatter={value => `${value}%`} />
                            <Tooltip contentStyle={{
                          backgroundColor: 'hsl(var(--background))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }} content={({
                          active,
                          payload
                        }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return <div className="bg-background border rounded p-3 shadow-lg">
                                      <p className="font-bold mb-2">{data.mes}</p>
                                      <div className="space-y-1 text-sm">
                                        <p className="text-green-600">Margem Bruta: {data.margemBruta?.toFixed(2)}%</p>
                                        <p className="text-xs text-muted-foreground">Lucro Bruto: R$ {data.lucroBruto?.toFixed(2)}</p>
                                        <p className="text-primary">Margem Líquida: {data.margemLiquida?.toFixed(2)}%</p>
                                        <p className="text-xs text-muted-foreground">Lucro Líquido: R$ {data.lucroLiquido?.toFixed(2)}</p>
                                      </div>
                                    </div>;
                          }
                          return null;
                        }} />
                            <Legend />
                            <Line type="monotone" dataKey="margemBruta" stroke={COLORS.success} strokeWidth={3} name="Margem Bruta" dot={{
                          r: 5
                        }}>
                              <LabelList dataKey="margemBruta" position="top" formatter={(val: number) => `${val.toFixed(1)}%`} style={{
                            fontSize: '10px',
                            fontWeight: 'bold'
                          }} />
                            </Line>
                            <Line type="monotone" dataKey="margemLiquida" stroke={COLORS.primary} strokeWidth={3} name="Margem Líquida" dot={{
                          r: 5
                        }}>
                              <LabelList dataKey="margemLiquida" position="bottom" formatter={(val: number) => `${val.toFixed(1)}%`} style={{
                            fontSize: '10px',
                            fontWeight: 'bold'
                          }} />
                            </Line>
                          </LineChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>

                    {/* Evolução do Lucro (R$) */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Evolução do Lucro (R$)</CardTitle>
                        <CardDescription>Lucro bruto e líquido em reais</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                          <BarChart data={dadosEvolucao} margin={{
                        top: 25,
                        right: 10,
                        left: 10,
                        bottom: 5
                      }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                            <XAxis dataKey="mes" tick={{
                          fontSize: 11,
                          fill: 'hsl(var(--foreground))'
                        }} />
                            <YAxis tick={{
                          fontSize: 11,
                          fill: 'hsl(var(--foreground))'
                        }} tickFormatter={value => `R$ ${value}`} />
                            <Tooltip contentStyle={{
                          backgroundColor: 'hsl(var(--background))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }} content={({
                          active,
                          payload
                        }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return <div className="bg-background border rounded p-3 shadow-lg">
                                      <p className="font-bold mb-2">{data.mes}</p>
                                      <div className="space-y-1 text-sm">
                                        <p>Faturamento: R$ {data.faturamento?.toFixed(2)}</p>
                                        <p className="text-red-600">(-) CMV: R$ {data.custoProdutos?.toFixed(2)}</p>
                                        <p className="text-red-600">(-) Comissões: R$ {data.comissoes?.toFixed(2)}</p>
                                        <p className="text-green-600 font-bold">(=) Lucro Bruto: R$ {data.lucroBruto?.toFixed(2)}</p>
                                        <p className="text-red-600">(-) Despesas: R$ {data.despesas?.toFixed(2)}</p>
                                        <p className="text-primary font-bold">(=) Lucro Líquido: R$ {data.lucroLiquido?.toFixed(2)}</p>
                                      </div>
                                    </div>;
                          }
                          return null;
                        }} />
                            <Legend />
                            <Bar dataKey="lucroBruto" fill={COLORS.success} name="Lucro Bruto" radius={[8, 8, 0, 0]}>
                              <LabelList dataKey="lucroBruto" position="top" formatter={(val: number) => `R$ ${val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} style={{
                            fontSize: '10px',
                            fontWeight: 'bold'
                          }} />
                            </Bar>
                            <Bar dataKey="lucroLiquido" fill={COLORS.primary} name="Lucro Líquido" radius={[8, 8, 0, 0]}>
                              <LabelList dataKey="lucroLiquido" position="top" formatter={(val: number) => `R$ ${val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} style={{
                            fontSize: '10px',
                            fontWeight: 'bold'
                          }} />
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Evolução de Despesas e Comissões */}
                  <div className="grid gap-4 md:grid-cols-2">
                    {/* Evolução de Despesas por Categoria */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Evolução de Despesas por Categoria</CardTitle>
                        <CardDescription>Distribuição mensal das despesas operacionais</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                          <BarChart data={despesasPorMesCategoria} margin={{
                        top: 25,
                        right: 10,
                        left: 10,
                        bottom: 5
                      }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                            <XAxis dataKey="mes" tick={{
                          fontSize: 11,
                          fill: 'hsl(var(--foreground))'
                        }} />
                            <YAxis tick={{
                          fontSize: 11,
                          fill: 'hsl(var(--foreground))'
                        }} tickFormatter={value => `R$ ${value}`} />
                            <Tooltip contentStyle={{
                          backgroundColor: 'hsl(var(--background))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }} content={({
                          active,
                          payload
                        }) => {
                          if (active && payload && payload.length) {
                            const sorted = [...payload].sort((a, b) => (b.value as number) - (a.value as number));
                            return <div className="bg-background border rounded p-3 shadow-lg max-w-xs">
                                      <p className="font-bold mb-2">{sorted[0].payload.mes}</p>
                                      <div className="space-y-1 text-sm">
                                        {sorted.map((entry, idx) => <p key={idx} style={{
                                  color: entry.color
                                }}>
                                            {entry.name}: R$ {(entry.value as number).toFixed(2)}
                                          </p>)}
                                        <p className="font-bold border-t pt-1 mt-1">
                                          Total: R$ {sorted.reduce((sum, e) => sum + (e.value as number), 0).toFixed(2)}
                                        </p>
                                      </div>
                                    </div>;
                          }
                          return null;
                        }} />
                            <Legend />
                            <Bar dataKey="fixa" stackId="a" fill={CHART_COLORS[0]} name="Fixa" />
                            <Bar dataKey="variavel" stackId="a" fill={CHART_COLORS[1]} name="Variável" />
                            <Bar dataKey="investimento" stackId="a" fill={CHART_COLORS[2]} name="Investimento" />
                            <Bar dataKey="impostos" stackId="a" fill={CHART_COLORS[3]} name="Impostos" />
                            <Bar dataKey="insumo" stackId="a" fill={CHART_COLORS[4]} name="Insumo" />
                            <Bar dataKey="outro" stackId="a" fill={CHART_COLORS[5]} name="Outro" />
                          </BarChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>

                    {/* Evolução de Comissões */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Evolução de Comissões</CardTitle>
                        <CardDescription>Valor e percentual sobre o faturamento</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                          <ComposedChart data={evolucaoComissoes} margin={{
                        top: 25,
                        right: 10,
                        left: 10,
                        bottom: 5
                      }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                            <XAxis dataKey="mes" tick={{
                          fontSize: 11,
                          fill: 'hsl(var(--foreground))'
                        }} />
                            <YAxis yAxisId="left" tick={{
                          fontSize: 11,
                          fill: 'hsl(var(--foreground))'
                        }} tickFormatter={value => `R$ ${value}`} />
                            <YAxis yAxisId="right" orientation="right" tick={{
                          fontSize: 11,
                          fill: 'hsl(var(--foreground))'
                        }} tickFormatter={value => `${value}%`} />
                            <Tooltip contentStyle={{
                          backgroundColor: 'hsl(var(--background))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }} formatter={(value: any, name: string) => {
                          if (name === 'Comissões (R$)') return [`R$ ${Number(value).toFixed(2)}`, name];
                          if (name === '% do Faturamento') return [`${Number(value).toFixed(2)}%`, name];
                          return [value, name];
                        }} />
                            <Legend />
                            <Bar yAxisId="left" dataKey="comissoes" fill={COLORS.warning} name="Comissões (R$)" radius={[8, 8, 0, 0]}>
                              <LabelList dataKey="comissoes" position="top" formatter={(val: number) => `R$ ${val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} style={{
                            fontSize: '10px',
                            fontWeight: 'bold'
                          }} />
                            </Bar>
                            <Line yAxisId="right" type="monotone" dataKey="percentualFaturamento" stroke={COLORS.danger} strokeWidth={2} name="% do Faturamento" dot={{
                          r: 4
                        }} />
                          </ComposedChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Ranking e Análise de Representatividade */}
                  <div className="grid gap-4 md:grid-cols-2">
                    {/* Ranking de Despesas */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Ranking de Despesas</CardTitle>
                        <CardDescription>Top 10 maiores despesas do período</CardDescription>
                      </CardHeader>
                      <CardContent>
                        {rankingDespesas.length > 0 ? <ResponsiveContainer width="100%" height={400}>
                            <BarChart data={rankingDespesas} layout="vertical" margin={{
                        left: 100
                      }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                              <XAxis type="number" tick={{
                          fontSize: 11,
                          fill: 'hsl(var(--foreground))'
                        }} tickFormatter={value => `R$ ${value}`} />
                              <YAxis type="category" dataKey="descricao" width={95} tick={{
                          fontSize: 10,
                          fill: 'hsl(var(--foreground))'
                        }} />
                              <Tooltip contentStyle={{
                          backgroundColor: 'hsl(var(--background))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }} formatter={(value: any, name: string, props: any) => {
                          const item = props.payload;
                          return [`R$ ${Number(value).toFixed(2)}`, `${item.categoria} - ${format(new Date(item.dataDespesa), 'dd/MM/yyyy')}`];
                        }} />
                              <Bar dataKey="valor" fill={COLORS.danger} radius={[0, 8, 8, 0]}>
                                <LabelList dataKey="valor" position="right" formatter={(val: number) => `R$ ${val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} style={{
                            fontSize: '10px',
                            fontWeight: 'bold'
                          }} />
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer> : <div className="flex items-center justify-center h-[400px] text-muted-foreground">
                            Nenhuma despesa registrada no período
                          </div>}
                      </CardContent>
                    </Card>

                    {/* Análise de Representatividade */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Representatividade das Despesas</CardTitle>
                        <CardDescription>Percentual das despesas sobre o faturamento</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="flex flex-col gap-4">
                          <ResponsiveContainer width="100%" height={250}>
                            <PieChart>
                              <Pie data={[{
                            name: 'Despesas',
                            value: representatividadeDespesas.despesas
                          }, {
                            name: 'Restante',
                            value: representatividadeDespesas.restante
                          }]} cx="50%" cy="50%" outerRadius={80} labelLine={false} label={({
                            name,
                            percent
                          }) => `${name}: ${(percent * 100).toFixed(1)}%`} dataKey="value">
                                <Cell fill={COLORS.danger} />
                                <Cell fill={COLORS.success} />
                              </Pie>
                              <Tooltip contentStyle={{
                            backgroundColor: 'hsl(var(--background))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px'
                          }} formatter={(value: any) => [`R$ ${Number(value).toFixed(2)}`, 'Valor']} />
                            </PieChart>
                          </ResponsiveContainer>
                          
                          <div className="space-y-3">
                            <div className="p-3 bg-muted rounded-lg">
                              <p className="text-xs text-muted-foreground">Faturamento Bruto</p>
                              <p className="text-lg font-bold">R$ {representatividadeDespesas.faturamento.toFixed(2)}</p>
                            </div>
                            <div className="p-3 bg-red-50 dark:bg-red-950 rounded-lg">
                              <p className="text-xs text-muted-foreground">Total de Despesas</p>
                              <p className="text-lg font-bold text-red-600">R$ {representatividadeDespesas.despesas.toFixed(2)}</p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {representatividadeDespesas.percentual.toFixed(2)}% do faturamento
                              </p>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Análise Vertical de Despesas */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Análise Vertical de Despesas</CardTitle>
                      <CardDescription>Detalhamento hierárquico por categoria</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {Object.keys(despesasPorCategoria).length > 0 ? <div className="space-y-2">
                          {Object.entries(despesasPorCategoria).sort((a, b) => b[1] - a[1]).map(([categoria, total]) => {
                      const despesasCategoria = despesasPeriodo.filter(d => d.categoria === categoria);
                      const percentualTotal = indicadoresFinanceirosReais.totalDespesas > 0 ? total / indicadoresFinanceirosReais.totalDespesas * 100 : 0;
                      return <Collapsible key={categoria}>
                                  <CollapsibleTrigger className="w-full">
                                    <div className="flex items-center justify-between p-3 bg-muted rounded-lg hover:bg-muted/80 transition-colors">
                                      <div className="flex items-center gap-3">
                                        <ChevronDown className="h-4 w-4 transition-transform" />
                                        <span className="font-medium">{categoria.toUpperCase()}</span>
                                      </div>
                                      <div className="flex items-center gap-4">
                                        <span className="text-sm text-muted-foreground">
                                          {percentualTotal.toFixed(1)}% do total
                                        </span>
                                        <span className="font-bold">R$ {total.toFixed(2)}</span>
                                      </div>
                                    </div>
                                  </CollapsibleTrigger>
                                  <CollapsibleContent>
                                    <div className="ml-8 mt-2 space-y-1">
                                      {despesasCategoria.sort((a, b) => b.valor - a.valor).map(desp => {
                              const percentualCategoria = desp.valor / total * 100;
                              return <div key={desp.id} className="flex justify-between p-2 border-l-2 border-muted pl-4 hover:bg-muted/50 transition-colors">
                                              <div>
                                                <p className="text-sm font-medium">{desp.descricao}</p>
                                                <p className="text-xs text-muted-foreground">
                                                  {format(new Date(desp.dataDespesa), 'dd/MM/yyyy', {
                                      locale: ptBR
                                    })}
                                                  {desp.fornecedor && ` • ${desp.fornecedor}`}
                                                </p>
                                              </div>
                                              <div className="text-right">
                                                <p className="text-sm font-bold">R$ {desp.valor.toFixed(2)}</p>
                                                <p className="text-xs text-muted-foreground">
                                                  {percentualCategoria.toFixed(1)}% da categoria
                                                </p>
                                              </div>
                                            </div>;
                            })}
                                    </div>
                                  </CollapsibleContent>
                                </Collapsible>;
                    })}
                        </div> : <div className="flex items-center justify-center h-[200px] text-muted-foreground">
                          Nenhuma despesa registrada no período
                        </div>}
                    </CardContent>
                  </Card>

                  <div className="grid gap-4 md:grid-cols-2">
                    {/* Próximas Despesas */}
                    <Card>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle>Próximas Despesas</CardTitle>
                            <CardDescription>Despesas programadas para o mês selecionado</CardDescription>
                          </div>
                          <div className="flex gap-2">
                            <Select value={String(mesSelecionadoDespesas)} onValueChange={v => setMesSelecionadoDespesas(Number(v))}>
                              <SelectTrigger className="w-32">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {Array.from({
                              length: 12
                            }, (_, i) => <SelectItem key={i + 1} value={String(i + 1)}>
                                    {format(new Date(2025, i, 1), 'MMMM', {
                                locale: ptBR
                              })}
                                  </SelectItem>)}
                              </SelectContent>
                            </Select>
                            <Select value={String(anoSelecionadoDespesas)} onValueChange={v => setAnoSelecionadoDespesas(Number(v))}>
                              <SelectTrigger className="w-24">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {[2024, 2025, 2026].map(ano => <SelectItem key={ano} value={String(ano)}>{ano}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        {proximasDespesas.length === 0 ? <p className="text-center text-muted-foreground py-8">
                            Nenhuma despesa futura programada para este mês
                          </p> : <>
                            <div className="space-y-2 mb-4 max-h-[300px] overflow-y-auto">
                              {proximasDespesas.map(desp => <div key={desp.id} className="flex justify-between items-center p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                                  <div>
                                    <p className="font-medium">{desp.descricao}</p>
                                    <p className="text-sm text-muted-foreground">
                                      {format(new Date(desp.dataDespesa), 'dd/MM/yyyy')} • {desp.categoria}
                                    </p>
                                  </div>
                                  <span className="font-bold text-red-600">R$ {desp.valor.toFixed(2)}</span>
                                </div>)}
                            </div>
                            <div className="border-t pt-4">
                              <div className="flex justify-between items-center">
                                <span className="font-bold">Total do Mês:</span>
                                <span className="text-xl font-bold text-red-600">
                                  R$ {proximasDespesas.reduce((sum, d) => sum + d.valor, 0).toFixed(2)}
                                </span>
                              </div>
                            </div>
                          </>}
                      </CardContent>
                    </Card>

                    {/* Resumo de Custos */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Resumo de Custos</CardTitle>
                        <CardDescription>Detalhamento dos custos operacionais</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div className="flex justify-between items-center pb-2 border-b">
                            <span className="text-sm font-medium" title="Custo de Mercadoria Vendida (Produtos e Insumos)">CMV (Custo de Produtos e Insumos)</span>
                            <span className="text-sm font-bold">R$ {indicadoresFinanceirosReais.custoProdutos.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between items-center pb-2 border-b">
                            <span className="text-sm font-medium">Total de Comissões</span>
                            <span className="text-sm font-bold">R$ {indicadoresFinanceirosReais.totalComissoes.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between items-center pb-2 border-b">
                            <span className="text-sm font-medium">Despesas Operacionais</span>
                            <span className="text-sm font-bold text-red-600">R$ {indicadoresFinanceirosReais.totalDespesas.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between items-center pt-2 border-t-2">
                            <span className="text-base font-bold">Custo Total</span>
                            <span className="text-base font-bold text-red-600">
                              R$ {(indicadoresFinanceirosReais.custoProdutos + indicadoresFinanceirosReais.totalComissoes + indicadoresFinanceirosReais.totalDespesas).toFixed(2)}
                            </span>
                          </div>
                          
                          <div className="mt-4 p-4 bg-muted rounded-lg">
                            <div className="flex justify-between items-center">
                              <span className="text-lg font-bold">Faturamento Líquido</span>
                              <span className={`text-lg font-bold ${indicadoresFinanceirosReais.lucroLiquido >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                R$ {indicadoresFinanceirosReais.lucroLiquido.toFixed(2)}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-2">
                              {margemLiquidaMedia >= 0 ? 'Lucro de' : 'Prejuízo de'} {Math.abs(margemLiquidaMedia).toFixed(2)}% sobre o faturamento bruto
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Tabela de Indicadores Mensais */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Indicadores Mensais Detalhados</CardTitle>
                      <CardDescription>
                        Análise mês a mês dos indicadores financeiros
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Mês/Ano</TableHead>
                            <TableHead className="text-right">Faturamento</TableHead>
                            <TableHead className="text-right">Despesas</TableHead>
                            <TableHead className="text-right">Lucro Bruto</TableHead>
                            <TableHead className="text-right">Lucro Líquido</TableHead>
                            <TableHead className="text-right">Margem Bruta</TableHead>
                            <TableHead className="text-right">Margem Líquida</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {(() => {
                            // Se período parcial (1 mês ou menos), usar dados filtrados
                            if (indicadoresPeriodo.length <= 1) {
                              const ind = indicadoresFinanceirosReais;
                              return ind.faturamentoBruto === 0 && ind.totalDespesas === 0 ? (
                                <TableRow>
                                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                                    Nenhum indicador disponível para o período selecionado
                                  </TableCell>
                                </TableRow>
                              ) : (
                                <TableRow>
                                  <TableCell className="font-medium">
                                    {String(dataInicio.getMonth() + 1).padStart(2, '0')}/{dataInicio.getFullYear()}
                                  </TableCell>
                                  <TableCell className="text-right font-mono">
                                    R$ {ind.faturamentoBruto.toFixed(2)}
                                  </TableCell>
                                  <TableCell className="text-right font-mono text-red-600">
                                    R$ {ind.totalDespesas.toFixed(2)}
                                  </TableCell>
                                  <TableCell className="text-right font-mono">
                                    R$ {ind.lucroBruto.toFixed(2)}
                                  </TableCell>
                                  <TableCell className={`text-right font-mono ${ind.lucroLiquido >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    R$ {ind.lucroLiquido.toFixed(2)}
                                  </TableCell>
                                  <TableCell className="text-right font-mono">
                                    {ind.margemBruta.toFixed(2)}%
                                  </TableCell>
                                  <TableCell className={`text-right font-mono ${ind.margemLiquida >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    {ind.margemLiquida.toFixed(2)}%
                                  </TableCell>
                                </TableRow>
                              );
                            }
                            // Múltiplos meses: manter comportamento original
                            return indicadoresPeriodo.map(ind => (
                              <TableRow key={ind.id}>
                                <TableCell className="font-medium">
                                  {String(ind.mesReferencia).padStart(2, '0')}/{ind.anoReferencia}
                                </TableCell>
                                <TableCell className="text-right font-mono">
                                  R$ {ind.faturamentoBruto.toFixed(2)}
                                </TableCell>
                                <TableCell className="text-right font-mono text-red-600">
                                  R$ {ind.totalDespesas.toFixed(2)}
                                </TableCell>
                                <TableCell className="text-right font-mono">
                                  R$ {ind.lucroBruto.toFixed(2)}
                                </TableCell>
                                <TableCell className={`text-right font-mono ${ind.lucroLiquido >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                  R$ {ind.lucroLiquido.toFixed(2)}
                                </TableCell>
                                <TableCell className="text-right font-mono">
                                  {ind.margemBruta.toFixed(2)}%
                                </TableCell>
                                <TableCell className={`text-right font-mono ${ind.margemLiquida >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                  {ind.margemLiquida.toFixed(2)}%
                                </TableCell>
                              </TableRow>
                            ));
                          })()}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </>;
          })()}
          </TabsContent>
        </Tabs>
      </div>

      <MemoriaCalculoModal isOpen={showMemoriaCalculo} onClose={() => setShowMemoriaCalculo(false)} indicador={{
      id: 'periodo-atual',
      mesReferencia: dataInicio.getMonth() + 1,
      anoReferencia: dataInicio.getFullYear(),
      faturamentoBruto: indicadoresFinanceirosReais.faturamentoBruto,
      faturamentoLiquido: indicadoresFinanceirosReais.lucroLiquido,
      totalDespesas: indicadoresFinanceirosReais.totalDespesas,
      custoProdutos: indicadoresFinanceirosReais.custoProdutos,
      lucroBruto: indicadoresFinanceirosReais.lucroBruto,
      lucroLiquido: indicadoresFinanceirosReais.lucroLiquido,
      margemBruta: indicadoresFinanceirosReais.margemBruta,
      margemLiquida: indicadoresFinanceirosReais.margemLiquida,
      totalComissoes: indicadoresFinanceirosReais.totalComissoes,
      numeroVendas: indicadoresFinanceirosReais.numeroVendas,
      ticketMedio: ticketMedio,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }} />

      {/* Modal de Quitação */}
      <AlertDialog open={!!contaParaQuitar} onOpenChange={(open) => !open && setContaParaQuitar(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Quitação</AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>Confirmar pagamento do saldo devedor?</p>
              {contaParaQuitar && (
                <div className="bg-muted p-3 rounded space-y-1 text-sm">
                  <div className="flex justify-between"><span>Cliente:</span><span className="font-bold">{contaParaQuitar.clienteNome}</span></div>
                  <div className="flex justify-between"><span>Saldo devedor:</span><span className="font-bold text-amber-600">R$ {contaParaQuitar.saldoDevedor.toFixed(2)}</span></div>
                </div>
              )}
              <div className="space-y-2">
                <label className="text-sm font-medium">Forma de pagamento:</label>
                <Select value={formaPagamentoQuitacao} onValueChange={setFormaPagamentoQuitacao}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dinheiro">Dinheiro</SelectItem>
                    <SelectItem value="cartao">Cartão</SelectItem>
                    <SelectItem value="pix">PIX</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={async () => {
              if (contaParaQuitar) {
                await quitarConta(contaParaQuitar.id, formaPagamentoQuitacao);
                setContaParaQuitar(null);
              }
            }}>
              Confirmar Pagamento
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ResponsiveLayout>;
};
export default Relatorios;