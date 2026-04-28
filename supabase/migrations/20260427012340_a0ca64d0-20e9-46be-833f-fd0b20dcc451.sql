
-- ============================================================
-- 1) AJUSTAR REGRA DO SNAPSHOT: específico>0 → geral barbeiro>0 → 0
--    (não usar config específica =0 para anular a comissão geral do barbeiro)
-- ============================================================
CREATE OR REPLACE FUNCTION public.save_commission_history()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_barbeiro UUID;
  v_empresa  UUID;
  v_def_serv NUMERIC;
  v_def_prod NUMERIC;
  v_pct_especifico NUMERIC;
  v_pct_default    NUMERIC;
  v_pct      NUMERIC;
  v_valor    NUMERIC;
BEGIN
  SELECT v.barbeiro_id, v.empresa_id, b.comissao_servicos, b.comissao_produtos
  INTO v_barbeiro, v_empresa, v_def_serv, v_def_prod
  FROM public.vendas v
  JOIN public.barbeiros b ON b.id = v.barbeiro_id
  WHERE v.id = NEW.venda_id;

  -- Configuração específica do item (pode ser 0)
  SELECT cc.percentual
  INTO v_pct_especifico
  FROM public.configuracoes_comissao cc
  WHERE cc.barbeiro_id = v_barbeiro
    AND cc.tipo = NEW.tipo
    AND (
      (NEW.tipo = 'servico' AND cc.servico_id = NEW.item_id) OR
      (NEW.tipo = 'produto' AND cc.produto_id = NEW.item_id)
    )
  LIMIT 1;

  v_pct_default := CASE WHEN NEW.tipo = 'servico' THEN v_def_serv ELSE v_def_prod END;

  -- Prioridade: específico>0 → geral>0 → 0
  IF v_pct_especifico IS NOT NULL AND v_pct_especifico > 0 THEN
    v_pct := v_pct_especifico;
  ELSIF v_pct_default IS NOT NULL AND v_pct_default > 0 THEN
    v_pct := v_pct_default;
  ELSE
    v_pct := 0;
  END IF;

  v_valor := ROUND( (COALESCE(NEW.subtotal,0) * v_pct) / 100.0, 2);

  -- Snapshot é gravado UMA vez (DO NOTHING continua valendo)
  INSERT INTO public.comissoes_historico (
    venda_id, barbeiro_id, item_id, item_tipo,
    percentual_comissao, valor_comissao, empresa_id
  ) VALUES (
    NEW.venda_id, v_barbeiro, NEW.item_id, NEW.tipo,
    v_pct, v_valor, v_empresa
  )
  ON CONFLICT (venda_id, item_id) DO NOTHING;

  RETURN NEW;
END;
$function$;

-- ============================================================
-- 2) AUDITORIA das correções (para rastreabilidade)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.comissoes_historico_auditoria (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  comissao_id UUID NOT NULL,
  venda_id UUID NOT NULL,
  barbeiro_id UUID NOT NULL,
  item_id UUID NOT NULL,
  item_tipo TEXT NOT NULL,
  percentual_anterior NUMERIC(10,2) NOT NULL,
  valor_anterior NUMERIC(10,2) NOT NULL,
  percentual_novo NUMERIC(10,2) NOT NULL,
  valor_novo NUMERIC(10,2) NOT NULL,
  motivo TEXT NOT NULL,
  empresa_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.comissoes_historico_auditoria ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins veem auditoria de comissoes" ON public.comissoes_historico_auditoria;
CREATE POLICY "Admins veem auditoria de comissoes"
ON public.comissoes_historico_auditoria
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.barbeiros b
  WHERE b.id = public.get_current_barbeiro_id()
    AND b.nivel = 'administrador'
));

DROP POLICY IF EXISTS "Sistema insere auditoria" ON public.comissoes_historico_auditoria;
CREATE POLICY "Sistema insere auditoria"
ON public.comissoes_historico_auditoria
FOR INSERT
WITH CHECK (true);

-- ============================================================
-- 3) REPARO SEGURO: restaurar somente quando há evidência histórica
-- ============================================================
DO $$
DECLARE
  r RECORD;
  v_pct_evidencia NUMERIC;
  v_novo_valor NUMERIC;
  v_meses_afetados TEXT[] := ARRAY[]::TEXT[];
BEGIN
  -- Desabilitar trigger de proteção temporariamente para reparo controlado
  ALTER TABLE public.comissoes_historico DISABLE TRIGGER protege_snapshot_comissao;

  FOR r IN
    SELECT ch.id, ch.venda_id, ch.barbeiro_id, ch.item_id, ch.item_tipo,
           ch.percentual_comissao AS pct_atual, ch.valor_comissao AS val_atual,
           v.data_venda, v.empresa_id, iv.subtotal
    FROM public.comissoes_historico ch
    JOIN public.vendas v ON v.id = ch.venda_id
    JOIN public.itens_venda iv ON iv.venda_id = ch.venda_id AND iv.item_id = ch.item_id
    WHERE ch.valor_comissao = 0
      AND v.status = 'pago'
  LOOP
    -- Buscar último snapshot positivo ANTERIOR para o mesmo barbeiro/item/tipo
    SELECT ch2.percentual_comissao
    INTO v_pct_evidencia
    FROM public.comissoes_historico ch2
    JOIN public.vendas v2 ON v2.id = ch2.venda_id
    WHERE ch2.barbeiro_id = r.barbeiro_id
      AND ch2.item_id = r.item_id
      AND ch2.item_tipo = r.item_tipo
      AND ch2.percentual_comissao > 0
      AND v2.data_venda < r.data_venda
    ORDER BY v2.data_venda DESC
    LIMIT 1;

    IF v_pct_evidencia IS NOT NULL AND v_pct_evidencia > 0 THEN
      v_novo_valor := ROUND( (COALESCE(r.subtotal,0) * v_pct_evidencia) / 100.0, 2);

      INSERT INTO public.comissoes_historico_auditoria (
        comissao_id, venda_id, barbeiro_id, item_id, item_tipo,
        percentual_anterior, valor_anterior, percentual_novo, valor_novo,
        motivo, empresa_id
      ) VALUES (
        r.id, r.venda_id, r.barbeiro_id, r.item_id, r.item_tipo,
        r.pct_atual, r.val_atual, v_pct_evidencia, v_novo_valor,
        'Reparo: restaurado a partir de snapshot positivo anterior do mesmo barbeiro/item',
        r.empresa_id
      );

      UPDATE public.comissoes_historico
      SET percentual_comissao = v_pct_evidencia,
          valor_comissao      = v_novo_valor
      WHERE id = r.id;
    END IF;
  END LOOP;

  -- Reativar trigger de proteção
  ALTER TABLE public.comissoes_historico ENABLE TRIGGER protege_snapshot_comissao;
END $$;

-- ============================================================
-- 4) RECALCULAR INDICADORES FINANCEIROS de todos os meses afetados
-- ============================================================
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN (
    SELECT DISTINCT
      EXTRACT(MONTH FROM v.data_venda)::INT AS mes,
      EXTRACT(YEAR  FROM v.data_venda)::INT AS ano
    FROM public.vendas v
  ) LOOP
    PERFORM public.recalcular_indicadores_mensais(r.mes, r.ano);
  END LOOP;
END $$;
