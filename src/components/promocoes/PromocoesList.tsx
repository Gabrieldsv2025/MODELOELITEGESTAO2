import React, { useState } from 'react';
import { useSupabaseData } from '@/hooks/useSupabaseData';
import { PromocaoCard } from './PromocaoCard';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, Package, Scissors, Grid3X3, List, ArrowUpDown, ChevronUp, ChevronDown } from 'lucide-react';
import { usePromocoes } from '@/hooks/usePromocoes';
import { PrecoComPromocao } from '@/components/ui/PrecoComPromocao';

export const PromocoesList = () => {
  const { servicos, produtos } = useSupabaseData();
  const { temPromocaoAtiva, obterInfoPromocao } = usePromocoes();
  const [filtro, setFiltro] = useState('');
  const [tipoFiltro, setTipoFiltro] = useState<'todos' | 'produto' | 'servico'>('todos');
  const [visualizacao, setVisualizacao] = useState<'grid' | 'lista'>('grid');
  const [sortBy, setSortBy] = useState<'nome' | 'preco' | 'promocao'>('nome');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Combinar produtos e serviços
  const todosItens = [
    ...produtos.map(p => ({ ...p, tipo: 'produto' as const })),
    ...servicos.map(s => ({ ...s, tipo: 'servico' as const, preco: s.preco }))
  ];

  // Aplicar filtros e ordenação
  const itensFiltrados = todosItens
    .filter(item => {
      const matchNome = item.nome.toLowerCase().includes(filtro.toLowerCase());
      const matchTipo = tipoFiltro === 'todos' || item.tipo === tipoFiltro;
      return matchNome && matchTipo && item.ativo;
    })
    .sort((a, b) => {
      let valorA, valorB;
      
      switch (sortBy) {
        case 'nome':
          valorA = a.nome.toLowerCase();
          valorB = b.nome.toLowerCase();
          break;
        case 'preco':
          valorA = a.tipo === 'produto' ? a.precoVenda : a.preco;
          valorB = b.tipo === 'produto' ? b.precoVenda : b.preco;
          break;
        case 'promocao':
          valorA = temPromocaoAtiva(a.id, a.tipo) ? 1 : 0;
          valorB = temPromocaoAtiva(b.id, b.tipo) ? 1 : 0;
          break;
        default:
          return 0;
      }
      
      if (sortDirection === 'asc') {
        return valorA > valorB ? 1 : valorA < valorB ? -1 : 0;
      } else {
        return valorA < valorB ? 1 : valorA > valorB ? -1 : 0;
      }
    });

  const handleSort = (column: typeof sortBy) => {
    if (sortBy === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortDirection('asc');
    }
  };

  return (
    <div className="space-y-6">
      {/* Filtros e controles */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar produto ou serviço..."
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Select value={tipoFiltro} onValueChange={(value: 'todos' | 'produto' | 'servico') => setTipoFiltro(value)}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os tipos</SelectItem>
            <SelectItem value="produto">
              <div className="flex items-center">
                <Package className="h-4 w-4 mr-2" />
                Produtos
              </div>
            </SelectItem>
            <SelectItem value="servico">
              <div className="flex items-center">
                <Scissors className="h-4 w-4 mr-2" />
                Serviços
              </div>
            </SelectItem>
          </SelectContent>
        </Select>

        {/* Toggle de visualização */}
        <div className="flex gap-2">
          <Button
            variant={visualizacao === 'grid' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setVisualizacao('grid')}
          >
            <Grid3X3 className="h-4 w-4" />
          </Button>
          <Button
            variant={visualizacao === 'lista' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setVisualizacao('lista')}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Estatísticas */}
      <div className="flex flex-wrap gap-3">
        <Badge variant="outline" className="text-sm">
          <Package className="h-3 w-3 mr-1" />
          {produtos.filter(p => p.ativo).length} Produtos
        </Badge>
        <Badge variant="outline" className="text-sm">
          <Scissors className="h-3 w-3 mr-1" />
          {servicos.filter(s => s.ativo).length} Serviços
        </Badge>
        <Badge variant="secondary" className="text-sm">
          {itensFiltrados.length} Itens encontrados
        </Badge>
      </div>

      {/* Conteúdo Principal */}
      {itensFiltrados.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-muted-foreground">
            {filtro ? 'Nenhum item encontrado com os filtros aplicados' : 'Nenhum produto ou serviço cadastrado'}
          </div>
        </div>
      ) : visualizacao === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {itensFiltrados.map(item => (
            <PromocaoCard
              key={`${item.tipo}-${item.id}`}
              item={{
                id: item.id,
                nome: item.nome,
                preco: item.tipo === 'produto' ? item.precoVenda : item.preco,
                tipo: item.tipo
              }}
            />
          ))}
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="cursor-pointer min-w-[200px]" onClick={() => handleSort('nome')}>
                    <div className="flex items-center gap-2 font-semibold">
                      Nome
                      {sortBy === 'nome' && (
                        sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                      )}
                    </div>
                  </TableHead>
                  <TableHead className="text-center min-w-[100px]">Tipo</TableHead>
                  <TableHead className="cursor-pointer text-right min-w-[120px]" onClick={() => handleSort('preco')}>
                    <div className="flex items-center gap-2 font-semibold justify-end">
                      Preço
                      {sortBy === 'preco' && (
                        sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                      )}
                    </div>
                  </TableHead>
                  <TableHead className="cursor-pointer text-center min-w-[120px]" onClick={() => handleSort('promocao')}>
                    <div className="flex items-center gap-2 font-semibold justify-center">
                      Promoção
                      {sortBy === 'promocao' && (
                        sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                      )}
                    </div>
                  </TableHead>
                  <TableHead className="text-center min-w-[100px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {itensFiltrados.map(item => {
                  const promocaoAtiva = temPromocaoAtiva(item.id, item.tipo);
                  const infoPromocao = obterInfoPromocao(item.id, item.tipo);
                  const preco = item.tipo === 'produto' ? item.precoVenda : item.preco;
                  
                  return (
                    <TableRow key={`${item.tipo}-${item.id}`} className="hover:bg-muted/30">
                      <TableCell className="font-medium text-foreground">{item.nome}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="font-medium">
                          {item.tipo === 'produto' ? (
                            <><Package className="h-3 w-3 mr-1" /> Produto</>
                          ) : (
                            <><Scissors className="h-3 w-3 mr-1" /> Serviço</>
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <PrecoComPromocao
                          itemId={item.id}
                          itemTipo={item.tipo}
                          precoOriginal={preco}
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        {promocaoAtiva && infoPromocao ? (
                          <Badge variant="secondary" className="bg-primary/10 text-primary font-medium">
                            {infoPromocao.tipo === 'desconto' ? '-' : '+'}{infoPromocao.percentual}%
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">Sem promoção</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <PromocaoCard
                          item={{
                            id: item.id,
                            nome: item.nome,
                            preco: preco,
                            tipo: item.tipo
                          }}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
};