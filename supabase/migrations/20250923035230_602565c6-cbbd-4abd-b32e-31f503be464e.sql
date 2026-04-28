-- Adicionar coluna de desconto na tabela vendas
ALTER TABLE public.vendas ADD COLUMN desconto NUMERIC DEFAULT 0;