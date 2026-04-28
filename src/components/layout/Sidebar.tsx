import { useState, useEffect } from 'react';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { Link, useLocation } from 'react-router-dom';
import { 
  Building2,
  Users, 
  Scissors, 
  ShoppingBag, 
  DollarSign, 
  BarChart3, 
  Settings,
  LogOut,
  Menu,
  X,
  Calculator,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const menuItems = [
  { icon: DollarSign, label: 'Vendas', path: '/vendas', badge: null },
  { icon: Users, label: 'Clientes', path: '/', badge: null },
  { icon: Scissors, label: 'Serviços', path: '/servicos', badge: null },
  { icon: ShoppingBag, label: 'Produtos', path: '/produtos', badge: 'Estoque' },
  { icon: Calculator, label: 'Comissões', path: '/comissoes', badge: null },
  { icon: BarChart3, label: 'Relatórios', path: '/relatorios', badge: 'Analytics' },
  { icon: Settings, label: 'Configurações', path: '/configuracoes', badge: null },
];

export const Sidebar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const location = useLocation();
  const { usuario, hasPermission, logout } = useSupabaseAuth();
  const { hasCurrentUserPermission, loading: permissionsLoading, permissions } = useUserPermissions();

  // LOG CRÍTICO - FORÇA EXIBIÇÃO MESMO COM CACHE
  console.log('🚀🚀🚀 SIDEBAR RENDERIZOU - TIMESTAMP:', new Date().toISOString());
  console.log('🚀🚀🚀 USUARIO ATUAL:', usuario);
  console.log('🚀🚀🚀 PERMISSIONS LOADING:', permissionsLoading);
  console.log('🚀🚀🚀 PERMISSIONS:', permissions);

  // Log para debug das permissões
  useEffect(() => {
    console.log('🚀 SIDEBAR - Componente renderizado');
    console.log(`👤 SIDEBAR - Usuario: ${usuario?.nome || 'NENHUM'} (ID: ${usuario?.id || 'NENHUM'})`);
    console.log(`⏳ SIDEBAR - Loading permissões: ${permissionsLoading}`);
    console.log(`📋 SIDEBAR - Objeto permissions:`, permissions);
    
    if (usuario && !permissionsLoading) {
      console.log('🔍 SIDEBAR - Verificando permissões de todos os módulos:');
      menuItems.forEach(item => {
        console.log(`📍 SIDEBAR - Processando item: ${item.label} (${item.path})`);
        const hasModulePerm = hasModulePermission(item.path);
        console.log(`  📄 SIDEBAR - ${item.label} (${item.path}): ${hasModulePerm ? '✅ SERÁ EXIBIDO' : '❌ SERÁ OCULTADO'}`);
      });
    }
  }, [usuario, permissionsLoading, permissions]);

  const handleLogout = () => {
    logout(); // O logout já gerencia o redirecionamento
  };

  const toggleSidebar = () => setIsOpen(!isOpen);
  const toggleCollapse = () => setIsCollapsed(!isCollapsed);

  // Função para verificar permissão específica de módulo
  const hasModulePermission = (modulePath: string): boolean => {
    console.log(`🔍 SIDEBAR hasModulePermission - Verificando: ${modulePath}`);
    
    if (!usuario) {
      console.log('❌ SIDEBAR hasModulePermission - Sem usuário logado');
      return false;
    }
    
    console.log(`🔍 SIDEBAR hasModulePermission - Usuario: ${usuario.nome} (${usuario.tipo})`);
    
    // Configurações só para administradores
    if (modulePath === '/configuracoes') {
      const isAdmin = usuario.tipo === 'administrador';
      console.log(`🔧 SIDEBAR hasModulePermission - Configurações - Admin: ${isAdmin}`);
      return isAdmin;
    }
    
    // Mapear paths para chaves de módulo
    const pathMap: { [key: string]: string } = {
      '/': 'clientes',
      '/servicos': 'servicos', 
      '/produtos': 'produtos',
      '/vendas': 'vendas',
      '/comissoes': 'comissoes',
      '/relatorios': 'relatorios'
    };
    
    const moduleKey = pathMap[modulePath];
    console.log(`🗺️ SIDEBAR hasModulePermission - Path ${modulePath} mapeado para: ${moduleKey}`);
    
    if (!moduleKey) {
      console.log(`❌ SIDEBAR hasModulePermission - Módulo não mapeado: ${modulePath}`);
      return false;
    }
    
    // Se as permissões ainda estão carregando, negar acesso
    if (permissionsLoading) {
      console.log(`⏳ SIDEBAR hasModulePermission - Permissões carregando para ${moduleKey}`);
      return false;
    }
    
    // Verificar permissão específica - usando diretamente a função que tem logs críticos
    const hasPermissionForModule = hasCurrentUserPermission(moduleKey);
    
    console.log(`🎯 SIDEBAR hasModulePermission - RESULTADO FINAL ${moduleKey} para usuário ${usuario.nome}: ${hasPermissionForModule ? '✅ PERMITIDO' : '❌ NEGADO'}`);
    
    return hasPermissionForModule;
  };

  return (
    <>
      {/* Mobile menu button */}
      <Button
        variant="outline"
        size="icon"
        className="fixed top-4 left-4 z-50 md:hidden glass-effect shadow-lg"
        onClick={toggleSidebar}
      >
        {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>

      {/* Overlay for mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden animate-fade-in"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed left-0 top-0 h-full z-40 glass-effect border-r shadow-xl
        transition-all duration-300 ease-in-out
        ${isCollapsed ? 'w-16' : 'w-72'}
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        md:translate-x-0 md:static md:z-auto
      `}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className={`p-6 border-b border-border/50 ${isCollapsed ? 'px-4' : ''}`}>
            <div className="flex items-center justify-between">
              {!isCollapsed && (
                <div className="flex items-center space-x-3 animate-fade-in">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg">
                    <Building2 className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-lg font-bold text-foreground">ERP Barbearia</h1>
                    <p className="text-xs text-muted-foreground">Igor Queiroz</p>
                  </div>
                </div>
              )}
              
              {/* Collapse button - only on desktop */}
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleCollapse}
                className={`hidden md:flex h-8 w-8 ${isCollapsed ? 'mx-auto' : ''}`}
              >
                {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {/* User info */}
          {!isCollapsed && (
            <div className="p-4 border-b border-border/50 animate-fade-in">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                  <span className="text-sm font-semibold text-primary">
                    {usuario?.nome.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{usuario?.nome}</p>
                  <p className="text-xs text-muted-foreground flex items-center">
                    <div className="w-2 h-2 bg-success rounded-full mr-2" />
                    {usuario?.tipo === 'administrador' ? 'Administrador' : 'Colaborador'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto custom-scrollbar">
            <div className={`space-y-1 ${isCollapsed ? 'space-y-2' : ''}`}>
              {menuItems.map((item, index) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                
                // Verificar apenas permissão específica do módulo (sem verificação básica)
                if (!hasModulePermission(item.path)) {
                  return null;
                }
                
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setIsOpen(false)}
                    className={`
                      group flex items-center rounded-xl transition-all duration-200
                      ${isCollapsed ? 'p-3 justify-center' : 'px-4 py-3 space-x-3'}
                      ${isActive 
                        ? 'bg-gradient-to-r from-primary to-accent text-white shadow-lg' 
                        : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
                      }
                    `}
                    style={{ animationDelay: `${index * 0.05}s` }}
                  >
                    <Icon className={`flex-shrink-0 transition-transform group-hover:scale-110 ${isCollapsed ? 'h-5 w-5' : 'h-5 w-5'}`} />
                    
                    {!isCollapsed && (
                      <>
                        <span className="font-medium flex-1">{item.label}</span>
                        {item.badge && (
                          <Badge variant="secondary" className="text-xs">
                            {item.badge}
                          </Badge>
                        )}
                      </>
                    )}
                  </Link>
                );
              })}
            </div>
          </nav>

          {/* Logout */}
          <div className={`p-4 border-t border-border/50 ${isCollapsed ? 'px-2' : ''}`}>
            <Button
              variant="ghost"
              onClick={handleLogout}
              className={`
                w-full text-muted-foreground hover:text-destructive hover:bg-destructive/10
                transition-colors duration-200
                ${isCollapsed ? 'px-3 py-3' : 'justify-start px-4 py-3'}
              `}
            >
              <LogOut className={`flex-shrink-0 ${isCollapsed ? 'h-5 w-5' : 'h-5 w-5 mr-3'}`} />
              {!isCollapsed && <span>Sair do Sistema</span>}
            </Button>
          </div>
        </div>
      </aside>
    </>
  );
};