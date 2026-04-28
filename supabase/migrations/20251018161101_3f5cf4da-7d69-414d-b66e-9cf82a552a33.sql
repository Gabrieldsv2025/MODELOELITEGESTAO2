-- Migration: Corrigir comissões históricas para barbeiros com 0%
-- Objetivo: Inserir histórico de comissões 0% para vendas antigas de barbeiros 
-- que atualmente têm comissão configurada como 0%, mas não têm histórico salvo

-- Inserir histórico de comissões 0% para itens sem histórico de barbeiros com comissão 0%
INSERT INTO comissoes_historico (
  venda_id,
  barbeiro_id,
  item_id,
  item_tipo,
  percentual_comissao,
  valor_comissao,
  empresa_id
)
SELECT DISTINCT
  iv.venda_id,
  v.barbeiro_id,
  iv.item_id,
  iv.tipo as item_tipo,
  0.00 as percentual_comissao,
  0.00 as valor_comissao,
  v.empresa_id
FROM itens_venda iv
JOIN vendas v ON v.id = iv.venda_id
JOIN barbeiros b ON b.id = v.barbeiro_id
WHERE 
  v.status = 'pago'
  AND (
    (iv.tipo = 'servico' AND b.comissao_servicos = 0)
    OR (iv.tipo = 'produto' AND b.comissao_produtos = 0)
  )
  AND NOT EXISTS (
    SELECT 1 
    FROM comissoes_historico ch
    WHERE ch.venda_id = iv.venda_id
      AND ch.item_id = iv.item_id
      AND ch.barbeiro_id = v.barbeiro_id
  )
ON CONFLICT DO NOTHING;

-- Log de execução
DO $$
DECLARE
  registros_inseridos INTEGER;
BEGIN
  GET DIAGNOSTICS registros_inseridos = ROW_COUNT;
  RAISE NOTICE 'Migration concluída: % registros de histórico 0%% inseridos', registros_inseridos;
END $$;