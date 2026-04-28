-- Corrigir a precisão da coluna percentual_comissao que estava causando overflow
ALTER TABLE public.comissoes_historico
ALTER COLUMN percentual_comissao TYPE NUMERIC(10,2);

-- Adicionar comentário
COMMENT ON COLUMN public.comissoes_historico.percentual_comissao IS 'Percentual de comissão aplicado (0-100)';