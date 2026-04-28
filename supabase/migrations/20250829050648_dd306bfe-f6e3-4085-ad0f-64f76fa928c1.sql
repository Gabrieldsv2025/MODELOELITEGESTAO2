-- Criar tabelas para sistema de promoções
CREATE TABLE public.promocoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  descricao TEXT,
  tipo TEXT NOT NULL CHECK (tipo IN ('desconto', 'acrescimo')),
  percentual NUMERIC NOT NULL CHECK (percentual > 0),
  dias_semana INTEGER[] NOT NULL DEFAULT '{}',
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de vinculação entre promoções e produtos/serviços
CREATE TABLE public.promocoes_produtos_servicos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  promocao_id UUID NOT NULL REFERENCES public.promocoes(id) ON DELETE CASCADE,
  item_id UUID NOT NULL,
  item_tipo TEXT NOT NULL CHECK (item_tipo IN ('produto', 'servico')),
  preco_original NUMERIC NOT NULL,
  preco_promocional NUMERIC NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS nas tabelas
ALTER TABLE public.promocoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promocoes_produtos_servicos ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para permitir todas as operações (sistema interno da barbearia)
CREATE POLICY "Permitir todas as operações em promocoes" 
ON public.promocoes 
FOR ALL 
USING (true) 
WITH CHECK (true);

CREATE POLICY "Permitir todas as operações em promocoes_produtos_servicos" 
ON public.promocoes_produtos_servicos 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_promocoes_updated_at
  BEFORE UPDATE ON public.promocoes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_promocoes_produtos_servicos_updated_at
  BEFORE UPDATE ON public.promocoes_produtos_servicos
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Índices para melhorar performance
CREATE INDEX idx_promocoes_produtos_servicos_item ON public.promocoes_produtos_servicos(item_id, item_tipo);
CREATE INDEX idx_promocoes_produtos_servicos_ativo ON public.promocoes_produtos_servicos(ativo);
CREATE INDEX idx_promocoes_dias_semana ON public.promocoes USING GIN(dias_semana);