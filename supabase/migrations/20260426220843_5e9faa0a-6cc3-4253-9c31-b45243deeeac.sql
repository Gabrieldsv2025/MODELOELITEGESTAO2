CREATE OR REPLACE FUNCTION public.estornar_estoque_por_venda(
  p_venda_id uuid,
  p_empresa_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_item RECORD;
  v_receita RECORD;
  v_qtd_total NUMERIC;
  v_is_composto BOOLEAN;
  v_count INTEGER := 0;
  v_motivo TEXT := 'Estorno venda ' || p_venda_id::text;
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.movimentacoes_insumos mi WHERE mi.motivo = v_motivo
    UNION ALL
    SELECT 1 FROM public.movimentacoes_estoque me WHERE me.motivo = v_motivo
    LIMIT 1
  ) THEN
    RAISE LOG '[ESTORNO] Venda % já possui estorno registrado. Ignorando duplicidade.', p_venda_id;
    RETURN jsonb_build_object('success', true, 'already_reversed', true, 'venda_id', p_venda_id);
  END IF;

  RAISE LOG '[ESTORNO] Iniciando estorno da venda %', p_venda_id;

  FOR v_item IN
    SELECT iv.item_id, iv.quantidade, iv.tipo
    FROM public.itens_venda iv
    WHERE iv.venda_id = p_venda_id
      AND iv.tipo = 'produto'
  LOOP
    v_count := v_count + 1;

    SELECT COALESCE(p.is_composto, false) INTO v_is_composto
    FROM public.produtos p
    WHERE p.id = v_item.item_id;

    IF COALESCE(v_is_composto, false) THEN
      FOR v_receita IN
        SELECT pr.insumo_id, pr.quantidade_utilizada, i.custo_unitario
        FROM public.produtos_receitas pr
        JOIN public.insumos i ON i.id = pr.insumo_id
        WHERE pr.produto_id = v_item.item_id
      LOOP
        v_qtd_total := v_receita.quantidade_utilizada * v_item.quantidade;

        UPDATE public.insumos
        SET quantidade_estoque = quantidade_estoque + v_qtd_total,
            updated_at = now()
        WHERE id = v_receita.insumo_id;

        INSERT INTO public.movimentacoes_insumos (
          insumo_id, tipo, quantidade, custo_unitario, motivo, empresa_id
        ) VALUES (
          v_receita.insumo_id, 'entrada', v_qtd_total,
          v_receita.custo_unitario, v_motivo, p_empresa_id
        );

        RAISE LOG '[ESTORNO] Venda %: insumo % +%', p_venda_id, v_receita.insumo_id, v_qtd_total;
      END LOOP;
    ELSE
      UPDATE public.produtos
      SET estoque = estoque + v_item.quantidade,
          updated_at = now()
      WHERE id = v_item.item_id;

      INSERT INTO public.movimentacoes_estoque (
        produto_id, tipo, quantidade, motivo, empresa_id
      ) VALUES (
        v_item.item_id, 'entrada', v_item.quantidade, v_motivo, p_empresa_id
      );

      RAISE LOG '[ESTORNO] Venda %: produto % +%', p_venda_id, v_item.item_id, v_item.quantidade;
    END IF;
  END LOOP;

  RAISE LOG '[ESTORNO] Concluído venda % - % itens processados', p_venda_id, v_count;
  RETURN jsonb_build_object('success', true, 'already_reversed', false, 'venda_id', p_venda_id, 'itens_processados', v_count);
EXCEPTION WHEN OTHERS THEN
  RAISE LOG '[ESTORNO] Erro ao estornar venda %: % %', p_venda_id, SQLERRM, SQLSTATE;
  RAISE;
END;
$function$;

CREATE OR REPLACE FUNCTION public.estornar_estoque_venda()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF OLD.status IS DISTINCT FROM 'cancelado' AND NEW.status = 'cancelado' THEN
      PERFORM public.estornar_estoque_por_venda(NEW.id, NEW.empresa_id);
    END IF;

    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' THEN
    IF OLD.status IS DISTINCT FROM 'cancelado' THEN
      PERFORM public.estornar_estoque_por_venda(OLD.id, OLD.empresa_id);
    END IF;

    RETURN OLD;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$function$;

DROP TRIGGER IF EXISTS trg_estornar_estoque_venda ON public.vendas;
DROP TRIGGER IF EXISTS trg_estornar_estoque_venda_delete ON public.vendas;
DROP TRIGGER IF EXISTS trg_estornar_estoque_venda_update ON public.vendas;

CREATE TRIGGER trg_estornar_estoque_venda_delete
BEFORE DELETE ON public.vendas
FOR EACH ROW
EXECUTE FUNCTION public.estornar_estoque_venda();

CREATE TRIGGER trg_estornar_estoque_venda_update
BEFORE UPDATE OF status ON public.vendas
FOR EACH ROW
EXECUTE FUNCTION public.estornar_estoque_venda();