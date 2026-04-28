-- Criar tabela barbeiros conforme esperado pelo código
CREATE TABLE public.barbeiros (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  usuario TEXT NOT NULL UNIQUE,
  senha TEXT NOT NULL,
  telefone TEXT,
  email TEXT,
  horario_trabalho JSONB DEFAULT '{}'::jsonb,
  comissao_servicos NUMERIC NOT NULL DEFAULT 0,
  comissao_produtos NUMERIC NOT NULL DEFAULT 0,
  data_cadastro TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ativo BOOLEAN NOT NULL DEFAULT true,
  nivel TEXT NOT NULL DEFAULT 'colaborador',
  is_proprietario BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.barbeiros ENABLE ROW LEVEL SECURITY;

-- Políticas de segurança para barbeiros
CREATE POLICY "Barbeiros podem ver seus próprios dados" 
ON public.barbeiros 
FOR SELECT 
USING (auth.uid() = id);

CREATE POLICY "Administradores podem ver todos os barbeiros" 
ON public.barbeiros 
FOR SELECT 
USING (is_admin());

CREATE POLICY "Administradores podem inserir barbeiros" 
ON public.barbeiros 
FOR INSERT 
WITH CHECK (is_admin());

CREATE POLICY "Administradores podem atualizar barbeiros" 
ON public.barbeiros 
FOR UPDATE 
USING (is_admin());

CREATE POLICY "Barbeiros podem atualizar seus próprios dados" 
ON public.barbeiros 
FOR UPDATE 
USING (auth.uid() = id);

CREATE POLICY "Administradores podem deletar barbeiros" 
ON public.barbeiros 
FOR DELETE 
USING (is_admin());

-- Adicionar trigger para updated_at
CREATE TRIGGER update_barbeiros_updated_at
BEFORE UPDATE ON public.barbeiros
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Inserir barbeiro administrador padrão (Igor)
INSERT INTO public.barbeiros (
  id,
  nome, 
  usuario, 
  senha, 
  nivel, 
  is_proprietario,
  ativo,
  comissao_servicos,
  comissao_produtos
) VALUES (
  gen_random_uuid(),
  'Igor Queiroz',
  'admin',
  'admin123',
  'administrador',
  true,
  true,
  0,
  0
) ON CONFLICT (usuario) DO NOTHING;