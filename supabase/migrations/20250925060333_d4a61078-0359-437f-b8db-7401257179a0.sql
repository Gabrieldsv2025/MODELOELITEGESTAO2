-- Update the clientes status check constraint to include 'excluido'
ALTER TABLE public.clientes 
DROP CONSTRAINT IF EXISTS clientes_status_check;

ALTER TABLE public.clientes 
ADD CONSTRAINT clientes_status_check 
CHECK (status IN ('ativo', 'perdido', 'excluido'));