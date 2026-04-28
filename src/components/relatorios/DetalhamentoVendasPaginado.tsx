import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Download, DollarSign, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Trash2, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Venda, Cliente, Barbeiro } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { getVendaValores } from '@/utils/vendaValores';
interface DetalhamentoVendasPaginadoProps {
  vendas: Venda[];
  clientes: Cliente[];
  barbeiros: Barbeiro[];
  onSort: (field: string) => void;
  sortField: string;
  sortDirection: 'asc' | 'desc';
  SortIcon: React.ComponentType<{
    field: string;
  }>;
  canViewAllData: boolean;
  onVendaDeleted?: () => void;
  saldoPendenteMap?: Map<string, number>;
  pagamentosVendaMap?: Record<string, string[]>;
}
const ITEMS_POR_PAGINA = 15;
export const DetalhamentoVendasPaginado = ({
  vendas,
  clientes,
  barbeiros,
  onSort,
  sortField,
  sortDirection,
  SortIcon,
  canViewAllData,
  onVendaDeleted,
  saldoPendenteMap,
  pagamentosVendaMap
}: DetalhamentoVendasPaginadoProps) => {
  const [paginaAtual, setPaginaAtual] = useState(1);
  const totalPaginas = Math.ceil(vendas.length / ITEMS_POR_PAGINA);
  const indiceInicio = (paginaAtual - 1) * ITEMS_POR_PAGINA;
  const indiceFim = indiceInicio + ITEMS_POR_PAGINA;
  const vendasPaginadas = vendas.slice(indiceInicio, indiceFim);
  const formatarTelefone = (telefone: string) => {
    const digits = telefone.replace(/\D/g, '');
    if (digits.length === 11) {
      return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
    }
    return telefone;
  };
  const exportarRelatorio = () => {
    // Implementar exportação para Excel/PDF
    alert('Funcionalidade de exportação será implementada em breve!');
  };
  const irParaPagina = (pagina: number) => {
    setPaginaAtual(Math.max(1, Math.min(pagina, totalPaginas)));
  };
  const excluirVenda = async (vendaId: string) => {
    try {
      const {
        data,
        error
      } = await supabase.rpc('excluir_venda_com_estorno' as any, { p_venda_id: vendaId });
      if (error) {
        throw error;
      }
      if (data && typeof data === 'object' && 'success' in data && !data.success) {
        throw new Error(String(data.error || 'Erro ao excluir venda'));
      }
      toast.success('Venda excluída com sucesso!');
      onVendaDeleted?.();
    } catch (error) {
      console.error('Erro ao excluir venda:', error);
      toast.error('Erro ao excluir venda. Tente novamente.');
    }
  };
  return <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            Detalhamento das Vendas
          </span>
          <Button onClick={exportarRelatorio} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
        </CardTitle>
        <CardDescription>
          Lista completa das vendas no período selecionado ({vendas.length} vendas)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Tabela */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">
                  <Button variant="ghost" onClick={() => onSort('data')} className="h-auto p-0 font-medium hover:bg-transparent text-primary-foreground">
                    Data <SortIcon field="data" />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button variant="ghost" onClick={() => onSort('cliente')} className="h-auto p-0 font-medium hover:bg-transparent text-primary-foreground">
                    Cliente <SortIcon field="cliente" />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button variant="ghost" onClick={() => onSort('barbeiro')} className="h-auto p-0 font-medium hover:bg-transparent text-primary-foreground">
                    Barbeiro <SortIcon field="barbeiro" />
                  </Button>
                </TableHead>
                <TableHead>Itens</TableHead>
                <TableHead>
                  <Button variant="ghost" onClick={() => onSort('formaPagamento')} className="h-auto p-0 font-medium hover:bg-transparent text-primary-foreground">
                    Pagamento <SortIcon field="formaPagamento" />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button variant="ghost" onClick={() => onSort('status')} className="h-auto p-0 font-medium hover:bg-transparent text-primary-foreground">
                    Status <SortIcon field="status" />
                  </Button>
                </TableHead>
                <TableHead className="text-right text-primary-foreground">Valor Original</TableHead>
                <TableHead className="text-right text-primary-foreground">Desconto</TableHead>
                <TableHead className="text-right">
                  <Button variant="ghost" onClick={() => onSort('valor')} className="h-auto p-0 font-medium hover:bg-transparent text-primary-foreground">
                    Valor Líquido <SortIcon field="valor" />
                  </Button>
                </TableHead>
                {canViewAllData && <TableHead className="w-[100px] text-primary-foreground">Ações</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {vendasPaginadas.length === 0 ? <TableRow>
                  <TableCell colSpan={canViewAllData ? 10 : 9} className="text-center py-8 text-muted-foreground">
                    Nenhuma venda encontrada no período selecionado
                  </TableCell>
                </TableRow> : vendasPaginadas.map(venda => {
              const cliente = clientes.find(c => c.id === venda.clienteId);
              const barbeiro = barbeiros.find(barbeiro => barbeiro.id === venda.barbeiroId);
               const saldoDevedor = saldoPendenteMap?.get(venda.id) || 0;
               const valores = getVendaValores(venda, saldoDevedor);
              return <TableRow key={venda.id}>
                      <TableCell className="font-mono text-sm">
                        {format(new Date(venda.dataVenda), 'dd/MM/yy', {
                    locale: ptBR
                  })}
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{cliente?.nome || 'Cliente não encontrado'}</div>
                          {cliente?.telefone && <div className="text-sm text-muted-foreground">
                              {formatarTelefone(cliente.telefone)}
                            </div>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {barbeiro?.fotoPerfilUrl ? <img src={barbeiro.fotoPerfilUrl} alt={barbeiro.nome} className="h-6 w-6 rounded-full object-cover" /> : <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
                              <span className="text-xs font-medium text-primary">
                                {barbeiro?.nome?.charAt(0) || '?'}
                              </span>
                            </div>}
                          <span className="text-sm">{barbeiro?.nome || 'Barbeiro não encontrado'}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {venda.itens.map((item, index) => <div key={index} className="text-sm">
                              <span className="font-medium">{item.nome}</span>
                              <span className="text-muted-foreground ml-1">({item.quantidade}x)</span>
                            </div>)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm capitalize">
                          {(pagamentosVendaMap?.[venda.id] && pagamentosVendaMap[venda.id].length > 0)
                            ? pagamentosVendaMap[venda.id].join(', ')
                            : venda.formaPagamento.replace('_', ' ')}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className={cn("inline-flex items-center px-2 py-1 rounded-full text-xs font-medium", venda.status === 'pago' && "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200", venda.status === 'aguardando' && "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200", venda.status === 'cancelado' && "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200")}>
                          {venda.status === 'pago' && '✓ Pago'}
                          {venda.status === 'aguardando' && '⏳ Aguardando'}
                          {venda.status === 'cancelado' && '✗ Cancelado'}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="font-mono font-medium">
                           R$ {valores.original.toLocaleString('pt-BR', {
                      minimumFractionDigits: 2
                    })}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                         {valores.desconto > 0 ? <span className="font-mono font-medium text-red-600">
                             -R$ {valores.desconto.toLocaleString('pt-BR', {
                      minimumFractionDigits: 2
                    })}
                          </span> : <span className="text-muted-foreground">-</span>}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {saldoDevedor > 0 && (
                            <AlertTriangle className="h-3.5 w-3.5 text-yellow-500" />
                          )}
                          <span className={cn("font-mono font-medium", saldoDevedor > 0 ? "text-yellow-600" : "text-green-600")}>
                            R$ {valores.liquido.toLocaleString('pt-BR', {
                              minimumFractionDigits: 2
                            })}
                          </span>
                        </div>
                      </TableCell>
                      {canViewAllData && <TableCell>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Tem certeza que deseja excluir esta venda? Esta ação não pode ser desfeita e removerá completamente a venda e seus dados associados (comissões, histórico, etc.).
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => excluirVenda(venda.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                  Excluir Venda
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </TableCell>}
                    </TableRow>;
            })}
            </TableBody>
          </Table>
        </div>

        {/* Paginação */}
        {totalPaginas > 1 && <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Mostrando {indiceInicio + 1} a {Math.min(indiceFim, vendas.length)} de {vendas.length} vendas
            </div>
            
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => irParaPagina(1)} disabled={paginaAtual === 1}>
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              
              <Button variant="outline" size="sm" onClick={() => irParaPagina(paginaAtual - 1)} disabled={paginaAtual === 1}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              
              <span className="text-sm px-3 py-1">
                Página {paginaAtual} de {totalPaginas}
              </span>
              
              <Button variant="outline" size="sm" onClick={() => irParaPagina(paginaAtual + 1)} disabled={paginaAtual === totalPaginas}>
                <ChevronRight className="h-4 w-4" />
              </Button>
              
              <Button variant="outline" size="sm" onClick={() => irParaPagina(totalPaginas)} disabled={paginaAtual === totalPaginas}>
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </div>
          </div>}
      </CardContent>
    </Card>;
};