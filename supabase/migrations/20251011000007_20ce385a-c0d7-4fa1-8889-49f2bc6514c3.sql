-- Corrigir cálculo de margem bruta para incluir comissões
CREATE OR REPLACE FUNCTION public.recalcular_indicadores_mensais(p_mes integer, p_ano integer)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  -- Calcular faturamento bruto (soma de todas as vendas pagas do mês)
  SELECT COALESCE(SUM(total), 0), COUNT(*)
  INTO v_faturamento_bruto, v_numero_vendas
  FROM public.vendas
  WHERE EXTRACT(MONTH FROM data_venda) = p_mes
    AND EXTRACT(YEAR FROM data_venda) = p_ano
    AND status = 'pago';
  
  -- Calcular total de despesas do mês
  SELECT COALESCE(SUM(valor), 0)
  INTO v_total_despesas
  FROM public.despesas
  WHERE EXTRACT(MONTH FROM data_despesa) = p_mes
    AND EXTRACT(YEAR FROM data_despesa) = p_ano
    AND status = 'ativo';
  
  -- Calcular custo de produtos vendidos
  SELECT COALESCE(SUM(iv.quantidade * p.preco_compra), 0)
  INTO v_custo_produtos
  FROM public.vendas v
  JOIN public.itens_venda iv ON iv.venda_id = v.id
  JOIN public.produtos p ON p.id = iv.item_id
  WHERE iv.tipo = 'produto'
    AND EXTRACT(MONTH FROM v.data_venda) = p_mes
    AND EXTRACT(YEAR FROM v.data_venda) = p_ano
    AND v.status = 'pago';
  
  -- Calcular total de comissões do mês
  SELECT COALESCE(SUM(ch.valor_comissao), 0)
  INTO v_total_comissoes
  FROM public.comissoes_historico ch
  JOIN public.vendas v ON v.id = ch.venda_id
  WHERE EXTRACT(MONTH FROM v.data_venda) = p_mes
    AND EXTRACT(YEAR FROM v.data_venda) = p_ano
    AND v.status = 'pago';
  
  -- Calcular lucro bruto (faturamento - custo produtos - comissões)
  v_lucro_bruto := v_faturamento_bruto - v_custo_produtos - v_total_comissoes;
  
  -- Calcular faturamento líquido (faturamento bruto - despesas - comissões)
  v_faturamento_liquido := v_faturamento_bruto - v_total_despesas - v_total_comissoes;
  
  -- Calcular lucro líquido (lucro bruto - despesas)
  v_lucro_liquido := v_lucro_bruto - v_total_despesas;
  
  -- Calcular margens
  IF v_faturamento_bruto > 0 THEN
    v_margem_bruta := (v_lucro_bruto / v_faturamento_bruto) * 100;
    v_margem_liquida := (v_lucro_liquido / v_faturamento_bruto) * 100;
    v_ticket_medio := v_faturamento_bruto / NULLIF(v_numero_vendas, 0);
  END IF;
  
  -- Inserir ou atualizar indicadores
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
$function$;

-- Recalcular todos os indicadores dos últimos 12 meses
DO $$
DECLARE
  mes_atual INTEGER;
  ano_atual INTEGER;
BEGIN
  FOR i IN 0..11 LOOP
    mes_atual := EXTRACT(MONTH FROM (CURRENT_DATE - (i || ' months')::INTERVAL));
    ano_atual := EXTRACT(YEAR FROM (CURRENT_DATE - (i || ' months')::INTERVAL));
    PERFORM recalcular_indicadores_mensais(mes_atual, ano_atual);
  END LOOP;
END $$;