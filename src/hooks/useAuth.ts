import { useEffect, useState } from 'react';
import { authStorage } from '@/utils/localStorage';
import { UsuarioLogado } from '@/types';

export const useAuth = () => {
  const [usuario, setUsuario] = useState<UsuarioLogado | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const usuarioLogado = authStorage.getUsuarioLogado();
    setUsuario(usuarioLogado);
    setIsLoading(false);
  }, []);

  const hasPermission = (rota: string): boolean => {
    if (!usuario) return false;
    
    // Administrador tem acesso a tudo
    if (usuario.tipo === 'administrador') return true;
    
    // Colaborador tem acesso limitado
    const rotasPermitidas = ['/', '/vendas', '/relatorios', '/clientes'];
    return rotasPermitidas.includes(rota);
  };

  const canViewAllData = (): boolean => {
    return usuario?.tipo === 'administrador' || false;
  };

  const getCurrentUserId = (): string => {
    return usuario?.barbeiroId || '';
  };

  const getCurrentUserName = (): string => {
    return usuario?.nome || '';
  };

  const isProprietario = (): boolean => {
    return usuario?.isProprietario || false;
  };

  const filterDataByUser = <T extends { barbeiroId?: string }>(data: T[]): T[] => {
    if (canViewAllData()) return data;
    return data.filter(item => item.barbeiroId === getCurrentUserId());
  };

  return {
    usuario,
    isLoading,
    hasPermission,
    canViewAllData,
    getCurrentUserId,
    getCurrentUserName,
    isProprietario,
    filterDataByUser
  };
};