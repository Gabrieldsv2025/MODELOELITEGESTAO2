-- Criar tabela de permissões de usuários
CREATE TABLE public.user_permissions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES barbeiros(id) ON DELETE CASCADE,
  module_name text NOT NULL,
  has_access boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, module_name)
);

-- Habilitar RLS
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso
CREATE POLICY "Todos podem ver permissões" 
ON public.user_permissions 
FOR SELECT 
USING (true);

CREATE POLICY "Apenas administradores podem modificar permissões" 
ON public.user_permissions 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM barbeiros 
    WHERE id = auth.uid() 
    AND nivel = 'administrador'
  )
);

-- Função para atualizar timestamp
CREATE TRIGGER update_user_permissions_updated_at
BEFORE UPDATE ON public.user_permissions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();