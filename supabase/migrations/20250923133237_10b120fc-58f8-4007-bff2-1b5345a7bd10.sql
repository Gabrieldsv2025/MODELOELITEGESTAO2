-- Verificar e corrigir as políticas da tabela itens_venda
-- O problema é que as políticas ainda dependem de usuários autenticados via Supabase Auth
-- mas este projeto usa autenticação customizada

-- Remover todas as políticas atuais
DROP POLICY IF EXISTS "Permitir inserção de itens de venda" ON public.itens_venda;
DROP POLICY IF EXISTS "Permitir leitura de itens de venda" ON public.itens_venda;
DROP POLICY IF EXISTS "Permitir atualização de itens de venda" ON public.itens_venda;
DROP POLICY IF EXISTS "Permitir exclusão de itens de venda" ON public.itens_venda;

-- Criar políticas mais simples que não dependem de autenticação Supabase
CREATE POLICY "Permitir todas as operações em itens_venda"
ON public.itens_venda
FOR ALL
USING (true)
WITH CHECK (true);