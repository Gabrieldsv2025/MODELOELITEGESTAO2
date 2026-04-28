-- Create table for commission history to preserve commission rates at the time of sale
CREATE TABLE public.comissoes_historico (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  venda_id UUID NOT NULL REFERENCES public.vendas(id) ON DELETE CASCADE,
  barbeiro_id UUID NOT NULL,
  item_id UUID NOT NULL,
  item_tipo TEXT NOT NULL CHECK (item_tipo IN ('servico', 'produto')),
  percentual_comissao DECIMAL(5,2) NOT NULL,
  valor_comissao DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX idx_comissoes_historico_venda_id ON public.comissoes_historico(venda_id);
CREATE INDEX idx_comissoes_historico_barbeiro_id ON public.comissoes_historico(barbeiro_id);
CREATE INDEX idx_comissoes_historico_item ON public.comissoes_historico(item_id, item_tipo);

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

-- Create function to automatically save commission history when a sale is made
CREATE OR REPLACE FUNCTION public.save_commission_history()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql;

-- Create trigger to automatically save commission history
CREATE TRIGGER trigger_save_commission_history
  AFTER INSERT ON public.itens_venda
  FOR EACH ROW
  EXECUTE FUNCTION public.save_commission_history();