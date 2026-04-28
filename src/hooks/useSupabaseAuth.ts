import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { UsuarioLogado } from '@/types';

export const useSupabaseAuth = () => {
  const [usuario, setUsuario] = useState<UsuarioLogado | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Gerar ID único para esta sessão/navegador
  const generateSessionId = () => {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
  };

  useEffect(() => {
    const initAuth = async () => {
      console.log('🔄 useSupabaseAuth inicializando');
      
      // Verificar se há usuário logado no sessionStorage (só persiste na aba atual)
      const usuarioSalvo = sessionStorage.getItem('barbearia_usuario_logado');
      const sessionId = sessionStorage.getItem('barbearia_session_id');
      const currentTabId = sessionStorage.getItem('barbearia_tab_id');
      
      // Se não há ID da aba atual, criar um novo (indica nova aba/navegador)
      if (!currentTabId) {
        console.log('🔐 Nova sessão detectada - limpando autenticação');
        sessionStorage.removeItem('barbearia_usuario_logado');
        sessionStorage.removeItem('barbearia_session_id');
        sessionStorage.setItem('barbearia_tab_id', generateSessionId());
        setIsLoading(false);
        return;
      }
      
      if (usuarioSalvo && sessionId) {
        try {
          const userParsed = JSON.parse(usuarioSalvo);
          console.log('👤 Usuário salvo encontrado na sessão atual:', userParsed);
          setUsuario(userParsed);
          
          // Set the current barbeiro ID in Postgres for RLS policies
          try {
            await supabase.rpc('set_current_barbeiro_id' as any, {
              barbeiro_id: userParsed.barbeiroId
            });
          } catch (error) {
            console.error('Erro ao configurar ID do barbeiro para RLS:', error);
          }
          
          // Recarregar dados do usuário do banco para sincronizar foto
          refreshUserData(userParsed.barbeiroId);
        } catch (error) {
          console.error('Erro ao carregar usuário salvo:', error);
          // Limpar dados corrompidos
          sessionStorage.removeItem('barbearia_usuario_logado');
          sessionStorage.removeItem('barbearia_session_id');
        }
      }
      setIsLoading(false);
    };
    
    initAuth();
  }, []);

  const refreshUserData = async (barbeiroId: string) => {
    try {
      console.log('🔄 Recarregando dados do usuário:', barbeiroId);
      const { data: barbeiro, error } = await supabase
        .from('barbeiros')
        .select('*')
        .eq('id', barbeiroId)
        .single();

      if (error || !barbeiro) {
        console.error('❌ Erro ao buscar dados do barbeiro:', error);
        return;
      }

      console.log('✅ Dados atualizados do barbeiro:', barbeiro);

      const usuarioAtualizado: UsuarioLogado = {
        id: barbeiro.id,
        nome: barbeiro.nome,
        tipo: barbeiro.nivel as 'administrador' | 'colaborador',
        barbeiroId: barbeiro.id,
        isProprietario: barbeiro.is_proprietario,
        fotoPerfilUrl: barbeiro.foto_perfil_url
      };

      console.log('📸 Nova foto URL:', barbeiro.foto_perfil_url);
      sessionStorage.setItem('barbearia_usuario_logado', JSON.stringify(usuarioAtualizado));
      setUsuario(usuarioAtualizado);
    } catch (error) {
      console.error('Erro ao recarregar dados do usuário:', error);
    }
  };

  const login = async (usuarioInput: string, senhaInput: string): Promise<{ success: boolean; error?: string }> => {
    try {
      // Limpar possíveis estados antigos de autenticação para evitar limbo
      try {
        Object.keys(localStorage).forEach((key) => {
          if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
            localStorage.removeItem(key);
          }
        });
        Object.keys(sessionStorage || {}).forEach((key) => {
          if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
            sessionStorage.removeItem(key);
          }
        });
        // Best-effort sign out global
        await supabase.auth.signOut({ scope: 'global' });
      } catch {}

      const usuario = usuarioInput.trim();
      const senha = senhaInput.trim();

      // Buscar barbeiro no Supabase (usuario case-insensitive)
      const { data: barbeiro, error } = await supabase
        .from('barbeiros')
        .select('*')
        .ilike('usuario', usuario)
        .eq('ativo', true)
        .maybeSingle();

      if (error || !barbeiro) {
        return { success: false, error: 'Usuário ou senha incorretos' };
      }

      // Verificar a senha - usar hash se disponível, senão usar senha plain text (para compatibilidade)
      let senhaValida = false;
      
      if (barbeiro.senha_hash) {
        // Usar verificação com hash
        const { data: verificacao, error: verifyError } = await supabase.rpc('verify_password', {
          password_text: senha,
          password_hash: barbeiro.senha_hash
        });
        
        if (verifyError) {
          console.error('Erro na verificação de senha:', verifyError);
          return { success: false, error: 'Erro interno do servidor' };
        }
        
        senhaValida = verificacao;
      } else {
        // Fallback para senha plain text (compatibilidade com dados antigos)
        senhaValida = barbeiro.senha === senha;
        
        // Se login for válido com senha plain text, migrar para hash
        if (senhaValida) {
          try {
            const { data: hashedPassword, error: hashError } = await supabase.rpc('hash_password', {
              password_text: senha
            });
            
            if (!hashError && hashedPassword) {
              await supabase
                .from('barbeiros')
                .update({ senha_hash: hashedPassword })
                .eq('id', barbeiro.id);
              console.log('Senha migrada para hash com sucesso');
            }
          } catch (migrationError) {
            console.warn('Erro ao migrar senha para hash:', migrationError);
          }
        }
      }

      if (!senhaValida) {
        return { success: false, error: 'Usuário ou senha incorretos' };
      }

      const usuarioLogado: UsuarioLogado = {
        id: barbeiro.id,
        nome: barbeiro.nome,
        tipo: barbeiro.nivel as 'administrador' | 'colaborador',
        barbeiroId: barbeiro.id,
        isProprietario: barbeiro.is_proprietario,
        fotoPerfilUrl: barbeiro.foto_perfil_url
      };

      // Criar nova sessão segura
      const sessionId = generateSessionId();
      const tabId = sessionStorage.getItem('barbearia_tab_id') || generateSessionId();
      
      sessionStorage.setItem('barbearia_usuario_logado', JSON.stringify(usuarioLogado));
      sessionStorage.setItem('barbearia_session_id', sessionId);
      sessionStorage.setItem('barbearia_tab_id', tabId);
      
      setUsuario(usuarioLogado);

      // Set the current barbeiro ID in Postgres for RLS policies
      try {
        await supabase.rpc('set_current_barbeiro_id' as any, {
          barbeiro_id: barbeiro.id
        });
      } catch (error) {
        console.error('Erro ao configurar ID do barbeiro para RLS:', error);
      }

      return { success: true };
    } catch (error) {
      console.error('Erro no login:', error);
      return { success: false, error: 'Erro interno. Tente novamente.' };
    }
  };

  const logout = async () => {
    try {
      // Primeiro fazer logout no Supabase Auth
      await supabase.auth.signOut({ scope: 'global' });
      
      // Limpar sessionStorage personalizado
      sessionStorage.removeItem('barbearia_usuario_logado');
      sessionStorage.removeItem('barbearia_session_id');
      sessionStorage.removeItem('barbearia_tab_id');
      
      // Limpar chaves de autenticação do Supabase em ambos os storages
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
          localStorage.removeItem(key);
        }
      });
      Object.keys(sessionStorage || {}).forEach((key) => {
        if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
          sessionStorage.removeItem(key);
        }
      });
      
      // Limpar o state
      setUsuario(null);
      
      // Redirecionar para login
      window.location.href = '/login';
    } catch (error) {
      console.error('Erro no logout:', error);
      // Mesmo com erro, limpar dados locais
      sessionStorage.removeItem('barbearia_usuario_logado');
      sessionStorage.removeItem('barbearia_session_id');
      sessionStorage.removeItem('barbearia_tab_id');
      setUsuario(null);
      window.location.href = '/login';
    }
  };

  const hasPermission = useCallback((rota: string): boolean => {
    if (!usuario) return false;
    
    if (usuario.tipo === 'administrador') return true;
    
    // Para colaboradores, permitir todas as rotas - o controle específico é feito pelas permissões de módulo
    const rotasPermitidas = ['/', '/vendas', '/relatorios', '/clientes', '/comissoes', '/servicos', '/produtos'];
    return rotasPermitidas.includes(rota);
  }, [usuario]);

  const canViewAllData = useCallback((): boolean => {
    return usuario?.tipo === 'administrador' || false;
  }, [usuario]);

  const getCurrentUserId = useCallback((): string => {
    return usuario?.barbeiroId || '';
  }, [usuario]);

  const getCurrentUserName = useCallback((): string => {
    return usuario?.nome || '';
  }, [usuario]);

  const isProprietario = useCallback((): boolean => {
    return usuario?.isProprietario || false;
  }, [usuario]);

  const updateUserPhoto = useCallback(async (photoUrl: string | null): Promise<void> => {
    if (!usuario) return;
    
    try {
      console.log('🔄 Atualizando foto do usuário no auth hook...', photoUrl);
      
      // Atualizar no banco de dados
      const { error } = await supabase
        .from('barbeiros')
        .update({ foto_perfil_url: photoUrl })
        .eq('id', usuario.barbeiroId);

      if (error) {
        throw error;
      }

      // Atualizar estado local e sessionStorage imediatamente
      const usuarioAtualizado = { ...usuario, fotoPerfilUrl: photoUrl };
      sessionStorage.setItem('barbearia_usuario_logado', JSON.stringify(usuarioAtualizado));
      setUsuario(usuarioAtualizado);
      
      console.log('✅ Foto do usuário atualizada com sucesso');
    } catch (error) {
      console.error('Erro ao atualizar foto do usuário:', error);
      throw error;
    }
  }, [usuario]);

  const forceRefreshUserData = useCallback(async (): Promise<void> => {
    if (!usuario?.barbeiroId) return;
    console.log('🔄 Forçando atualização dos dados do usuário...');
    await refreshUserData(usuario.barbeiroId);
  }, [usuario?.barbeiroId, refreshUserData]);

  const changePassword = async (currentPassword: string, newPassword: string): Promise<{ success: boolean; error?: string }> => {
    if (!usuario?.id) {
      return { success: false, error: 'Usuário não encontrado' };
    }

    try {
      const { data, error } = await supabase.rpc('change_barbeiro_password', {
        barbeiro_id: usuario.id,
        current_password: currentPassword,
        new_password: newPassword
      });

      if (error) {
        console.error('Erro ao alterar senha:', error);
        return { success: false, error: 'Erro interno do servidor' };
      }

      const result = data as { success: boolean; error?: string; message?: string };
      
      if (result.success) {
        return { success: true };
      } else {
        return { success: false, error: result.error || 'Erro ao alterar senha' };
      }
    } catch (error) {
      console.error('Erro ao alterar senha:', error);
      return { success: false, error: 'Erro interno do servidor' };
    }
  };

  return {
    usuario,
    isLoading,
    login,
    logout,
    hasPermission,
    canViewAllData,
    getCurrentUserId,
    getCurrentUserName,
    isProprietario,
    updateUserPhoto,
    refreshUserData,
    forceRefreshUserData,
    changePassword
  };
};