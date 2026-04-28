import { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, Users, Package, TrendingUp, Grid3X3, List, ArrowUpDown, ChevronUp, ChevronDown } from 'lucide-react';
import { ResponsiveLayout } from '@/components/layout/ResponsiveLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useSupabaseData } from '@/hooks/useSupabaseData';
import { supabaseServicoStorage } from '@/utils/supabaseStorage';
import { Servico, Barbeiro } from '@/types';
import { useToast } from '@/hooks/use-toast';
export const Servicos = () => {
  const {
    servicos,
    barbeiros,
    refreshData
  } = useSupabaseData();
  const [filteredServicos, setFilteredServicos] = useState<Servico[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoriaFilter, setCategoriaFilter] = useState<string>('todos');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [servicoEditando, setServicoEditando] = useState<Servico | null>(null);
  const [visualizacao, setVisualizacao] = useState<'grid' | 'lista'>('grid');
  const [sortBy, setSortBy] = useState<'nome' | 'preco' | 'categoria'>('nome');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const {
    toast
  } = useToast();

  // Form state
  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    preco: '',
    duracaoMinutos: '',
    categoria: 'corte' as 'corte' | 'barba' | 'combo' | 'sobrancelha' | 'outros',
    ativo: true,
    barbeiroIds: [] as string[],
    comissaoPersonalizada: {} as {
      [key: string]: number;
    },
    isPacote: false,
    servicoIds: [] as string[],
    desconto: ''
  });
  useEffect(() => {
    setFilteredServicos(servicos);
  }, [servicos]);
  useEffect(() => {
    // Filtrar serviços baseado no termo de busca e categoria
    let filtered = servicos.filter(servico => servico.nome.toLowerCase().includes(searchTerm.toLowerCase()) || servico.descricao?.toLowerCase().includes(searchTerm.toLowerCase()));
    if (categoriaFilter !== 'todos') {
      filtered = filtered.filter(servico => servico.categoria === categoriaFilter);
    }

    // Aplicar ordenação
    filtered = filtered.sort((a, b) => {
      let valorA, valorB;
      switch (sortBy) {
        case 'nome':
          valorA = a.nome.toLowerCase();
          valorB = b.nome.toLowerCase();
          break;
        case 'preco':
          valorA = a.preco;
          valorB = b.preco;
          break;
        case 'categoria':
          valorA = a.categoria.toLowerCase();
          valorB = b.categoria.toLowerCase();
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
    setFilteredServicos(filtered);
  }, [servicos, searchTerm, categoriaFilter, sortBy, sortDirection]);
  const resetForm = () => {
    setFormData({
      nome: '',
      descricao: '',
      preco: '',
      duracaoMinutos: '',
      categoria: 'corte',
      ativo: true,
      barbeiroIds: [],
      comissaoPersonalizada: {},
      isPacote: false,
      servicoIds: [],
      desconto: ''
    });
    setServicoEditando(null);
  };
  const handleOpenDialog = (servico?: Servico) => {
    if (servico) {
      setServicoEditando(servico);
      setFormData({
        nome: servico.nome,
        descricao: servico.descricao || '',
        preco: servico.preco.toString(),
        duracaoMinutos: servico.duracaoMinutos?.toString() || '',
        categoria: servico.categoria,
        ativo: servico.ativo,
        barbeiroIds: servico.barbeiroIds || [],
        comissaoPersonalizada: servico.comissaoPersonalizada || {},
        isPacote: !!servico.pacote,
        servicoIds: servico.pacote?.servicoIds || [],
        desconto: servico.pacote?.desconto.toString() || ''
      });
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };
  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    resetForm();
  };
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nome.trim() || !formData.preco) {
      toast({
        title: "Erro",
        description: "Nome e preço são obrigatórios",
        variant: "destructive"
      });
      return;
    }
    const servicoData: Omit<Servico, 'id' | 'dataCadastro'> = {
      nome: formData.nome.trim(),
      descricao: formData.descricao.trim() || undefined,
      preco: parseFloat(formData.preco),
      duracaoMinutos: formData.duracaoMinutos ? parseInt(formData.duracaoMinutos) : undefined,
      categoria: formData.categoria,
      ativo: formData.ativo,
      barbeiroIds: formData.barbeiroIds.length > 0 ? formData.barbeiroIds : undefined,
      comissaoPersonalizada: Object.keys(formData.comissaoPersonalizada).length > 0 ? formData.comissaoPersonalizada : undefined,
      pacote: formData.isPacote && formData.servicoIds.length > 0 ? {
        servicoIds: formData.servicoIds,
        desconto: parseFloat(formData.desconto) || 0
      } : undefined
    };
    const handleSave = async () => {
      try {
        if (servicoEditando) {
          const servicoAtualizado: Servico = {
            ...servicoEditando,
            ...servicoData
          };
          await supabaseServicoStorage.update(servicoAtualizado);
          toast({
            title: "Serviço atualizado",
            description: "Serviço atualizado com sucesso"
          });
        } else {
          const novoServico: Servico = {
            id: crypto.randomUUID(),
            ...servicoData,
            dataCadastro: new Date().toISOString()
          };
          await supabaseServicoStorage.add(novoServico);
          toast({
            title: "Serviço salvo",
            description: "Serviço cadastrado com sucesso"
          });
        }
        await refreshData();
        setIsDialogOpen(false);
        resetForm();
      } catch (error) {
        toast({
          title: "Erro",
          description: "Erro ao salvar serviço",
          variant: "destructive"
        });
      }
    };
    handleSave();
  };
  const handleDelete = async (servico: Servico) => {
    if (window.confirm(`Tem certeza que deseja excluir o serviço ${servico.nome}?`)) {
      try {
        await supabaseServicoStorage.delete(servico.id);
        await refreshData();
        toast({
          title: "Sucesso",
          description: "Serviço excluído com sucesso"
        });
      } catch (error) {
        toast({
          title: "Erro",
          description: "Erro ao excluir serviço",
          variant: "destructive"
        });
      }
    }
  };
  const toggleStatus = async (servico: Servico) => {
    const servicoAtualizado = {
      ...servico,
      ativo: !servico.ativo
    };
    try {
      await supabaseServicoStorage.update(servicoAtualizado);
      await refreshData();
      toast({
        title: "Sucesso",
        description: `Serviço ${servicoAtualizado.ativo ? 'ativado' : 'desativado'} com sucesso`
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao atualizar status do serviço",
        variant: "destructive"
      });
    }
  };
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };
  const getBarbeiroNomes = (barbeiroIds?: string[]) => {
    if (!barbeiroIds || barbeiroIds.length === 0) return 'Todos os barbeiros';
    return barbeiros.filter(b => barbeiroIds.includes(b.id)).map(b => b.nome).join(', ');
  };
  const categorias = [{
    value: 'todos',
    label: 'Todas'
  }, {
    value: 'corte',
    label: 'Corte'
  }, {
    value: 'barba',
    label: 'Barba'
  }, {
    value: 'combo',
    label: 'Combo'
  }, {
    value: 'sobrancelha',
    label: 'Sobrancelha'
  }, {
    value: 'outros',
    label: 'Outros'
  }];
  const servicosDisponiveis = servicos.filter(s => !formData.isPacote || s.id !== servicoEditando?.id);
  const handleSort = (column: typeof sortBy) => {
    if (sortBy === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortDirection('asc');
    }
  };
  return <ResponsiveLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Cadastro de Serviços</h1>
            <p className="text-muted-foreground">Gerencie seus serviços e pacotes</p>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => handleOpenDialog()} className="gradient-primary shadow-primary">
                <Plus className="h-4 w-4 mr-2" />
                Novo Serviço
              </Button>
            </DialogTrigger>
            
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {servicoEditando ? 'Editar Serviço' : 'Novo Serviço'}
                </DialogTitle>
              </DialogHeader>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="nome">Nome *</Label>
                    <Input id="nome" value={formData.nome} onChange={e => setFormData(prev => ({
                    ...prev,
                    nome: e.target.value
                  }))} placeholder="Nome do serviço" required />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="categoria">Categoria *</Label>
                    <Select value={formData.categoria} onValueChange={(value: any) => setFormData(prev => ({
                    ...prev,
                    categoria: value
                  }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="corte">Corte</SelectItem>
                        <SelectItem value="barba">Barba</SelectItem>
                        <SelectItem value="combo">Combo</SelectItem>
                        <SelectItem value="sobrancelha">Sobrancelha</SelectItem>
                        <SelectItem value="outros">Outros</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="descricao">Descrição</Label>
                  <Textarea id="descricao" value={formData.descricao} onChange={e => setFormData(prev => ({
                  ...prev,
                  descricao: e.target.value
                }))} placeholder="Descrição do serviço..." rows={2} />
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="preco">Preço (R$) *</Label>
                    <Input id="preco" type="number" step="0.01" min="0" value={formData.preco} onChange={e => setFormData(prev => ({
                    ...prev,
                    preco: e.target.value
                  }))} placeholder="0,00" required />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="duracaoMinutos">Duração (em minutos)</Label>
                  <Input id="duracaoMinutos" type="number" min="1" value={formData.duracaoMinutos} onChange={e => setFormData(prev => ({
                  ...prev,
                  duracaoMinutos: e.target.value
                }))} placeholder="Ex: 30" />
                </div>

                <div className="space-y-2">
                  <Label>Barbeiros Autorizados</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {barbeiros.map(barbeiro => <div key={barbeiro.id} className="flex items-center space-x-2">
                        <Checkbox id={`barbeiro-${barbeiro.id}`} checked={formData.barbeiroIds.includes(barbeiro.id)} onCheckedChange={checked => {
                      if (checked) {
                        setFormData(prev => ({
                          ...prev,
                          barbeiroIds: [...prev.barbeiroIds, barbeiro.id]
                        }));
                      } else {
                        setFormData(prev => ({
                          ...prev,
                          barbeiroIds: prev.barbeiroIds.filter(id => id !== barbeiro.id)
                        }));
                      }
                    }} />
                        <Label htmlFor={`barbeiro-${barbeiro.id}`} className="text-sm">
                          {barbeiro.nome}
                        </Label>
                      </div>)}
                  </div>
                  {formData.barbeiroIds.length === 0 && <p className="text-xs text-muted-foreground">
                      Nenhum barbeiro selecionado = todos podem realizar
                    </p>}
                </div>

                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Switch id="isPacote" checked={formData.isPacote} onCheckedChange={checked => setFormData(prev => ({
                    ...prev,
                    isPacote: checked
                  }))} />
                    <Label htmlFor="isPacote">Este é um pacote promocional</Label>
                  </div>

                  {formData.isPacote && <div className="space-y-4 border border-border rounded-lg p-4">
                      <div className="space-y-2">
                        <Label>Serviços do Pacote</Label>
                        <div className="grid grid-cols-1 gap-2 max-h-32 overflow-y-auto">
                          {servicosDisponiveis.map(servico => <div key={servico.id} className="flex items-center space-x-2">
                              <Checkbox id={`servico-${servico.id}`} checked={formData.servicoIds.includes(servico.id)} onCheckedChange={checked => {
                          if (checked) {
                            setFormData(prev => ({
                              ...prev,
                              servicoIds: [...prev.servicoIds, servico.id]
                            }));
                          } else {
                            setFormData(prev => ({
                              ...prev,
                              servicoIds: prev.servicoIds.filter(id => id !== servico.id)
                            }));
                          }
                        }} />
                              <Label htmlFor={`servico-${servico.id}`} className="text-sm">
                                {servico.nome} - {formatCurrency(servico.preco)}
                              </Label>
                            </div>)}
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="desconto">Desconto (%)</Label>
                        <Input id="desconto" type="number" min="0" max="100" value={formData.desconto} onChange={e => setFormData(prev => ({
                      ...prev,
                      desconto: e.target.value
                    }))} placeholder="10" />
                      </div>
                    </div>}
                </div>

                <div className="flex items-center space-x-2">
                  <Switch id="ativo" checked={formData.ativo} onCheckedChange={checked => setFormData(prev => ({
                  ...prev,
                  ativo: checked
                }))} />
                  <Label htmlFor="ativo">Serviço ativo</Label>
                </div>
                
                <div className="flex gap-2 pt-4">
                  <Button type="submit" className="flex-1 gradient-primary">
                    {servicoEditando ? 'Salvar' : 'Cadastrar'}
                  </Button>
                  <Button type="button" variant="outline" onClick={handleCloseDialog} className="flex-1">
                    Cancelar
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative max-w-md flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar serviços..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10" />
          </div>
          
          <Select value={categoriaFilter} onValueChange={setCategoriaFilter}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {categorias.map(categoria => <SelectItem key={categoria.value} value={categoria.value}>
                  {categoria.label}
                </SelectItem>)}
            </SelectContent>
          </Select>

          {/* Toggle de visualização */}
          <div className="flex gap-2">
            <Button variant={visualizacao === 'grid' ? 'default' : 'outline'} size="sm" onClick={() => setVisualizacao('grid')}>
              <Grid3X3 className="h-4 w-4" />
            </Button>
            <Button variant={visualizacao === 'lista' ? 'default' : 'outline'} size="sm" onClick={() => setVisualizacao('lista')}>
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        {filteredServicos.length === 0 ? <div className="text-center py-12">
            <div className="text-muted-foreground text-lg">
              {searchTerm || categoriaFilter !== 'todos' ? 'Nenhum serviço encontrado com os filtros aplicados' : 'Nenhum serviço cadastrado ainda'}
            </div>
          </div> : visualizacao === 'grid' ? <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredServicos.map(servico => <Card key={servico.id} className="hover:shadow-lg transition-shadow">
                <div className="p-6">
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <h3 className="text-lg font-semibold text-foreground line-clamp-1">
                          {servico.nome}
                        </h3>
                        <Badge variant="secondary" className="text-xs capitalize">
                          {servico.categoria}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" onClick={() => handleOpenDialog(servico)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(servico)} className="text-destructive hover:text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {servico.descricao && <p className="text-sm text-muted-foreground line-clamp-2">
                        {servico.descricao}
                      </p>}

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Preço:</span>
                        <span className="text-lg font-bold text-primary">
                          {formatCurrency(servico.preco)}
                        </span>
                      </div>

                      {servico.duracaoMinutos && <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Duração:</span>
                          <Badge variant="outline" className="text-xs">
                            {servico.duracaoMinutos} min
                          </Badge>
                        </div>}

                      <div className="text-xs text-muted-foreground">
                        <strong>Barbeiros:</strong> {getBarbeiroNomes(servico.barbeiroIds)}
                      </div>

                      {servico.pacote && <div className="text-xs text-muted-foreground">
                          <strong>Pacote:</strong> {servico.pacote.desconto}% de desconto
                        </div>}
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Status:</span>
                        <Badge variant={servico.ativo ? "default" : "secondary"}>
                          {servico.ativo ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </div>
                      <Button variant={servico.ativo ? "destructive" : "default"} size="sm" onClick={() => toggleStatus(servico)}>
                        {servico.ativo ? 'Desativar' : 'Ativar'}
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>)}
          </div> : <div className="border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="cursor-pointer min-w-[200px]" onClick={() => handleSort('nome')}>
                      <div className="flex items-center gap-2 font-semibold">
                        Nome
                        {sortBy === 'nome' && (sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />)}
                      </div>
                    </TableHead>
                    <TableHead className="cursor-pointer text-center min-w-[120px]" onClick={() => handleSort('categoria')}>
                      <div className="flex items-center gap-2 font-semibold justify-center">
                        Categoria
                        {sortBy === 'categoria' && (sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />)}
                      </div>
                    </TableHead>
                    <TableHead className="cursor-pointer text-right min-w-[120px]" onClick={() => handleSort('preco')}>
                      <div className="flex items-center gap-2 font-semibold justify-end">
                        Preço
                        {sortBy === 'preco' && (sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />)}
                      </div>
                    </TableHead>
                    <TableHead className="text-center min-w-[100px]">Duração</TableHead>
                    <TableHead className="text-center min-w-[150px]">Barbeiros</TableHead>
                    <TableHead className="text-center min-w-[100px]">Status</TableHead>
                    <TableHead className="text-center min-w-[120px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredServicos.map(servico => <TableRow key={servico.id} className="hover:bg-muted/30">
                      <TableCell className="font-medium">
                        <div>
                          <div className="font-medium text-foreground">{servico.nome}</div>
                          {servico.descricao && <div className="text-sm text-muted-foreground truncate max-w-[250px]">
                              {servico.descricao}
                            </div>}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="capitalize">
                          {servico.categoria}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="font-semibold text-primary">
                          {formatCurrency(servico.preco)}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        {servico.duracaoMinutos ? <Badge variant="outline" className="text-xs">
                            {servico.duracaoMinutos} min
                          </Badge> : <span className="text-muted-foreground text-sm">--</span>}
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="text-sm text-muted-foreground">
                          {getBarbeiroNomes(servico.barbeiroIds)}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={servico.ativo ? "default" : "secondary"}>
                          {servico.ativo ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center gap-2 justify-center">
                          <Button variant="ghost" size="sm" onClick={() => handleOpenDialog(servico)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDelete(servico)} className="text-destructive hover:text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                          <Button variant={servico.ativo ? "destructive" : "default"} size="sm" onClick={() => toggleStatus(servico)}>
                            {servico.ativo ? 'Desativar' : 'Ativar'}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>)}
                </TableBody>
              </Table>
            </div>
          </div>}
      </div>
    </ResponsiveLayout>;
};