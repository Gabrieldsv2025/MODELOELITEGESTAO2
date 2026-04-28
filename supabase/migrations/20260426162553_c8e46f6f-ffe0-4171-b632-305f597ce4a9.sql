-- 1. Estorno retroativo das 2 vendas de Açaí já excluídas
-- Venda 1: d3ffe43c-ac4a-40da-984b-34bbfc39361a (excluída antes da trigger existir)
-- Venda 2: fbb03167-d697-4be0-a3d3-26eb4b06864b (excluída — verificar se trigger rodou)

-- Restaurar estoque dos insumos (2× quantidades de cada item da receita do Açaí)
UPDATE public.insumos
SET quantidade_estoque = quantidade_estoque + 700,  -- 2 vendas × 350g de Açaí
    updated_at = now()
WHERE id = '70fff772-c14b-403a-94b1-00d78fb99e29';  -- Acai de 1kg

UPDATE public.insumos
SET quantidade_estoque = quantidade_estoque + 50,   -- 2 vendas × 25g de Granola
    updated_at = now()
WHERE id = 'cae04231-7cde-4a21-a67b-2ef00fe5edc1';  -- GRANOLA

UPDATE public.insumos
SET quantidade_estoque = quantidade_estoque + 2,    -- 2 vendas × 1 colher
    updated_at = now()
WHERE id = 'c4a750fd-f19a-491d-b4bb-b645c731afe0';  -- Colheres

-- Registrar movimentações de auditoria do estorno retroativo
INSERT INTO public.movimentacoes_insumos (insumo_id, tipo, quantidade, custo_unitario, motivo) VALUES
  ('70fff772-c14b-403a-94b1-00d78fb99e29', 'entrada', 350, 0.04, 'Estorno retroativo venda d3ffe43c-ac4a-40da-984b-34bbfc39361a'),
  ('cae04231-7cde-4a21-a67b-2ef00fe5edc1', 'entrada', 25,  0.04, 'Estorno retroativo venda d3ffe43c-ac4a-40da-984b-34bbfc39361a'),
  ('c4a750fd-f19a-491d-b4bb-b645c731afe0', 'entrada', 1,   0.20, 'Estorno retroativo venda d3ffe43c-ac4a-40da-984b-34bbfc39361a'),
  ('70fff772-c14b-403a-94b1-00d78fb99e29', 'entrada', 350, 0.04, 'Estorno retroativo venda fbb03167-d697-4be0-a3d3-26eb4b06864b'),
  ('cae04231-7cde-4a21-a67b-2ef00fe5edc1', 'entrada', 25,  0.04, 'Estorno retroativo venda fbb03167-d697-4be0-a3d3-26eb4b06864b'),
  ('c4a750fd-f19a-491d-b4bb-b645c731afe0', 'entrada', 1,   0.20, 'Estorno retroativo venda fbb03167-d697-4be0-a3d3-26eb4b06864b');

-- 2. Reforçar a função de estorno com logging defensivo via RAISE NOTICE
CREATE OR REPLACE FUNCTION public.estornar_estoque_venda()
RETURNS trigger
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
BEGIN
  RAISE NOTICE '[ESTORNO] Iniciando estorno da venda %', OLD.id;

  FOR v_item IN
    SELECT iv.item_id, iv.quantidade, iv.tipo
    FROM public.itens_venda iv
    WHERE iv.venda_id = OLD.id
      AND iv.tipo = 'produto'
  LOOP
    v_count := v_count + 1;
    SELECT COALESCE(p.is_composto, false) INTO v_is_composto
    FROM public.produtos p
    WHERE p.id = v_item.item_id;

    IF v_is_composto THEN
      RAISE NOTICE '[ESTORNO] Item composto % qty=%', v_item.item_id, v_item.quantidade;
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
        RAISE NOTICE '[ESTORNO] Insumo % +%', v_receita.insumo_id, v_qtd_total;
      END LOOP;
    ELSE
      RAISE NOTICE '[ESTORNO] Produto revenda % qty=%', v_item.item_id, v_item.quantidade;
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

  RAISE NOTICE '[ESTORNO] Concluído venda % - % itens processados', OLD.id, v_count;
  RETURN OLD;
END;
$function$;