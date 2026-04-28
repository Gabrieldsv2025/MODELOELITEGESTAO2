DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'insumos'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.insumos;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.excluir_venda_com_estorno(p_venda_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_empresa_id UUID;
  v_status TEXT;
BEGIN
  SELECT empresa_id, status
  INTO v_empresa_id, v_status
  FROM public.vendas
  WHERE id = p_venda_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Venda não encontrada', 'venda_id', p_venda_id);
  END IF;

  PERFORM public.estornar_estoque_por_venda(p_venda_id, v_empresa_id);

  DELETE FROM public.pagamentos_venda WHERE venda_id = p_venda_id;
  DELETE FROM public.contas_receber WHERE venda_id = p_venda_id;
  DELETE FROM public.comissoes_historico WHERE venda_id = p_venda_id;
  DELETE FROM public.historico_atendimentos WHERE venda_id = p_venda_id;
  DELETE FROM public.itens_venda WHERE venda_id = p_venda_id;
  DELETE FROM public.vendas WHERE id = p_venda_id;

  RETURN jsonb_build_object('success', true, 'venda_id', p_venda_id);
EXCEPTION WHEN OTHERS THEN
  RAISE LOG '[EXCLUIR_VENDA] Erro ao excluir venda %: % %', p_venda_id, SQLERRM, SQLSTATE;
  RAISE;
END;
$function$;