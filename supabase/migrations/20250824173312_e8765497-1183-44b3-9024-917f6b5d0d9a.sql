-- 1. REMOVER TABELAS DESNECESSÁRIAS
-- Remover activity_logs (não está sendo usada)
DROP TABLE IF EXISTS public.activity_logs CASCADE;

-- Remover profiles (usando barbeiros ao invés)
DROP TABLE IF EXISTS public.profiles CASCADE;

-- 2. CORRIGIR TODAS AS POLÍTICAS RLS

-- LIMPAR TODAS AS POLÍTICAS EXISTENTES
DROP POLICY IF EXISTS "Login público permitido" ON public.barbeiros;
DROP POLICY IF EXISTS "Usuários autenticados podem ver todos os barbeiros" ON public.barbeiros;
DROP POLICY IF EXISTS "Apenas administradores podem inserir barbeiros" ON public.barbeiros;
DROP POLICY IF EXISTS "Apenas administradores podem atualizar barbeiros" ON public.barbeiros;
DROP POLICY IF EXISTS "Apenas administradores podem deletar barbeiros" ON public.barbeiros;

-- BARBEIROS - Permitir acesso público para login
ALTER TABLE public.barbeiros DISABLE ROW LEVEL SECURITY;

-- CLIENTES
DROP POLICY IF EXISTS "Usuários podem atualizar seus clientes" ON public.clientes;
DROP POLICY IF EXISTS "Usuários podem criar seus clientes" ON public.clientes;
DROP POLICY IF EXISTS "Usuários podem deletar seus clientes" ON public.clientes;
DROP POLICY IF EXISTS "Usuários veem seus próprios clientes" ON public.clientes;

ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir todas as operações em clientes" 
ON public.clientes 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- PRODUTOS  
DROP POLICY IF EXISTS "Usuários podem atualizar seus produtos" ON public.produtos;
DROP POLICY IF EXISTS "Usuários podem criar seus produtos" ON public.produtos;
DROP POLICY IF EXISTS "Usuários podem deletar seus produtos" ON public.produtos;
DROP POLICY IF EXISTS "Usuários veem seus próprios produtos" ON public.produtos;

ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir todas as operações em produtos" 
ON public.produtos 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- SERVICOS
DROP POLICY IF EXISTS "Usuários podem atualizar seus serviços" ON public.servicos;
DROP POLICY IF EXISTS "Usuários podem criar seus serviços" ON public.servicos;
DROP POLICY IF EXISTS "Usuários podem deletar seus serviços" ON public.servicos;
DROP POLICY IF EXISTS "Usuários veem seus próprios serviços" ON public.servicos;

ALTER TABLE public.servicos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir todas as operações em serviços" 
ON public.servicos 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- VENDAS
DROP POLICY IF EXISTS "Usuários podem atualizar suas vendas" ON public.vendas;
DROP POLICY IF EXISTS "Usuários podem criar suas vendas" ON public.vendas;
DROP POLICY IF EXISTS "Usuários podem deletar suas vendas" ON public.vendas;
DROP POLICY IF EXISTS "Usuários veem suas próprias vendas" ON public.vendas;

ALTER TABLE public.vendas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir todas as operações em vendas" 
ON public.vendas 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- ITENS_VENDA
DROP POLICY IF EXISTS "Usuários podem criar itens de suas vendas" ON public.itens_venda;
DROP POLICY IF EXISTS "Usuários veem itens de suas vendas" ON public.itens_venda;

ALTER TABLE public.itens_venda ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir todas as operações em itens_venda" 
ON public.itens_venda 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- FORNECEDORES
DROP POLICY IF EXISTS "Usuários podem atualizar seus fornecedores" ON public.fornecedores;
DROP POLICY IF EXISTS "Usuários podem criar seus fornecedores" ON public.fornecedores;
DROP POLICY IF EXISTS "Usuários podem deletar seus fornecedores" ON public.fornecedores;
DROP POLICY IF EXISTS "Usuários veem seus próprios fornecedores" ON public.fornecedores;

ALTER TABLE public.fornecedores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir todas as operações em fornecedores" 
ON public.fornecedores 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- CONFIGURACOES_COMISSAO
DROP POLICY IF EXISTS "Usuários podem configurar suas comissões" ON public.configuracoes_comissao;
DROP POLICY IF EXISTS "Usuários veem suas próprias comissões" ON public.configuracoes_comissao;

ALTER TABLE public.configuracoes_comissao ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir todas as operações em configuracoes_comissao" 
ON public.configuracoes_comissao 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- HISTORICO_ATENDIMENTOS
DROP POLICY IF EXISTS "Usuários podem criar seu histórico" ON public.historico_atendimentos;
DROP POLICY IF EXISTS "Usuários veem seu próprio histórico" ON public.historico_atendimentos;

ALTER TABLE public.historico_atendimentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir todas as operações em historico_atendimentos" 
ON public.historico_atendimentos 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- MOVIMENTACOES_ESTOQUE
DROP POLICY IF EXISTS "Usuários podem criar movimentações de seus produtos" ON public.movimentacoes_estoque;
DROP POLICY IF EXISTS "Usuários veem movimentações de seus produtos" ON public.movimentacoes_estoque;

ALTER TABLE public.movimentacoes_estoque ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir todas as operações em movimentacoes_estoque" 
ON public.movimentacoes_estoque 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- USER_PERMISSIONS
DROP POLICY IF EXISTS "Admins podem gerenciar todas as permissões" ON public.user_permissions;
DROP POLICY IF EXISTS "Usuários podem ver suas próprias permissões" ON public.user_permissions;

ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir todas as operações em user_permissions" 
ON public.user_permissions 
FOR ALL 
USING (true) 
WITH CHECK (true);