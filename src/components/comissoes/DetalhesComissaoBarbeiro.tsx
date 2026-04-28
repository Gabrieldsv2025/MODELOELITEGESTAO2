import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useComissoes } from '@/hooks/useComissoes';
import { buscarComissoesHistoricas } from '@/utils/comissoesCalculator';
import { supabaseComissaoStorage } from '@/utils/supabaseStorage';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface DetalhesComissaoBarberiroProps {
  barbeiroId: string;
  barbeiro: any;
  vendasDoPeriodo: any[];
  servicos: any[];
  produtos: any[];
  clientes: any[];
}

export function DetalhesComissaoBarbeiro({ 
  barbeiroId, 
  barbeiro, 
  vendasDoPeriodo, 
  servicos, 
  produtos,
  clientes 
}: DetalhesComissaoBarberiroProps) {
  const { obterPercentualComissao, calcularComissoesBarbeiro } = useComissoes();
  const [detalhesComissao, setDetalhesComissao] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const calcularDetalhes = async () => {
      console.log(`🚀 [DetalhesComissaoBarbeiro] Carregando detalhes para ${barbeiro.nome}...`);
      setLoading(true);
      
      // Calcular comissões totais
      const comissoes = await calcularComissoesBarbeiro(barbeiro, vendasDoPeriodo);
      console.log(`📋 [DetalhesComissaoBarbeiro] Resultado:`, comissoes);
      
      // Obter percentuais para cada serviço
      const configuracoes = await supabaseComissaoStorage.getByBarbeiro(barbeiroId);
      
      const servicosComPercentuais = await Promise.all(
        servicos.map(async (servico) => {
          const configuracao = configuracoes.find(c => 
            c.tipo === 'servico' && c.servicoId === servico.id
          );
          const percentual = configuracao?.percentual || barbeiro.comissaoServicos;
          
          return {
            ...servico,
            percentualComissao: percentual
          };
        })
      );

      // Obter percentuais para cada produto
      const produtosComPercentuais = await Promise.all(
        produtos.map(async (produto) => {
          const configuracao = configuracoes.find(c => 
            c.tipo === 'produto' && c.produtoId === produto.id
          );
          const percentual = configuracao?.percentual || barbeiro.comissaoProdutos;
          
          return {
            ...produto,
            percentualComissao: percentual
          };
        })
      );

      // Buscar comissões históricas para cálculo preciso das vendas
      const vendasBarbeiro = vendasDoPeriodo.filter(v => v.barbeiroId === barbeiroId && v.status === 'pago');
      const vendaIds = vendasBarbeiro.map(v => v.id);
      const comissoesHistoricas = await buscarComissoesHistoricas(barbeiroId, vendaIds);

      // Detalhes por venda
      const vendasDetalhadas = await Promise.all(
        vendasDoPeriodo.map(async (venda) => {
          const itensDetalhados = await Promise.all(
            venda.itens.map(async (item: any) => {
              let percentual: number;
              let valorComissao: number;
              
              // Verificar se existe comissão histórica para esta venda/item
              const historicoVenda = comissoesHistoricas[venda.id];
              const comissaoHistorica = historicoVenda?.[item.itemId];
              
              if (comissaoHistorica) {
                // Usar percentual histórico mas recalcular com subtotal (considera descontos)
                percentual = comissaoHistorica.percentual;
                valorComissao = (item.subtotal * percentual) / 100;
              } else {
                // Calcular com configurações atuais se não há histórico
                percentual = await obterPercentualComissao(
                  barbeiroId,
                  item.itemId,
                  item.tipo,
                  item.tipo === 'servico' ? barbeiro.comissaoServicos : barbeiro.comissaoProdutos
                );
                valorComissao = (item.subtotal * percentual) / 100;
              }
              
              const detalhesItem = item.tipo === 'servico' 
                ? servicos.find(s => s.id === item.itemId)
                : produtos.find(p => p.id === item.itemId);
              
              const clienteVenda = clientes.find(c => c.id === venda.clienteId);
              
              return {
                ...item,
                nome: detalhesItem?.nome || 'Item não encontrado',
                nomeCliente: clienteVenda?.nome || 'Cliente não encontrado',
                percentualComissao: percentual,
                valorComissao: valorComissao
              };
            })
          );
          
          const comissaoTotalVenda = itensDetalhados.reduce(
            (total, item) => total + item.valorComissao, 
            0
          );
          
          return {
            ...venda,
            itensDetalhados,
            comissaoTotal: comissaoTotalVenda
          };
        })
      );

      setDetalhesComissao({
        comissoes,
        servicosComPercentuais,
        produtosComPercentuais,
        vendasDetalhadas
      });
      
      setLoading(false);
    };

    calcularDetalhes();
  }, [barbeiroId, barbeiro, vendasDoPeriodo, servicos, produtos, obterPercentualComissao, calcularComissoesBarbeiro]);

  if (loading) {
    return <div className="p-4">Carregando detalhes...</div>;
  }

  if (!detalhesComissao) {
    return <div className="p-4">Erro ao carregar detalhes.</div>;
  }

  return (
    <div className="space-y-6">
      {/* Resumo Geral */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Resumo de Comissões</CardTitle>
            <Button 
              onClick={() => {
                console.log(`🔄 Recarregando dados de ${barbeiro.nome}...`);
                // Forçar recálculo dos detalhes
                const calcularDetalhes = async () => {
                  console.log(`🚀 [MANUAL] Carregando detalhes para ${barbeiro.nome}...`);
                  setLoading(true);
                  const comissoes = await calcularComissoesBarbeiro(barbeiro, vendasDoPeriodo);
                  console.log(`📋 [MANUAL] Resultado:`, comissoes);
                  setDetalhesComissao(prev => ({ ...prev, comissoes }));
                  setLoading(false);
                };
                calcularDetalhes();
              }} 
              variant="outline" 
              size="sm"
              className="text-xs"
            >
              🔄 Atualizar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-sm text-muted-foreground">Total Geral</div>
              <div className="text-lg font-bold text-green-600">
                R$ {detalhesComissao.comissoes.totalGeral.toFixed(2)}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Serviços</div>
              <div className="text-lg font-bold">
                R$ {detalhesComissao.comissoes.totalServicos.toFixed(2)}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Produtos</div>
              <div className="text-lg font-bold">
                R$ {detalhesComissao.comissoes.totalProdutos.toFixed(2)}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Vendas</div>
              <div className="text-lg font-bold">
                {vendasDoPeriodo.length}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="percentuais" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="percentuais">Percentuais</TabsTrigger>
          <TabsTrigger value="vendas">Vendas Detalhadas</TabsTrigger>
          <TabsTrigger value="resumo">Resumo por Item</TabsTrigger>
        </TabsList>

        <TabsContent value="percentuais" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Serviços */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Comissões - Serviços</CardTitle>
                <div className="text-sm text-muted-foreground">
                  Padrão: {barbeiro.comissaoServicos}%
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {detalhesComissao.servicosComPercentuais.map((servico: any) => (
                    <div key={servico.id} className="flex justify-between items-center p-3 bg-muted rounded">
                      <div className="flex-1">
                        <div className="font-medium">{servico.nome}</div>
                        <div className="text-sm text-muted-foreground">
                          R$ {servico.preco.toFixed(2)}
                        </div>
                      </div>
                      <Badge variant={servico.percentualComissao !== barbeiro.comissaoServicos ? "default" : "secondary"}>
                        {servico.percentualComissao}%
                      </Badge>
                    </div>
                  ))}
                  {detalhesComissao.servicosComPercentuais.length === 0 && (
                    <div className="text-center py-4 text-muted-foreground">
                      Nenhum serviço encontrado
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Produtos */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Comissões - Produtos</CardTitle>
                <div className="text-sm text-muted-foreground">
                  Padrão: {barbeiro.comissaoProdutos}%
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {detalhesComissao.produtosComPercentuais.map((produto: any) => (
                    <div key={produto.id} className="flex justify-between items-center p-3 bg-muted rounded">
                      <div className="flex-1">
                        <div className="font-medium">{produto.nome}</div>
                        <div className="text-sm text-muted-foreground">
                          R$ {produto.precoVenda.toFixed(2)}
                        </div>
                      </div>
                      <Badge variant={produto.percentualComissao !== barbeiro.comissaoProdutos ? "default" : "secondary"}>
                        {produto.percentualComissao}%
                      </Badge>
                    </div>
                  ))}
                  {detalhesComissao.produtosComPercentuais.length === 0 && (
                    <div className="text-center py-4 text-muted-foreground">
                      Nenhum produto encontrado
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="vendas" className="space-y-4">
          <div className="space-y-4">
            {detalhesComissao.vendasDetalhadas.map((venda: any) => {
              const cliente = clientes.find(c => c.id === venda.clienteId);
              return (
                <Card key={venda.id}>
                  <CardHeader>
                    <div className="flex justify-between items-center">
                      <div>
                        <CardTitle className="text-lg">Venda #{venda.id.slice(-8)}</CardTitle>
                        <div className="text-sm text-muted-foreground">
                          {format(new Date(venda.dataVenda), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                        </div>
                        {cliente && (
                          <div className="text-sm font-medium text-blue-600 mt-1">
                            Cliente: {cliente.nome}
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold">R$ {venda.total.toFixed(2)}</div>
                        <div className="text-sm text-green-600 font-medium">
                          Comissão: R$ {venda.comissaoTotal.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {venda.itensDetalhados.map((item: any, index: number) => {
                        // Calcular valores para transparência
                        const valorOriginal = item.precoOriginal || item.preco;
                        const valorVendido = item.subtotal / item.quantidade;
                        const descontoConcedido = (valorOriginal - valorVendido) * item.quantidade;
                        
                        return (
                          <div key={index} className="p-3 bg-muted rounded space-y-2">
                            <div className="flex justify-between items-center">
                              <div className="font-medium">{item.nome}</div>
                              <div className="text-right">
                                <Badge variant="outline">{item.percentualComissao}%</Badge>
                                <div className="text-sm font-medium text-green-600 mt-1">
                                  Comissão: R$ {item.valorComissao.toFixed(2)}
                                </div>
                              </div>
                            </div>
                            
                            {/* Tabela de valores detalhados */}
                            <div className="grid grid-cols-4 gap-2 text-xs">
                              <div className="text-center">
                                <div className="font-medium text-muted-foreground">Qtd</div>
                                <div>{item.quantidade}</div>
                              </div>
                              <div className="text-center">
                                <div className="font-medium text-muted-foreground">Valor Original</div>
                                <div>R$ {valorOriginal.toFixed(2)}</div>
                              </div>
                              <div className="text-center">
                                <div className="font-medium text-muted-foreground">Desconto</div>
                                <div className="text-red-600">
                                  {descontoConcedido > 0.01 ? `-R$ ${descontoConcedido.toFixed(2)}` : '-'}
                                </div>
                              </div>
                              <div className="text-center">
                                <div className="font-medium text-muted-foreground">Valor Vendido</div>
                                <div className="font-medium">R$ {item.subtotal.toFixed(2)}</div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            {detalhesComissao.vendasDetalhadas.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                Nenhuma venda encontrada no período
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="resumo" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Resumo Serviços */}
            <Card>
              <CardHeader>
                <CardTitle>Resumo - Serviços</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {detalhesComissao.comissoes.detalhesServicos?.map((detalhe: any, index: number) => (
                    <div key={index} className="flex justify-between items-center p-3 bg-muted rounded">
                      <div className="flex-1">
                        <div className="font-medium">{detalhe.nome}</div>
                        <div className="text-sm text-muted-foreground">
                          {detalhe.quantidade} vendas • {detalhe.percentual}%
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-green-600">
                          R$ {detalhe.comissao.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Resumo Produtos */}
            <Card>
              <CardHeader>
                <CardTitle>Resumo - Produtos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {detalhesComissao.comissoes.detalhesProdutos?.map((detalhe: any, index: number) => (
                    <div key={index} className="flex justify-between items-center p-3 bg-muted rounded">
                      <div className="flex-1">
                        <div className="font-medium">{detalhe.nome}</div>
                        <div className="text-sm text-muted-foreground">
                          {detalhe.quantidade} vendas • {detalhe.percentual}%
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-green-600">
                          R$ {detalhe.comissao.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}