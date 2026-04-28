import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, DollarSign, ShoppingBag, Scissors, Clock, TrendingUp, User, Receipt, Download, AlertTriangle } from 'lucide-react';
import { Cliente, Venda, ItemVenda } from '@/types';
import { useSupabaseData } from '@/hooks/useSupabaseData';
import { useContasReceber } from '@/hooks/useContasReceber';

interface ClienteDetailsProps {
  cliente: Cliente | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ClienteDetails = ({ cliente, isOpen, onClose }: ClienteDetailsProps) => {
  const { vendas, servicos, produtos, barbeiros } = useSupabaseData();
  const { contasPendentes } = useContasReceber();

  // Mapa de saldo devedor pendente por vendaId
  const saldoPendenteMap = useMemo(() => {
    const map = new Map<string, number>();
    contasPendentes.forEach(c => {
      map.set(c.vendaId, c.saldoDevedor);
    });
    return map;
  }, [contasPendentes]);

  const getValorEfetivo = (venda: Venda) => {
    const saldo = saldoPendenteMap.get(venda.id) || 0;
    return venda.total - saldo;
  };

  if (!cliente) return null;

  // Filtrar vendas do cliente
  const vendasCliente = vendas.filter(v => v.clienteId === cliente.id);
  
  // Calcular estatísticas usando valor efetivo
  const totalGasto = vendasCliente.reduce((sum, venda) => sum + getValorEfetivo(venda), 0);
  const totalGastoMensal = vendasCliente
    .filter(v => {
      const vendaDate = new Date(v.dataVenda);
      const agora = new Date();
      return vendaDate.getMonth() === agora.getMonth() && vendaDate.getFullYear() === agora.getFullYear();
    })
    .reduce((sum, venda) => sum + getValorEfetivo(venda), 0);
  
  const totalGastoSemanal = vendasCliente
    .filter(v => {
      const vendaDate = new Date(v.dataVenda);
      const agora = new Date();
      const diffTime = agora.getTime() - vendaDate.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays <= 7;
    })
    .reduce((sum, venda) => sum + getValorEfetivo(venda), 0);

  const pagamentosPendentes = vendasCliente
    .filter(v => saldoPendenteMap.has(v.id))
    .reduce((sum, venda) => sum + (saldoPendenteMap.get(venda.id) || 0), 0);

  // Calcular frequência
  const ultimaVisita = vendasCliente.length > 0 
    ? Math.floor((new Date().getTime() - new Date(Math.max(...vendasCliente.map(v => new Date(v.dataVenda).getTime()))).getTime()) / (1000 * 60 * 60 * 24))
    : null;

  // Extrair serviços e produtos mais utilizados
  const servicosUtilizados: { [key: string]: number } = {};
  const produtosUtilizados: { [key: string]: number } = {};

  vendasCliente.forEach(venda => {
    venda.itens.forEach(item => {
      if (item.tipo === 'servico') {
        servicosUtilizados[item.nome] = (servicosUtilizados[item.nome] || 0) + item.quantidade;
      } else {
        produtosUtilizados[item.nome] = (produtosUtilizados[item.nome] || 0) + item.quantidade;
      }
    });
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
              <span className="text-primary font-semibold">
                {cliente.nome.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
              </span>
            </div>
            <div>
              <p className="text-lg font-semibold">{cliente.nome}</p>
              <p className="text-sm text-muted-foreground">{cliente.telefone}</p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="historico" className="mt-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="historico">Histórico e Relacionamento</TabsTrigger>
            <TabsTrigger value="financeiro">Financeiro</TabsTrigger>
            <TabsTrigger value="vendas">Todas as Vendas</TabsTrigger>
          </TabsList>

          <TabsContent value="historico" className="space-y-4">
            {/* Frequência de Visitas */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Frequência de Visitas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-primary">{vendasCliente.length}</p>
                    <p className="text-sm text-muted-foreground">Total de Visitas</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-primary">
                      {ultimaVisita !== null ? ultimaVisita : '-'}
                    </p>
                    <p className="text-sm text-muted-foreground">Dias desde última visita</p>
                  </div>
                  <div className="text-center">
                    <Badge variant={cliente.pontosFidelidade >= 100 ? "default" : "secondary"}>
                      {cliente.pontosFidelidade} pontos
                    </Badge>
                    <p className="text-sm text-muted-foreground mt-1">Fidelidade</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Serviços Favoritos */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Scissors className="h-5 w-5" />
                  Serviços Mais Utilizados
                </CardTitle>
              </CardHeader>
              <CardContent>
                {Object.keys(servicosUtilizados).length > 0 ? (
                  <div className="space-y-2">
                    {Object.entries(servicosUtilizados)
                      .sort(([,a], [,b]) => b - a)
                      .slice(0, 5)
                      .map(([servico, quantidade]) => (
                        <div key={servico} className="flex justify-between items-center">
                          <span className="font-medium">{servico}</span>
                          <Badge variant="outline">{quantidade}x</Badge>
                        </div>
                      ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">Nenhum serviço registrado ainda</p>
                )}
              </CardContent>
            </Card>

            {/* Produtos Favoritos */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingBag className="h-5 w-5" />
                  Produtos Mais Comprados
                </CardTitle>
              </CardHeader>
              <CardContent>
                {Object.keys(produtosUtilizados).length > 0 ? (
                  <div className="space-y-2">
                    {Object.entries(produtosUtilizados)
                      .sort(([,a], [,b]) => b - a)
                      .slice(0, 5)
                      .map(([produto, quantidade]) => (
                        <div key={produto} className="flex justify-between items-center">
                          <span className="font-medium">{produto}</span>
                          <Badge variant="outline">{quantidade}x</Badge>
                        </div>
                      ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">Nenhum produto comprado ainda</p>
                )}
              </CardContent>
            </Card>

            {/* Observações */}
            {(cliente.observacoes || cliente.preferencias?.observacoes || cliente.preferencias?.barbeiroPreferido) && (
              <Card>
                <CardHeader>
                  <CardTitle>Observações e Preferências</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {cliente.preferencias?.barbeiroPreferido && (
                    <div>
                      <span className="font-medium">Barbeiro Preferido: </span>
                      <span>{barbeiros.find(b => b.id === cliente.preferencias?.barbeiroPreferido)?.nome || 'N/A'}</span>
                    </div>
                  )}
                  {cliente.preferencias?.corteFavorito && (
                    <div>
                      <span className="font-medium">Corte Favorito: </span>
                      <span>{cliente.preferencias.corteFavorito}</span>
                    </div>
                  )}
                  {cliente.preferencias?.observacoes && (
                    <div>
                      <span className="font-medium">Preferências: </span>
                      <span>{cliente.preferencias.observacoes}</span>
                    </div>
                  )}
                  {cliente.observacoes && (
                    <div>
                      <span className="font-medium">Observações: </span>
                      <span>{cliente.observacoes}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="financeiro" className="space-y-4">
            {/* Resumo Financeiro */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-green-500" />
                    <div>
                      <p className="text-sm text-muted-foreground">Total Vitalício</p>
                      <p className="text-lg font-bold">{formatCurrency(totalGasto)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-blue-500" />
                    <div>
                      <p className="text-sm text-muted-foreground">Este Mês</p>
                      <p className="text-lg font-bold">{formatCurrency(totalGastoMensal)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-purple-500" />
                    <div>
                      <p className="text-sm text-muted-foreground">Esta Semana</p>
                      <p className="text-lg font-bold">{formatCurrency(totalGastoSemanal)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-red-500" />
                    <div>
                      <p className="text-sm text-muted-foreground">Pendente</p>
                      <p className="text-lg font-bold">{formatCurrency(pagamentosPendentes)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Últimas Vendas - Resumo */}
            <Card>
              <CardHeader>
                <CardTitle>Últimas 5 Vendas</CardTitle>
              </CardHeader>
              <CardContent>
                {vendasCliente.length > 0 ? (
                  <div className="space-y-3">
                    {vendasCliente
                      .sort((a, b) => new Date(b.dataVenda).getTime() - new Date(a.dataVenda).getTime())
                      .slice(0, 5)
                      .map((venda) => {
                        const barbeiro = barbeiros.find(b => b.id === venda.barbeiroId);
                        return (
                           <div key={venda.id} className="flex justify-between items-center p-3 border rounded-lg">
                            <div>
                              <p className="font-medium">
                                {new Date(venda.horarioAtendimento).toLocaleDateString('pt-BR')} às {new Date(venda.horarioAtendimento).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {barbeiro?.nome || 'Barbeiro não encontrado'}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-bold">{formatCurrency(getValorEfetivo(venda))}</p>
                              {saldoPendenteMap.has(venda.id) && (
                                <Badge variant="outline" className="text-amber-600 border-amber-600 text-xs">
                                  <AlertTriangle className="h-3 w-3 mr-1" />
                                  Fiado R$ {(saldoPendenteMap.get(venda.id) || 0).toFixed(2)}
                                </Badge>
                              )}
                              <Badge variant={venda.status === 'pago' ? 'default' : venda.status === 'aguardando' ? 'secondary' : 'destructive'}>
                                {venda.status}
                              </Badge>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                ) : (
                  <p className="text-muted-foreground">Nenhuma venda registrada ainda</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="vendas" className="space-y-4">
            {/* Histórico Completo de Vendas */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Receipt className="h-5 w-5" />
                    Histórico Completo de Vendas ({vendasCliente.length})
                  </span>
                  {vendasCliente.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const csvContent = [
                          'Data,Barbeiro,Serviços,Produtos,Total,Status,Forma Pagamento',
                          ...vendasCliente.map(venda => {
                            const barbeiro = barbeiros.find(b => b.id === venda.barbeiroId);
                            const servicos = venda.itens.filter(i => i.tipo === 'servico').map(i => `${i.nome} (${i.quantidade}x)`).join('; ');
                            const produtos = venda.itens.filter(i => i.tipo === 'produto').map(i => `${i.nome} (${i.quantidade}x)`).join('; ');
                            return [
                              new Date(venda.dataVenda).toLocaleDateString('pt-BR'),
                              barbeiro?.nome || 'N/A',
                              servicos || 'Nenhum',
                              produtos || 'Nenhum',
                              formatCurrency(venda.total).replace('R$', '').trim(),
                              venda.status,
                              venda.formaPagamento
                            ].join(',');
                          })
                        ].join('\n');
                        
                        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                        const link = document.createElement('a');
                        link.href = URL.createObjectURL(blob);
                        link.download = `historico_${cliente.nome.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`;
                        link.click();
                      }}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Exportar
                    </Button>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {vendasCliente.length > 0 ? (
                  <div className="space-y-4">
                    {vendasCliente
                      .sort((a, b) => new Date(b.dataVenda).getTime() - new Date(a.dataVenda).getTime())
                      .map((venda) => {
                        const barbeiro = barbeiros.find(b => b.id === venda.barbeiroId);
                        const servicosVenda = venda.itens.filter(item => item.tipo === 'servico');
                        const produtosVenda = venda.itens.filter(item => item.tipo === 'produto');
                        
                        return (
                          <Card key={venda.id} className="border-l-4 border-l-primary">
                            <CardContent className="pt-4">
                              <div className="flex justify-between items-start mb-3">
                                <div>
                                  <p className="font-semibold text-lg">
                                    {new Date(venda.horarioAtendimento).toLocaleDateString('pt-BR', {
                                      weekday: 'long',
                                      year: 'numeric',
                                      month: 'long',
                                      day: 'numeric'
                                    })} às {new Date(venda.horarioAtendimento).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                  </p>
                                  <p className="text-muted-foreground flex items-center gap-1">
                                    <User className="h-4 w-4" />
                                    {barbeiro?.nome || 'Barbeiro não encontrado'}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <p className="text-2xl font-bold text-primary">{formatCurrency(getValorEfetivo(venda))}</p>
                                  {saldoPendenteMap.has(venda.id) && (
                                    <Badge variant="outline" className="text-amber-600 border-amber-600 text-xs">
                                      <AlertTriangle className="h-3 w-3 mr-1" />
                                      Fiado R$ {(saldoPendenteMap.get(venda.id) || 0).toFixed(2)}
                                    </Badge>
                                  )}
                                  <div className="flex gap-2">
                                    <Badge variant={venda.status === 'pago' ? 'default' : venda.status === 'aguardando' ? 'secondary' : 'destructive'}>
                                      {venda.status}
                                    </Badge>
                                    <Badge variant="outline">{venda.formaPagamento}</Badge>
                                  </div>
                                </div>
                              </div>
                              
                              {servicosVenda.length > 0 && (
                                <div className="mb-3">
                                  <h4 className="font-medium text-sm text-muted-foreground mb-2 flex items-center gap-1">
                                    <Scissors className="h-4 w-4" />
                                    Serviços Realizados
                                  </h4>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                    {servicosVenda.map((item, index) => (
                                      <div key={index} className="flex justify-between items-center bg-muted/50 p-2 rounded">
                                        <span className="font-medium">{item.nome}</span>
                                        <div className="text-right">
                                          <p className="text-sm">{item.quantidade}x {formatCurrency(item.preco)}</p>
                                          <p className="text-xs text-muted-foreground">{formatCurrency(item.subtotal)}</p>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                              
                              {produtosVenda.length > 0 && (
                                <div className="mb-3">
                                  <h4 className="font-medium text-sm text-muted-foreground mb-2 flex items-center gap-1">
                                    <ShoppingBag className="h-4 w-4" />
                                    Produtos Comprados
                                  </h4>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                    {produtosVenda.map((item, index) => (
                                      <div key={index} className="flex justify-between items-center bg-muted/50 p-2 rounded">
                                        <span className="font-medium">{item.nome}</span>
                                        <div className="text-right">
                                          <p className="text-sm">{item.quantidade}x {formatCurrency(item.preco)}</p>
                                          <p className="text-xs text-muted-foreground">{formatCurrency(item.subtotal)}</p>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                              
                              {venda.observacoes && (
                                <div className="mt-3 p-2 bg-muted/30 rounded">
                                  <p className="text-sm"><strong>Observações:</strong> {venda.observacoes}</p>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        );
                      })}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Receipt className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">Nenhuma venda registrada ainda</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};