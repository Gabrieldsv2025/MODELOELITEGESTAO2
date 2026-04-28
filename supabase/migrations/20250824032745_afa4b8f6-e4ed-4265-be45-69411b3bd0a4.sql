-- Create metas_mensais table for monthly sales goals
CREATE TABLE public.metas_mensais (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  barbeiro_id UUID NOT NULL REFERENCES public.barbeiros(id),
  mes INTEGER NOT NULL CHECK (mes >= 1 AND mes <= 12),
  ano INTEGER NOT NULL CHECK (ano >= 2020),
  valor_meta DECIMAL(10,2) NOT NULL CHECK (valor_meta >= 0),
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  criado_por TEXT NOT NULL,
  observacoes TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  UNIQUE(barbeiro_id, mes, ano)
);

-- Enable RLS
ALTER TABLE public.metas_mensais ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view metas_mensais" 
ON public.metas_mensais 
FOR SELECT 
USING (true);

CREATE POLICY "Admins can manage metas_mensais" 
ON public.metas_mensais 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.user_permissions 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Create trigger for updated_at
CREATE TRIGGER update_metas_mensais_updated_at
BEFORE UPDATE ON public.metas_mensais
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for better performance
CREATE INDEX idx_metas_mensais_barbeiro_periodo ON public.metas_mensais(barbeiro_id, ano DESC, mes DESC);
CREATE INDEX idx_metas_mensais_periodo ON public.metas_mensais(ano DESC, mes DESC);