-- Função auxiliar para sanitizar valores numéricos no PostgreSQL
CREATE OR REPLACE FUNCTION sanitize_numeric(
  p_value TEXT,
  p_allow_null BOOLEAN DEFAULT false,
  p_max_value NUMERIC DEFAULT 99999999.99,
  p_min_value NUMERIC DEFAULT 0
)
RETURNS NUMERIC
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_num NUMERIC;
BEGIN
  -- Se valor é NULL/vazio e null é permitido
  IF (p_value IS NULL OR p_value = 'null' OR p_value = '') AND p_allow_null THEN
    RETURN NULL;
  END IF;
  
  -- Tentar converter para número
  BEGIN
    v_num := p_value::NUMERIC;
  EXCEPTION WHEN OTHERS THEN
    -- Se falhar conversão, retornar 0
    RETURN 0;
  END;
  
  -- Validar limites
  IF v_num > p_max_value THEN
    RETURN p_max_value;
  END IF;
  
  IF v_num < p_min_value THEN
    RETURN p_min_value;
  END IF;
  
  -- Arredondar para 2 casas decimais
  RETURN ROUND(v_num, 2);
END;
$$;

-- Refatorar inserir_venda com validação robusta
CREATE OR REPLACE FUNCTION public.inserir_venda(
  p_venda_data JSONB,
  p_barbeiro_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_venda_id UUID;
  v_empresa_id UUID;
  v_total NUMERIC;
  v_desconto NUMERIC;
BEGIN
  -- Validar que o barbeiro existe e está ativo
  IF NOT EXISTS (
    SELECT 1 FROM public.barbeiros 
    WHERE id = p_barbeiro_id AND ativo = true
  ) THEN
    RAISE EXCEPTION 'Barbeiro não encontrado ou inativo';
  END IF;

  -- Buscar empresa_id do barbeiro
  SELECT empresa_id INTO v_empresa_id
  FROM public.barbeiros
  WHERE id = p_barbeiro_id;
  
  -- Sanitizar valores numéricos ANTES do INSERT
  v_total := sanitize_numeric(p_venda_data->>'total', false);
  v_desconto := sanitize_numeric(p_venda_data->>'desconto', true);
  
  -- Validar que total é positivo
  IF v_total IS NULL OR v_total <= 0 THEN
    RAISE EXCEPTION 'Total da venda deve ser maior que zero';
  END IF;

  -- Inserir venda com valores sanitizados
  INSERT INTO public.vendas (
    id,
    cliente_id,
    barbeiro_id,
    total,
    desconto,
    forma_pagamento,
    status,
    observacoes,
    data_venda,
    data_atualizacao,
    horario_atendimento,
    empresa_id
  )
  VALUES (
    COALESCE((p_venda_data->>'id')::UUID, gen_random_uuid()),
    (p_venda_data->>'cliente_id')::UUID,
    p_barbeiro_id,
    v_total,
    v_desconto,
    p_venda_data->>'forma_pagamento',
    COALESCE(p_venda_data->>'status', 'aguardando'),
    p_venda_data->>'observacoes',
    COALESCE((p_venda_data->>'data_venda')::TIMESTAMPTZ, NOW()),
    NOW(),
    COALESCE((p_venda_data->>'horario_atendimento')::TIMESTAMPTZ, NOW()),
    v_empresa_id
  )
  RETURNING id INTO v_venda_id;

  RETURN v_venda_id;
END;
$$;

-- Garantir permissões
GRANT EXECUTE ON FUNCTION public.inserir_venda(JSONB, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.inserir_venda(JSONB, UUID) TO anon;
GRANT EXECUTE ON FUNCTION sanitize_numeric(TEXT, BOOLEAN, NUMERIC, NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION sanitize_numeric(TEXT, BOOLEAN, NUMERIC, NUMERIC) TO anon;

COMMENT ON FUNCTION sanitize_numeric IS 'Valida e sanitiza valores numéricos para evitar overflow';
COMMENT ON FUNCTION public.inserir_venda IS 'Insere venda com validação de valores numéricos para evitar overflow';