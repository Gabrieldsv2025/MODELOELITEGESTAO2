
-- Tabela: contas_receber (saldos devedores / inadimplência)
CREATE TABLE public.contas_receber (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  venda_id UUID NOT NULL REFERENCES public.vendas(id) ON DELETE CASCADE,
  cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  barbeiro_id UUID NOT NULL REFERENCES public.barbeiros(id),
  valor_total_venda NUMERIC(10,2) NOT NULL,
  valor_pago NUMERIC(10,2) NOT NULL DEFAULT 0,
  saldo_devedor NUMERIC(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pendente',
  data_quitacao TIMESTAMPTZ,
  empresa_id UUID REFERENCES public.empresas(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela: pagamentos_venda (múltiplas formas de pagamento por venda)
CREATE TABLE public.pagamentos_venda (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  venda_id UUID NOT NULL REFERENCES public.vendas(id) ON DELETE CASCADE,
  forma_pagamento TEXT NOT NULL,
  valor NUMERIC(10,2) NOT NULL,
  empresa_id UUID REFERENCES public.empresas(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indices
CREATE INDEX idx_contas_receber_cliente ON public.contas_receber(cliente_id);
CREATE INDEX idx_contas_receber_status ON public.contas_receber(status);
CREATE INDEX idx_contas_receber_venda ON public.contas_receber(venda_id);
CREATE INDEX idx_pagamentos_venda_venda ON public.pagamentos_venda(venda_id);

-- RLS contas_receber
ALTER TABLE public.contas_receber ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios podem ver contas a receber"
  ON public.contas_receber FOR SELECT
  USING (true);

CREATE POLICY "Usuarios podem inserir contas a receber"
  ON public.contas_receber FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Usuarios podem atualizar contas a receber"
  ON public.contas_receber FOR UPDATE
  USING (
    barbeiro_id = get_current_barbeiro_id()
    OR EXISTS (
      SELECT 1 FROM public.barbeiros
      WHERE id = get_current_barbeiro_id() AND nivel = 'administrador'
    )
  );

CREATE POLICY "Admins podem deletar contas a receber"
  ON public.contas_receber FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.barbeiros
      WHERE id = get_current_barbeiro_id() AND nivel = 'administrador'
    )
  );

-- RLS pagamentos_venda
ALTER TABLE public.pagamentos_venda ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios podem ver pagamentos"
  ON public.pagamentos_venda FOR SELECT
  USING (true);

CREATE POLICY "Usuarios podem inserir pagamentos"
  ON public.pagamentos_venda FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins podem atualizar pagamentos"
  ON public.pagamentos_venda FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.barbeiros
      WHERE id = get_current_barbeiro_id() AND nivel = 'administrador'
    )
  );

CREATE POLICY "Admins podem deletar pagamentos"
  ON public.pagamentos_venda FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.barbeiros
      WHERE id = get_current_barbeiro_id() AND nivel = 'administrador'
    )
  );

-- Trigger updated_at para contas_receber
CREATE TRIGGER update_contas_receber_updated_at
  BEFORE UPDATE ON public.contas_receber
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger para auto-popular empresa_id
CREATE TRIGGER set_contas_receber_empresa_id
  BEFORE INSERT ON public.contas_receber
  FOR EACH ROW
  EXECUTE FUNCTION public.set_empresa_id_from_context();

CREATE TRIGGER set_pagamentos_venda_empresa_id
  BEFORE INSERT ON public.pagamentos_venda
  FOR EACH ROW
  EXECUTE FUNCTION public.set_empresa_id_from_context();
