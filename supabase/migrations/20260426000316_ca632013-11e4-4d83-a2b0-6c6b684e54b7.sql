
-- ========================================
-- 1. TABELA INSUMOS
-- ========================================
CREATE TABLE public.insumos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID,
  nome TEXT NOT NULL,
  descricao TEXT,
  unidade_medida TEXT NOT NULL CHECK (unidade_medida IN ('kg','g','l','ml','un')),
  quantidade_estoque NUMERIC(14,4) NOT NULL DEFAULT 0,
  custo_total_compra NUMERIC(12,2) NOT NULL DEFAULT 0,
  quantidade_compra NUMERIC(14,4) NOT NULL DEFAULT 0,
  custo_unitario NUMERIC(16,8) NOT NULL DEFAULT 0,
  estoque_minimo_alerta NUMERIC(14,4) NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.insumos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios podem ver insumos" ON public.insumos
  FOR SELECT USING (true);
CREATE POLICY "Usuarios podem inserir insumos" ON public.insumos
  FOR INSERT WITH CHECK (true);
CREATE POLICY "Usuarios podem atualizar insumos" ON public.insumos
  FOR UPDATE USING (true);
CREATE POLICY "Admins podem deletar insumos" ON public.insumos
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM barbeiros WHERE id = get_current_barbeiro_id() AND nivel = 'administrador')
  );

-- ========================================
-- 2. TABELA PRODUTOS_RECEITAS (Ficha Técnica)
-- ========================================
CREATE TABLE public.produtos_receitas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID,
  produto_id UUID NOT NULL REFERENCES public.produtos(id) ON DELETE CASCADE,
  insumo_id UUID NOT NULL REFERENCES public.insumos(id) ON DELETE RESTRICT,
  quantidade_utilizada NUMERIC(14,4) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (produto_id, insumo_id)
);

ALTER TABLE public.produtos_receitas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios podem gerenciar receitas" ON public.produtos_receitas
  FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX idx_produtos_receitas_produto ON public.produtos_receitas(produto_id);
CREATE INDEX idx_produtos_receitas_insumo ON public.produtos_receitas(insumo_id);

-- ========================================
-- 3. TABELA MOVIMENTACOES_INSUMOS
-- ========================================
CREATE TABLE public.movimentacoes_insumos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID,
  insumo_id UUID NOT NULL REFERENCES public.insumos(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('entrada','saida')),
  quantidade NUMERIC(14,4) NOT NULL,
  custo_unitario NUMERIC(16,8),
  motivo TEXT NOT NULL,
  observacoes TEXT,
  data_movimento TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.movimentacoes_insumos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios podem gerenciar movimentacoes insumos" ON public.movimentacoes_insumos
  FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX idx_mov_insumos_insumo ON public.movimentacoes_insumos(insumo_id);

-- ========================================
-- 4. ALTERAÇÕES EM TABELAS EXISTENTES
-- ========================================
ALTER TABLE public.produtos
  ADD COLUMN IF NOT EXISTS is_composto BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.itens_venda
  ADD COLUMN IF NOT EXISTS custo_cmv NUMERIC(12,2) DEFAULT 0;

-- ========================================
-- 5. TRIGGER updated_at em insumos
-- ========================================
CREATE TRIGGER trg_insumos_updated_at
  BEFORE UPDATE ON public.insumos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ========================================
-- 6. FUNÇÃO: calcular custo_unitario na unidade base
-- (kg → g, l → ml, un → un, g → g, ml → ml)
-- ========================================
CREATE OR REPLACE FUNCTION public.calcular_custo_unitario_insumo()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_qtd_base NUMERIC;
BEGIN
  -- Converter quantidade comprada para unidade base
  IF NEW.unidade_medida = 'kg' THEN
    v_qtd_base := NEW.quantidade_compra * 1000; -- kg -> g
  ELSIF NEW.unidade_medida = 'l' THEN
    v_qtd_base := NEW.quantidade_compra * 1000; -- l -> ml
  ELSE
    v_qtd_base := NEW.quantidade_compra; -- g, ml, un
  END IF;
  
  IF v_qtd_base IS NULL OR v_qtd_base <= 0 THEN
    NEW.custo_unitario := 0;
  ELSE
    NEW.custo_unitario := ROUND(NEW.custo_total_compra / v_qtd_base, 8);
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_calcular_custo_unitario
  BEFORE INSERT OR UPDATE OF custo_total_compra, quantidade_compra, unidade_medida
  ON public.insumos
  FOR EACH ROW EXECUTE FUNCTION public.calcular_custo_unitario_insumo();

-- ========================================
-- 7. FUNÇÃO: calcular CMV de um item
-- ========================================
CREATE OR REPLACE FUNCTION public.calcular_cmv_item(p_item_id UUID, p_tipo TEXT, p_quantidade INTEGER)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cmv NUMERIC := 0;
  v_is_composto BOOLEAN := false;
  v_preco_compra NUMERIC := 0;
BEGIN
  IF p_tipo = 'servico' THEN
    RETURN 0;
  END IF;
  
  -- Buscar info do produto
  SELECT COALESCE(is_composto, false), COALESCE(preco_compra, 0)
  INTO v_is_composto, v_preco_compra
  FROM public.produtos
  WHERE id = p_item_id;
  
  IF v_is_composto THEN
    -- Soma do custo dos insumos da receita
    SELECT COALESCE(SUM(pr.quantidade_utilizada * i.custo_unitario), 0)
    INTO v_cmv
    FROM public.produtos_receitas pr
    JOIN public.insumos i ON i.id = pr.insumo_id
    WHERE pr.produto_id = p_item_id;
    
    v_cmv := v_cmv * p_quantidade;
  ELSE
    v_cmv := v_preco_compra * p_quantidade;
  END IF;
  
  RETURN ROUND(COALESCE(v_cmv, 0), 2);
END;
$$;

-- ========================================
-- 8. ATUALIZAR inserir_itens_venda para gravar custo_cmv
-- ========================================
CREATE OR REPLACE FUNCTION public.inserir_itens_venda(p_itens jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item JSONB;
  v_preco NUMERIC;
  v_subtotal NUMERIC;
  v_quantidade INTEGER;
  v_item_id UUID;
  v_tipo TEXT;
  v_cmv NUMERIC;
BEGIN
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_itens)
  LOOP
    v_preco := sanitize_numeric(v_item->>'preco', false);
    v_subtotal := sanitize_numeric(v_item->>'subtotal', false);
    v_quantidade := GREATEST(1, (v_item->>'quantidade')::INTEGER);
    v_item_id := (v_item->>'item_id')::UUID;
    v_tipo := v_item->>'tipo';
    
    -- Calcular CMV (snapshot no momento da venda)
    v_cmv := public.calcular_cmv_item(v_item_id, v_tipo, v_quantidade);
    
    INSERT INTO public.itens_venda (
      id, venda_id, tipo, item_id, nome,
      preco, quantidade, subtotal, empresa_id, custo_cmv
    ) VALUES (
      (v_item->>'id')::UUID,
      (v_item->>'venda_id')::UUID,
      v_tipo,
      v_item_id,
      v_item->>'nome',
      v_preco,
      v_quantidade,
      v_subtotal,
      (v_item->>'empresa_id')::UUID,
      v_cmv
    );
  END LOOP;
END;
$$;

-- ========================================
-- 9. RPC: dar baixa em insumos de uma venda
-- ========================================
CREATE OR REPLACE FUNCTION public.dar_baixa_insumos_venda(p_venda_id UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item RECORD;
  v_receita RECORD;
  v_qtd_total NUMERIC;
  v_resultado jsonb := '[]'::jsonb;
BEGIN
  -- Para cada item composto da venda
  FOR v_item IN
    SELECT iv.item_id, iv.quantidade
    FROM public.itens_venda iv
    JOIN public.produtos p ON p.id = iv.item_id
    WHERE iv.venda_id = p_venda_id
      AND iv.tipo = 'produto'
      AND COALESCE(p.is_composto, false) = true
  LOOP
    -- Para cada insumo da receita
    FOR v_receita IN
      SELECT pr.insumo_id, pr.quantidade_utilizada, i.custo_unitario, i.nome
      FROM public.produtos_receitas pr
      JOIN public.insumos i ON i.id = pr.insumo_id
      WHERE pr.produto_id = v_item.item_id
    LOOP
      v_qtd_total := v_receita.quantidade_utilizada * v_item.quantidade;
      
      -- Decrementar estoque (pode ficar negativo)
      UPDATE public.insumos
      SET quantidade_estoque = quantidade_estoque - v_qtd_total,
          updated_at = now()
      WHERE id = v_receita.insumo_id;
      
      -- Registrar movimentação
      INSERT INTO public.movimentacoes_insumos (
        insumo_id, tipo, quantidade, custo_unitario, motivo
      ) VALUES (
        v_receita.insumo_id, 'saida', v_qtd_total,
        v_receita.custo_unitario, 'Venda ' || p_venda_id::text
      );
    END LOOP;
  END LOOP;
  
  RETURN jsonb_build_object('success', true, 'venda_id', p_venda_id);
END;
$$;

-- ========================================
-- 10. RPC: validar disponibilidade de insumos para uma lista de itens
-- ========================================
CREATE OR REPLACE FUNCTION public.validar_disponibilidade_insumos(p_itens jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item JSONB;
  v_produto_id UUID;
  v_quantidade INTEGER;
  v_is_composto BOOLEAN;
  v_receita RECORD;
  v_qtd_necessaria NUMERIC;
  v_estoque_atual NUMERIC;
  v_alertas jsonb := '[]'::jsonb;
BEGIN
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_itens)
  LOOP
    IF (v_item->>'tipo') <> 'produto' THEN CONTINUE; END IF;
    v_produto_id := (v_item->>'item_id')::UUID;
    v_quantidade := GREATEST(1, (v_item->>'quantidade')::INTEGER);
    
    SELECT COALESCE(is_composto, false) INTO v_is_composto
    FROM public.produtos WHERE id = v_produto_id;
    
    IF NOT v_is_composto THEN CONTINUE; END IF;
    
    FOR v_receita IN
      SELECT pr.quantidade_utilizada, i.id AS insumo_id, i.nome, i.unidade_medida, i.quantidade_estoque
      FROM public.produtos_receitas pr
      JOIN public.insumos i ON i.id = pr.insumo_id
      WHERE pr.produto_id = v_produto_id
    LOOP
      v_qtd_necessaria := v_receita.quantidade_utilizada * v_quantidade;
      v_estoque_atual := v_receita.quantidade_estoque;
      
      IF v_estoque_atual < v_qtd_necessaria THEN
        v_alertas := v_alertas || jsonb_build_object(
          'insumo_id', v_receita.insumo_id,
          'insumo_nome', v_receita.nome,
          'unidade', v_receita.unidade_medida,
          'necessario', v_qtd_necessaria,
          'disponivel', v_estoque_atual,
          'falta', v_qtd_necessaria - v_estoque_atual
        );
      END IF;
    END LOOP;
  END LOOP;
  
  RETURN jsonb_build_object(
    'ok', jsonb_array_length(v_alertas) = 0,
    'alertas', v_alertas
  );
END;
$$;

-- ========================================
-- 11. ATUALIZAR recalcular_indicadores_mensais para usar custo_cmv
-- ========================================
CREATE OR REPLACE FUNCTION public.recalcular_indicadores_mensais(p_mes integer, p_ano integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_faturamento_bruto NUMERIC := 0;
  v_faturamento_liquido NUMERIC := 0;
  v_total_despesas NUMERIC := 0;
  v_custo_produtos NUMERIC := 0;
  v_total_comissoes NUMERIC := 0;
  v_numero_vendas INTEGER := 0;
  v_lucro_bruto NUMERIC := 0;
  v_lucro_liquido NUMERIC := 0;
  v_margem_bruta NUMERIC := 0;
  v_margem_liquida NUMERIC := 0;
  v_ticket_medio NUMERIC := 0;
BEGIN
  SELECT COALESCE(SUM(total), 0), COUNT(*)
  INTO v_faturamento_bruto, v_numero_vendas
  FROM public.vendas
  WHERE EXTRACT(MONTH FROM data_venda) = p_mes
    AND EXTRACT(YEAR FROM data_venda) = p_ano
    AND status = 'pago';
  
  SELECT COALESCE(SUM(valor), 0)
  INTO v_total_despesas
  FROM public.despesas
  WHERE EXTRACT(MONTH FROM data_despesa) = p_mes
    AND EXTRACT(YEAR FROM data_despesa) = p_ano
    AND status = 'ativo';
  
  -- CMV: usa custo_cmv quando > 0, senão fallback para preco_compra
  SELECT COALESCE(SUM(
    CASE 
      WHEN COALESCE(iv.custo_cmv, 0) > 0 THEN iv.custo_cmv
      ELSE iv.quantidade * COALESCE(p.preco_compra, 0)
    END
  ), 0)
  INTO v_custo_produtos
  FROM public.vendas v
  JOIN public.itens_venda iv ON iv.venda_id = v.id
  LEFT JOIN public.produtos p ON p.id = iv.item_id
  WHERE iv.tipo = 'produto'
    AND EXTRACT(MONTH FROM v.data_venda) = p_mes
    AND EXTRACT(YEAR FROM v.data_venda) = p_ano
    AND v.status = 'pago';
  
  SELECT COALESCE(SUM(ch.valor_comissao), 0)
  INTO v_total_comissoes
  FROM public.comissoes_historico ch
  JOIN public.vendas v ON v.id = ch.venda_id
  WHERE EXTRACT(MONTH FROM v.data_venda) = p_mes
    AND EXTRACT(YEAR FROM v.data_venda) = p_ano
    AND v.status = 'pago';
  
  v_lucro_bruto := v_faturamento_bruto - v_custo_produtos - v_total_comissoes;
  v_faturamento_liquido := v_faturamento_bruto - v_total_despesas - v_total_comissoes;
  v_lucro_liquido := v_lucro_bruto - v_total_despesas;
  
  IF v_faturamento_bruto > 0 THEN
    v_margem_bruta := (v_lucro_bruto / v_faturamento_bruto) * 100;
    v_margem_liquida := (v_lucro_liquido / v_faturamento_bruto) * 100;
    v_ticket_medio := v_faturamento_bruto / NULLIF(v_numero_vendas, 0);
  END IF;
  
  INSERT INTO public.indicadores_financeiros (
    mes_referencia, ano_referencia, faturamento_bruto, faturamento_liquido,
    total_despesas, custo_produtos, lucro_bruto, lucro_liquido,
    margem_bruta, margem_liquida, total_comissoes, numero_vendas, ticket_medio
  ) VALUES (
    p_mes, p_ano, v_faturamento_bruto, v_faturamento_liquido,
    v_total_despesas, v_custo_produtos, v_lucro_bruto, v_lucro_liquido,
    v_margem_bruta, v_margem_liquida, v_total_comissoes, v_numero_vendas, v_ticket_medio
  )
  ON CONFLICT (mes_referencia, ano_referencia)
  DO UPDATE SET
    faturamento_bruto = EXCLUDED.faturamento_bruto,
    faturamento_liquido = EXCLUDED.faturamento_liquido,
    total_despesas = EXCLUDED.total_despesas,
    custo_produtos = EXCLUDED.custo_produtos,
    lucro_bruto = EXCLUDED.lucro_bruto,
    lucro_liquido = EXCLUDED.lucro_liquido,
    margem_bruta = EXCLUDED.margem_bruta,
    margem_liquida = EXCLUDED.margem_liquida,
    total_comissoes = EXCLUDED.total_comissoes,
    numero_vendas = EXCLUDED.numero_vendas,
    ticket_medio = EXCLUDED.ticket_medio,
    updated_at = NOW();
END;
$$;
