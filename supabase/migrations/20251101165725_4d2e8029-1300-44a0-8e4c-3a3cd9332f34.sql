-- Corrigir overflow nas colunas de margem dos indicadores financeiros
-- Problema: NUMERIC(5,2) só suporta valores até ±999.99
-- Com despesas recorrentes e poucas vendas em novembro, margens ficam extremamente negativas
-- Solução: Aumentar precisão para NUMERIC(8,2) → permite valores até ±999,999.99

ALTER TABLE public.indicadores_financeiros
ALTER COLUMN margem_bruta TYPE NUMERIC(8,2);

ALTER TABLE public.indicadores_financeiros
ALTER COLUMN margem_liquida TYPE NUMERIC(8,2);

-- Adicionar comentários explicativos
COMMENT ON COLUMN public.indicadores_financeiros.margem_bruta IS 
  'Margem bruta em percentual. Pode ser negativa em meses com prejuízo.';

COMMENT ON COLUMN public.indicadores_financeiros.margem_liquida IS 
  'Margem líquida em percentual. Pode ser negativa em meses com prejuízo.';

-- Adicionar constraints para limitar margens a valores razoáveis (-10000% a +10000%)
ALTER TABLE public.indicadores_financeiros
DROP CONSTRAINT IF EXISTS check_margem_bruta_range;

ALTER TABLE public.indicadores_financeiros
DROP CONSTRAINT IF EXISTS check_margem_liquida_range;

ALTER TABLE public.indicadores_financeiros
ADD CONSTRAINT check_margem_bruta_range CHECK (margem_bruta >= -10000 AND margem_bruta <= 10000);

ALTER TABLE public.indicadores_financeiros
ADD CONSTRAINT check_margem_liquida_range CHECK (margem_liquida >= -10000 AND margem_liquida <= 10000);