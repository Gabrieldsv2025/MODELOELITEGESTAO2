-- ============================================================
-- BLINDAGEM TOTAL DA IMUTABILIDADE DE COMISSÕES
-- ============================================================

-- 1.1) ⚠️ REVERTER O BACKFILL CATASTRÓFICO DA MIGRAÇÃO ANTERIOR
-- Identifica snapshots cujo percentual veio de uma configuração 
-- cadastrada/atualizada DEPOIS da data da venda e zera esses registros.
-- Critério: snapshot reflete config que não existia no momento da venda.
WITH snapshots_corrompidos AS (
  SELECT DISTINCT ch.id
  FROM public.comissoes_historico ch
  JOIN public.vendas v ON v.id = ch.venda_id
  JOIN public.configuracoes_comissao cc 
    ON cc.barbeiro_id = ch.barbeiro_id 
   AND cc.tipo = ch.item_tipo
   AND ((ch.item_tipo = 'servico' AND cc.servico_id = ch.item_id)
     OR (ch.item_tipo = 'produto' AND cc.produto_id = ch.item_id))
  WHERE ch.percentual_comissao > 0
    -- Configuração foi criada DEPOIS da venda
    AND cc.created_at > v.data_venda
    -- E o snapshot foi gravado ANTES da configuração existir
    -- (sinal de que foi reescrito por backfill posterior)
    AND ch.created_at < cc.created_at
    -- Apenas para snapshots cujo percentual bate exatamente com a config nova
    -- (proteção extra contra falso positivo)
    AND ch.percentual_comissao = cc.percentual
)
UPDATE public.comissoes_historico
SET percentual_comissao = 0,
    valor_comissao = 0
WHERE id IN (SELECT id FROM snapshots_corrompidos);

-- ============================================================
-- 1.2) REFATORAR save_commission_history — Snapshot LITERAL
-- ============================================================
-- Mudanças críticas:
-- a) Remove filtro `percentual > 0` — snapshot reflete EXATAMENTE a config no momento
-- b) Mantém ON CONFLICT DO NOTHING — snapshot é gravado UMA VEZ e nunca sobrescrito
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
  -- Buscar dados da venda + defaults do barbeiro
  SELECT v.barbeiro_id, v.empresa_id, b.comissao_servicos, b.comissao_produtos
  INTO v_barbeiro, v_empresa, v_def_serv, v_def_prod
  FROM public.vendas v
  JOIN public.barbeiros b ON b.id = v.barbeiro_id
  WHERE v.id = NEW.venda_id;

  -- Configuração específica para este item (SEM filtro >0)
  -- Se existe configuração cadastrada (mesmo que 0%), ela é a verdade.
  SELECT cc.percentual
  INTO v_pct
  FROM public.configuracoes_comissao cc
  WHERE cc.barbeiro_id = v_barbeiro
    AND cc.tipo = NEW.tipo
    AND (
      (NEW.tipo = 'servico' AND cc.servico_id = NEW.item_id) OR
      (NEW.tipo = 'produto' AND cc.produto_id = NEW.item_id)
    )
  LIMIT 1;

  -- Se NÃO há configuração específica, usa o default do barbeiro
  IF v_pct IS NULL THEN
    v_pct := CASE WHEN NEW.tipo = 'servico' THEN v_def_serv ELSE v_def_prod END;
  END IF;

  v_pct   := COALESCE(v_pct, 0);
  v_valor := ROUND( (COALESCE(NEW.subtotal,0) * v_pct) / 100.0, 2);

  -- INSERT idempotente: snapshot é gravado UMA ÚNICA VEZ
  -- DO NOTHING garante imutabilidade — qualquer tentativa de sobrescrita é bloqueada
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
-- 1.3) TRIGGER DE PROTEÇÃO — bloqueia UPDATE de snapshot existente
-- ============================================================
CREATE OR REPLACE FUNCTION public.proteger_snapshot_comissao()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Bloqueia qualquer alteração em percentual ou valor
  IF TG_OP = 'UPDATE' THEN
    IF OLD.percentual_comissao IS DISTINCT FROM NEW.percentual_comissao
       OR OLD.valor_comissao IS DISTINCT FROM NEW.valor_comissao THEN
      RAISE EXCEPTION 'Snapshot de comissão é imutável. Tentativa bloqueada para venda_id=%, item_id=%. Para corrigir manualmente, desabilite temporariamente este trigger via migração específica.',
        OLD.venda_id, OLD.item_id;
    END IF;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$function$;

DROP TRIGGER IF EXISTS protege_snapshot_comissao ON public.comissoes_historico;
CREATE TRIGGER protege_snapshot_comissao
BEFORE UPDATE ON public.comissoes_historico
FOR EACH ROW EXECUTE FUNCTION public.proteger_snapshot_comissao();

-- ============================================================
-- 1.4) GARANTIR que o trigger save_commission_history está ANEXADO
-- ============================================================
DROP TRIGGER IF EXISTS itens_venda_save_commission ON public.itens_venda;
DROP TRIGGER IF EXISTS save_commission_on_item_insert ON public.itens_venda;
DROP TRIGGER IF EXISTS trigger_save_commission_history ON public.itens_venda;

CREATE TRIGGER itens_venda_save_commission
AFTER INSERT ON public.itens_venda
FOR EACH ROW EXECUTE FUNCTION public.save_commission_history();

-- ============================================================
-- 1.5) RECALCULAR INDICADORES após o reparo
-- ============================================================
DO $$
DECLARE 
  r RECORD;
BEGIN
  FOR r IN (
    SELECT DISTINCT 
      EXTRACT(MONTH FROM data_venda)::INT AS mes,
      EXTRACT(YEAR FROM data_venda)::INT AS ano
    FROM public.vendas
  ) LOOP
    PERFORM public.recalcular_indicadores_mensais(r.mes, r.ano);
  END LOOP;
END $$;