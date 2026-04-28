import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';

interface ProtectedModuleRouteProps {
  children: ReactNode;
  module: string;
}

export const ProtectedModuleRoute = ({ children, module }: ProtectedModuleRouteProps) => {
  const { usuario, isLoading } = useSupabaseAuth();
  const { hasCurrentUserPermission, loading: permissionsLoading } = useUserPermissions();
  
  // Show loading while checking auth or permissions
  if (isLoading || permissionsLoading) {
    return <div className="flex items-center justify-center h-screen">Carregando...</div>;
  }
  
  // Redirect to login if not authenticated
  if (!usuario) {
    return <Navigate to="/login" replace />;
  }
  
  // Special case: configuracoes is only for administrators
  if (module === 'configuracoes' && usuario.tipo !== 'administrador') {
    return <Navigate to="/" replace />;
  }
  
  // Check module permission for other modules
  if (module !== 'configuracoes' && !hasCurrentUserPermission(module)) {
    return <Navigate to="/" replace />;
  }
  
  return <>{children}</>;
};