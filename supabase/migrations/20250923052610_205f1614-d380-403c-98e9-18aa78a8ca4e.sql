-- Create security definer functions to get current user info without RLS recursion
CREATE OR REPLACE FUNCTION public.get_current_barbeiro_id()
RETURNS UUID AS $$
DECLARE
  barbeiro_id UUID;
BEGIN
  -- Get the barbeiro_id from session storage/context
  -- This will be set by the application when user logs in
  SELECT current_setting('app.current_barbeiro_id', true)::UUID INTO barbeiro_id;
  RETURN barbeiro_id;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.get_current_barbeiro_role()
RETURNS TEXT AS $$
DECLARE
  user_nivel TEXT;
  is_owner BOOLEAN;
BEGIN
  SELECT nivel, is_proprietario 
  INTO user_nivel, is_owner
  FROM public.barbeiros 
  WHERE id = public.get_current_barbeiro_id();
  
  IF is_owner THEN
    RETURN 'proprietario';
  ELSE
    RETURN COALESCE(user_nivel, 'colaborador');
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RETURN 'colaborador';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Drop existing permissive policies and create secure ones
DROP POLICY IF EXISTS "Permitir todas as operações em vendas" ON public.vendas;

-- Vendas policies: Owners and admins see all, barbers see only their sales
CREATE POLICY "Proprietarios e admins podem ver todas as vendas"
ON public.vendas FOR SELECT
USING (public.get_current_barbeiro_role() IN ('proprietario', 'administrador'));

CREATE POLICY "Barbeiros podem ver suas próprias vendas"
ON public.vendas FOR SELECT
USING (
  public.get_current_barbeiro_role() = 'colaborador' 
  AND barbeiro_id = public.get_current_barbeiro_id()
);

CREATE POLICY "Proprietarios e admins podem inserir vendas"
ON public.vendas FOR INSERT
WITH CHECK (public.get_current_barbeiro_role() IN ('proprietario', 'administrador', 'colaborador'));

CREATE POLICY "Proprietarios e admins podem atualizar todas as vendas"
ON public.vendas FOR UPDATE
USING (public.get_current_barbeiro_role() IN ('proprietario', 'administrador'));

CREATE POLICY "Barbeiros podem atualizar suas próprias vendas"
ON public.vendas FOR UPDATE
USING (
  public.get_current_barbeiro_role() = 'colaborador' 
  AND barbeiro_id = public.get_current_barbeiro_id()
);

CREATE POLICY "Proprietarios e admins podem deletar vendas"
ON public.vendas FOR DELETE
USING (public.get_current_barbeiro_role() IN ('proprietario', 'administrador'));

-- Itens venda policies
DROP POLICY IF EXISTS "Permitir todas as operações em itens_venda" ON public.itens_venda;

CREATE POLICY "Proprietarios e admins podem ver todos os itens de venda"
ON public.itens_venda FOR SELECT
USING (public.get_current_barbeiro_role() IN ('proprietario', 'administrador'));

CREATE POLICY "Barbeiros podem ver itens de suas próprias vendas"
ON public.itens_venda FOR SELECT
USING (
  public.get_current_barbeiro_role() = 'colaborador' 
  AND EXISTS (
    SELECT 1 FROM public.vendas v 
    WHERE v.id = venda_id 
    AND v.barbeiro_id = public.get_current_barbeiro_id()
  )
);

CREATE POLICY "Usuarios autenticados podem inserir itens de venda"
ON public.itens_venda FOR INSERT
WITH CHECK (public.get_current_barbeiro_id() IS NOT NULL);

CREATE POLICY "Proprietarios e admins podem atualizar itens de venda"
ON public.itens_venda FOR UPDATE
USING (public.get_current_barbeiro_role() IN ('proprietario', 'administrador'));

CREATE POLICY "Proprietarios e admins podem deletar itens de venda"
ON public.itens_venda FOR DELETE
USING (public.get_current_barbeiro_role() IN ('proprietario', 'administrador'));

-- Update comissoes_historico policies
DROP POLICY IF EXISTS "Users can view commission history" ON public.comissoes_historico;
DROP POLICY IF EXISTS "Users can insert commission history" ON public.comissoes_historico;

CREATE POLICY "Proprietarios e admins podem ver todo histórico de comissões"
ON public.comissoes_historico FOR SELECT
USING (public.get_current_barbeiro_role() IN ('proprietario', 'administrador'));

CREATE POLICY "Barbeiros podem ver suas próprias comissões"
ON public.comissoes_historico FOR SELECT
USING (
  public.get_current_barbeiro_role() = 'colaborador' 
  AND barbeiro_id = public.get_current_barbeiro_id()
);

CREATE POLICY "Sistema pode inserir histórico de comissões"
ON public.comissoes_historico FOR INSERT
WITH CHECK (true); -- This is automated by triggers

-- Secure other sensitive tables
DROP POLICY IF EXISTS "Permitir todas as operações em clientes" ON public.clientes;

CREATE POLICY "Usuarios autenticados podem ver clientes"
ON public.clientes FOR SELECT
USING (public.get_current_barbeiro_id() IS NOT NULL);

CREATE POLICY "Usuarios autenticados podem gerenciar clientes"
ON public.clientes FOR ALL
USING (public.get_current_barbeiro_id() IS NOT NULL)
WITH CHECK (public.get_current_barbeiro_id() IS NOT NULL);

-- Keep other tables with authenticated user access
DROP POLICY IF EXISTS "Permitir todas as operações em servicos" ON public.servicos;
CREATE POLICY "Usuarios autenticados podem gerenciar servicos"
ON public.servicos FOR ALL
USING (public.get_current_barbeiro_id() IS NOT NULL)
WITH CHECK (public.get_current_barbeiro_id() IS NOT NULL);

DROP POLICY IF EXISTS "Permitir todas as operações em produtos" ON public.produtos;
CREATE POLICY "Usuarios autenticados podem gerenciar produtos"
ON public.produtos FOR ALL
USING (public.get_current_barbeiro_id() IS NOT NULL)
WITH CHECK (public.get_current_barbeiro_id() IS NOT NULL);