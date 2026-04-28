import { useState, useEffect } from 'react';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { useSupabaseData } from '@/hooks/useSupabaseData';
import { useContasReceber } from '@/hooks/useContasReceber';
import { Plus, Trash2, ShoppingCart, Calculator, Percent, DollarSign, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
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
import { ResponsiveLayout } from '@/components/layout/ResponsiveLayout';
import { Cliente, Servico, Produto, Venda, ItemVenda, Barbeiro, PagamentoVenda } from '@/types';
import { supabaseVendaStorage, supabaseClienteStorage } from '@/utils/supabaseStorage';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useComissoes } from '@/hooks/useComissoes';
import { PrecoComPromocao } from '@/components/ui/PrecoComPromocao';
import { usePrecoPromocional } from '@/utils/precoPromocional';

// Função para calcular subtotal original (sem descontos)
const calcularSubtotalOriginal = (itens: ItemVenda[]) => {
  return itens.reduce((total, item) => {
    const precoOriginal = item.precoOriginal || item.preco;
    return total + precoOriginal * item.quantidade;
  }, 0);
};

// Componente ResumoVenda separado para melhor organização
interface ResumoVendaProps {
  subtotal: number;
  totalDesconto: number;
  total: number;
  barbeiroSelecionado: string;
  barbeiros: Barbeiro[];
  itensVenda: ItemVenda[];
  calcularComissaoItem: any;
  onFinalizarVenda: () => void;
  canFinalize: boolean;
  horarioAtendimento: string;
  pagamentos: PagamentoVenda[];
}
function ResumoVenda({
  subtotal,
  totalDesconto,
  total,
  barbeiroSelecionado,
  barbeiros,
  itensVenda,
  calcularComissaoItem,
  onFinalizarVenda,
  canFinalize,
  horarioAtendimento,
  pagamentos,
}: ResumoVendaProps) {
  const [comissaoTotal, setComissaoTotal] = useState(0);
  const [detalhesComissao, setDetalhesComissao] = useState<Array<{
    item: ItemVenda;
    percentual: number;
    valor: number;
  }>>([]);

  useEffect(() => {
    const calcular = async () => {
      if (!barbeiroSelecionado || itensVenda.length === 0) {
        setComissaoTotal(0);
        setDetalhesComissao([]);
        return;
      }
      const barbeiro = barbeiros.find(b => b.id === barbeiroSelecionado);
      if (!barbeiro) return;
      let total = 0;
      const detalhes = [];
      for (const item of itensVenda) {
        const comissaoPadrao = item.tipo === 'servico' ? barbeiro.comissaoServicos : barbeiro.comissaoProdutos;
        const { valor, percentual } = await calcularComissaoItem(barbeiroSelecionado, item, comissaoPadrao);
        total += valor;
        detalhes.push({ item, percentual, valor });
      }
      setComissaoTotal(total);
      setDetalhesComissao(detalhes);
    };
    calcular();
  }, [barbeiroSelecionado, itensVenda, barbeiros, calcularComissaoItem]);

  const barbeiroNome = barbeiros.find(b => b.id === barbeiroSelecionado)?.nome;
  const somaPagamentos = pagamentos.reduce((s, p) => s + p.valor, 0);
  const valorRestante = total - somaPagamentos;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="h-5 w-5" />
          Resumo da Venda
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2">
          <div className="flex justify-between">
            <span>Data/Hora:</span>
            <span>{new Date().toLocaleDateString('pt-BR')} às {horarioAtendimento}</span>
          </div>
          <Separator />
          <div className="flex justify-between">
            <span>Subtotal:</span>
            <span>R$ {calcularSubtotalOriginal(itensVenda).toFixed(2)}</span>
          </div>
          {totalDesconto > 0 && (
            <div className="flex justify-between text-red-600">
              <span>Desconto Total:</span>
              <span>- R$ {totalDesconto.toFixed(2)}</span>
            </div>
          )}
          <Separator />
          <div className="flex justify-between text-lg font-bold">
            <span>Total:</span>
            <span>R$ {total.toFixed(2)}</span>
          </div>

          {/* Indicador de pagamento */}
          {total > 0 && pagamentos.length > 0 && (
            <>
              <Separator />
              <div className="flex justify-between text-sm">
                <span>Total informado:</span>
                <span>R$ {somaPagamentos.toFixed(2)}</span>
              </div>
              {valorRestante > 0.01 && (
                <div className="flex justify-between text-sm text-amber-600 font-medium">
                  <span>⚠️ Valor restante:</span>
                  <span>R$ {valorRestante.toFixed(2)}</span>
                </div>
              )}
              {valorRestante < -0.01 && (
                <div className="flex justify-between text-sm text-blue-600 font-medium">
                  <span>💵 Troco:</span>
                  <span>R$ {Math.abs(valorRestante).toFixed(2)}</span>
                </div>
              )}
            </>
          )}

          {barbeiroSelecionado && itensVenda.length > 0 && (
            <>
              <Separator />
              <div className="bg-muted p-3 rounded space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Barbeiro: {barbeiroNome}</span>
                </div>
                <div className="flex justify-between text-green-600 font-medium">
                  <span>Comissão Total:</span>
                  <span>R$ {comissaoTotal.toFixed(2)}</span>
                </div>
                {detalhesComissao.length > 0 && (
                  <div className="mt-2 space-y-1">
                    <div className="text-xs text-muted-foreground font-medium">Detalhes:</div>
                    {detalhesComissao.map((detalhe, index) => (
                      <div key={index} className="text-xs flex justify-between items-center">
                        <span>{detalhe.item.nome} ({detalhe.percentual}%)</span>
                        <span className="text-green-600">R$ {detalhe.valor.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <Button onClick={onFinalizarVenda} disabled={!canFinalize} className="w-full">
          Finalizar Venda
        </Button>
      </CardContent>
    </Card>
  );
}

export default function Vendas() {
  const { canViewAllData, getCurrentUserId } = useSupabaseAuth();
  const { clientes, servicos, produtos, barbeiros, vendas, refreshData } = useSupabaseData();
  const { calcularComissaoItem } = useComissoes();
  const { calcularPrecoFinal } = usePrecoPromocional();
  const { contasPendentes, fetchPendenciasPorCliente, registrarInadimplencia, registrarPagamentosVenda } = useContasReceber();
  const { toast } = useToast();

  // Carregar métodos de pagamento ativos da configuração
  const [metodosPagamentoAtivos, setMetodosPagamentoAtivos] = useState<Record<string, boolean>>({
    dinheiro: true, cartao: true, pix: true, fiado: true,
  });
  // Mapa de vendaId -> formas de pagamento reais (da tabela pagamentos_venda)
  const [pagamentosVendaMap, setPagamentosVendaMap] = useState<Record<string, string[]>>({});

  useEffect(() => {
    const carregar = async () => {
      const { data } = await supabase
        .from('configuracoes_sistema')
        .select('valor')
        .eq('chave', 'metodos_pagamento_ativos')
        .maybeSingle();
      if (data?.valor) {
        try { setMetodosPagamentoAtivos(JSON.parse(data.valor)); } catch {}
      }
    };
    carregar();
  }, []);

  // Carregar pagamentos múltiplos das vendas recentes
  useEffect(() => {
    const carregarPagamentos = async () => {
      if (vendas.length === 0) return;
      const vendasIds = vendas.slice(0, 20).map(v => v.id);
      const { data } = await supabase
        .from('pagamentos_venda')
        .select('venda_id, forma_pagamento')
        .in('venda_id', vendasIds);
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

  const formasPagamentoDisponiveis = Object.entries(metodosPagamentoAtivos)
    .filter(([, ativo]) => ativo)
    .map(([id]) => ({ id, nome: id === 'cartao' ? 'Cartão' : id === 'pix' ? 'PIX' : id === 'fiado' ? 'Fiado' : 'Dinheiro' }));

  // Estado do formulário de venda
  const [clienteSelecionado, setClienteSelecionado] = useState<string>('');
  const [barbeiroSelecionado, setBarbeiroSelecionado] = useState<string>('');
  const [itensVenda, setItensVenda] = useState<ItemVenda[]>([]);
  const [observacoes, setObservacoes] = useState('');
  const [horarioAtendimento, setHorarioAtendimento] = useState(() => {
    const agora = new Date();
    return agora.toTimeString().slice(0, 5);
  });

  // Múltiplos pagamentos
  const [pagamentos, setPagamentos] = useState<PagamentoVenda[]>([
    { id: crypto.randomUUID(), vendaId: '', formaPagamento: 'dinheiro', valor: 0 },
  ]);

  // Pendências do cliente
  const [pendenciasCliente, setPendenciasCliente] = useState<any[]>([]);

  // Modal de confirmação de inadimplência
  const [showModalInadimplencia, setShowModalInadimplencia] = useState(false);
  const [saldoDevedor, setSaldoDevedor] = useState(0);

  // Modal de confirmação de estoque insuficiente de insumos
  const [showAlertaInsumos, setShowAlertaInsumos] = useState(false);
  const [alertasInsumos, setAlertasInsumos] = useState<Array<{ insumo_nome: string; unidade: string; necessario: number; disponivel: number; falta: number }>>([]);
  const [comInadimplenciaPendente, setComInadimplenciaPendente] = useState(false);

  // Estados para busca/adição de itens
  const [buscarItem, setBuscarItem] = useState('');
  const [tipoItem, setTipoItem] = useState<'servico' | 'produto'>('servico');
  const [itemSelecionado, setItemSelecionado] = useState<string>('');
  const [quantidadeItem, setQuantidadeItem] = useState(1);

  // Estados para busca de cliente
  const [buscarCliente, setBuscarCliente] = useState('');
  const [clienteSelecionadoNome, setClienteSelecionadoNome] = useState('');

  // Estados para desconto individual por item
  const [descItemPercentual, setDescItemPercentual] = useState<{ [key: string]: string }>({});
  const [descItemValor, setDescItemValor] = useState<{ [key: string]: string }>({});

  // Definir barbeiro padrão quando o componente carrega
  useEffect(() => {
    const userId = getCurrentUserId();
    if (userId && !canViewAllData() && !barbeiroSelecionado) {
      setBarbeiroSelecionado(userId);
    }
  }, [getCurrentUserId, canViewAllData, barbeiroSelecionado]);

  // Buscar pendências ao selecionar cliente
  useEffect(() => {
    if (clienteSelecionado) {
      fetchPendenciasPorCliente(clienteSelecionado).then(setPendenciasCliente);
    } else {
      setPendenciasCliente([]);
    }
  }, [clienteSelecionado, fetchPendenciasPorCliente]);

  const calcularSubtotal = () => {
    return itensVenda.reduce((total, item) => total + item.subtotal, 0);
  };
  const calcularTotalDesconto = () => {
    return itensVenda.reduce((total, item) => total + (item.valorDesconto || 0), 0);
  };
  const calcularTotal = () => {
    return calcularSubtotal();
  };

  const atualizarDescontoItem = (itemId: string, tipo: 'percentual' | 'valor', valorDesconto: string) => {
    if (tipo === 'percentual') {
      setDescItemPercentual(prev => ({ ...prev, [itemId]: valorDesconto }));
    } else {
      setDescItemValor(prev => ({ ...prev, [itemId]: valorDesconto }));
    }
    setItensVenda(prev => prev.map(item => {
      if (item.id === itemId) {
        const percentual = tipo === 'percentual' ? valorDesconto : descItemPercentual[itemId] || '';
        const valor = tipo === 'valor' ? valorDesconto : descItemValor[itemId] || '';
        let valorDescontoCalculado = 0;
        const subtotalOriginal = item.preco * item.quantidade;
        if (percentual.trim()) {
          const perc = parseFloat(percentual.replace(',', '.'));
          if (!isNaN(perc) && perc > 0) {
            valorDescontoCalculado += subtotalOriginal * Math.min(perc, 100) / 100;
          }
        }
        if (valor.trim()) {
          const val = parseFloat(valor.replace(',', '.'));
          if (!isNaN(val) && val > 0) {
            valorDescontoCalculado += val;
          }
        }
        if (valorDescontoCalculado < 0) valorDescontoCalculado = 0;
        valorDescontoCalculado = Math.min(valorDescontoCalculado, subtotalOriginal);
        const subtotalFinal = Math.max(0, subtotalOriginal - valorDescontoCalculado);
        return {
          ...item,
          descontoPercentual: percentual.trim() ? parseFloat(percentual.replace(',', '.')) : undefined,
          descontoValor: valor.trim() ? parseFloat(valor.replace(',', '.')) : undefined,
          valorDesconto: valorDescontoCalculado,
          subtotal: subtotalFinal,
        };
      }
      return item;
    }));
  };

  // --- Pagamentos múltiplos ---
  const adicionarPagamento = () => {
    setPagamentos(prev => [
      ...prev,
      { id: crypto.randomUUID(), vendaId: '', formaPagamento: 'dinheiro', valor: 0 },
    ]);
  };

  const removerPagamento = (id: string) => {
    if (pagamentos.length <= 1) return;
    setPagamentos(prev => prev.filter(p => p.id !== id));
  };

  const atualizarPagamento = (id: string, campo: 'formaPagamento' | 'valor', valor: any) => {
    setPagamentos(prev =>
      prev.map(p => p.id === id ? { ...p, [campo]: campo === 'valor' ? parseFloat(valor) || 0 : valor } : p)
    );
  };

  const somaPagamentos = pagamentos.reduce((s, p) => s + p.valor, 0);

  const adicionarItem = () => {
    if (!itemSelecionado || quantidadeItem <= 0) {
      toast({ title: 'Erro', description: 'Selecione um item e defina a quantidade.', variant: 'destructive' });
      return;
    }
    let item: Servico | Produto | undefined;
    let nome: string;
    let precoOriginal: number;
    let precoFinal: number;
    let temPromocao = false;
    let infoPromocao = '';
    if (tipoItem === 'servico') {
      item = servicos.find(s => s.id === itemSelecionado);
      if (!item) return;
      nome = item.nome;
      precoOriginal = (item as Servico).preco;
    } else {
      item = produtos.find(p => p.id === itemSelecionado);
      if (!item) return;
      nome = item.nome;
      precoOriginal = (item as Produto).precoVenda;
      // Apenas produtos de revenda têm estoque próprio. Compostos validam
      // disponibilidade de insumos no checkout (warn-but-allow), nunca bloqueiam.
      if (!(item as Produto).isComposto && (item as Produto).estoque < quantidadeItem) {
        toast({ title: 'Estoque insuficiente', description: `Disponível: ${(item as Produto).estoque} unidades`, variant: 'destructive' });
        return;
      }
    }
    const infoPrecoPromocional = calcularPrecoFinal(itemSelecionado, tipoItem, precoOriginal);
    if (infoPrecoPromocional.temPromocao && infoPrecoPromocional.precoPromocional !== null) {
      precoFinal = infoPrecoPromocional.precoPromocional;
      temPromocao = true;
      infoPromocao = `${infoPrecoPromocional.tipo === 'desconto' ? 'Desconto' : 'Acréscimo'} de ${infoPrecoPromocional.percentual}%`;
    } else {
      precoFinal = precoOriginal;
    }
    if (precoFinal <= 0 || precoFinal > 999999.99) {
      toast({ title: 'Preço Inválido', description: `O preço do item "${nome}" está fora do limite permitido (R$ 0,01 - R$ 999.999,99)`, variant: 'destructive' });
      return;
    }
    const subtotalCalculado = precoFinal * quantidadeItem;
    if (subtotalCalculado > 999999.99) {
      toast({ title: 'Subtotal Muito Alto', description: `O subtotal (R$ ${subtotalCalculado.toFixed(2)}) excede o limite máximo. Reduza a quantidade.`, variant: 'destructive' });
      return;
    }
    const novoItem: ItemVenda = {
      id: crypto.randomUUID(),
      tipo: tipoItem,
      itemId: itemSelecionado,
      nome,
      preco: precoFinal,
      quantidade: quantidadeItem,
      subtotal: precoFinal * quantidadeItem,
      precoOriginal: temPromocao ? precoOriginal : undefined,
      promocaoInfo: temPromocao ? infoPromocao : undefined,
      valorDesconto: 0,
    };
    setItensVenda([...itensVenda, novoItem]);
    setItemSelecionado('');
    setQuantidadeItem(1);
    setBuscarItem('');
    toast({ title: 'Item adicionado', description: `${nome} foi adicionado à venda.` });
  };

  const removerItem = (id: string) => {
    setItensVenda(itensVenda.filter(item => item.id !== id));
    setDescItemPercentual(prev => { const n = { ...prev }; delete n[id]; return n; });
    setDescItemValor(prev => { const n = { ...prev }; delete n[id]; return n; });
  };

  const finalizarVenda = async () => {
    if (!clienteSelecionado) {
      toast({ title: 'Erro', description: 'Selecione um cliente.', variant: 'destructive' });
      return;
    }
    if (!barbeiroSelecionado) {
      toast({ title: 'Erro', description: 'Selecione um barbeiro.', variant: 'destructive' });
      return;
    }
    if (itensVenda.length === 0) {
      toast({ title: 'Erro', description: 'Adicione pelo menos um item à venda.', variant: 'destructive' });
      return;
    }
    if (pagamentos.every(p => p.valor <= 0)) {
      toast({ title: 'Erro', description: 'Informe pelo menos um pagamento.', variant: 'destructive' });
      return;
    }

    const totalVenda = calcularTotal();
    const totalPago = somaPagamentos;
    const comInadimplencia = totalPago < totalVenda - 0.01;

    // Validar disponibilidade de insumos para produtos compostos
    const itensProdutos = itensVenda
      .filter(i => i.tipo === 'produto')
      .map(i => ({ tipo: 'produto', item_id: i.itemId, quantidade: i.quantidade }));

    if (itensProdutos.length > 0) {
      try {
        const { data, error } = await supabase.rpc('validar_disponibilidade_insumos', {
          p_itens: itensProdutos as any,
        });
        if (!error && data && typeof data === 'object' && (data as any).ok === false) {
          setAlertasInsumos((data as any).alertas || []);
          setComInadimplenciaPendente(comInadimplencia);
          if (comInadimplencia) setSaldoDevedor(totalVenda - totalPago);
          setShowAlertaInsumos(true);
          return;
        }
      } catch (e) {
        console.warn('Falha ao validar insumos (prosseguindo):', e);
      }
    }

    // Se pagou menos que o total, perguntar sobre inadimplência
    if (comInadimplencia) {
      setSaldoDevedor(totalVenda - totalPago);
      setShowModalInadimplencia(true);
      return;
    }

    // Pagou total ou mais - registrar normalmente
    await executarRegistroVenda(false);
  };

  const executarRegistroVenda = async (comInadimplencia: boolean) => {
    try {
      const valorDesconto = calcularTotalDesconto();
      const totalVenda = calcularTotal();
      const totalPago = somaPagamentos;

      // Forma de pagamento principal (maior valor) para compatibilidade
      const formaPrincipal = pagamentos.reduce((prev, curr) => curr.valor > prev.valor ? curr : prev).formaPagamento;

      const dataAtendimento = new Date();
      const [horas, minutos] = horarioAtendimento.split(':').map(Number);
      dataAtendimento.setHours(horas, minutos, 0, 0);

      const novaVenda: Venda = {
        id: crypto.randomUUID(),
        clienteId: clienteSelecionado,
        barbeiroId: barbeiroSelecionado,
        itens: itensVenda,
        total: totalVenda,
        desconto: valorDesconto > 0 ? valorDesconto : undefined,
        formaPagamento: formaPrincipal as any,
        status: 'pago',
        observacoes: observacoes.trim() || undefined,
        dataVenda: dataAtendimento.toISOString(),
        dataAtualizacao: new Date().toISOString(),
        horarioAtendimento: dataAtendimento.toISOString(),
      };

      await supabaseVendaStorage.add(novaVenda);

      // Registrar pagamentos múltiplos
      const pagamentosComVenda = pagamentos.filter(p => p.valor > 0).map(p => ({
        ...p,
        vendaId: novaVenda.id,
      }));
      await registrarPagamentosVenda(novaVenda.id, pagamentosComVenda);

      // Se inadimplência, registrar conta a receber
      if (comInadimplencia) {
        await registrarInadimplencia(
          novaVenda.id,
          clienteSelecionado,
          barbeiroSelecionado,
          totalVenda,
          totalPago,
          pagamentosComVenda,
        );
      }

      // Atualizar ultimoAtendimento do cliente
      if (clienteSelecionado) {
        const cliente = clientes.find(c => c.id === clienteSelecionado);
        if (cliente) {
          await supabaseClienteStorage.update({
            ...cliente,
            ultimoAtendimento: new Date().toISOString(),
          });
        }
      }

      toast({
        title: 'Venda registrada',
        description: comInadimplencia
          ? `Venda registrada com saldo devedor de R$ ${saldoDevedor.toFixed(2)}.`
          : 'Venda registrada com sucesso. Dashboard financeiro atualizado!',
      });

      // Limpar formulário
      setClienteSelecionado('');
      setBuscarCliente('');
      setClienteSelecionadoNome('');
      setBarbeiroSelecionado(canViewAllData() ? '' : getCurrentUserId());
      setItensVenda([]);
      setPagamentos([{ id: crypto.randomUUID(), vendaId: '', formaPagamento: 'dinheiro', valor: 0 }]);
      setObservacoes('');
      setDescItemPercentual({});
      setDescItemValor({});
      setPendenciasCliente([]);
      setShowModalInadimplencia(false);
      const agora = new Date();
      setHorarioAtendimento(agora.toTimeString().slice(0, 5));

      setTimeout(() => { refreshData(); }, 500);
    } catch (error: any) {
      console.error('❌ Erro ao registrar venda:', error);
      let mensagemErro = 'Erro ao registrar venda';
      if (error.message) mensagemErro = error.message;
      else if (error.code === 'PGRST116') mensagemErro = 'Erro de permissão ao salvar venda.';
      else if (error.code === '22003') mensagemErro = 'Valores da venda são muito grandes.';
      toast({ title: 'Erro ao Registrar Venda', description: mensagemErro, variant: 'destructive' });
    }
  };

  const itensDisponiveis = tipoItem === 'servico'
    ? servicos.filter(s => s.nome.toLowerCase().includes(buscarItem.toLowerCase()) && s.ativo)
    : produtos.filter(p => p.nome.toLowerCase().includes(buscarItem.toLowerCase()) && p.ativo && (p.isComposto || p.estoque > 0));

  const clientesFiltrados = clientes.filter(c =>
    c.nome.toLowerCase().includes(buscarCliente.toLowerCase()) || c.telefone.includes(buscarCliente)
  );

  const vendasFiltradas = canViewAllData() ? vendas : vendas.filter(v => v.barbeiroId === getCurrentUserId());

  const totalPendencias = pendenciasCliente.reduce((s: number, p: any) => s + p.saldoDevedor, 0);

  return (
    <ResponsiveLayout>
      <div className="space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Digitação da Venda</h1>
            <p className="text-sm sm:text-base text-muted-foreground">Registre vendas de serviços e produtos</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Formulário de Nova Venda */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                Nova Venda
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Seleção de Cliente */}
              <div className="space-y-2">
                <Label>Cliente *</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Buscar cliente por nome ou telefone..."
                    value={buscarCliente}
                    onChange={e => {
                      setBuscarCliente(e.target.value);
                      if (!e.target.value) {
                        setClienteSelecionado('');
                        setClienteSelecionadoNome('');
                      }
                    }}
                  />
                  <Button variant="outline" size="icon"><Plus className="h-4 w-4" /></Button>
                </div>
                {buscarCliente && !clienteSelecionado && (
                  <div className="border rounded max-h-40 overflow-y-auto">
                    {clientesFiltrados.slice(0, 5).map(cliente => (
                      <button
                        key={cliente.id}
                        className="w-full text-left px-3 py-2 hover:bg-muted"
                        onClick={() => {
                          setClienteSelecionado(cliente.id);
                          setClienteSelecionadoNome(cliente.nome);
                          setBuscarCliente(cliente.nome);
                        }}
                      >
                        <div className="font-medium">{cliente.nome}</div>
                        <div className="text-sm text-muted-foreground">{cliente.telefone}</div>
                      </button>
                    ))}
                    {clientesFiltrados.length === 0 && (
                      <div className="px-3 py-2 text-muted-foreground">Nenhum cliente encontrado</div>
                    )}
                  </div>
                )}
                {clienteSelecionado && (
                  <div className="text-sm text-green-600 font-medium">✓ {clienteSelecionadoNome}</div>
                )}

                {/* Alerta de pendências */}
                {clienteSelecionado && pendenciasCliente.length > 0 && (
                  <Alert variant="destructive" className="border-amber-500 bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-200">
                    <AlertTriangle className="h-4 w-4 !text-amber-600" />
                    <AlertTitle>Pendências: R$ {totalPendencias.toFixed(2)}</AlertTitle>
                    <AlertDescription>
                      <div className="space-y-1 mt-1">
                        {pendenciasCliente.map((p: any) => (
                          <div key={p.id} className="text-xs">
                            {p.dataVenda ? new Date(p.dataVenda).toLocaleDateString('pt-BR') : '-'} • {p.barbeiroNome || 'Barbeiro'} • R$ {p.saldoDevedor.toFixed(2)}
                            {p.itensVenda && p.itensVenda.length > 0 && (
                              <span className="ml-1 text-muted-foreground">
                                ({p.itensVenda.map((i: any) => i.nome).join(', ')})
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              {/* Seleção de Barbeiro */}
              {canViewAllData() && (
                <div className="space-y-2">
                  <Label>Barbeiro *</Label>
                  <Select value={barbeiroSelecionado} onValueChange={setBarbeiroSelecionado}>
                    <SelectTrigger><SelectValue placeholder="Selecione o barbeiro" /></SelectTrigger>
                    <SelectContent>
                      {barbeiros.filter(b => b.ativo).map(barbeiro => (
                        <SelectItem key={barbeiro.id} value={barbeiro.id}>{barbeiro.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Adicionar Itens */}
              <div className="space-y-3">
                <div className="flex items-center gap-4">
                  <div className="flex items-center space-x-2">
                    <input type="radio" id="servico" name="tipoItem" checked={tipoItem === 'servico'} onChange={() => { setTipoItem('servico'); setItemSelecionado(''); setBuscarItem(''); }} />
                    <Label htmlFor="servico">Serviços</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input type="radio" id="produto" name="tipoItem" checked={tipoItem === 'produto'} onChange={() => { setTipoItem('produto'); setItemSelecionado(''); setBuscarItem(''); }} />
                    <Label htmlFor="produto">Produtos</Label>
                  </div>
                </div>
                <Input placeholder={`Buscar ${tipoItem === 'servico' ? 'serviços' : 'produtos'}...`} value={buscarItem} onChange={e => setBuscarItem(e.target.value)} />
                {buscarItem && (
                  <div className="border rounded max-h-60 overflow-y-auto">
                    {itensDisponiveis.slice(0, 10).map(item => (
                      <div key={item.id} className={`p-3 border-b last:border-b-0 cursor-pointer hover:bg-muted ${itemSelecionado === item.id ? 'bg-primary/10' : ''}`} onClick={() => setItemSelecionado(item.id)}>
                        <div className="flex justify-between items-center">
                          <div>
                            <div className="font-medium">{item.nome}</div>
                            <PrecoComPromocao itemId={item.id} itemTipo={tipoItem} precoOriginal={tipoItem === 'servico' ? (item as Servico).preco : (item as Produto).precoVenda} />
                          </div>
                          {tipoItem === 'produto' && <div className="text-sm text-muted-foreground">Estoque: {(item as Produto).estoque}</div>}
                        </div>
                      </div>
                    ))}
                    {itensDisponiveis.length === 0 && <div className="p-3 text-muted-foreground">Nenhum item encontrado</div>}
                  </div>
                )}
                {itemSelecionado && (
                  <div className="flex gap-2">
                    <Input type="number" placeholder="Qtd" min="1" value={quantidadeItem} onChange={e => setQuantidadeItem(parseInt(e.target.value) || 1)} className="w-20" />
                    <Button onClick={adicionarItem}><Plus className="h-4 w-4 mr-2" />Adicionar</Button>
                  </div>
                )}
              </div>

              {/* Itens da Venda */}
              {itensVenda.length > 0 && (
                <div className="space-y-2">
                  <Separator />
                  <h3 className="font-semibold">Itens da Venda</h3>
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {itensVenda.map(item => {
                      const valorOriginal = item.precoOriginal || item.preco;
                      const subtotalOriginal = valorOriginal * item.quantidade;
                      const valorDesconto = item.valorDesconto || 0;
                      const valorFinal = item.subtotal;
                      return (
                        <div key={item.id} className="p-3 bg-muted rounded space-y-3">
                          <div className="flex justify-between items-center">
                            <div className="font-medium">{item.nome}</div>
                            <Button variant="ghost" size="sm" onClick={() => removerItem(item.id)} className="text-red-600 hover:text-red-700 h-6 w-6 p-0">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                          <div className="grid grid-cols-4 gap-2 text-xs">
                            <div className="text-center">
                              <div className="font-medium text-muted-foreground">Qtd</div>
                              <div>{item.quantidade}</div>
                            </div>
                            <div className="text-center">
                              <div className="font-medium text-muted-foreground">Valor Original</div>
                              <div>R$ {subtotalOriginal.toFixed(2)}</div>
                            </div>
                            <div className="text-center">
                              <div className="font-medium text-muted-foreground">Desconto</div>
                              <div className="text-red-600">{valorDesconto > 0.01 ? `-R$ ${valorDesconto.toFixed(2)}` : '-'}</div>
                            </div>
                            <div className="text-center">
                              <div className="font-medium text-muted-foreground">Valor Final</div>
                              <div className="font-medium">R$ {valorFinal.toFixed(2)}</div>
                            </div>
                          </div>
                          <div className="border-t pt-2 space-y-2">
                            <div className="text-xs font-medium text-muted-foreground">Desconto Individual</div>
                            <div className="grid grid-cols-2 gap-2">
                              <div className="flex items-center gap-1">
                                <Percent className="h-3 w-3 text-muted-foreground" />
                                <Input type="text" placeholder="Ex: 10" value={descItemPercentual[item.id] || ''} onChange={e => atualizarDescontoItem(item.id, 'percentual', e.target.value)} className="text-xs h-7" />
                              </div>
                              <div className="flex items-center gap-1">
                                <DollarSign className="h-3 w-3 text-muted-foreground" />
                                <Input type="text" placeholder="Ex: 15" value={descItemValor[item.id] || ''} onChange={e => atualizarDescontoItem(item.id, 'valor', e.target.value)} className="text-xs h-7" />
                              </div>
                            </div>
                          </div>
                          {item.promocaoInfo && <div className="text-xs text-primary font-medium">⭐ {item.promocaoInfo}</div>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Pagamentos Múltiplos */}
              <div className="space-y-3">
                <Separator />
                <Label className="text-base font-semibold">Formas de Pagamento *</Label>
                {pagamentos.map((pag, index) => (
                  <div key={pag.id} className="flex items-center gap-2">
                    <Select value={pag.formaPagamento} onValueChange={(v) => atualizarPagamento(pag.id, 'formaPagamento', v)}>
                      <SelectTrigger className="w-[140px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {formasPagamentoDisponiveis.map(fp => (
                          <SelectItem key={fp.id} value={fp.id}>{fp.nome}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="flex items-center gap-1 flex-1">
                      <span className="text-sm text-muted-foreground">R$</span>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0,00"
                        value={pag.valor || ''}
                        onChange={e => atualizarPagamento(pag.id, 'valor', e.target.value)}
                      />
                    </div>
                    {pagamentos.length > 1 && (
                      <Button variant="ghost" size="icon" onClick={() => removerPagamento(pag.id)} className="text-red-500 h-8 w-8">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={adicionarPagamento} className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Pagamento
                </Button>
              </div>

              {/* Horário do Atendimento */}
              <div className="space-y-2">
                <Label>Horário do Atendimento</Label>
                <div className="flex items-center gap-2">
                  <Input type="time" value={horarioAtendimento} onChange={e => setHorarioAtendimento(e.target.value)} className="w-32" />
                  <span className="text-sm text-muted-foreground">({new Date().toLocaleDateString('pt-BR')})</span>
                </div>
                <div className="text-xs text-muted-foreground">O dia será sempre hoje, você pode ajustar apenas o horário</div>
              </div>

              {/* Observações */}
              <div className="space-y-2">
                <Label>Observações</Label>
                <Textarea placeholder="Observações sobre a venda..." value={observacoes} onChange={e => setObservacoes(e.target.value)} rows={2} />
              </div>
            </CardContent>
          </Card>

          {/* Resumo da Venda */}
          <ResumoVenda
            subtotal={calcularSubtotal()}
            totalDesconto={calcularTotalDesconto()}
            total={calcularTotal()}
            barbeiroSelecionado={barbeiroSelecionado}
            barbeiros={barbeiros}
            itensVenda={itensVenda}
            calcularComissaoItem={calcularComissaoItem}
            onFinalizarVenda={finalizarVenda}
            canFinalize={!(!clienteSelecionado || !barbeiroSelecionado || itensVenda.length === 0)}
            horarioAtendimento={horarioAtendimento}
            pagamentos={pagamentos}
          />
        </div>

        {/* Vendas Recentes */}
        <Card>
          <CardHeader><CardTitle>Vendas Recentes</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {vendasFiltradas
                .sort((a, b) => new Date(b.dataVenda).getTime() - new Date(a.dataVenda).getTime())
                .slice(0, 10)
                .map(venda => {
                  const cliente = clientes.find(c => c.id === venda.clienteId);
                  const barbeiro = barbeiros.find(b => b.id === venda.barbeiroId);
                  return (
                    <div key={venda.id} className="flex justify-between items-center p-3 bg-muted rounded">
                      <div>
                        <div className="font-medium">{cliente?.nome || 'Cliente não encontrado'}</div>
                        <div className="text-sm text-muted-foreground">
                          {barbeiro?.nome} • {new Date(venda.dataVenda).toLocaleDateString('pt-BR')} às {new Date(venda.dataVenda).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                        <div className="text-xs text-muted-foreground">{venda.itens.map(item => item.nome).join(', ')}</div>
                      </div>
                      <div className="text-right">
                        <Badge variant="secondary">R$ {(() => {
                          const conta = contasPendentes.find(c => c.vendaId === venda.id);
                          const valorEfetivo = conta ? venda.total - conta.saldoDevedor : venda.total;
                          return valorEfetivo.toFixed(2);
                        })()}</Badge>
                        {contasPendentes.some(c => c.vendaId === venda.id) && (
                          <Badge variant="outline" className="text-amber-600 border-amber-600 text-xs ml-1">Fiado</Badge>
                        )}
                        <div className="text-xs text-muted-foreground mt-1 capitalize">
                          {(pagamentosVendaMap[venda.id] && pagamentosVendaMap[venda.id].length > 0)
                            ? pagamentosVendaMap[venda.id].join(', ')
                            : venda.formaPagamento.replace('_', ' ')}
                        </div>
                      </div>
                    </div>
                  );
                })}
              {vendasFiltradas.length === 0 && <div className="text-center py-8 text-muted-foreground">Nenhuma venda registrada</div>}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Modal de Confirmação de Inadimplência */}
      <AlertDialog open={showModalInadimplencia} onOpenChange={setShowModalInadimplencia}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-amber-600">
              <AlertTriangle className="h-5 w-5" />
              Saldo Devedor Detectado
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>O valor informado nos pagamentos é menor que o total da venda.</p>
              <div className="bg-muted p-3 rounded space-y-1 text-sm">
                <div className="flex justify-between"><span>Total da venda:</span><span className="font-bold">R$ {calcularTotal().toFixed(2)}</span></div>
                <div className="flex justify-between"><span>Total pago:</span><span>R$ {somaPagamentos.toFixed(2)}</span></div>
                <Separator />
                <div className="flex justify-between text-amber-600 font-bold"><span>Saldo devedor:</span><span>R$ {saldoDevedor.toFixed(2)}</span></div>
              </div>
              <p className="font-medium">Deseja registrar este cliente como inadimplente?</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => executarRegistroVenda(true)} className="bg-amber-600 hover:bg-amber-700">
              Confirmar Inadimplência
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal de Alerta de Estoque Insuficiente de Insumos */}
      <AlertDialog open={showAlertaInsumos} onOpenChange={setShowAlertaInsumos}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-amber-600">
              <AlertTriangle className="h-5 w-5" />
              Estoque de Insumos Insuficiente
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>Os seguintes insumos não têm estoque suficiente para atender a esta venda:</p>
              <div className="bg-muted p-3 rounded space-y-1 text-sm max-h-60 overflow-y-auto">
                {alertasInsumos.map((a, idx) => (
                  <div key={idx} className="flex justify-between gap-2">
                    <span className="font-medium">{a.insumo_nome}</span>
                    <span className="text-amber-600">
                      Falta {Number(a.falta).toLocaleString('pt-BR', { maximumFractionDigits: 3 })} {a.unidade}
                      <span className="text-muted-foreground ml-1">
                        (precisa {Number(a.necessario).toLocaleString('pt-BR', { maximumFractionDigits: 3 })}, tem {Number(a.disponivel).toLocaleString('pt-BR', { maximumFractionDigits: 3 })})
                      </span>
                    </span>
                  </div>
                ))}
              </div>
              <p className="font-medium">Deseja prosseguir mesmo assim? O estoque dos insumos ficará negativo.</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar Venda</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowAlertaInsumos(false);
                if (comInadimplenciaPendente) {
                  setShowModalInadimplencia(true);
                } else {
                  executarRegistroVenda(false);
                }
              }}
              className="bg-amber-600 hover:bg-amber-700"
            >
              Prosseguir Mesmo Assim
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ResponsiveLayout>
  );
}
