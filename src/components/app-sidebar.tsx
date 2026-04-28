import { NavLink, useLocation } from "react-router-dom";
import { DollarSign, Users, Scissors, ShoppingBag, Calculator, BarChart3, Settings, LogOut, Wallet, Boxes } from "lucide-react";
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader, SidebarFooter, useSidebar } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { useUserPermissions } from "@/hooks/useUserPermissions";
const menuItems = [{
  icon: DollarSign,
  label: 'Vendas',
  path: '/',
  badge: null
}, {
  icon: Users,
  label: 'Clientes',
  path: '/clientes',
  badge: null
}, {
  icon: Scissors,
  label: 'Serviços',
  path: '/servicos',
  badge: null
}, {
  icon: ShoppingBag,
  label: 'Produtos',
  path: '/produtos',
  badge: 'Estoque'
}, {
  icon: Boxes,
  label: 'Insumos',
  path: '/insumos',
  badge: 'Almoxarifado'
}, {
  icon: Calculator,
  label: 'Comissões',
  path: '/comissoes',
  badge: null
}, {
  icon: BarChart3,
  label: 'Relatórios',
  path: '/relatorios',
  badge: 'Analytics'
}, {
  icon: Wallet,
  label: 'Despesas',
  path: '/despesas',
  badge: 'Financeiro'
}, {
  icon: Settings,
  label: 'Configurações',
  path: '/configuracoes',
  badge: null
}];
export function AppSidebar() {
  const {
    state
  } = useSidebar();
  const location = useLocation();
  const {
    usuario,
    logout
  } = useSupabaseAuth();
  const {
    hasCurrentUserPermission
  } = useUserPermissions();
  const collapsed = state === "collapsed";

  // Map paths to module names for permission checking
  const getModuleFromPath = (path: string): string | null => {
    switch (path) {
      case '/':
        return 'vendas';
      case '/clientes':
        return 'clientes';
      case '/servicos':
        return 'servicos';
      case '/produtos':
        return 'produtos';
      case '/insumos':
        return 'insumos';
      case '/comissoes':
        return 'comissoes';
      case '/relatorios':
        return 'relatorios';
      case '/despesas':
        return 'despesas';
      case '/configuracoes':
        return 'configuracoes';
      default:
        return null;
    }
  };

  // Filter menu items based on user permissions
  const getVisibleMenuItems = () => {
    if (!usuario) return [];
    return menuItems.filter(item => {
      const module = getModuleFromPath(item.path);
      if (!module) return false;

      // Special case: configuracoes is only for administrators
      if (module === 'configuracoes') {
        return usuario.tipo === 'administrador';
      }

      // Check permissions for other modules
      return hasCurrentUserPermission(module);
    });
  };
  const visibleMenuItems = getVisibleMenuItems();
  const isActive = (path: string) => location.pathname === path;
  const handleLogout = () => {
    logout();
  };
  return <Sidebar className="border-r-0 gradient-sidebar">
      {/* Header com Branding Elite */}
      <SidebarHeader className="border-b border-white/10">
        <div className="flex items-center gap-3 px-2 py-3">
          {/* Logo Elite Sistemas */}
          
          {!collapsed && <div className="flex flex-col min-w-0">
              <h2 className="text-lg font-bold leading-none text-white">Elite Gestão</h2>
              <p className="text-xs text-white/70 truncate font-medium">
                Nome e logo da sua Empresa
              </p>
            </div>}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-white/60 uppercase text-[10px] tracking-wider font-semibold">
            Menu Principal
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleMenuItems.map(item => <SidebarMenuItem key={item.path}>
                  <SidebarMenuButton asChild isActive={isActive(item.path)} className={`
                      text-white/80 hover:text-white hover:bg-white/10 
                      data-[active=true]:bg-white/15 data-[active=true]:text-white 
                      data-[active=true]:border-l-2 data-[active=true]:border-white
                      data-[active=true]:font-semibold
                      transition-all duration-200
                    `}>
                    <NavLink to={item.path} className="flex items-center gap-3">
                      <item.icon className="h-5 w-5 flex-shrink-0" />
                      {!collapsed && <>
                          <span className="flex-1">{item.label}</span>
                          {item.badge && <Badge variant="secondary" className="text-[10px] bg-white/20 text-white border-0 px-1.5 py-0">
                              {item.badge}
                            </Badge>}
                        </>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-white/10">
        {/* User Info */}
        <div className="flex items-center gap-3 px-2 py-3">
          <div className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center flex-shrink-0 border border-white/20">
            <span className="text-sm font-medium text-white">
              {usuario?.nome?.charAt(0).toUpperCase()}
            </span>
          </div>
          {!collapsed && <div className="flex flex-col min-w-0 flex-1">
              <p className="text-sm font-medium text-white truncate">
                {usuario?.nome}
              </p>
              <p className="text-xs text-white/60">
                {usuario?.tipo === 'administrador' ? 'Administrador' : 'Colaborador'}
              </p>
            </div>}
        </div>

        {/* Elite Sistemas Mini Logo */}
        {!collapsed}

        {/* Logout Button */}
        <div className="px-2 pb-2">
          <Button variant="ghost" size={collapsed ? "icon" : "sm"} onClick={handleLogout} className="w-full justify-start gap-3 text-white/70 hover:text-white hover:bg-white/10">
            <LogOut className="h-4 w-4" />
            {!collapsed && <span>Sair do Sistema</span>}
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>;
}