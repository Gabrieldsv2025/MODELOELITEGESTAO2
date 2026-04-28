-- Função para inserir vendas contornando RLS
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

  -- Inserir venda (bypassing RLS com SECURITY DEFINER)
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
    (p_venda_data->>'total')::NUMERIC,
    COALESCE((p_venda_data->>'desconto')::NUMERIC, 0),
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

-- Grant execute para authenticated users
GRANT EXECUTE ON FUNCTION public.inserir_venda(JSONB, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.inserir_venda(JSONB, UUID) TO anon;

-- Comentário para documentação
COMMENT ON FUNCTION public.inserir_venda IS 'Insere venda contornando RLS quando autenticação customizada é usada. SECURITY DEFINER permite bypass das políticas RLS.';