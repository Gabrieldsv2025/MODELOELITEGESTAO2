-- Corrigir histórico de comissões de serviços do Igor Queiroz para 0%
-- Barbeiro: Igor Queiroz (id: ed23d57b-0f4c-4819-bf23-17305134fa54)

UPDATE comissoes_historico
SET 
  percentual_comissao = 0.00,
  valor_comissao = 0.00
WHERE barbeiro_id = 'ed23d57b-0f4c-4819-bf23-17305134fa54'
  AND item_tipo = 'servico'
  AND percentual_comissao > 0;

-- Log de quantos registros foram corrigidos
DO $$
DECLARE
  registros_atualizados INT;
BEGIN
  GET DIAGNOSTICS registros_atualizados = ROW_COUNT;
  RAISE NOTICE 'Corrigidos % registros de comissões de serviços do Igor Queiroz para 0%%', registros_atualizados;
END $$;