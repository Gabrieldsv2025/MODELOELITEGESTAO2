-- Verificar extensões instaladas no schema public
SELECT 
    e.extname as extension_name,
    n.nspname as schema_name
FROM pg_extension e
JOIN pg_namespace n ON e.extnamespace = n.oid
WHERE n.nspname = 'public';

-- Mover extensões pg_cron e pg_net para o schema extensions (se necessário)
-- Primeiro, criar o schema extensions se não existir
CREATE SCHEMA IF NOT EXISTS extensions;

-- Alterar o schema das extensões para extensions (se estiverem no public)
DO $$
BEGIN
    -- Verificar se pg_cron está no schema public e mover
    IF EXISTS (
        SELECT 1 FROM pg_extension e
        JOIN pg_namespace n ON e.extnamespace = n.oid
        WHERE e.extname = 'pg_cron' AND n.nspname = 'public'
    ) THEN
        ALTER EXTENSION pg_cron SET SCHEMA extensions;
    END IF;
    
    -- Verificar se pg_net está no schema public e mover  
    IF EXISTS (
        SELECT 1 FROM pg_extension e
        JOIN pg_namespace n ON e.extnamespace = n.oid
        WHERE e.extname = 'pg_net' AND n.nspname = 'public'
    ) THEN
        ALTER EXTENSION pg_net SET SCHEMA extensions;
    END IF;
END $$;