-- Criação das tabelas principais do sistema de barbearia

-- Tabela de barbeiros (substitui auth.users para login personalizado)
CREATE TABLE public.barbeiros (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  usuario TEXT NOT NULL UNIQUE,
  senha TEXT NOT NULL,
  telefone TEXT,
  email TEXT,
  horario_trabalho JSONB NOT NULL DEFAULT '{}',
  comissao_servicos NUMERIC(5,2) NOT NULL DEFAULT 0,
  comissao_produtos NUMERIC(5,2) NOT NULL DEFAULT 0,
  data_cadastro TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ativo BOOLEAN NOT NULL DEFAULT true,
  nivel TEXT NOT NULL CHECK (nivel IN ('administrador', 'colaborador')) DEFAULT 'colaborador',
  is_proprietario BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de clientes
CREATE TABLE public.clientes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  telefone TEXT NOT NULL,
  email TEXT,
  aniversario DATE,
  preferencias JSONB DEFAULT '{}',
  observacoes TEXT,
  pontos_fidelidade INTEGER NOT NULL DEFAULT 0,
  data_cadastro TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ultimo_atendimento TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de fornecedores
CREATE TABLE public.fornecedores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  cnpj TEXT,
  telefone TEXT,
  email TEXT,
  endereco TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  data_cadastro TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de serviços
CREATE TABLE public.servicos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  descricao TEXT,
  preco NUMERIC(10,2) NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT true,
  categoria TEXT NOT NULL CHECK (categoria IN ('corte', 'barba', 'combo', 'sobrancelha', 'outros')),
  barbeiro_ids JSONB DEFAULT '[]',
  comissao_personalizada JSONB DEFAULT '{}',
  pacote JSONB,
  data_cadastro TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de produtos
CREATE TABLE public.produtos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  descricao TEXT,
  preco_compra NUMERIC(10,2) NOT NULL,
  preco_venda NUMERIC(10,2) NOT NULL,
  estoque INTEGER NOT NULL DEFAULT 0,
  estoque_minimo INTEGER NOT NULL DEFAULT 0,
  categoria TEXT NOT NULL,
  fornecedor_id UUID REFERENCES public.fornecedores(id),
  ativo BOOLEAN NOT NULL DEFAULT true,
  data_cadastro TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de movimentações de estoque
CREATE TABLE public.movimentacoes_estoque (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  produto_id UUID NOT NULL REFERENCES public.produtos(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('entrada', 'saida')),
  quantidade INTEGER NOT NULL,
  preco_unitario NUMERIC(10,2),
  motivo TEXT NOT NULL,
  observacoes TEXT,
  data_movimento TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de vendas
CREATE TABLE public.vendas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cliente_id UUID NOT NULL REFERENCES public.clientes(id),
  barbeiro_id UUID NOT NULL REFERENCES public.barbeiros(id),
  total NUMERIC(10,2) NOT NULL,
  forma_pagamento TEXT NOT NULL CHECK (forma_pagamento IN ('dinheiro', 'cartao', 'pix', 'fiado')),
  status TEXT NOT NULL CHECK (status IN ('aguardando', 'pago', 'cancelado')) DEFAULT 'aguardando',
  observacoes TEXT,
  data_venda TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  data_atualizacao TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de itens de venda
CREATE TABLE public.itens_venda (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  venda_id UUID NOT NULL REFERENCES public.vendas(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('servico', 'produto')),
  item_id UUID NOT NULL,
  nome TEXT NOT NULL,
  preco NUMERIC(10,2) NOT NULL,
  quantidade INTEGER NOT NULL DEFAULT 1,
  subtotal NUMERIC(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de histórico de atendimentos
CREATE TABLE public.historico_atendimentos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cliente_id UUID NOT NULL REFERENCES public.clientes(id),
  barbeiro_id UUID NOT NULL REFERENCES public.barbeiros(id),
  venda_id UUID NOT NULL REFERENCES public.vendas(id),
  servicos JSONB DEFAULT '[]',
  produtos JSONB DEFAULT '[]',
  total NUMERIC(10,2) NOT NULL,
  observacoes TEXT,
  data_atendimento TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de configurações de comissão
CREATE TABLE public.configuracoes_comissao (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  servico_id UUID REFERENCES public.servicos(id),
  produto_id UUID REFERENCES public.produtos(id),
  barbeiro_id UUID NOT NULL REFERENCES public.barbeiros(id),
  tipo TEXT NOT NULL CHECK (tipo IN ('servico', 'produto')),
  percentual NUMERIC(5,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT check_tipo_referencia CHECK (
    (tipo = 'servico' AND servico_id IS NOT NULL AND produto_id IS NULL) OR
    (tipo = 'produto' AND produto_id IS NOT NULL AND servico_id IS NULL)
  )
);

-- Habilitar Row Level Security em todas as tabelas
ALTER TABLE public.barbeiros ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fornecedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.servicos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movimentacoes_estoque ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.itens_venda ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.historico_atendimentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.configuracoes_comissao ENABLE ROW LEVEL SECURITY;

-- Criar políticas RLS básicas (permitir acesso autenticado por enquanto)
CREATE POLICY "Allow authenticated access" ON public.barbeiros FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow authenticated access" ON public.clientes FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow authenticated access" ON public.fornecedores FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow authenticated access" ON public.servicos FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow authenticated access" ON public.produtos FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow authenticated access" ON public.movimentacoes_estoque FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow authenticated access" ON public.vendas FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow authenticated access" ON public.itens_venda FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow authenticated access" ON public.historico_atendimentos FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow authenticated access" ON public.configuracoes_comissao FOR ALL TO authenticated USING (true);

-- Função para atualizar timestamp updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para atualizar updated_at automaticamente
CREATE TRIGGER update_barbeiros_updated_at BEFORE UPDATE ON public.barbeiros FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_clientes_updated_at BEFORE UPDATE ON public.clientes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_fornecedores_updated_at BEFORE UPDATE ON public.fornecedores FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_servicos_updated_at BEFORE UPDATE ON public.servicos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_produtos_updated_at BEFORE UPDATE ON public.produtos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_vendas_updated_at BEFORE UPDATE ON public.vendas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_configuracoes_comissao_updated_at BEFORE UPDATE ON public.configuracoes_comissao FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Inserir dados iniciais padrão
INSERT INTO public.barbeiros (nome, usuario, senha, nivel, is_proprietario, comissao_servicos, comissao_produtos) VALUES
('Igor Queiroz', 'igor', 'igor123', 'administrador', true, 0, 0),
('Mickael', 'mickael', 'mickael123', 'colaborador', false, 50, 10);

-- Inserir alguns serviços básicos
INSERT INTO public.servicos (nome, categoria, preco) VALUES
('Corte Social', 'corte', 25.00),
('Corte + Barba', 'combo', 40.00),
('Barba Completa', 'barba', 20.00),
('Sobrancelha', 'sobrancelha', 15.00);

-- Inserir algumas categorias de produtos básicas
INSERT INTO public.produtos (nome, categoria, preco_compra, preco_venda, estoque, estoque_minimo) VALUES
('Pomada Modeladora', 'Cosméticos', 15.00, 30.00, 10, 5),
('Shampoo Anticaspa', 'Cosméticos', 12.00, 25.00, 8, 3),
('Óleo para Barba', 'Cosméticos', 20.00, 45.00, 6, 2);