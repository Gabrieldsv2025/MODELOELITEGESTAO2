-- Add monthly sales goal column to barbeiros table
ALTER TABLE public.barbeiros 
ADD COLUMN meta_mensal numeric DEFAULT 0;

-- Add date/time tracking column to vendas table
ALTER TABLE public.vendas 
ADD COLUMN horario_atendimento timestamp with time zone DEFAULT now();