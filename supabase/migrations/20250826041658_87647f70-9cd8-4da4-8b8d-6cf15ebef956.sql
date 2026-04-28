-- Fix function search path security issue
CREATE OR REPLACE FUNCTION public.save_commission_history()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- This function will be called when itens_venda are inserted
  -- It will calculate and save the commission based on current configurations
  INSERT INTO public.comissoes_historico (
    venda_id,
    barbeiro_id,
    item_id,
    item_tipo,
    percentual_comissao,
    valor_comissao
  )
  SELECT 
    NEW.venda_id,
    v.barbeiro_id,
    NEW.item_id,
    NEW.tipo,
    COALESCE(cc.percentual, 
      CASE 
        WHEN NEW.tipo = 'servico' THEN b.comissao_servicos
        WHEN NEW.tipo = 'produto' THEN b.comissao_produtos
        ELSE 0
      END
    ) as percentual_comissao,
    (NEW.subtotal * COALESCE(cc.percentual, 
      CASE 
        WHEN NEW.tipo = 'servico' THEN b.comissao_servicos
        WHEN NEW.tipo = 'produto' THEN b.comissao_produtos
        ELSE 0
      END
    ) / 100) as valor_comissao
  FROM public.vendas v
  LEFT JOIN public.barbeiros b ON v.barbeiro_id = b.id
  LEFT JOIN public.configuracoes_comissao cc ON (
    cc.barbeiro_id = v.barbeiro_id AND
    ((NEW.tipo = 'servico' AND cc.servico_id = NEW.item_id) OR
     (NEW.tipo = 'produto' AND cc.produto_id = NEW.item_id))
  )
  WHERE v.id = NEW.venda_id;
  
  RETURN NEW;
END;
$$;