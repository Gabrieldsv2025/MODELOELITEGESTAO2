-- Criar tabela de promoções
CREATE TABLE public.promocoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  descricao TEXT,
  tipo TEXT NOT NULL CHECK (tipo IN ('desconto', 'acrescimo')),
  percentual NUMERIC NOT NULL CHECK (percentual >= 0 AND percentual <= 100),
  dias_semana INTEGER[] NOT NULL DEFAULT '{}', -- 0=domingo, 1=segunda, ..., 6=sábado
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela de promoções aplicadas a produtos/serviços
CREATE TABLE public.promocoes_produtos_servicos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  promocao_id UUID NOT NULL,
  item_id UUID NOT NULL,
  item_tipo TEXT NOT NULL CHECK (item_tipo IN ('produto', 'servico')),
  preco_original NUMERIC NOT NULL,
  preco_promocional NUMERIC NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT false, -- se a promoção está ativa hoje
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.promocoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promocoes_produtos_servicos ENABLE ROW LEVEL SECURITY;

-- Criar políticas para permitir todas as operações
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

-- Criar índices para performance
CREATE INDEX idx_promocoes_ativo ON public.promocoes(ativo);
CREATE INDEX idx_promocoes_produtos_servicos_item ON public.promocoes_produtos_servicos(item_id, item_tipo);
CREATE INDEX idx_promocoes_produtos_servicos_ativo ON public.promocoes_produtos_servicos(ativo);

-- Trigger para updated_at
CREATE TRIGGER update_promocoes_updated_at
  BEFORE UPDATE ON public.promocoes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_promocoes_produtos_servicos_updated_at
  BEFORE UPDATE ON public.promocoes_produtos_servicos
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Habilitar realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.promocoes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.promocoes_produtos_servicos;