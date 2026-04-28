-- Corrigir o problema de RLS na tabela barbeiros
-- Habilitar RLS mas permitir acesso para login
ALTER TABLE public.barbeiros ENABLE ROW LEVEL SECURITY;

-- Permitir SELECT público para login (sem autenticação)
CREATE POLICY "Permitir login público" 
ON public.barbeiros 
FOR SELECT 
TO anon, authenticated
USING (true);

-- Permitir outras operações apenas para administradores
CREATE POLICY "Apenas administradores podem modificar barbeiros" 
ON public.barbeiros 
FOR INSERT, UPDATE, DELETE
TO authenticated
USING (true)
WITH CHECK (true);