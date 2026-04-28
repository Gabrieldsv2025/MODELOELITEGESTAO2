import { useState, useMemo } from 'react';
import { useDespesas } from '@/hooks/useDespesas';
import { useIndicadoresFinanceiros } from '@/hooks/useIndicadoresFinanceiros';
import { ResponsiveLayout } from '@/components/layout/ResponsiveLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { DespesaForm } from '@/components/despesas/DespesaForm';
import { DespesasChart } from '@/components/despesas/DespesasChart';
import { DialogPagamentoDespesa } from '@/components/despesas/DialogPagamentoDespesa';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, Trash2, TrendingDown, TrendingUp, DollarSign, Calendar, Repeat } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Despesa } from '@/types';
const categoriasLabel: Record<string, string> = {
  fixa: 'Fixa',
  variavel: 'Variável',
  investimento: 'Investimento',
  impostos: 'Impostos',
  comissao: 'Comissão',
  insumo: 'Insumo',
  outro: 'Outro'
};
const formasPagamentoLabel: Record<string, string> = {
  dinheiro: 'Dinheiro',
  pix: 'PIX',
  cartao: 'Cartão',
  transferencia: 'Transferência'
};
export default function Despesas() {
  const {
    despesas,
    loading,
    adicionarDespesa,
    editarDespesa,
    excluirDespesa,
    marcarComoPago,
    calcularResumoDespesas
  } = useDespesas();
  const {
    indicadores
  } = useIndicadoresFinanceiros();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [despesaSelecionada, setDespesaSelecionada] = useState<Despesa | undefined>();
  const [despesaParaDeletar, setDespesaParaDeletar] = useState<string | null>(null);
  const [pagamentoDialogOpen, setPagamentoDialogOpen] = useState(false);
  const [despesaParaPagar, setDespesaParaPagar] = useState<Despesa | null>(null);

  // Filtros
  const [filtroCategoria, setFiltroCategoria] = useState<string>('todas');
  const [filtroFormaPagamento, setFiltroFormaPagamento] = useState<string>('todas');
  const [filtroMes, setFiltroMes] = useState<string>(() => {
    const hoje = new Date();
    const ano = hoje.getFullYear();
    const mes = String(hoje.getMonth() + 1).padStart(2, '0');
    return `${ano}-${mes}`;
  });
  const [filtroBusca, setFiltroBusca] = useState('');
  const [filtroAno, setFiltroAno] = useState<number>(() => {
    return new Date().getFullYear(); // Padrão: ano atual
  });
  const despesasFiltradas = useMemo(() => {
    return despesas.filter(despesa => {
      const matchCategoria = filtroCategoria === 'todas' || despesa.categoria === filtroCategoria;
      const matchFormaPagamento = filtroFormaPagamento === 'todas' || despesa.formaPagamento === filtroFormaPagamento;
      const matchMes = filtroMes === 'todos' || (() => {
        const data = new Date(despesa.dataDespesa);
        const mesAno = `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}`;
        return mesAno === filtroMes;
      })();
      const matchBusca = filtroBusca === '' || despesa.descricao.toLowerCase().includes(filtroBusca.toLowerCase()) || despesa.fornecedor?.toLowerCase().includes(filtroBusca.toLowerCase());
      return matchCategoria && matchFormaPagamento && matchMes && matchBusca;
    });
  }, [despesas, filtroCategoria, filtroFormaPagamento, filtroMes, filtroBusca]);
  const resumo = useMemo(() => calcularResumoDespesas(despesasFiltradas), [despesasFiltradas, calcularResumoDespesas]);
  const mesesDisponiveis = useMemo(() => {
    const meses = new Set<string>();
    despesas.forEach(despesa => {
      const data = new Date(despesa.dataDespesa);
      const mesAno = `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}`;
      meses.add(mesAno);
    });
    return Array.from(meses).sort().reverse();
  }, [despesas]);
  const anosDisponiveis = useMemo(() => {
    const anos = new Set<number>();
    const anoAtual = new Date().getFullYear();

    // Adicionar ano atual sempre (mesmo sem despesas)
    anos.add(anoAtual);

    // Adicionar anos que têm despesas
    despesas.forEach(despesa => {
      const ano = new Date(despesa.dataDespesa).getFullYear();
      anos.add(ano);
    });

    // Ordenar do mais recente para o mais antigo
    return Array.from(anos).sort((a, b) => b - a);
  }, [despesas]);
  const indicadorAtual = useMemo(() => {
    const hoje = new Date();
    return indicadores.find(ind => ind.mesReferencia === hoje.getMonth() + 1 && ind.anoReferencia === hoje.getFullYear());
  }, [indicadores]);
  const handleAdicionarDespesa = () => {
    setDespesaSelecionada(undefined);
    setDialogOpen(true);
  };
  const handleEditarDespesa = (despesa: Despesa) => {
    setDespesaSelecionada(despesa);
    setDialogOpen(true);
  };
  const handleConfirmarDelete = (id: string) => {
    setDespesaParaDeletar(id);
    setDeleteDialogOpen(true);
  };
  const handleDelete = async () => {
    if (despesaParaDeletar) {
      await excluirDespesa(despesaParaDeletar);
      setDeleteDialogOpen(false);
      setDespesaParaDeletar(null);
    }
  };
  const handleSubmit = async (data: any) => {
    if (despesaSelecionada) {
      const success = await editarDespesa(despesaSelecionada.id, data);
      if (success) {
        setDialogOpen(false);
      }
      return success;
    } else {
      const success = await adicionarDespesa(data);
      if (success) {
        setDialogOpen(false);
      }
      return success;
    }
  };
  const handleMarcarComoPago = (despesa: Despesa) => {
    setDespesaParaPagar(despesa);
    setPagamentoDialogOpen(true);
  };
  const handleConfirmarPagamento = async (dataPagamento: string) => {
    if (despesaParaPagar) {
      await marcarComoPago(despesaParaPagar.id, dataPagamento);
      setDespesaParaPagar(null);
    }
  };
  if (loading) {
    return <ResponsiveLayout>
        <div className="container mx-auto p-6">
          <div className="flex items-center justify-center h-64">
            <p className="text-muted-foreground">Carregando despesas...</p>
          </div>
        </div>
      </ResponsiveLayout>;
  }
  return <ResponsiveLayout>
      <div className="container mx-auto p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Controle de Despesas</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Gerencie as despesas e controle financeiro</p>
        </div>
        <Button onClick={handleAdicionarDespesa} className="w-full sm:w-auto">
          <Plus className="mr-2 h-4 w-4" />
          Nova Despesa
        </Button>
      </div>

      {/* Cards de Resumo */}
      <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Despesas</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              R$ {resumo.totalGeral.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              {despesasFiltradas.length} despesa(s)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Média Mensal</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              R$ {resumo.mediaMensal.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              Baseado no período filtrado
            </p>
          </CardContent>
        </Card>

        {indicadorAtual && <>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Margem Líquida</CardTitle>
                {indicadorAtual.margemLiquida >= 0 ? <TrendingUp className="h-4 w-4 text-green-500" /> : <TrendingDown className="h-4 w-4 text-destructive" />}
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${indicadorAtual.margemLiquida >= 0 ? 'text-green-500' : 'text-destructive'}`}>
                  {indicadorAtual.margemLiquida.toFixed(2)}%
                </div>
                <p className="text-xs text-muted-foreground">
                  Mês atual
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Lucro Líquido</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${indicadorAtual.lucroLiquido >= 0 ? '' : 'text-destructive'}`}>
                  R$ {indicadorAtual.lucroLiquido.toFixed(2)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Mês atual
                </p>
              </CardContent>
            </Card>
          </>}
      </div>

      {/* Gráfico de Evolução */}
      <DespesasChart despesas={despesas} loading={loading} anoSelecionado={filtroAno} />

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
          <CardDescription>Filtre as despesas por categoria, forma de pagamento e período</CardDescription>
        </CardHeader>
      <CardContent>
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-5">
            <div className="space-y-2">
              <label className="text-sm font-medium">Buscar</label>
              <Input placeholder="Descrição ou fornecedor..." value={filtroBusca} onChange={e => setFiltroBusca(e.target.value)} />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Categoria</label>
              <Select value={filtroCategoria} onValueChange={setFiltroCategoria}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas</SelectItem>
                  {Object.entries(categoriasLabel).map(([key, label]) => <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Forma de Pagamento</label>
              <Select value={filtroFormaPagamento} onValueChange={setFiltroFormaPagamento}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas</SelectItem>
                  {Object.entries(formasPagamentoLabel).map(([key, label]) => <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Ano</label>
              <Select value={filtroAno.toString()} onValueChange={value => setFiltroAno(parseInt(value))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {anosDisponiveis.map(ano => <SelectItem key={ano} value={ano.toString()}>
                      {ano}
                    </SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Mês</label>
              <Select value={filtroMes} onValueChange={setFiltroMes}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {mesesDisponiveis.map(mes => {
                    const [ano, mesNum] = mes.split('-');
                    const data = new Date(parseInt(ano), parseInt(mesNum) - 1);
                    return <SelectItem key={mes} value={mes}>
                        {format(data, 'MMMM yyyy', {
                        locale: ptBR
                      })}
                      </SelectItem>;
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Despesas */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Despesas</CardTitle>
          <CardDescription>
            {despesasFiltradas.length} despesa(s) encontrada(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px] text-primary-foreground">Pagar</TableHead>
                <TableHead>Data Despesa</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Forma Pgto</TableHead>
                <TableHead>Fornecedor</TableHead>
                <TableHead>Status Pgto</TableHead>
                <TableHead>Data Pgto</TableHead>
                <TableHead className="text-right text-primary-foreground">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {despesasFiltradas.length === 0 ? <TableRow>
                  <TableCell colSpan={10} className="text-center text-muted-foreground">
                    Nenhuma despesa encontrada
                  </TableCell>
                </TableRow> : despesasFiltradas.map(despesa => <TableRow key={despesa.id}>
                    <TableCell>
                      <input type="checkbox" checked={despesa.statusPagamento === 'pago'} disabled={despesa.statusPagamento === 'pago'} onChange={() => handleMarcarComoPago(despesa)} className="h-4 w-4 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50" />
                    </TableCell>
                    <TableCell>
                      {format(new Date(despesa.dataDespesa), 'dd/MM/yyyy', {
                    locale: ptBR
                  })}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{despesa.descricao}</span>
                        {despesa.isRecurring && <Badge variant="secondary" className="flex items-center gap-1 text-xs">
                            <Repeat className="h-3 w-3" />
                            Recorrente
                          </Badge>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{categoriasLabel[despesa.categoria]}</Badge>
                    </TableCell>
                    <TableCell className="font-mono">R$ {despesa.valor.toFixed(2)}</TableCell>
                    <TableCell>{formasPagamentoLabel[despesa.formaPagamento]}</TableCell>
                    <TableCell>{despesa.fornecedor || '-'}</TableCell>
                    <TableCell>
                      <Badge variant={despesa.statusPagamento === 'pago' ? 'default' : 'destructive'} className={despesa.statusPagamento === 'pago' ? 'bg-green-600 hover:bg-green-700' : 'bg-yellow-600 hover:bg-yellow-700'}>
                        {despesa.statusPagamento === 'pago' ? 'Pago' : 'Pendente'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {despesa.dataPagamento ? format(new Date(despesa.dataPagamento), 'dd/MM/yyyy', {
                    locale: ptBR
                  }) : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-2 justify-end">
                        <Button variant="ghost" size="icon" onClick={() => handleEditarDespesa(despesa)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleConfirmarDelete(despesa.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>)}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dialog para Adicionar/Editar */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {despesaSelecionada ? 'Editar Despesa' : 'Nova Despesa'}
            </DialogTitle>
            <DialogDescription>
              {despesaSelecionada ? 'Atualize as informações da despesa' : 'Preencha os dados da nova despesa'}
            </DialogDescription>
          </DialogHeader>
          <DespesaForm despesa={despesaSelecionada} onSubmit={handleSubmit} onCancel={() => setDialogOpen(false)} />
        </DialogContent>
      </Dialog>

      {/* Dialog de Confirmação de Exclusão */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta despesa? Esta ação não pode ser desfeita e os
              indicadores financeiros serão recalculados automaticamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog de Pagamento */}
      <DialogPagamentoDespesa open={pagamentoDialogOpen} onOpenChange={setPagamentoDialogOpen} onConfirm={handleConfirmarPagamento} descricaoDespesa={despesaParaPagar?.descricao || ''} />
      </div>
    </ResponsiveLayout>;
}