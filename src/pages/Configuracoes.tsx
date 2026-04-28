import { useState, useEffect } from "react";
import { ResponsiveLayout } from "@/components/layout/ResponsiveLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { PhotoUpload } from "@/components/ui/photo-upload";
import { 
  Settings, 
  Users, 
  CreditCard, 
  Percent, 
  Plus,
  Edit,
  Trash2,
  Clock,
  DollarSign,
  Package,
  Scissors,
  Calculator,
  BarChart3
} from "lucide-react";
import { PromocoesList } from '@/components/promocoes/PromocoesList';
import { useToast } from "@/hooks/use-toast";
import { useSupabaseData } from "@/hooks/useSupabaseData";
import { useUserPermissions } from "@/hooks/useUserPermissions";
import { useComissoes } from "@/hooks/useComissoes";
import { usePhotoUpload } from "@/hooks/usePhotoUpload";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { supabase } from "@/integrations/supabase/client";
import { Barbeiro, Servico, Produto } from "@/types";

// Estrutura para comissões personalizadas - REMOVIDA (agora vem do hook useComissoes)

const METODOS_PAGAMENTO_PADRAO = [
  { id: "dinheiro", nome: "Dinheiro" },
  { id: "cartao", nome: "Cartão" },
  { id: "pix", nome: "PIX" },
  { id: "fiado", nome: "Fiado" },
];

export default function Configuracoes() {
  const { toast } = useToast();
  const { barbeiros, servicos, produtos, vendas, loading, refreshData } = useSupabaseData();
  const { permissions, updateModulePermission, updateAllPermissions, RELATORIOS_TABS } = useUserPermissions();
  const { getComissoesBarbeiro, salvarComissoesBarbeiro, loading: loadingComissoes } = useComissoes();
  const { uploadPhoto, removePhoto } = usePhotoUpload();
  const { usuario, updateUserPhoto, refreshUserData, forceRefreshUserData } = useSupabaseAuth();
  
  // Estado de métodos de pagamento ativos
  const [metodosPagamentoAtivos, setMetodosPagamentoAtivos] = useState<Record<string, boolean>>({
    dinheiro: true, cartao: true, pix: true, fiado: false,
  });

  // Carregar configurações de pagamento do banco
  useEffect(() => {
    const carregarMetodosPagamento = async () => {
      const { data } = await supabase
        .from('configuracoes_sistema')
        .select('valor')
        .eq('chave', 'metodos_pagamento_ativos')
        .maybeSingle();
      if (data?.valor) {
        try {
          setMetodosPagamentoAtivos(JSON.parse(data.valor));
        } catch {}
      }
    };
    carregarMetodosPagamento();
  }, []);

  const toggleMetodoPagamento = async (metodoId: string, ativo: boolean) => {
    const novosMetodos = { ...metodosPagamentoAtivos, [metodoId]: ativo };
    setMetodosPagamentoAtivos(novosMetodos);
    
    const { error } = await supabase
      .from('configuracoes_sistema')
      .upsert({
        chave: 'metodos_pagamento_ativos',
        valor: JSON.stringify(novosMetodos),
        tipo_dado: 'json',
        descricao: 'Métodos de pagamento ativos no sistema',
      }, { onConflict: 'chave' });
    
    if (error) {
      console.error('Erro ao salvar métodos de pagamento:', error);
      toast({ title: 'Erro', description: 'Erro ao salvar configuração.', variant: 'destructive' });
    } else {
      toast({ title: 'Configuração salva', description: `${metodoId} foi ${ativo ? 'ativado' : 'desativado'}.` });
    }
  };

  const [novoBarbeiro, setNovoBarbeiro] = useState({
    nome: "",
    usuario: "",
    senha: "",
    email: "",
    telefone: "",
    comissaoServicos: 15,
    comissaoProdutos: 10,
    nivel: "colaborador"
  });
  
  const [dialogoNovoBarberioAberto, setDialogoNovoBarberioAberto] = useState(false);

  const [comissaoDialogOpen, setComissaoDialogOpen] = useState(false);
  const [selectedBarbeiro, setSelectedBarbeiro] = useState<Barbeiro | null>(null);
  const [servicosComComissao, setServicosComComissao] = useState<(Servico & { comissao: number })[]>([]);
  const [produtosComComissao, setProdutosComComissao] = useState<(Produto & { comissao: number })[]>([]);
  const [editBarbeiroDialogOpen, setEditBarbeiroDialogOpen] = useState(false);
  const [editingBarbeiro, setEditingBarbeiro] = useState<Barbeiro | null>(null);

  const [selectedUserPermissions, setSelectedUserPermissions] = useState<string | null>(null);
  
  // Estado para controlar quais seções de relatórios estão expandidas
  const [expandedRelatorios, setExpandedRelatorios] = useState<{[barbeiroId: string]: boolean}>({});
  
  // Estado para carregar permissões específicas de cada barbeiro
  const [barbeirosPermissions, setBarbeirosPermissions] = useState<{[barbeiroId: string]: {[module: string]: boolean}}>({});

  // Função para carregar permissões de um barbeiro específico
  const carregarPermissoesBarbeiro = async (barbeiroId: string) => {
    try {
      console.log(`🔄 CONFIGURACOES - Carregando permissões do barbeiro: ${barbeiroId}`);
      
      const { data: userPermissionsData, error } = await supabase
        .from('user_permissions')
        .select('module_name, has_access')
        .eq('user_id', barbeiroId);

      if (error) {
        console.error('❌ CONFIGURACOES - Erro ao carregar permissões:', error);
        return {};
      }

      console.log(`📋 CONFIGURACOES - Permissões encontradas para ${barbeiroId}:`, userPermissionsData);

      // Converter array de permissões para objeto
      const permissionsObj: {[module: string]: boolean} = {};
      userPermissionsData?.forEach(perm => {
        permissionsObj[perm.module_name] = perm.has_access;
      });

      // Atualizar estado
      setBarbeirosPermissions(prev => ({
        ...prev,
        [barbeiroId]: permissionsObj
      }));

      console.log(`✅ CONFIGURACOES - Permissões processadas para ${barbeiroId}:`, permissionsObj);
      
      return permissionsObj;
    } catch (error) {
      console.error('💥 CONFIGURACOES - Erro geral ao carregar permissões:', error);
      return {};
    }
  };

  // Atualizar dados do usuário quando a página carregar
  useEffect(() => {
    console.log('📱 CONFIGURACOES - Página carregada, atualizando dados do usuário');
    if (usuario?.barbeiroId) {
      forceRefreshUserData();
    }
  }, []);

  // Carregar permissões de todos os barbeiros quando a lista mudar
  useEffect(() => {
    if (barbeiros.length > 0) {
      console.log('🔄 CONFIGURACOES - Carregando permissões para todos os barbeiros');
      barbeiros.forEach(barbeiro => {
        if (barbeiro.nivel === 'colaborador') {
          carregarPermissoesBarbeiro(barbeiro.id);
        }
      });
    }
  }, [barbeiros]);

  // Função auxiliar para obter permissão específica de um barbeiro
  const getBarbeiroPermission = (barbeiroId: string, module: string): boolean => {
    const barbeiro = barbeiros.find(b => b.id === barbeiroId);
    
    // Se for administrador, sempre tem permissão
    if (barbeiro?.nivel === 'administrador') {
      return true;
    }

    // Para colaboradores, verificar permissões específicas
    const permissions = barbeirosPermissions[barbeiroId] || {};
    return permissions[module] || false;
  };

  const togglePermissaoModulo = async (userId: string, modulo: string, hasPermission: boolean) => {
    console.log(`🔄 Atualizando permissão: usuário ${userId}, módulo ${modulo}, acesso ${hasPermission}`);
    
      const success = await updateModulePermission(userId, modulo, hasPermission);
      if (success) {
        console.log(`✅ Permissão atualizada com sucesso no banco de dados`);
        
        // Recarregar permissões do barbeiro específico para atualizar a UI
        await carregarPermissoesBarbeiro(userId);
      
      toast({
        title: "Permissão atualizada",
        description: `Permissão do módulo ${modulo} foi ${hasPermission ? 'liberada' : 'removida'} com sucesso.`,
      });
    } else {
      console.log(`❌ Erro ao atualizar permissão`);
      toast({
        title: "Erro",
        description: "Erro ao atualizar permissão. Tente novamente.",
        variant: "destructive"
      });
    }
  };

  const toggleAllPermissions = async (userId: string, hasPermission: boolean) => {
      const success = await updateAllPermissions(userId, hasPermission);
      if (success) {
        // Recarregar permissões do barbeiro específico para atualizar a UI
        await carregarPermissoesBarbeiro(userId);
        
        toast({
        title: "Permissões atualizadas",
        description: `Todas as permissões foram ${hasPermission ? 'liberadas' : 'removidas'} com sucesso.`,
      });
    } else {
      toast({
        title: "Erro",
        description: "Erro ao atualizar permissões. Tente novamente.",
        variant: "destructive"
      });
    }
  };

  const salvarBarbeiro = async () => {
    try {
      // Validações básicas
      if (!novoBarbeiro.nome || !novoBarbeiro.usuario || !novoBarbeiro.senha) {
        toast({
          title: "Erro",
          description: "Preencha todos os campos obrigatórios: nome, usuário e senha.",
          variant: "destructive"
        });
        return;
      }

      // Buscar empresa_id do barbeiro logado
      const { data: barbeiroLogado, error: errorBarbeiroLogado } = await supabase
        .from('barbeiros')
        .select('empresa_id')
        .eq('id', usuario?.barbeiroId)
        .maybeSingle();

      if (errorBarbeiroLogado || !barbeiroLogado?.empresa_id) {
        toast({
          title: "Erro",
          description: "Não foi possível identificar a empresa. Faça login novamente.",
          variant: "destructive"
        });
        return;
      }

      // Verificar se usuário já existe
      const { data: usuarioExistente } = await supabase
        .from('barbeiros')
        .select('usuario')
        .ilike('usuario', novoBarbeiro.usuario)
        .maybeSingle();

      if (usuarioExistente) {
        toast({
          title: "Erro",
          description: "Este nome de usuário já existe. Escolha outro.",
          variant: "destructive"
        });
        return;
      }

      // Criar barbeiro no Supabase
      const { data: barbeiroCriado, error: errorBarbeiro } = await supabase
        .from('barbeiros')
        .insert([{
          nome: novoBarbeiro.nome,
          usuario: novoBarbeiro.usuario,
          senha: novoBarbeiro.senha,
          email: novoBarbeiro.email || null,
          telefone: novoBarbeiro.telefone || null,
          comissao_servicos: novoBarbeiro.comissaoServicos,
          comissao_produtos: novoBarbeiro.comissaoProdutos,
          nivel: novoBarbeiro.nivel,
          ativo: true,
          is_proprietario: false,
          empresa_id: barbeiroLogado.empresa_id
        }])
        .select()
        .single();

      if (errorBarbeiro) {
        console.error('Erro ao criar barbeiro:', errorBarbeiro);
        throw errorBarbeiro;
      }

      // Se for colaborador, criar permissões padrão (todas negadas)
      if (novoBarbeiro.nivel === 'colaborador') {
        const modulos = ['clientes', 'servicos', 'produtos', 'vendas', 'comissoes', 'relatorios'];
        
        const permissoesDefault = modulos.map(modulo => ({
          user_id: barbeiroCriado.id,
          module_name: modulo,
          has_access: false // Por padrão, colaboradores não têm acesso
        }));

        const { error: errorPermissoes } = await supabase
          .from('user_permissions')
          .insert(permissoesDefault);

        if (errorPermissoes) {
          console.error('Erro ao criar permissões padrão:', errorPermissoes);
          // Continuar mesmo se houver erro nas permissões
        }
      }

      // Sucesso
      toast({
        title: "Usuário criado com sucesso!",
        description: `O usuário ${novoBarbeiro.nome} foi criado e já pode fazer login no sistema.`,
      });

      // Limpar formulário
      setNovoBarbeiro({
        nome: "",
        usuario: "",
        senha: "",
        email: "",
        telefone: "",
        comissaoServicos: 15,
        comissaoProdutos: 10,
        nivel: "colaborador"
      });

      // Fechar diálogo
      setDialogoNovoBarberioAberto(false);

      // Forçar atualização da lista (caso o realtime tenha problemas)
      setTimeout(() => {
        refreshData();
      }, 500);

    } catch (error) {
      console.error('Erro ao salvar barbeiro:', error);
      toast({
        title: "Erro",
        description: "Erro ao criar usuário. Tente novamente.",
        variant: "destructive"
      });
    }
  };

  const salvarConfiguracoes = () => {
    toast({
      title: "Configurações salvas",
      description: "As configurações do sistema foram atualizadas.",
    });
  };


  const abrirEdicaoBarbeiro = (barbeiro: Barbeiro) => {
    setEditingBarbeiro(barbeiro);
    setEditBarbeiroDialogOpen(true);
  };

  const salvarEdicaoBarbeiro = async () => {
    if (!editingBarbeiro) return;

    try {
      const { error } = await supabase
        .from('barbeiros')
        .update({
          nome: editingBarbeiro.nome,
          email: editingBarbeiro.email,
          telefone: editingBarbeiro.telefone,
          comissao_servicos: editingBarbeiro.comissaoServicos,
          comissao_produtos: editingBarbeiro.comissaoProdutos,
          nivel: editingBarbeiro.nivel
        })
        .eq('id', editingBarbeiro.id);

      if (error) {
        throw error;
      }

      toast({
        title: "Barbeiro atualizado",
        description: "Os dados do barbeiro foram atualizados com sucesso.",
      });

      setEditBarbeiroDialogOpen(false);
      setEditingBarbeiro(null);
      refreshData();
    } catch (error) {
      console.error('Erro ao atualizar barbeiro:', error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar dados do barbeiro. Tente novamente.",
        variant: "destructive"
      });
    }
  };

  const handlePhotoUpload = async (file: File, barbeiroId: string) => {
    try {
      console.log('📤 CONFIGURACOES - Iniciando upload da foto...', { file: file.name, barbeiroId });
      const photoUrl = await uploadPhoto(file, barbeiroId);
      console.log('✅ CONFIGURACOES - Upload concluído:', photoUrl);
      
      // Atualizar estado local se estiver editando este barbeiro
      if (editingBarbeiro && editingBarbeiro.id === barbeiroId) {
        console.log('🔄 Atualizando estado local do barbeiro em edição');
        setEditingBarbeiro(prev => prev ? { ...prev, fotoPerfilUrl: photoUrl } : null);
      }

      // Se for o usuário logado, atualizar seu estado também
      if (usuario && usuario.barbeiroId === barbeiroId) {
        console.log('👤 Atualizando foto do usuário logado');
        await updateUserPhoto(photoUrl);
        
        // Força múltiplas atualizações para garantir sincronização
        await forceRefreshUserData();
        
        // Dupla garantia de atualização
        setTimeout(async () => {
          await forceRefreshUserData();
        }, 100);
      }

      // Forçar refresh dos dados globais
      console.log('🔄 Forçando refresh dos dados globais');
      refreshData();
      
      // Garantir atualização após um tempo
      setTimeout(() => {
        refreshData();
      }, 500);

      return photoUrl;
    } catch (error) {
      console.error('❌ CONFIGURACOES - Erro no upload da foto:', error);
      throw error;
    }
  };

  const handlePhotoRemove = async (barbeiroId: string, currentPhotoUrl?: string) => {
    try {
      console.log('🗑️ CONFIGURACOES - Removendo foto...', { barbeiroId, currentPhotoUrl });
      await removePhoto(barbeiroId, currentPhotoUrl);
      
      // Atualizar estado local se estiver editando este barbeiro
      if (editingBarbeiro && editingBarbeiro.id === barbeiroId) {
        console.log('🔄 Atualizando estado local do barbeiro em edição');
        setEditingBarbeiro(prev => prev ? { ...prev, fotoPerfilUrl: undefined } : null);
      }

      // Se for o usuário logado, atualizar seu estado também
      if (usuario && usuario.barbeiroId === barbeiroId) {
        console.log('👤 Removendo foto do usuário logado');
        await updateUserPhoto(null);
        
        // Força múltiplas atualizações para garantir sincronização
        await forceRefreshUserData();
        
        // Dupla garantia de atualização
        setTimeout(async () => {
          await forceRefreshUserData();
        }, 100);
      }

      // Forçar refresh dos dados globais
      console.log('🔄 Forçando refresh dos dados globais');
      refreshData();
      
      // Garantir atualização após um tempo
      setTimeout(() => {
        refreshData();
      }, 500);
      
    } catch (error) {
      console.error('❌ CONFIGURACOES - Erro ao remover foto:', error);
    }
  };

  const abrirComissoes = (barbeiro: Barbeiro) => {
    setSelectedBarbeiro(barbeiro);
    
    // Buscar comissão personalizada do barbeiro no Supabase
    const comissaoBarbeiro = getComissoesBarbeiro(barbeiro.id);
    
    // Configurar serviços com suas comissões
    const servicosComConfig = servicos.map(servico => ({
      ...servico,
      comissao: comissaoBarbeiro.servicos[servico.id] ?? barbeiro.comissaoServicos
    }));
    
    // Configurar produtos com suas comissões
    const produtosComConfig = produtos.map(produto => ({
      ...produto,
      comissao: comissaoBarbeiro.produtos[produto.id] ?? barbeiro.comissaoProdutos
    }));
    
    setServicosComComissao(servicosComConfig);
    setProdutosComComissao(produtosComConfig);
    setComissaoDialogOpen(true);
  };

  const atualizarComissaoServico = (id: string, novaComissao: number) => {
    setServicosComComissao(prev => 
      prev.map(item => 
        item.id === id ? { ...item, comissao: novaComissao } : item
      )
    );
  };

  const atualizarComissaoProduto = (id: string, novaComissao: number) => {
    setProdutosComComissao(prev => 
      prev.map(item => 
        item.id === id ? { ...item, comissao: novaComissao } : item
      )
    );
  };

  const salvarComissoes = async () => {
    if (!selectedBarbeiro) return;
    
    console.log('🔧 Iniciando salvamento de comissões para:', selectedBarbeiro.nome);
    
    const servicosComissoes: { [servicoId: string]: number } = {};
    const produtosComissoes: { [produtoId: string]: number } = {};
    
    // Preparar comissões de serviços (TODAS as comissões, não apenas as diferentes)
    servicosComComissao.forEach(servico => {
      servicosComissoes[servico.id] = servico.comissao;
      console.log(`📋 Serviço ${servico.nome}: ${servico.comissao}%`);
    });
    
    // Preparar comissões de produtos (TODAS as comissões, não apenas as diferentes)
    produtosComComissao.forEach(produto => {
      produtosComissoes[produto.id] = produto.comissao;
      console.log(`📦 Produto ${produto.nome}: ${produto.comissao}%`);
    });
    
    console.log('📋 Dados a serem salvos:', {
      barbeiroId: selectedBarbeiro.id,
      servicosComissoes,
      produtosComissoes
    });
    
    try {
      const success = await salvarComissoesBarbeiro(
        selectedBarbeiro.id, 
        servicosComissoes, 
        produtosComissoes
      );
      
      if (success) {
        console.log('✅ Comissões salvas com sucesso no hook');
        toast({
          title: "Comissões salvas",
          description: `Comissões do barbeiro ${selectedBarbeiro.nome} foram atualizadas com sucesso.`,
        });
        setComissaoDialogOpen(false);
        
        // Forçar refresh dos dados para atualizar em todos os módulos
        setTimeout(() => {
          refreshData();
        }, 500);
      } else {
        throw new Error('Falha ao salvar');
      }
    } catch (error) {
      console.error('❌ Erro ao salvar comissões:', error);
      toast({
        title: "Erro",
        description: "Erro ao salvar comissões. Tente novamente.",
        variant: "destructive"
      });
    }
  };

  return (
    <ResponsiveLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Configurações</h1>
            <p className="text-sm sm:text-base text-muted-foreground">Gerencie as configurações da barbearia</p>
          </div>
          <Button onClick={salvarConfiguracoes} className="w-full sm:w-auto">
            <Settings className="h-4 w-4 mr-2" />
            Salvar Configurações
          </Button>
        </div>

        <Tabs defaultValue="barbeiros" className="space-y-4">
          <TabsList className="w-full flex flex-wrap gap-1 h-auto">
            <TabsTrigger value="barbeiros">Barbeiros</TabsTrigger>
            <TabsTrigger value="pagamentos">Pagamentos</TabsTrigger>
            <TabsTrigger value="promocoes">Promoções</TabsTrigger>
            <TabsTrigger value="acessos">Acessos</TabsTrigger>
          </TabsList>

          <TabsContent value="barbeiros" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Gestão de Barbeiros</h2>
              <Dialog open={dialogoNovoBarberioAberto} onOpenChange={setDialogoNovoBarberioAberto}>
                <DialogTrigger asChild>
                  <Button onClick={() => setDialogoNovoBarberioAberto(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Novo Barbeiro
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Cadastrar Novo Barbeiro</DialogTitle>
                    <DialogDescription>
                      Preencha os dados do barbeiro e configure comissões e horários.
                    </DialogDescription>
                  </DialogHeader>
                     <div className="space-y-4 mb-6">
                       <div className="flex justify-center">
                         <PhotoUpload
                           onPhotoUpload={async (file: File) => {
                             // Simular upload - na implementação real seria após criar o barbeiro
                             return "temp-url";
                           }}
                           fallbackText={novoBarbeiro.nome ? novoBarbeiro.nome.charAt(0).toUpperCase() : "?"}
                           disabled
                         />
                       </div>
                       <p className="text-sm text-muted-foreground text-center">
                         A foto poderá ser adicionada após o cadastro do barbeiro
                       </p>
                     </div>
                     
                     <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="nome">Nome Completo</Label>
                        <Input
                          id="nome"
                          value={novoBarbeiro.nome}
                          onChange={(e) => setNovoBarbeiro({...novoBarbeiro, nome: e.target.value})}
                          placeholder="Nome do barbeiro"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="usuario">Usuário</Label>
                        <Input
                          id="usuario"
                          value={novoBarbeiro.usuario}
                          onChange={(e) => setNovoBarbeiro({...novoBarbeiro, usuario: e.target.value})}
                          placeholder="Usuario para login"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="senha">Senha *</Label>
                      <Input
                        id="senha"
                        type="password"
                        value={novoBarbeiro.senha}
                        onChange={(e) => setNovoBarbeiro({...novoBarbeiro, senha: e.target.value})}
                        placeholder="Digite a senha do usuário"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="email">E-mail</Label>
                        <Input
                          id="email"
                          type="email"
                          value={novoBarbeiro.email}
                          onChange={(e) => setNovoBarbeiro({...novoBarbeiro, email: e.target.value})}
                          placeholder="email@exemplo.com"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="telefone">Telefone</Label>
                        <Input
                          id="telefone"
                          value={novoBarbeiro.telefone}
                          onChange={(e) => setNovoBarbeiro({...novoBarbeiro, telefone: e.target.value})}
                          placeholder="(11) 99999-9999"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="comissaoServicos">Comissão Serviços (%)</Label>
                        <Input
                          id="comissaoServicos"
                          type="number"
                          value={novoBarbeiro.comissaoServicos}
                          onChange={(e) => setNovoBarbeiro({...novoBarbeiro, comissaoServicos: Number(e.target.value)})}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="comissaoProdutos">Comissão Produtos (%)</Label>
                        <Input
                          id="comissaoProdutos"
                          type="number"
                          value={novoBarbeiro.comissaoProdutos}
                          onChange={(e) => setNovoBarbeiro({...novoBarbeiro, comissaoProdutos: Number(e.target.value)})}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="nivel">Nível de Acesso</Label>
                      <Select value={novoBarbeiro.nivel} onValueChange={(value) => setNovoBarbeiro({...novoBarbeiro, nivel: value})}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="colaborador">Colaborador</SelectItem>
                          <SelectItem value="administrador">Administrador</SelectItem>
                          <SelectItem value="atendente">Atendente</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button onClick={salvarBarbeiro}>Salvar Barbeiro</Button>
                  </DialogFooter>
                  </DialogContent>
              </Dialog>
            </div>

            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>E-mail</TableHead>
                      <TableHead>Telefone</TableHead>
                      <TableHead>Comissão Serv.</TableHead>
                      <TableHead>Comissão Prod.</TableHead>
                      
                      <TableHead>Nível</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {barbeiros.map((barbeiro) => (
                      <TableRow key={barbeiro.id}>
                        <TableCell>{barbeiro.nome}</TableCell>
                        <TableCell>{barbeiro.email}</TableCell>
                        <TableCell>{barbeiro.telefone}</TableCell>
                        <TableCell>{barbeiro.comissaoServicos}%</TableCell>
                        <TableCell>{barbeiro.comissaoProdutos}%</TableCell>
                        <TableCell>-</TableCell>
                        <TableCell>
                        <Badge variant={barbeiro.nivel === "administrador" ? "default" : "secondary"}>
                          {barbeiro.nivel}
                        </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={barbeiro.ativo ? "default" : "secondary"}>
                            {barbeiro.ativo ? "Ativo" : "Inativo"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                           <div className="flex gap-2">
                             <Button 
                               variant="outline" 
                               size="sm"
                               onClick={() => abrirEdicaoBarbeiro(barbeiro)}
                             >
                               <Edit className="h-4 w-4" />
                             </Button>
                             <Button variant="outline" size="sm">
                               <Clock className="h-4 w-4" />
                             </Button>
                             <Button 
                               variant="outline" 
                               size="sm"
                               onClick={() => abrirComissoes(barbeiro)}
                             >
                               <DollarSign className="h-4 w-4" />
                             </Button>
                           </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>


          <TabsContent value="pagamentos" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Métodos de Pagamento</CardTitle>
                <CardDescription>Configure quais métodos de pagamento serão aceitos</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {METODOS_PAGAMENTO_PADRAO.map((metodo) => (
                    <div key={metodo.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <CreditCard className="h-5 w-5" />
                        <span className="font-medium">{metodo.nome}</span>
                      </div>
                      <Switch
                        checked={metodosPagamentoAtivos[metodo.id] ?? false}
                        onCheckedChange={(checked) => toggleMetodoPagamento(metodo.id, checked)}
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Configurações de Taxa</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="taxaCartao">Taxa Cartão (%)</Label>
                    <Input id="taxaCartao" type="number" placeholder="2.5" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="taxaPix">Taxa PIX (%)</Label>
                    <Input id="taxaPix" type="number" placeholder="0.5" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>


          <TabsContent value="promocoes" className="space-y-4">
            <PromocoesList />
          </TabsContent>


          <TabsContent value="acessos" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Controle de Acesso por Módulo</CardTitle>
                <CardDescription>Configure permissões individuais para cada usuário e módulo do sistema</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="border rounded-lg p-4">
                    <h4 className="font-medium mb-4">Usuários e Permissões</h4>
                    <div className="space-y-4">
                      {barbeiros.map((barbeiro) => (
                        <div key={barbeiro.id} className="border rounded-lg p-4">
                           <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center space-x-3">
                              <Avatar className="w-10 h-10">
                                <AvatarImage 
                                  src={barbeiro.fotoPerfilUrl} 
                                  alt={barbeiro.nome} 
                                />
                                <AvatarFallback className="bg-primary/20 text-primary">
                                  {barbeiro.nome.charAt(0).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium">{barbeiro.nome}</p>
                                <p className="text-sm text-muted-foreground">
                                  {barbeiro.nivel === 'administrador' ? 'Administrador' : 
                                   barbeiro.nivel === 'colaborador' ? 'Colaborador' : 'Atendente'}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <span className="text-sm text-muted-foreground">Liberar Tudo</span>
                              <Switch
                                checked={false}
                                onCheckedChange={(checked) => toggleAllPermissions(barbeiro.id, checked)}
                              />
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setSelectedUserPermissions(
                                  selectedUserPermissions === barbeiro.id ? null : barbeiro.id
                                )}
                              >
                                {selectedUserPermissions === barbeiro.id ? 'Ocultar' : 'Configurar'}
                              </Button>
                            </div>
                          </div>
                          
                          {selectedUserPermissions === barbeiro.id && (
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-4 border-t">
                              {[
                                { key: 'clientes', label: 'Clientes', icon: Users },
                                { key: 'servicos', label: 'Serviços', icon: Scissors },
                                { key: 'produtos', label: 'Produtos', icon: Package },
                                { key: 'vendas', label: 'Vendas', icon: DollarSign },
                                { key: 'comissoes', label: 'Comissões', icon: Calculator },
                                { key: 'relatorios', label: 'Relatórios', icon: BarChart3 }
                              ].map((modulo) => {
                                const Icon = modulo.icon;
                                const hasPermission = getBarbeiroPermission(barbeiro.id, modulo.key);
                                const isRelatorios = modulo.key === 'relatorios';
                                const isExpanded = expandedRelatorios[barbeiro.id] || false;
                                
                                return (
                                  <div key={modulo.key} className="space-y-2">
                                    <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/20">
                                      <div className="flex items-center space-x-2">
                                        <Icon className="h-4 w-4 text-muted-foreground" />
                                        <span className="text-sm font-medium">{modulo.label}</span>
                                        {isRelatorios && hasPermission && (
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-6 w-6 p-0"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setExpandedRelatorios(prev => ({
                                                ...prev,
                                                [barbeiro.id]: !prev[barbeiro.id]
                                              }));
                                            }}
                                          >
                                            {isExpanded ? (
                                              <ChevronDown className="h-4 w-4" />
                                            ) : (
                                              <ChevronRight className="h-4 w-4" />
                                            )}
                                          </Button>
                                        )}
                                      </div>
                                      <Switch
                                        checked={hasPermission}
                                        onCheckedChange={(checked) => {
                                          togglePermissaoModulo(barbeiro.id, modulo.key, checked);
                                          // Se ativou Relatórios, ativar todas as sub-permissões por padrão
                                          if (isRelatorios && checked) {
                                            RELATORIOS_TABS.forEach(tab => {
                                              togglePermissaoModulo(barbeiro.id, `relatorios_${tab.key}`, true);
                                            });
                                            setExpandedRelatorios(prev => ({
                                              ...prev,
                                              [barbeiro.id]: true
                                            }));
                                          }
                                          // Se desativou Relatórios, desativar todas as sub-permissões
                                          if (isRelatorios && !checked) {
                                            RELATORIOS_TABS.forEach(tab => {
                                              togglePermissaoModulo(barbeiro.id, `relatorios_${tab.key}`, false);
                                            });
                                            setExpandedRelatorios(prev => ({
                                              ...prev,
                                              [barbeiro.id]: false
                                            }));
                                          }
                                        }}
                                      />
                                    </div>
                                    
                                    {/* Sub-permissões de Relatórios */}
                                    {isRelatorios && hasPermission && isExpanded && (
                                      <div className="ml-6 pl-4 border-l-2 border-primary/30 space-y-2">
                                        <p className="text-xs text-muted-foreground font-medium mb-2">
                                          Selecione as análises disponíveis:
                                        </p>
                                        <div className="grid grid-cols-2 gap-2">
                                          {RELATORIOS_TABS.map((tab) => {
                                            const subPermissionKey = `relatorios_${tab.key}`;
                                            const hasSubPermission = getBarbeiroPermission(barbeiro.id, subPermissionKey);
                                            
                                            return (
                                              <div 
                                                key={tab.key} 
                                                className="flex items-center space-x-2 p-2 rounded-md hover:bg-muted/40 transition-colors"
                                              >
                                                <Checkbox
                                                  id={`${barbeiro.id}-${tab.key}`}
                                                  checked={hasSubPermission}
                                                  onCheckedChange={(checked) => {
                                                    togglePermissaoModulo(barbeiro.id, subPermissionKey, Boolean(checked));
                                                  }}
                                                />
                                                <label 
                                                  htmlFor={`${barbeiro.id}-${tab.key}`}
                                                  className="text-sm cursor-pointer select-none"
                                                >
                                                  {tab.label}
                                                </label>
                                              </div>
                                            );
                                          })}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-muted/50 rounded-lg p-4">
                    <h4 className="font-medium mb-2">Informações sobre Permissões</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• <strong>Administradores:</strong> Por padrão têm acesso total, mas podem ter módulos específicos removidos</li>
                      <li>• <strong>Colaboradores:</strong> Acesso básico por padrão, permissões podem ser expandidas</li>
                      <li>• <strong>Atendentes:</strong> Acesso limitado por padrão, ideal para operações básicas</li>
                      <li>• Usuários só verão no menu lateral os módulos aos quais têm acesso</li>
                      <li>• Use "Liberar Tudo" para dar acesso completo rapidamente</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

        </Tabs>

        {/* Dialog de Comissões */}
        <Dialog open={comissaoDialogOpen} onOpenChange={setComissaoDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                Configurar Comissões - {selectedBarbeiro?.nome}
              </DialogTitle>
              <DialogDescription>
                Defina as comissões específicas por serviço e produto para este barbeiro
              </DialogDescription>
            </DialogHeader>

            <div className="rounded-md border border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-700/50 px-4 py-3 text-sm text-amber-900 dark:text-amber-200">
              <strong>⚠️ Atenção:</strong> Alterações no percentual de comissão valerão apenas para vendas <strong>futuras</strong>. O histórico de vendas anteriores permanece intacto com o percentual original do momento da venda.
            </div>

            <div className="space-y-6">
              {/* Seção de Serviços */}
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Comissões por Serviço
                </h3>
                <div className="space-y-3">
                  {servicosComComissao.map((servico) => (
                    <div key={servico.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <div className="font-medium">{servico.nome}</div>
                        <div className="text-sm text-muted-foreground">
                          Preço: R$ {servico.preco.toFixed(2)}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 w-48">
                        <Label htmlFor={`servico-${servico.id}`} className="text-sm">
                          Comissão (%)
                        </Label>
                        <Input
                          id={`servico-${servico.id}`}
                          type="number"
                          min="0"
                          max="100"
                          step="0.1"
                          value={servico.comissao}
                          onChange={(e) => atualizarComissaoServico(servico.id, parseFloat(e.target.value) || 0)}
                          className="w-20"
                        />
                      </div>
                      <div className="text-sm text-muted-foreground w-24 text-right">
                        = R$ {((servico.preco * servico.comissao) / 100).toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Seção de Produtos */}
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Comissões por Produto
                </h3>
                <div className="space-y-3">
                  {produtosComComissao.map((produto) => (
                    <div key={produto.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <div className="font-medium">{produto.nome}</div>
                        <div className="text-sm text-muted-foreground">
                          Preço: R$ {produto.precoVenda.toFixed(2)}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 w-48">
                        <Label htmlFor={`produto-${produto.id}`} className="text-sm">
                          Comissão (%)
                        </Label>
                        <Input
                          id={`produto-${produto.id}`}
                          type="number"
                          min="0"
                          max="100"
                          step="0.1"
                          value={produto.comissao}
                          onChange={(e) => atualizarComissaoProduto(produto.id, parseFloat(e.target.value) || 0)}
                          className="w-20"
                        />
                      </div>
                      <div className="text-sm text-muted-foreground w-24 text-right">
                        = R$ {((produto.precoVenda * produto.comissao) / 100).toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <DialogFooter className="mt-6">
              <Button variant="outline" onClick={() => setComissaoDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={salvarComissoes}>
                Salvar Comissões
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog de Edição de Barbeiro */}
        <Dialog open={editBarbeiroDialogOpen} onOpenChange={setEditBarbeiroDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Editar Barbeiro - {editingBarbeiro?.nome}</DialogTitle>
              <DialogDescription>
                Altere os dados do barbeiro, incluindo foto de perfil.
              </DialogDescription>
            </DialogHeader>
            
            {editingBarbeiro && (
              <div className="space-y-6">
                {/* Upload de Foto */}
                <div className="flex justify-center">
                  <PhotoUpload
                    currentPhotoUrl={editingBarbeiro.fotoPerfilUrl}
                    onPhotoUpload={(file) => handlePhotoUpload(file, editingBarbeiro.id)}
                    onPhotoRemove={() => handlePhotoRemove(editingBarbeiro.id, editingBarbeiro.fotoPerfilUrl)}
                    fallbackText={editingBarbeiro.nome.charAt(0).toUpperCase()}
                  />
                </div>
                
                <div className="grid gap-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="editNome">Nome Completo</Label>
                      <Input
                        id="editNome"
                        value={editingBarbeiro.nome}
                        onChange={(e) => setEditingBarbeiro({...editingBarbeiro, nome: e.target.value})}
                        placeholder="Nome do barbeiro"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="editEmail">E-mail</Label>
                      <Input
                        id="editEmail"
                        type="email"
                        value={editingBarbeiro.email || ''}
                        onChange={(e) => setEditingBarbeiro({...editingBarbeiro, email: e.target.value})}
                        placeholder="email@exemplo.com"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="editTelefone">Telefone</Label>
                    <Input
                      id="editTelefone"
                      value={editingBarbeiro.telefone || ''}
                      onChange={(e) => setEditingBarbeiro({...editingBarbeiro, telefone: e.target.value})}
                      placeholder="(11) 99999-9999"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="editComissaoServicos">Comissão Serviços (%)</Label>
                      <Input
                        id="editComissaoServicos"
                        type="number"
                        value={editingBarbeiro.comissaoServicos}
                        onChange={(e) => setEditingBarbeiro({...editingBarbeiro, comissaoServicos: Number(e.target.value)})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="editComissaoProdutos">Comissão Produtos (%)</Label>
                      <Input
                        id="editComissaoProdutos"
                        type="number"
                        value={editingBarbeiro.comissaoProdutos}
                        onChange={(e) => setEditingBarbeiro({...editingBarbeiro, comissaoProdutos: Number(e.target.value)})}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="editNivel">Nível de Acesso</Label>
                    <Select 
                      value={editingBarbeiro.nivel || 'colaborador'} 
                      onValueChange={(value) => setEditingBarbeiro({...editingBarbeiro, nivel: value as 'administrador' | 'colaborador'})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="colaborador">Colaborador</SelectItem>
                        <SelectItem value="administrador">Administrador</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditBarbeiroDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={salvarEdicaoBarbeiro}>
                Salvar Alterações
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </ResponsiveLayout>
  );
}