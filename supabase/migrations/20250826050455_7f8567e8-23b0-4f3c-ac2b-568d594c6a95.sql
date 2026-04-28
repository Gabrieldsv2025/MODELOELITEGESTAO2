-- Fix function search path security issue for save_commission_history function
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
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public;