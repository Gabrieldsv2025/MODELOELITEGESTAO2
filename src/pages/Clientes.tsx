import { useState, useEffect, useMemo, useCallback } from 'react';
import { Plus, Search, Edit, Trash2, Phone, Users, Eye, Download, Filter, ArrowUpDown, TrendingUp, Clock, UserX, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { ResponsiveLayout } from '@/components/layout/ResponsiveLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useSupabaseData } from '@/hooks/useSupabaseData';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { supabaseClienteStorage } from '@/utils/supabaseStorage';
import { Cliente } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { ClienteDetails } from '@/components/clientes/ClienteDetails';
import { supabase } from '@/integrations/supabase/client';
import { useDebounce } from '@/hooks/useDebounce';
export const Clientes = () => {
  const {
    usuario,
    isLoading
  } = useSupabaseAuth();
  const {
    clientes,
    vendas,
    barbeiros,
    refreshData
  } = useSupabaseData();
  const [filteredClientes, setFilteredClientes] = useState<Cliente[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [clienteEditando, setClienteEditando] = useState<Cliente | null>(null);
  const [clienteSelecionado, setClienteSelecionado] = useState<Cliente | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [sortBy, setSortBy] = useState<'nome' | 'telefone' | 'totalGasto' | 'ticketMedio' | 'classificacao' | 'ultimaVisita'>('nome');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [filterBy, setFilterBy] = useState<'todos' | 'vip' | 'novos' | 'inativos' | 'perdidos'>('todos');
  const [diasSemVisitaFilter, setDiasSemVisitaFilter] = useState<number | null>(null);
  
  // ⚡ PAGINAÇÃO: Estado para paginar clientes
  const [paginaClientes, setPaginaClientes] = useState(1);
  const CLIENTES_POR_PAGINA = 20;
  const {
    toast
  } = useToast();

  // Form state
  const [formData, setFormData] = useState({
    nome: '',
    telefone: '',
    corteFavorito: '',
    barbeiroPreferido: '',
    preferenciasObservacoes: '',
    observacoes: ''
  });

  // Memoizar estatísticas dos clientes para evitar recálculos desnecessários
  const clientesComEstatisticas = useMemo(() => {
    console.log('🧮 Recalculando estatísticas para', clientes.length, 'clientes');
    const startTime = performance.now();
    const resultado = clientes.map(cliente => {
      const vendasCliente = vendas.filter(v => v.clienteId === cliente.id);
      const totalGasto = vendasCliente.reduce((sum, venda) => sum + venda.total, 0);
      const ticketMedio = vendasCliente.length > 0 ? totalGasto / vendasCliente.length : 0;
      const ultimaVenda = vendasCliente.length > 0 ? vendasCliente.reduce((mais_recente, venda) => new Date(venda.dataVenda) > new Date(mais_recente.dataVenda) ? venda : mais_recente) : null;
      const diasSemComprar = ultimaVenda ? Math.floor((new Date().getTime() - new Date(ultimaVenda.dataVenda).getTime()) / (1000 * 60 * 60 * 24)) : null;
      const stats = {
        totalGasto,
        ticketMedio,
        diasSemComprar,
        quantidadeVisitas: vendasCliente.length,
        ultimaVendaCompleta: ultimaVenda
      };

      // Classificar cliente baseado nas estatísticas
      // REGRA CORRETA: "novos" = cadastrados nos últimos 30 dias (baseado na data de cadastro, NÃO última compra)
      let classificacao = 'regulares';
      
      // Calcular dias desde o cadastro
      const dataCadastroCliente = new Date(cliente.dataCadastro);
      const hoje = new Date();
      const diasDesdeCadastro = Math.floor((hoje.getTime() - dataCadastroCliente.getTime()) / (1000 * 60 * 60 * 24));
      
      // Ordem de prioridade: VIP > Novos > Inativos > Regulares
      if (totalGasto >= 1000 || stats.quantidadeVisitas >= 10) {
        classificacao = 'vip';
      } else if (diasDesdeCadastro <= 30) {
        // Cliente cadastrado nos últimos 30 dias é "novo"
        classificacao = 'novos';
      } else if (diasSemComprar && diasSemComprar > 90) {
        classificacao = 'inativos';
      }
      return {
        ...cliente,
        stats,
        classificacao
      };
    });
    const endTime = performance.now();
    console.log('⚡ Estatísticas calculadas em', Math.round(endTime - startTime), 'ms');
    return resultado;
  }, [clientes, vendas]);

  // Função otimizada para buscar estatísticas (sem recalcular)
  const calcularEstatisticasCliente = useCallback((cliente: Cliente) => {
    const clienteComStats = clientesComEstatisticas.find(c => c.id === cliente.id);
    return clienteComStats?.stats || {
      totalGasto: 0,
      ticketMedio: 0,
      diasSemComprar: null,
      quantidadeVisitas: 0,
      ultimaVendaCompleta: null
    };
  }, [clientesComEstatisticas]);

  // Função otimizada para classificar cliente (sem recalcular)
  const classificarCliente = useCallback((cliente: Cliente) => {
    const clienteComStats = clientesComEstatisticas.find(c => c.id === cliente.id);
    return clienteComStats?.classificacao || 'regulares';
  }, [clientesComEstatisticas]);

  // Memoizar opções de dias sem visita
  const opcoesDiasSemVisita = useMemo(() => {
    const diasUnicos = new Set<number>();
    clientesComEstatisticas.forEach(({
      stats,
      status
    }) => {
      if (stats.diasSemComprar !== null && status === 'ativo') {
        diasUnicos.add(stats.diasSemComprar);
      }
    });
    return Array.from(diasUnicos).sort((a, b) => a - b);
  }, [clientesComEstatisticas]);

  // Handle column sorting
  const handleSort = (column: typeof sortBy) => {
    if (sortBy === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortDirection('asc');
    }
  };

  // Effect unificado para todos os filtros (usando clientesComEstatisticas)
  useEffect(() => {
    const startTime = performance.now();
    console.log('🔍 [FILTRO] Buscando:', debouncedSearchTerm, '| Clientes:', clientesComEstatisticas.length);

    // Start with all clients with pre-calculated stats
    let filtered = [...clientesComEstatisticas];

    // 1. Apply status filter FIRST
    if (filterBy === 'perdidos') {
      filtered = filtered.filter(cliente => cliente.status === 'perdido');
    } else {
      // Excluir clientes com status 'excluido' da listagem normal, mostrar apenas ativos
      filtered = filtered.filter(cliente => cliente.status === 'ativo');
    }

    // 2. Apply search filter (CRITICAL - must work in all scenarios)
    if (debouncedSearchTerm.trim()) {
      const normalizedSearch = debouncedSearchTerm.toLowerCase().trim();
      filtered = filtered.filter(cliente => {
        // Search in name with contains logic (case-insensitive)
        const nomeMatch = cliente.nome.toLowerCase().includes(normalizedSearch);

        // Search in phone (both formatted and raw) - only if search has numbers
        const searchPhone = debouncedSearchTerm.replace(/\D/g, '');
        const phoneMatch = searchPhone.length > 0 ? formatarTelefone(cliente.telefone).toLowerCase().includes(normalizedSearch) || cliente.telefone.replace(/\D/g, '').includes(searchPhone) : false;

        // Search in email if exists
        const emailMatch = cliente.email ? cliente.email.toLowerCase().includes(normalizedSearch) : false;
        const match = nomeMatch || phoneMatch || emailMatch;
        return match;
      });
      console.log('✅ Resultado da busca:', filtered.length, 'clientes encontrados');
    }

    // 3. Apply classification filter (using pre-calculated classification)
    if (filterBy !== 'todos' && filterBy !== 'perdidos') {
      filtered = filtered.filter(cliente => cliente.classificacao === filterBy);
    }

    // 4. Apply days without visit filter
    if (diasSemVisitaFilter !== null) {
      filtered = filtered.filter(cliente => cliente.stats.diasSemComprar === diasSemVisitaFilter);
    }

    // 5. Apply sorting with pre-calculated stats
    filtered.sort((a, b) => {
      let result = 0;
      switch (sortBy) {
        case 'nome':
          result = a.nome.localeCompare(b.nome);
          break;
        case 'telefone':
          result = a.telefone.localeCompare(b.telefone);
          break;
        case 'totalGasto':
          result = a.stats.totalGasto - b.stats.totalGasto;
          break;
        case 'ticketMedio':
          result = a.stats.ticketMedio - b.stats.ticketMedio;
          break;
        case 'classificacao':
          result = a.classificacao.localeCompare(b.classificacao);
          break;
        case 'ultimaVisita':
          const ultimaA = a.stats.diasSemComprar ?? 9999;
          const ultimaB = b.stats.diasSemComprar ?? 9999;
          result = ultimaB - ultimaA; // Menor dias = mais recente
          break;
        default:
          result = 0;
      }
      return sortDirection === 'asc' ? result : -result;
    });
    const endTime = performance.now();
    console.log('⚡ Filtragem concluída em', Math.round(endTime - startTime), 'ms | Resultado:', filtered.length, 'clientes');
    setFilteredClientes(filtered);
    // Reset para primeira página quando filtros mudam
    setPaginaClientes(1);
  }, [clientesComEstatisticas, debouncedSearchTerm, sortBy, sortDirection, filterBy, diasSemVisitaFilter]);

  // ⚡ PAGINAÇÃO: Calcular clientes paginados
  const paginacaoClientes = useMemo(() => {
    const total = filteredClientes.length;
    const totalPaginas = Math.ceil(total / CLIENTES_POR_PAGINA);
    const indiceInicio = (paginaClientes - 1) * CLIENTES_POR_PAGINA;
    const indiceFim = indiceInicio + CLIENTES_POR_PAGINA;
    const clientesPaginados = filteredClientes.slice(indiceInicio, indiceFim);
    return { total, totalPaginas, indiceInicio, indiceFim, clientesPaginados };
  }, [filteredClientes, paginaClientes]);

  const irParaPaginaClientes = useCallback((pagina: number) => {
    setPaginaClientes(Math.max(1, Math.min(pagina, paginacaoClientes.totalPaginas)));
  }, [paginacaoClientes.totalPaginas]);
  const resetForm = () => {
    setFormData({
      nome: '',
      telefone: '',
      corteFavorito: '',
      barbeiroPreferido: '',
      preferenciasObservacoes: '',
      observacoes: ''
    });
    setClienteEditando(null);
  };
  const handleOpenDialog = (cliente?: Cliente) => {
    if (cliente) {
      setClienteEditando(cliente);
      setFormData({
        nome: cliente.nome,
        telefone: formatarTelefone(cliente.telefone),
        // Show formatted phone
        corteFavorito: cliente.preferencias?.corteFavorito || '',
        barbeiroPreferido: cliente.preferencias?.barbeiroPreferido || '',
        preferenciasObservacoes: cliente.preferencias?.observacoes || '',
        observacoes: cliente.observacoes || ''
      });
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };
  const handleOpenDetails = (cliente: Cliente) => {
    setClienteSelecionado(cliente);
    setIsDetailsOpen(true);
  };
  const handleSave = async () => {
    if (!formData.nome || !formData.telefone || !formData.barbeiroPreferido) {
      toast({
        title: "Erro",
        description: "Nome, telefone e barbeiro preferido são obrigatórios",
        variant: "destructive"
      });
      return;
    }

    // Validar formato do telefone
    const phoneDigits = formData.telefone.replace(/\D/g, '');
    if (phoneDigits.length !== 11) {
      toast({
        title: "Erro",
        description: "Telefone deve ter 11 dígitos no formato (00) 00000-0000",
        variant: "destructive"
      });
      return;
    }
    const clienteData: Cliente = {
      id: clienteEditando?.id || crypto.randomUUID(),
      nome: formData.nome,
      telefone: formData.telefone.replace(/\D/g, ''),
      // Store only digits
      preferencias: {
        corteFavorito: formData.corteFavorito,
        barbeiroPreferido: formData.barbeiroPreferido,
        observacoes: formData.preferenciasObservacoes
      },
      observacoes: formData.observacoes,
      pontosFidelidade: clienteEditando?.pontosFidelidade || 0,
      dataCadastro: clienteEditando?.dataCadastro || new Date().toISOString(),
      ultimoAtendimento: clienteEditando?.ultimoAtendimento || null,
      status: clienteEditando?.status || 'ativo'
    };
    try {
      if (clienteEditando) {
        await supabaseClienteStorage.update(clienteData);
        toast({
          title: "Cliente atualizado",
          description: "Cliente atualizado com sucesso"
        });
      } else {
        await supabaseClienteStorage.add(clienteData);
        toast({
          title: "Cliente salvo",
          description: "Cliente cadastrado com sucesso"
        });
      }
      await refreshData();
      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error('Erro ao salvar cliente:', error);
      toast({
        title: "Erro",
        description: "Erro ao salvar cliente",
        variant: "destructive"
      });
    }
  };

  // Funções para status
  const marcarComoPerdido = async (id: string) => {
    const cliente = clientes.find(c => c.id === id);
    if (!cliente) return;
    try {
      await supabaseClienteStorage.update({
        ...cliente,
        status: 'perdido'
      });
      await refreshData();
      toast({
        title: "Cliente marcado como perdido",
        description: "Cliente foi marcado como perdido"
      });
    } catch (error) {
      console.error('Erro ao marcar cliente como perdido:', error);
      toast({
        title: "Erro",
        description: "Erro ao marcar cliente como perdido",
        variant: "destructive"
      });
    }
  };
  const reativarCliente = async (id: string) => {
    const cliente = clientes.find(c => c.id === id);
    if (!cliente) return;
    try {
      await supabaseClienteStorage.update({
        ...cliente,
        status: 'ativo'
      });
      await refreshData();
      toast({
        title: "Cliente reativado",
        description: "Cliente foi reativado com sucesso"
      });
    } catch (error) {
      console.error('Erro ao reativar cliente:', error);
      toast({
        title: "Erro",
        description: "Erro ao reativar cliente",
        variant: "destructive"
      });
    }
  };
  const excluirCliente = async (id: string) => {
    const cliente = clientes.find(c => c.id === id);
    if (!cliente) return;

    // Confirmar exclusão
    const confirmacao = window.confirm(`Tem certeza que deseja excluir o cliente "${cliente.nome}"?\n\nAo excluir não tem mais volta. O histórico de vendas será mantido, mas o cliente não estará disponível para novas vendas.`);
    if (!confirmacao) return;
    try {
      console.log('🗑️ Excluindo cliente:', id, cliente.nome);

      // Marcar cliente como excluído (soft delete) em vez de deletar fisicamente
      const {
        error
      } = await supabase.from('clientes').update({
        status: 'excluido'
      }).eq('id', id);
      if (error) {
        console.error('❌ Erro ao excluir cliente no Supabase:', error);
        throw error;
      }
      console.log('✅ Cliente marcado como excluído com sucesso');

      // Atualizar dados locais imediatamente
      await refreshData();
      toast({
        title: "Cliente excluído",
        description: `Cliente ${cliente.nome} foi excluído permanentemente`
      });
    } catch (error: any) {
      console.error('❌ Erro ao excluir cliente:', error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao excluir cliente",
        variant: "destructive"
      });
    }
  };
  const formatarTelefone = (telefone: string) => {
    const digits = telefone.replace(/\D/g, '');
    if (digits.length === 11) {
      return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
    }
    return telefone;
  };

  // Função para exportar clientes
  const exportarClientes = () => {
    const dadosExportacao = filteredClientes.map(cliente => {
      const stats = calcularEstatisticasCliente(cliente);
      return {
        Nome: cliente.nome,
        Telefone: cliente.telefone,
        Email: cliente.email || '',
        'Data Cadastro': new Date(cliente.dataCadastro).toLocaleDateString('pt-BR'),
        'Último Atendimento': cliente.ultimoAtendimento ? new Date(cliente.ultimoAtendimento).toLocaleDateString('pt-BR') : 'Nunca',
        'Total Gasto': `R$ ${stats.totalGasto.toFixed(2).replace('.', ',')}`,
        'Quantidade Visitas': stats.quantidadeVisitas,
        'Pontos Fidelidade': cliente.pontosFidelidade,
        'Classificação': classificarCliente(cliente),
        'Corte Favorito': cliente.preferencias?.corteFavorito || '',
        'Observações': cliente.observacoes || ''
      };
    });
    const csvContent = [Object.keys(dadosExportacao[0] || {}).join(','), ...dadosExportacao.map(row => Object.values(row).map(value => typeof value === 'string' && value.includes(',') ? `"${value}"` : value).join(','))].join('\n');
    const blob = new Blob([csvContent], {
      type: 'text/csv;charset=utf-8;'
    });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `clientes_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    toast({
      title: "Exportação concluída",
      description: `${filteredClientes.length} clientes exportados com sucesso`
    });
  };

  // Verificar se o usuário está logado
  if (isLoading) {
    return <ResponsiveLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <p className="text-muted-foreground">Carregando...</p>
          </div>
        </div>
      </ResponsiveLayout>;
  }
  if (!usuario) {
    return <ResponsiveLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center space-y-4">
            <h2 className="text-2xl font-bold text-foreground">Acesso Negado</h2>
            <p className="text-muted-foreground">Você precisa estar logado para acessar esta página.</p>
            <Button onClick={() => window.location.href = '/login'}>
              Fazer Login
            </Button>
          </div>
        </div>
      </ResponsiveLayout>;
  }
  return <ResponsiveLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Gerenciamento de Clientes</h1>
            <p className="text-muted-foreground">Sistema CRM da sua Empresa - gerencie relacionamentos e histórico</p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative max-w-md flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar clientes..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10" />
            </div>
            
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => handleOpenDialog()}>
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Cliente
                </Button>
              </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {clienteEditando ? 'Editar Cliente' : 'Cadastrar Novo Cliente'}
                </DialogTitle>
              </DialogHeader>
              
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="nome">Nome Completo *</Label>
                    <Input id="nome" value={formData.nome} onChange={e => setFormData({
                      ...formData,
                      nome: e.target.value
                    })} placeholder="Nome do cliente" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="telefone">Telefone *</Label>
                    <Input id="telefone" value={formData.telefone} onChange={e => {
                      const input = e.target.value;
                      // Remove all non-digits
                      const digits = input.replace(/\D/g, '');

                      // Format as (00) 00000-0000 while typing
                      let formatted = digits;
                      if (digits.length >= 3) {
                        formatted = `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
                      }
                      if (digits.length >= 8) {
                        formatted = `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
                      }

                      // Limit to 11 digits
                      if (digits.length <= 11) {
                        setFormData({
                          ...formData,
                          telefone: formatted
                        });
                      }
                    }} placeholder="(11) 99999-9999" maxLength={15} />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="barbeiroPreferido">Barbeiro Preferido *</Label>
                  <Select value={formData.barbeiroPreferido} onValueChange={value => setFormData({
                    ...formData,
                    barbeiroPreferido: value
                  })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o barbeiro preferido" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ambos">Ambos</SelectItem>
                      {barbeiros.filter(barbeiro => barbeiro.ativo).map(barbeiro => <SelectItem key={barbeiro.id} value={barbeiro.id}>
                          {barbeiro.nome}
                        </SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="corteFavorito">Corte Favorito</Label>
                  <Input id="corteFavorito" value={formData.corteFavorito} onChange={e => setFormData({
                    ...formData,
                    corteFavorito: e.target.value
                  })} placeholder="Ex: Degradê, Social, etc." />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="preferenciasObservacoes">Preferências</Label>
                  <Textarea id="preferenciasObservacoes" value={formData.preferenciasObservacoes} onChange={e => setFormData({
                    ...formData,
                    preferenciasObservacoes: e.target.value
                  })} placeholder="Ex: prefere fade alto, usa navalha..." rows={2} />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="observacoes">Observações Gerais</Label>
                  <Textarea id="observacoes" value={formData.observacoes} onChange={e => setFormData({
                    ...formData,
                    observacoes: e.target.value
                  })} placeholder="Observações gerais sobre o cliente..." rows={3} />
                </div>
              </div>
              
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleSave}>
                  {clienteEditando ? 'Atualizar' : 'Salvar'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex gap-2">
            <Select value={filterBy} onValueChange={(value: any) => setFilterBy(value)}>
              <SelectTrigger className="w-[150px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filtrar" />
              </SelectTrigger>
              <SelectContent className="z-50 bg-background">
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="vip">VIP</SelectItem>
                <SelectItem value="novos">Novos</SelectItem>
                <SelectItem value="inativos">Inativos</SelectItem>
                <SelectItem value="perdidos">Perdidos</SelectItem>
              </SelectContent>
            </Select>

            <Select value={diasSemVisitaFilter !== null ? String(diasSemVisitaFilter) : undefined} onValueChange={value => {
            if (value === 'all') {
              setDiasSemVisitaFilter(null);
            } else {
              setDiasSemVisitaFilter(parseInt(value));
            }
          }}>
              <SelectTrigger className="w-[180px]">
                <Clock className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Dias sem visita" />
              </SelectTrigger>
              <SelectContent className="z-50 bg-background">
                <SelectItem value="all">Todos os dias</SelectItem>
                {opcoesDiasSemVisita.map(dias => <SelectItem key={dias} value={dias.toString()}>
                    {dias} {dias === 1 ? 'dia' : 'dias'}
                  </SelectItem>)}
              </SelectContent>
            </Select>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <ArrowUpDown className="h-4 w-4 mr-2" />
                  Ordenar
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="z-50 bg-background">
                <DropdownMenuItem onClick={() => handleSort('nome')}>
                  A-Z (Nome)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleSort('telefone')}>
                  Telefone
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleSort('totalGasto')}>
                  Total Gasto
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleSort('ticketMedio')}>
                  Ticket Médio
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleSort('classificacao')}>
                  Classificação
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleSort('ultimaVisita')}>
                  Última Visita
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button variant="outline" onClick={exportarClientes}>
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
          <Card className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Total de Clientes</p>
                <p className="text-2xl font-bold">{clientes.filter(c => c.status === 'ativo').length}</p>
              </div>
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-yellow-500" />
              <div>
                <p className="text-sm text-muted-foreground">Clientes VIP</p>
                <p className="text-2xl font-bold">{clientes.filter(c => c.status === 'ativo' && classificarCliente(c) === 'vip').length}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">Novos (últimos 30 dias)</p>
                <p className="text-2xl font-bold">{clientes.filter(c => c.status === 'ativo' && classificarCliente(c) === 'novos').length}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center space-x-2">
              <UserX className="h-5 w-5 text-red-500" />
              <div>
                <p className="text-sm text-muted-foreground">Inativos (+90 dias)</p>
                <p className="text-2xl font-bold">{clientes.filter(c => c.status === 'ativo' && classificarCliente(c) === 'inativos').length}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4 border-red-200 dark:border-red-800">
            <div className="flex items-center space-x-2">
              <UserX className="h-5 w-5 text-red-600" />
              <div>
                <p className="text-sm text-muted-foreground">Clientes Perdidos</p>
                <p className="text-2xl font-bold text-red-600">{clientes.filter(c => c.status === 'perdido').length}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Table */}
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => handleSort('nome')}>
                  <div className="flex items-center gap-2 text-primary-foreground">
                    Cliente
                    {sortBy === 'nome' ? sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" /> : <ArrowUpDown className="h-4 w-4" />}
                  </div>
                </TableHead>
                <TableHead className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => handleSort('telefone')}>
                  <div className="flex items-center gap-2 text-primary-foreground">
                    Telefone
                    {sortBy === 'telefone' ? sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" /> : <ArrowUpDown className="h-4 w-4" />}
                  </div>
                </TableHead>
                <TableHead className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => handleSort('totalGasto')}>
                  <div className="flex items-center gap-2 text-primary-foreground">
                    Total Gasto
                    {sortBy === 'totalGasto' ? sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" /> : <ArrowUpDown className="h-4 w-4" />}
                  </div>
                </TableHead>
                <TableHead className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => handleSort('ticketMedio')}>
                  <div className="flex items-center gap-2 text-primary-foreground">
                    Ticket Médio
                    {sortBy === 'ticketMedio' ? sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" /> : <ArrowUpDown className="h-4 w-4" />}
                  </div>
                </TableHead>
                <TableHead className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => handleSort('classificacao')}>
                  <div className="flex items-center gap-2 text-primary-foreground">
                    Classificação
                    {sortBy === 'classificacao' ? sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" /> : <ArrowUpDown className="h-4 w-4" />}
                  </div>
                </TableHead>
                <TableHead className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => handleSort('ultimaVisita')}>
                  <div className="flex items-center gap-2 text-primary-foreground">
                    Última Visita
                    {sortBy === 'ultimaVisita' ? sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" /> : <ArrowUpDown className="h-4 w-4" />}
                  </div>
                </TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginacaoClientes.clientesPaginados.map(cliente => {
                const stats = calcularEstatisticasCliente(cliente);
                const classificacao = classificarCliente(cliente);
                return <TableRow key={cliente.id} className={cliente.status === 'perdido' ? 'opacity-60' : ''}>
                      <TableCell>
                        <div>
                          <button onClick={() => handleOpenDetails(cliente)} className="font-medium text-primary hover:underline text-left">
                            {cliente.nome}
                            {cliente.status === 'perdido' && <Badge variant="destructive" className="ml-2 text-xs">
                                Perdido
                              </Badge>}
                          </button>
                          {cliente.preferencias?.corteFavorito && <p className="text-sm text-muted-foreground">
                              Corte: {cliente.preferencias.corteFavorito}
                            </p>}
                          <div className="flex items-center gap-1 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {stats.quantidadeVisitas} visitas
                            </Badge>
                            <Badge variant="secondary" className="text-xs">
                              {cliente.pontosFidelidade} pts
                            </Badge>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-sm">
                          {formatarTelefone(cliente.telefone)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="font-semibold">
                          {new Intl.NumberFormat('pt-BR', {
                        style: 'currency',
                        currency: 'BRL'
                      }).format(stats.totalGasto)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="font-semibold">
                          {new Intl.NumberFormat('pt-BR', {
                        style: 'currency',
                        currency: 'BRL'
                      }).format(stats.ticketMedio)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={classificacao === 'vip' ? 'default' : classificacao === 'novos' ? 'secondary' : classificacao === 'inativos' ? 'destructive' : 'outline'}>
                          {classificacao === 'vip' ? 'VIP' : classificacao === 'novos' ? 'Novo' : classificacao === 'inativos' ? 'Inativo' : 'Regular'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {stats.ultimaVendaCompleta ? <div>
                            <span className="text-sm">
                              {new Date(stats.ultimaVendaCompleta.dataVenda).toLocaleDateString('pt-BR')}
                            </span>
                            <p className="text-xs text-muted-foreground">
                              {new Date(stats.ultimaVendaCompleta.horarioAtendimento || stats.ultimaVendaCompleta.dataVenda).toLocaleTimeString('pt-BR', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                            </p>
                            {stats.diasSemComprar && <p className="text-xs text-muted-foreground">
                                há {stats.diasSemComprar} dias
                              </p>}
                          </div> : <span className="text-muted-foreground">Nunca</span>}
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button variant="outline" size="sm" onClick={() => handleOpenDetails(cliente)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => handleOpenDialog(cliente)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          {cliente.status === 'perdido' ? <>
                              <Button variant="outline" size="sm" onClick={() => reativarCliente(cliente.id)} className="text-green-600 hover:text-green-700">
                                Reativar
                              </Button>
                              <Button variant="outline" size="sm" onClick={() => excluirCliente(cliente.id)} className="text-red-600 hover:text-red-700">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </> : <>
                              <Button variant="outline" size="sm" onClick={() => marcarComoPerdido(cliente.id)} className="text-red-600 hover:text-red-700">
                                Perdido
                              </Button>
                              <Button variant="outline" size="sm" onClick={() => excluirCliente(cliente.id)} className="text-red-600 hover:text-red-700">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>}
                        </div>
                      </TableCell>
                    </TableRow>;
              })}
            </TableBody>
          </Table>

          {/* Controles de Paginação */}
          {paginacaoClientes.totalPaginas > 1 && (
            <div className="flex items-center justify-between p-4 border-t">
              <div className="text-sm text-muted-foreground">
                Mostrando {paginacaoClientes.indiceInicio + 1} a {Math.min(paginacaoClientes.indiceFim, paginacaoClientes.total)} de {paginacaoClientes.total} clientes
              </div>
              
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => irParaPaginaClientes(1)} disabled={paginaClientes === 1}>
                  <ChevronsLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => irParaPaginaClientes(paginaClientes - 1)} disabled={paginaClientes === 1}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm px-3 py-1">
                  Página {paginaClientes} de {paginacaoClientes.totalPaginas}
                </span>
                <Button variant="outline" size="sm" onClick={() => irParaPaginaClientes(paginaClientes + 1)} disabled={paginaClientes === paginacaoClientes.totalPaginas}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => irParaPaginaClientes(paginacaoClientes.totalPaginas)} disabled={paginaClientes === paginacaoClientes.totalPaginas}>
                  <ChevronsRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </Card>

        {filteredClientes.length === 0 && <div className="text-center py-12">
            <Users className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-2 text-sm font-semibold text-muted-foreground">Nenhum cliente encontrado</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {searchTerm ? 'Tente ajustar sua busca.' : 'Comece cadastrando seu primeiro cliente.'}
            </p>
          </div>}

        {/* Cliente Details Modal */}
        <ClienteDetails cliente={clienteSelecionado} isOpen={isDetailsOpen} onClose={() => setIsDetailsOpen(false)} />
      </div>
    </ResponsiveLayout>;
};