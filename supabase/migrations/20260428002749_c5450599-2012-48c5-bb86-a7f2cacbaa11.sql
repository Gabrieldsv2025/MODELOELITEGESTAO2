-- Recuperação cirúrgica: snapshots zerados do Mickael em 2025
-- Aplica percentual atual cadastrado (específico>0, senão geral do barbeiro)
-- Não altera lógica, não toca em outros barbeiros, não toca em outros anos

DO $$
DECLARE
  v_mickael_id UUID;
  v_rec RECORD;
  v_pct_esp NUMERIC;
  v_pct_def NUMERIC;
  v_pct NUMERIC;
  v_novo_valor NUMERIC;
  v_count INT := 0;
  v_total NUMERIC := 0;
BEGIN
  SELECT id INTO v_mickael_id FROM public.barbeiros WHERE nome ILIKE '%mickael%' LIMIT 1;
  IF v_mickael_id IS NULL THEN
    RAISE EXCEPTION 'Barbeiro Mickael não encontrado';
  END IF;

  -- Desabilitar trigger de imutabilidade temporariamente
  ALTER TABLE public.comissoes_historico DISABLE TRIGGER USER;

  FOR v_rec IN
    SELECT ch.id AS ch_id, ch.item_id, ch.item_tipo, ch.venda_id,
           ch.percentual_comissao AS pct_anterior, ch.valor_comissao AS valor_anterior,
           ch.empresa_id, iv.subtotal,
           b.comissao_servicos, b.comissao_produtos
    FROM public.comissoes_historico ch
    JOIN public.vendas v ON v.id = ch.venda_id
    JOIN public.itens_venda iv ON iv.venda_id = ch.venda_id AND iv.item_id = ch.item_id
    JOIN public.barbeiros b ON b.id = ch.barbeiro_id
    WHERE ch.barbeiro_id = v_mickael_id
      AND ch.valor_comissao = 0
      AND EXTRACT(YEAR FROM v.data_venda) = 2025
      AND v.status = 'pago'
  LOOP
    -- Específico
    SELECT cc.percentual INTO v_pct_esp
    FROM public.configuracoes_comissao cc
    WHERE cc.barbeiro_id = v_mickael_id
      AND cc.tipo = v_rec.item_tipo
      AND ((v_rec.item_tipo = 'servico' AND cc.servico_id = v_rec.item_id)
        OR (v_rec.item_tipo = 'produto' AND cc.produto_id = v_rec.item_id))
    LIMIT 1;

    v_pct_def := CASE WHEN v_rec.item_tipo = 'servico' THEN v_rec.comissao_servicos ELSE v_rec.comissao_produtos END;

    IF v_pct_esp IS NOT NULL AND v_pct_esp > 0 THEN
      v_pct := v_pct_esp;
    ELSIF v_pct_def IS NOT NULL AND v_pct_def > 0 THEN
      v_pct := v_pct_def;
    ELSE
      v_pct := 0;
    END IF;

    IF v_pct > 0 THEN
      v_novo_valor := ROUND((COALESCE(v_rec.subtotal, 0) * v_pct) / 100.0, 2);

      UPDATE public.comissoes_historico
      SET percentual_comissao = v_pct,
          valor_comissao = v_novo_valor
      WHERE id = v_rec.ch_id;

      INSERT INTO public.comissoes_historico_auditoria (
        comissao_id, venda_id, barbeiro_id, item_id, item_tipo,
        percentual_anterior, percentual_novo, valor_anterior, valor_novo,
        motivo, empresa_id
      ) VALUES (
        v_rec.ch_id, v_rec.venda_id, v_mickael_id, v_rec.item_id, v_rec.item_tipo,
        v_rec.pct_anterior, v_pct, v_rec.valor_anterior, v_novo_valor,
        'Recuperação 2025 Mickael - aplicado percentual atual cadastrado', v_rec.empresa_id
      );

      v_count := v_count + 1;
      v_total := v_total + v_novo_valor;
    END IF;

    v_pct_esp := NULL;
  END LOOP;

  -- Reabilitar trigger
  ALTER TABLE public.comissoes_historico ENABLE TRIGGER USER;

  RAISE NOTICE 'Atualizados % snapshots, total R$ %', v_count, v_total;

  -- Recalcular indicadores dos meses afetados (set 2025 a dez 2025)
  PERFORM public.recalcular_indicadores_mensais(9, 2025);
  PERFORM public.recalcular_indicadores_mensais(10, 2025);
  PERFORM public.recalcular_indicadores_mensais(11, 2025);
  PERFORM public.recalcular_indicadores_mensais(12, 2025);
END $$;