-- Remover a política atual que requer autenticação
DROP POLICY IF EXISTS "Allow authenticated access" ON public.barbeiros;

-- Criar uma política que permite leitura para login (anônimos podem ler para autenticar)
CREATE POLICY "Allow login access" 
ON public.barbeiros 
FOR SELECT 
USING (true);

-- Criar uma política que permite apenas usuários autenticados modificarem dados
CREATE POLICY "Allow authenticated modifications" 
ON public.barbeiros 
FOR ALL 
USING (auth.uid() IS NOT NULL) 
WITH CHECK (auth.uid() IS NOT NULL);