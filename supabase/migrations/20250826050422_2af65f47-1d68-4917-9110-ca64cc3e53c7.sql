-- Create or replace trigger function to snapshot commission at the time of item insertion
CREATE OR REPLACE FUNCTION public.save_commission_history()
RETURNS TRIGGER AS $$
DECLARE
  v_barbeiro uuid;
  def_serv numeric;
  def_prod numeric;
  percentual_usado numeric;
  valor_comissao numeric;
BEGIN
  -- Fetch barber defaults for this sale
  SELECT v.barbeiro_id, b.comissao_servicos, b.comissao_produtos
  INTO v_barbeiro, def_serv, def_prod
  FROM public.vendas v
  JOIN public.barbeiros b ON b.id = v.barbeiro_id
  WHERE v.id = NEW.venda_id;

  -- Try to get a specific commission configuration for this item at insert time
  SELECT cc.percentual
  INTO percentual_usado
  FROM public.configuracoes_comissao cc
  WHERE cc.barbeiro_id = v_barbeiro
    AND cc.tipo = NEW.tipo
    AND (
      (NEW.tipo = 'servico' AND cc.servico_id = NEW.item_id) OR
      (NEW.tipo = 'produto' AND cc.produto_id = NEW.item_id)
    )
  LIMIT 1;

  -- Fallback to barber defaults
  IF percentual_usado IS NULL THEN
    IF NEW.tipo = 'servico' THEN
      percentual_usado := def_serv;
    ELSE
      percentual_usado := def_prod;
    END IF;
  END IF;

  -- Avoid duplicate history rows for same sale/item
  IF EXISTS (
    SELECT 1 FROM public.comissoes_historico ch
    WHERE ch.venda_id = NEW.venda_id AND ch.item_id = NEW.item_id
  ) THEN
    RETURN NEW;
  END IF;

  valor_comissao := (NEW.subtotal * percentual_usado) / 100.0;

  INSERT INTO public.comissoes_historico (
    venda_id,
    barbeiro_id,
    item_id,
    item_tipo,
    percentual_comissao,
    valor_comissao
  ) VALUES (
    NEW.venda_id,
    v_barbeiro,
    NEW.item_id,
    NEW.tipo,
    percentual_usado,
    valor_comissao
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Ensure the trigger exists (drop and recreate safely)
DROP TRIGGER IF EXISTS save_commission_on_item_insert ON public.itens_venda;
CREATE TRIGGER save_commission_on_item_insert
  AFTER INSERT ON public.itens_venda
  FOR EACH ROW
  EXECUTE FUNCTION public.save_commission_history();

-- One-time backfill for items without history yet
INSERT INTO public.comissoes_historico (
  venda_id,
  barbeiro_id,
  item_id,
  item_tipo,
  percentual_comissao,
  valor_comissao
)
SELECT
  iv.venda_id,
  v.barbeiro_id,
  iv.item_id,
  iv.tipo,
  COALESCE(
    cc.percentual,
    CASE WHEN iv.tipo = 'servico' THEN b.comissao_servicos ELSE b.comissao_produtos END
  ) AS percentual_comissao,
  (iv.subtotal * COALESCE(
    cc.percentual,
    CASE WHEN iv.tipo = 'servico' THEN b.comissao_servicos ELSE b.comissao_produtos END
  )) / 100.0 AS valor_comissao
FROM public.itens_venda iv
JOIN public.vendas v ON v.id = iv.venda_id
JOIN public.barbeiros b ON b.id = v.barbeiro_id
LEFT JOIN public.configuracoes_comissao cc ON (
  cc.barbeiro_id = v.barbeiro_id
  AND cc.tipo = iv.tipo
  AND (
    (iv.tipo = 'servico' AND cc.servico_id = iv.item_id) OR
    (iv.tipo = 'produto' AND cc.produto_id = iv.item_id)
  )
)
WHERE NOT EXISTS (
  SELECT 1 FROM public.comissoes_historico ch
  WHERE ch.venda_id = iv.venda_id AND ch.item_id = iv.item_id
);