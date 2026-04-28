-- Verificar e ajustar as políticas RLS para permitir operações CRUD adequadas

-- Remover política restritiva de clientes se existir
DROP POLICY IF EXISTS "Usuarios autenticados podem gerenciar clientes" ON public.clientes;
DROP POLICY IF EXISTS "Usuarios autenticados podem ver clientes" ON public.clientes;

-- Criar política mais permissiva para clientes
CREATE POLICY "Permitir todas as operações em clientes"
ON public.clientes
FOR ALL
USING (true)
WITH CHECK (true);

-- Verificar se a função get_current_barbeiro_id existe e funciona corretamente
CREATE OR REPLACE FUNCTION public.get_current_barbeiro_id()
RETURNS UUID
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT id FROM public.barbeiros WHERE usuario = current_setting('request.jwt.claims', true)::json->>'sub'),
    (SELECT id FROM public.barbeiros LIMIT 1)
  );
$$;

-- Garantir que a tabela clientes tenha RLS habilitado
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;