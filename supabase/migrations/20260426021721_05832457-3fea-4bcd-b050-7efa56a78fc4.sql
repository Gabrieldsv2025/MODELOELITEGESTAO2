-- Função: estornar estoque (produtos de revenda + insumos de compostos) ao excluir venda
CREATE OR REPLACE FUNCTION public.estornar_estoque_venda()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item RECORD;
  v_receita RECORD;
  v_qtd_total NUMERIC;
  v_is_composto BOOLEAN;
BEGIN
  -- Itera todos os itens da venda excluída
  FOR v_item IN
    SELECT iv.item_id, iv.quantidade, iv.tipo
    FROM public.itens_venda iv
    WHERE iv.venda_id = OLD.id
      AND iv.tipo = 'produto'
  LOOP
    SELECT COALESCE(p.is_composto, false) INTO v_is_composto
    FROM public.produtos p
    WHERE p.id = v_item.item_id;

    IF v_is_composto THEN
      -- Estornar insumos da receita
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
          insumo_id, tipo, quantidade, custo_unitario, motivo
        ) VALUES (
          v_receita.insumo_id, 'entrada', v_qtd_total,
          v_receita.custo_unitario, 'Estorno venda ' || OLD.id::text
        );
      END LOOP;
    ELSE
      -- Estornar estoque do produto de revenda
      UPDATE public.produtos
      SET estoque = estoque + v_item.quantidade,
          updated_at = now()
      WHERE id = v_item.item_id;

      INSERT INTO public.movimentacoes_estoque (
        produto_id, tipo, quantidade, motivo, empresa_id
      ) VALUES (
        v_item.item_id, 'entrada', v_item.quantidade,
        'Estorno venda ' || OLD.id::text, OLD.empresa_id
      );
    END IF;
  END LOOP;

  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_estornar_estoque_venda ON public.vendas;

CREATE TRIGGER trg_estornar_estoque_venda
BEFORE DELETE ON public.vendas
FOR EACH ROW
EXECUTE FUNCTION public.estornar_estoque_venda();