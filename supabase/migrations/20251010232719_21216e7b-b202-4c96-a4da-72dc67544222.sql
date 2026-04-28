-- ============================================
-- MÓDULO DE DESPESAS - MIGRAÇÃO COMPLETA
-- ============================================

-- 1. TABELA: despesas
CREATE TABLE IF NOT EXISTS public.despesas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  descricao TEXT NOT NULL,
  categoria TEXT NOT NULL CHECK (categoria IN ('fixa', 'variavel', 'investimento', 'impostos', 'comissao', 'insumo', 'outro')),
  valor NUMERIC(10,2) NOT NULL CHECK (valor >= 0),
  data_despesa DATE NOT NULL,
  forma_pagamento TEXT NOT NULL CHECK (forma_pagamento IN ('dinheiro', 'pix', 'cartao', 'transferencia')),
  fornecedor TEXT,
  observacao TEXT,
  status TEXT NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'inativo')),
  barbeiro_id UUID REFERENCES public.barbeiros(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_despesas_data ON public.despesas(data_despesa);
CREATE INDEX IF NOT EXISTS idx_despesas_categoria ON public.despesas(categoria);
CREATE INDEX IF NOT EXISTS idx_despesas_status ON public.despesas(status);
CREATE INDEX IF NOT EXISTS idx_despesas_barbeiro ON public.despesas(barbeiro_id);

-- 2. TABELA: indicadores_financeiros
CREATE TABLE IF NOT EXISTS public.indicadores_financeiros (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mes_referencia INTEGER NOT NULL CHECK (mes_referencia BETWEEN 1 AND 12),
  ano_referencia INTEGER NOT NULL CHECK (ano_referencia >= 2020),
  faturamento_bruto NUMERIC(12,2) NOT NULL DEFAULT 0,
  faturamento_liquido NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_despesas NUMERIC(12,2) NOT NULL DEFAULT 0,
  custo_produtos NUMERIC(12,2) NOT NULL DEFAULT 0,
  lucro_bruto NUMERIC(12,2) NOT NULL DEFAULT 0,
  lucro_liquido NUMERIC(12,2) NOT NULL DEFAULT 0,
  margem_bruta NUMERIC(5,2) NOT NULL DEFAULT 0,
  margem_liquida NUMERIC(5,2) NOT NULL DEFAULT 0,
  total_comissoes NUMERIC(12,2) NOT NULL DEFAULT 0,
  numero_vendas INTEGER NOT NULL DEFAULT 0,
  ticket_medio NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(mes_referencia, ano_referencia)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_indicadores_periodo ON public.indicadores_financeiros(ano_referencia, mes_referencia);

-- 3. HABILITAR RLS
ALTER TABLE public.despesas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.indicadores_financeiros ENABLE ROW LEVEL SECURITY;

-- 4. POLÍTICAS RLS PARA DESPESAS
CREATE POLICY "Proprietarios e admins podem gerenciar despesas"
ON public.despesas FOR ALL
USING (get_current_barbeiro_role() IN ('proprietario', 'administrador'))
WITH CHECK (get_current_barbeiro_role() IN ('proprietario', 'administrador'));

CREATE POLICY "Barbeiros podem ver suas próprias despesas"
ON public.despesas FOR SELECT
USING (
  (get_current_barbeiro_role() = 'colaborador' AND barbeiro_id = get_current_barbeiro_id())
  OR get_current_barbeiro_role() IN ('proprietario', 'administrador')
);

-- 5. POLÍTICAS RLS PARA INDICADORES FINANCEIROS
CREATE POLICY "Proprietarios e admins podem gerenciar indicadores"
ON public.indicadores_financeiros FOR ALL
USING (get_current_barbeiro_role() IN ('proprietario', 'administrador'))
WITH CHECK (get_current_barbeiro_role() IN ('proprietario', 'administrador'));

CREATE POLICY "Todos autenticados podem ler indicadores"
ON public.indicadores_financeiros FOR SELECT
USING (get_current_barbeiro_id() IS NOT NULL);

-- 6. TRIGGERS PARA UPDATED_AT
CREATE TRIGGER update_despesas_updated_at
  BEFORE UPDATE ON public.despesas
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_indicadores_updated_at
  BEFORE UPDATE ON public.indicadores_financeiros
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 7. FUNCTION PARA RECALCULAR INDICADORES MENSAIS
CREATE OR REPLACE FUNCTION public.recalcular_indicadores_mensais(p_mes INTEGER, p_ano INTEGER)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_faturamento_bruto NUMERIC := 0;
  v_faturamento_liquido NUMERIC := 0;
  v_total_despesas NUMERIC := 0;
  v_custo_produtos NUMERIC := 0;
  v_total_comissoes NUMERIC := 0;
  v_numero_vendas INTEGER := 0;
  v_lucro_bruto NUMERIC := 0;
  v_lucro_liquido NUMERIC := 0;
  v_margem_bruta NUMERIC := 0;
  v_margem_liquida NUMERIC := 0;
  v_ticket_medio NUMERIC := 0;
BEGIN
  -- Calcular faturamento bruto (soma de todas as vendas pagas do mês)
  SELECT COALESCE(SUM(total), 0), COUNT(*)
  INTO v_faturamento_bruto, v_numero_vendas
  FROM public.vendas
  WHERE EXTRACT(MONTH FROM data_venda) = p_mes
    AND EXTRACT(YEAR FROM data_venda) = p_ano
    AND status = 'pago';
  
  -- Calcular total de despesas do mês
  SELECT COALESCE(SUM(valor), 0)
  INTO v_total_despesas
  FROM public.despesas
  WHERE EXTRACT(MONTH FROM data_despesa) = p_mes
    AND EXTRACT(YEAR FROM data_despesa) = p_ano
    AND status = 'ativo';
  
  -- Calcular custo de produtos vendidos
  SELECT COALESCE(SUM(iv.quantidade * p.preco_compra), 0)
  INTO v_custo_produtos
  FROM public.vendas v
  JOIN public.itens_venda iv ON iv.venda_id = v.id
  JOIN public.produtos p ON p.id = iv.item_id
  WHERE iv.tipo = 'produto'
    AND EXTRACT(MONTH FROM v.data_venda) = p_mes
    AND EXTRACT(YEAR FROM v.data_venda) = p_ano
    AND v.status = 'pago';
  
  -- Calcular total de comissões do mês
  SELECT COALESCE(SUM(ch.valor_comissao), 0)
  INTO v_total_comissoes
  FROM public.comissoes_historico ch
  JOIN public.vendas v ON v.id = ch.venda_id
  WHERE EXTRACT(MONTH FROM v.data_venda) = p_mes
    AND EXTRACT(YEAR FROM v.data_venda) = p_ano
    AND v.status = 'pago';
  
  -- Calcular lucro bruto (faturamento - custo produtos)
  v_lucro_bruto := v_faturamento_bruto - v_custo_produtos;
  
  -- Calcular faturamento líquido (faturamento bruto - despesas - comissões)
  v_faturamento_liquido := v_faturamento_bruto - v_total_despesas - v_total_comissoes;
  
  -- Calcular lucro líquido (lucro bruto - despesas - comissões)
  v_lucro_liquido := v_lucro_bruto - v_total_despesas - v_total_comissoes;
  
  -- Calcular margens
  IF v_faturamento_bruto > 0 THEN
    v_margem_bruta := (v_lucro_bruto / v_faturamento_bruto) * 100;
    v_margem_liquida := (v_lucro_liquido / v_faturamento_bruto) * 100;
    v_ticket_medio := v_faturamento_bruto / NULLIF(v_numero_vendas, 0);
  END IF;
  
  -- Inserir ou atualizar indicadores
  INSERT INTO public.indicadores_financeiros (
    mes_referencia, ano_referencia, faturamento_bruto, faturamento_liquido,
    total_despesas, custo_produtos, lucro_bruto, lucro_liquido,
    margem_bruta, margem_liquida, total_comissoes, numero_vendas, ticket_medio
  ) VALUES (
    p_mes, p_ano, v_faturamento_bruto, v_faturamento_liquido,
    v_total_despesas, v_custo_produtos, v_lucro_bruto, v_lucro_liquido,
    v_margem_bruta, v_margem_liquida, v_total_comissoes, v_numero_vendas, v_ticket_medio
  )
  ON CONFLICT (mes_referencia, ano_referencia)
  DO UPDATE SET
    faturamento_bruto = EXCLUDED.faturamento_bruto,
    faturamento_liquido = EXCLUDED.faturamento_liquido,
    total_despesas = EXCLUDED.total_despesas,
    custo_produtos = EXCLUDED.custo_produtos,
    lucro_bruto = EXCLUDED.lucro_bruto,
    lucro_liquido = EXCLUDED.lucro_liquido,
    margem_bruta = EXCLUDED.margem_bruta,
    margem_liquida = EXCLUDED.margem_liquida,
    total_comissoes = EXCLUDED.total_comissoes,
    numero_vendas = EXCLUDED.numero_vendas,
    ticket_medio = EXCLUDED.ticket_medio,
    updated_at = NOW();
END;
$$;

-- 8. TRIGGER PARA RECALCULAR AUTOMATICAMENTE AO MODIFICAR DESPESAS
CREATE OR REPLACE FUNCTION public.trigger_recalcular_indicadores()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Recalcular para o mês da despesa (OLD ou NEW)
  IF TG_OP = 'DELETE' THEN
    PERFORM recalcular_indicadores_mensais(
      EXTRACT(MONTH FROM OLD.data_despesa)::INTEGER,
      EXTRACT(YEAR FROM OLD.data_despesa)::INTEGER
    );
  ELSE
    PERFORM recalcular_indicadores_mensais(
      EXTRACT(MONTH FROM NEW.data_despesa)::INTEGER,
      EXTRACT(YEAR FROM NEW.data_despesa)::INTEGER
    );
    
    -- Se a data mudou, recalcular também o mês antigo
    IF TG_OP = 'UPDATE' AND OLD.data_despesa != NEW.data_despesa THEN
      PERFORM recalcular_indicadores_mensais(
        EXTRACT(MONTH FROM OLD.data_despesa)::INTEGER,
        EXTRACT(YEAR FROM OLD.data_despesa)::INTEGER
      );
    END IF;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER despesas_recalcular_indicadores
AFTER INSERT OR UPDATE OR DELETE ON public.despesas
FOR EACH ROW
EXECUTE FUNCTION public.trigger_recalcular_indicadores();

-- 9. ADICIONAR PERMISSÕES PARA O MÓDULO DESPESAS
INSERT INTO public.user_permissions (user_id, module_name, has_access, can_read, can_write, can_delete, can_admin)
SELECT 
  b.id,
  'despesas',
  CASE 
    WHEN b.is_proprietario = true OR b.nivel = 'administrador' THEN true
    ELSE false
  END,
  CASE 
    WHEN b.is_proprietario = true OR b.nivel = 'administrador' THEN true
    ELSE true
  END,
  CASE 
    WHEN b.is_proprietario = true OR b.nivel = 'administrador' THEN true
    ELSE false
  END,
  CASE 
    WHEN b.is_proprietario = true OR b.nivel = 'administrador' THEN true
    ELSE false
  END,
  CASE 
    WHEN b.is_proprietario = true OR b.nivel = 'administrador' THEN true
    ELSE false
  END
FROM public.barbeiros b
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_permissions up 
  WHERE up.user_id = b.id AND up.module_name = 'despesas'
);