-- Remover políticas existentes da tabela barbeiros
DROP POLICY IF EXISTS "Barbeiros podem ver seus próprios dados" ON public.barbeiros;
DROP POLICY IF EXISTS "Administradores podem ver todos os barbeiros" ON public.barbeiros;
DROP POLICY IF EXISTS "Administradores podem inserir barbeiros" ON public.barbeiros;
DROP POLICY IF EXISTS "Administradores podem atualizar barbeiros" ON public.barbeiros;
DROP POLICY IF EXISTS "Barbeiros podem atualizar seus próprios dados" ON public.barbeiros;
DROP POLICY IF EXISTS "Administradores podem deletar barbeiros" ON public.barbeiros;

-- Criar política pública para login (SELECT sem autenticação)
CREATE POLICY "Login público permitido" 
ON public.barbeiros 
FOR SELECT 
TO anon, authenticated
USING (true);

-- Políticas para operações autenticadas
CREATE POLICY "Usuários autenticados podem ver todos os barbeiros" 
ON public.barbeiros 
FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Apenas administradores podem inserir barbeiros" 
ON public.barbeiros 
FOR INSERT 
TO authenticated
WITH CHECK (is_admin());

CREATE POLICY "Apenas administradores podem atualizar barbeiros" 
ON public.barbeiros 
FOR UPDATE 
TO authenticated
USING (is_admin());

CREATE POLICY "Apenas administradores podem deletar barbeiros" 
ON public.barbeiros 
FOR DELETE 
TO authenticated
USING (is_admin());