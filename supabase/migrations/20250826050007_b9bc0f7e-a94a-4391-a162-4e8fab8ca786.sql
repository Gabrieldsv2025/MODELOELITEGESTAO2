-- Create commission history table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.comissoes_historico (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  venda_id UUID NOT NULL,
  barbeiro_id UUID NOT NULL,
  item_id UUID NOT NULL,
  item_tipo TEXT NOT NULL CHECK (item_tipo IN ('servico', 'produto')),
  percentual_comissao DECIMAL(5,2) NOT NULL,
  valor_comissao DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.comissoes_historico ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view commission history" 
ON public.comissoes_historico 
FOR SELECT 
USING (true);

CREATE POLICY "Users can insert commission history" 
ON public.comissoes_historico 
FOR INSERT 
WITH CHECK (true);

-- Create function to save commission history when a sale item is created
CREATE OR REPLACE FUNCTION public.save_commission_history()
RETURNS TRIGGER AS $$
DECLARE
  barbeiro_rec RECORD;
  config_comissao RECORD;
  percentual_usado DECIMAL(5,2);
  valor_comissao DECIMAL(10,2);
BEGIN
  -- Get barbeiro information from venda
  SELECT b.id, b.comissao_servicos, b.comissao_produtos, v.barbeiro_id
  INTO barbeiro_rec
  FROM public.vendas v
  JOIN public.barbeiros b ON b.id = v.barbeiro_id
  WHERE v.id = NEW.venda_id;
  
  -- Get custom commission configuration if exists
  SELECT percentual
  INTO config_comissao
  FROM public.configuracoes_comissao
  WHERE barbeiro_id = barbeiro_rec.barbeiro_id
    AND tipo = NEW.tipo
    AND (
      (NEW.tipo = 'servico' AND servico_id = NEW.item_id) OR
      (NEW.tipo = 'produto' AND produto_id = NEW.item_id)
    );
  
  -- Determine commission percentage to use
  IF config_comissao.percentual IS NOT NULL THEN
    percentual_usado := config_comissao.percentual;
  ELSE
    -- Use default commission from barbeiro
    IF NEW.tipo = 'servico' THEN
      percentual_usado := barbeiro_rec.comissao_servicos;
    ELSE
      percentual_usado := barbeiro_rec.comissao_produtos;
    END IF;
  END IF;
  
  -- Calculate commission value
  valor_comissao := (NEW.subtotal * percentual_usado) / 100;
  
  -- Insert commission history record
  INSERT INTO public.comissoes_historico (
    venda_id,
    barbeiro_id,
    item_id,
    item_tipo,
    percentual_comissao,
    valor_comissao
  ) VALUES (
    NEW.venda_id,
    barbeiro_rec.barbeiro_id,
    NEW.item_id,
    NEW.tipo,
    percentual_usado,
    valor_comissao
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically save commission history
DROP TRIGGER IF EXISTS save_commission_on_item_insert ON public.itens_venda;
CREATE TRIGGER save_commission_on_item_insert
  AFTER INSERT ON public.itens_venda
  FOR EACH ROW
  EXECUTE FUNCTION public.save_commission_history();

-- Populate historical data for existing sales (one-time migration)
INSERT INTO public.comissoes_historico (
  venda_id,
  barbeiro_id,
  item_id,
  item_tipo,
  percentual_comissao,
  valor_comissao
)
SELECT DISTINCT
  iv.venda_id,
  v.barbeiro_id,
  iv.item_id,
  iv.tipo,
  COALESCE(
    cc.percentual,
    CASE 
      WHEN iv.tipo = 'servico' THEN b.comissao_servicos
      ELSE b.comissao_produtos
    END
  ) as percentual_comissao,
  (iv.subtotal * COALESCE(
    cc.percentual,
    CASE 
      WHEN iv.tipo = 'servico' THEN b.comissao_servicos
      ELSE b.comissao_produtos
    END
  )) / 100 as valor_comissao
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
  WHERE ch.venda_id = iv.venda_id 
    AND ch.item_id = iv.item_id
);