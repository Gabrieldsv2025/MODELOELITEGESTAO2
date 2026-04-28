-- Forçar reload completo das permissões removendo cache
UPDATE user_permissions 
SET updated_at = now() 
WHERE user_id = 'd1eca7f5-73bb-4336-8c68-8fe3ee1ec50c';