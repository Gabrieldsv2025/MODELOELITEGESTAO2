-- Função RPC para inserir itens de venda com sanitização
CREATE OR REPLACE FUNCTION public.inserir_itens_venda(
  p_itens JSONB
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item JSONB;
  v_preco NUMERIC;
  v_subtotal NUMERIC;
  v_quantidade INTEGER;
BEGIN
  -- Iterar sobre cada item do array JSON
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_itens)
  LOOP
    -- Sanitizar valores numéricos
    v_preco := sanitize_numeric(v_item->>'preco', false);
    v_subtotal := sanitize_numeric(v_item->>'subtotal', false);
    v_quantidade := GREATEST(1, (v_item->>'quantidade')::INTEGER);
    
    -- Inserir item com valores sanitizados
    INSERT INTO public.itens_venda (
      id,
      venda_id,
      tipo,
      item_id,
      nome,
      preco,
      quantidade,
      subtotal,
      empresa_id
    ) VALUES (
      (v_item->>'id')::UUID,
      (v_item->>'venda_id')::UUID,
      v_item->>'tipo',
      (v_item->>'item_id')::UUID,
      v_item->>'nome',
      v_preco,
      v_quantidade,
      v_subtotal,
      (v_item->>'empresa_id')::UUID
    );
  END LOOP;
END;
$$;

-- Garantir permissões
GRANT EXECUTE ON FUNCTION public.inserir_itens_venda(JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.inserir_itens_venda(JSONB) TO anon;

COMMENT ON FUNCTION public.inserir_itens_venda IS 'Insere itens de venda com sanitização de valores numéricos';

-- Adicionar precisão à coluna desconto se não tiver
DO $$
BEGIN
  -- Alterar coluna desconto para ter precisão definida
  ALTER TABLE public.vendas 
  ALTER COLUMN desconto TYPE NUMERIC(10,2);
EXCEPTION
  WHEN OTHERS THEN
    -- Ignorar se já estiver configurado
    NULL;
END $$;

-- Adicionar constraints de validação
ALTER TABLE public.vendas
  DROP CONSTRAINT IF EXISTS check_vendas_total_positivo,
  DROP CONSTRAINT IF EXISTS check_vendas_desconto_valido;

ALTER TABLE public.vendas
  ADD CONSTRAINT check_vendas_total_positivo CHECK (total > 0),
  ADD CONSTRAINT check_vendas_desconto_valido CHECK (desconto IS NULL OR (desconto >= 0 AND desconto <= 99999999.99));

ALTER TABLE public.itens_venda
  DROP CONSTRAINT IF EXISTS check_itens_valores_validos;

ALTER TABLE public.itens_venda
  ADD CONSTRAINT check_itens_valores_validos CHECK (
    preco >= 0 AND preco <= 99999999.99 AND
    subtotal >= 0 AND subtotal <= 99999999.99 AND
    quantidade > 0
  );