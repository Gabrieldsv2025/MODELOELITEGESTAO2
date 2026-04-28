-- Corrigir permissões do Mickael - apenas Vendas deve estar liberado
UPDATE user_permissions 
SET has_access = false, updated_at = now()
WHERE user_id = 'd1eca7f5-73bb-4336-8c68-8fe3ee1ec50c' 
AND module_name IN ('clientes', 'servicos', 'produtos', 'comissoes', 'relatorios');

-- Garantir que apenas vendas está liberado para o Mickael
UPDATE user_permissions 
SET has_access = true, updated_at = now()
WHERE user_id = 'd1eca7f5-73bb-4336-8c68-8fe3ee1ec50c' 
AND module_name = 'vendas';