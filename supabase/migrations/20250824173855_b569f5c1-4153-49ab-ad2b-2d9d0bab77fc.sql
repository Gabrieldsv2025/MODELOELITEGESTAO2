-- Fix barbeiros table RLS setup
-- First enable RLS
ALTER TABLE public.barbeiros ENABLE ROW LEVEL SECURITY;

-- Allow public SELECT for login functionality
CREATE POLICY "Permitir login público barbeiros" 
ON public.barbeiros 
FOR SELECT 
USING (true);

-- Allow INSERT/UPDATE/DELETE for authenticated users (will be restricted by app logic)
CREATE POLICY "Permitir operações autenticadas barbeiros" 
ON public.barbeiros 
FOR INSERT, UPDATE, DELETE
TO authenticated
USING (true)
WITH CHECK (true);