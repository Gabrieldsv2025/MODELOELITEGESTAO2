-- =====================================================================
-- A.1) Remove trigger duplicado
-- =====================================================================
DROP TRIGGER IF EXISTS save_commission_on_item_insert ON public.itens_venda;

-- =====================================================================
-- A.2) save_commission_history v2 — snapshot completo, idempotente,
--      com filtro de % > 0 e empresa_id correto
-- =====================================================================
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
  v_pct      NUMERIC;
  v_valor    NUMERIC;
BEGIN
  -- Defaults do barbeiro + empresa da venda
  SELECT v.barbeiro_id, v.empresa_id, b.comissao_servicos, b.comissao_produtos
  INTO v_barbeiro, v_empresa, v_def_serv, v_def_prod
  FROM public.vendas v
  JOIN public.barbeiros b ON b.id = v.barbeiro_id
  WHERE v.id = NEW.venda_id;

  -- Configuração específica > 0 (ignora linhas-placeholder com 0%)
  SELECT cc.percentual
  INTO v_pct
  FROM public.configuracoes_comissao cc
  WHERE cc.barbeiro_id = v_barbeiro
    AND cc.tipo = NEW.tipo
    AND COALESCE(cc.percentual, 0) > 0
    AND (
      (NEW.tipo = 'servico' AND cc.servico_id = NEW.item_id) OR
      (NEW.tipo = 'produto' AND cc.produto_id = NEW.item_id)
    )
  ORDER BY cc.updated_at DESC NULLS LAST
  LIMIT 1;

  -- Fallback: comissão padrão do barbeiro
  IF v_pct IS NULL THEN
    v_pct := CASE WHEN NEW.tipo = 'servico' THEN v_def_serv ELSE v_def_prod END;
  END IF;

  v_pct   := COALESCE(v_pct, 0);
  v_valor := ROUND( (COALESCE(NEW.subtotal,0) * v_pct) / 100.0, 2);

  -- UPSERT idempotente
  INSERT INTO public.comissoes_historico (
    venda_id, barbeiro_id, item_id, item_tipo,
    percentual_comissao, valor_comissao, empresa_id
  ) VALUES (
    NEW.venda_id, v_barbeiro, NEW.item_id, NEW.tipo,
    v_pct, v_valor, v_empresa
  )
  ON CONFLICT (venda_id, item_id) DO UPDATE
  SET percentual_comissao = EXCLUDED.percentual_comissao,
      valor_comissao      = EXCLUDED.valor_comissao,
      barbeiro_id         = EXCLUDED.barbeiro_id,
      item_tipo           = EXCLUDED.item_tipo,
      empresa_id          = COALESCE(EXCLUDED.empresa_id, public.comissoes_historico.empresa_id);

  RETURN NEW;
END;
$function$;

-- Garantir UNIQUE p/ ON CONFLICT funcionar
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conrelid = 'public.comissoes_historico'::regclass 
      AND conname = 'comissoes_historico_venda_item_uniq'
  ) THEN
    -- remover possíveis duplicatas antes de criar a constraint
    DELETE FROM public.comissoes_historico a
    USING public.comissoes_historico b
    WHERE a.ctid < b.ctid 
      AND a.venda_id = b.venda_id 
      AND a.item_id = b.item_id;

    ALTER TABLE public.comissoes_historico
      ADD CONSTRAINT comissoes_historico_venda_item_uniq
      UNIQUE (venda_id, item_id);
  END IF;
END $$;

-- =====================================================================
-- A.3) Backfill: corrige snapshots zerados aplicando a regra correta
-- =====================================================================
WITH calc AS (
  SELECT 
    ch.id,
    ch.venda_id,
    ch.item_id,
    iv.subtotal,
    COALESCE(
      (SELECT cc.percentual 
       FROM public.configuracoes_comissao cc
       WHERE cc.barbeiro_id = ch.barbeiro_id
         AND cc.tipo = ch.item_tipo
         AND COALESCE(cc.percentual,0) > 0
         AND ((ch.item_tipo = 'servico' AND cc.servico_id = ch.item_id)
           OR (ch.item_tipo = 'produto' AND cc.produto_id = ch.item_id))
       ORDER BY cc.updated_at DESC NULLS LAST
       LIMIT 1),
      CASE WHEN ch.item_tipo = 'servico' THEN b.comissao_servicos ELSE b.comissao_produtos END,
      0
    )::NUMERIC AS pct_correto
  FROM public.comissoes_historico ch
  JOIN public.itens_venda iv ON iv.venda_id = ch.venda_id AND iv.item_id = ch.item_id
  JOIN public.barbeiros b ON b.id = ch.barbeiro_id
  WHERE ch.valor_comissao = 0
)
UPDATE public.comissoes_historico ch
SET percentual_comissao = calc.pct_correto,
    valor_comissao      = ROUND((COALESCE(calc.subtotal,0) * calc.pct_correto)/100.0, 2)
FROM calc
WHERE ch.id = calc.id
  AND calc.pct_correto > 0;

-- =====================================================================
-- A.4) trigger_recalcular_indicadores_venda v2 — cobre DELETE/UPDATE total/data
-- =====================================================================
CREATE OR REPLACE FUNCTION public.trigger_recalcular_indicadores_venda()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_mes_old INT; v_ano_old INT;
  v_mes_new INT; v_ano_new INT;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_mes_old := EXTRACT(MONTH FROM OLD.data_venda)::INT;
    v_ano_old := EXTRACT(YEAR  FROM OLD.data_venda)::INT;
    PERFORM public.recalcular_indicadores_mensais(v_mes_old, v_ano_old);
    RETURN OLD;
  END IF;

  v_mes_new := EXTRACT(MONTH FROM NEW.data_venda)::INT;
  v_ano_new := EXTRACT(YEAR  FROM NEW.data_venda)::INT;

  IF TG_OP = 'INSERT' THEN
    PERFORM public.recalcular_indicadores_mensais(v_mes_new, v_ano_new);
    RETURN NEW;
  END IF;

  -- UPDATE: recalcula sempre que muda algo relevante OU mês/ano
  v_mes_old := EXTRACT(MONTH FROM OLD.data_venda)::INT;
  v_ano_old := EXTRACT(YEAR  FROM OLD.data_venda)::INT;

  IF (OLD.status     IS DISTINCT FROM NEW.status)
  OR (OLD.total      IS DISTINCT FROM NEW.total)
  OR (OLD.desconto   IS DISTINCT FROM NEW.desconto)
  OR (OLD.data_venda IS DISTINCT FROM NEW.data_venda) THEN
    PERFORM public.recalcular_indicadores_mensais(v_mes_new, v_ano_new);
    IF v_mes_old <> v_mes_new OR v_ano_old <> v_ano_new THEN
      PERFORM public.recalcular_indicadores_mensais(v_mes_old, v_ano_old);
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

-- Recriar trigger com AFTER INSERT OR UPDATE OR DELETE
DROP TRIGGER IF EXISTS trigger_venda_recalcular_indicadores ON public.vendas;
DROP TRIGGER IF EXISTS vendas_recalcular_indicadores ON public.vendas;
CREATE TRIGGER vendas_recalc_indicadores
AFTER INSERT OR UPDATE OR DELETE ON public.vendas
FOR EACH ROW EXECUTE FUNCTION public.trigger_recalcular_indicadores_venda();

-- =====================================================================
-- A.5) Triggers de recalc para comissoes_historico e itens_venda
-- =====================================================================
CREATE OR REPLACE FUNCTION public.trigger_recalc_indicadores_via_venda()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_venda_id UUID;
  v_data TIMESTAMPTZ;
BEGIN
  v_venda_id := COALESCE(NEW.venda_id, OLD.venda_id);
  SELECT data_venda INTO v_data FROM public.vendas WHERE id = v_venda_id;
  IF v_data IS NOT NULL THEN
    PERFORM public.recalcular_indicadores_mensais(
      EXTRACT(MONTH FROM v_data)::INT,
      EXTRACT(YEAR  FROM v_data)::INT
    );
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$function$;

DROP TRIGGER IF EXISTS comissoes_hist_recalc ON public.comissoes_historico;
CREATE TRIGGER comissoes_hist_recalc
AFTER INSERT OR UPDATE OR DELETE ON public.comissoes_historico
FOR EACH ROW EXECUTE FUNCTION public.trigger_recalc_indicadores_via_venda();

DROP TRIGGER IF EXISTS itens_venda_recalc ON public.itens_venda;
CREATE TRIGGER itens_venda_recalc
AFTER INSERT OR UPDATE OR DELETE ON public.itens_venda
FOR EACH ROW EXECUTE FUNCTION public.trigger_recalc_indicadores_via_venda();

-- =====================================================================
-- C) Estorno: ao cancelar venda (status -> cancelado), apagar comissões
--     (estorno de estoque já existe em outra trigger)
-- =====================================================================
CREATE OR REPLACE FUNCTION public.limpa_comissoes_venda_cancelada()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.status = 'cancelado' AND OLD.status IS DISTINCT FROM 'cancelado' THEN
    DELETE FROM public.comissoes_historico WHERE venda_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_cancela_venda_limpa_comissao ON public.vendas;
CREATE TRIGGER trg_cancela_venda_limpa_comissao
AFTER UPDATE OF status ON public.vendas
FOR EACH ROW EXECUTE FUNCTION public.limpa_comissoes_venda_cancelada();

-- =====================================================================
-- A.6) Realtime publication completa + REPLICA IDENTITY FULL
-- =====================================================================
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'comissoes_historico','indicadores_financeiros','despesas',
    'pagamentos_venda','contas_receber','barbeiros','configuracoes_comissao'
  ] LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename=t
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    END IF;
    EXECUTE format('ALTER TABLE public.%I REPLICA IDENTITY FULL', t);
  END LOOP;
END $$;

-- =====================================================================
-- A.7) Forçar recálculo de TODOS os meses com vendas/despesas
-- =====================================================================
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN (
    SELECT DISTINCT EXTRACT(MONTH FROM data_venda)::INT AS mes,
                    EXTRACT(YEAR  FROM data_venda)::INT AS ano
    FROM public.vendas
    UNION
    SELECT DISTINCT EXTRACT(MONTH FROM data_despesa)::INT,
                    EXTRACT(YEAR  FROM data_despesa)::INT
    FROM public.despesas
  ) LOOP
    PERFORM public.recalcular_indicadores_mensais(r.mes, r.ano);
  END LOOP;
END $$;