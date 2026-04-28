-- Add status column to clientes table
ALTER TABLE public.clientes 
ADD COLUMN status text NOT NULL DEFAULT 'ativo';

-- Add check constraint for valid status values
ALTER TABLE public.clientes 
ADD CONSTRAINT clientes_status_check 
CHECK (status IN ('ativo', 'perdido'));

-- Update all existing clients to active status
UPDATE public.clientes 
SET status = 'ativo' 
WHERE status IS NULL OR status = '';

-- Add index for better performance on status filtering
CREATE INDEX idx_clientes_status ON public.clientes (status);