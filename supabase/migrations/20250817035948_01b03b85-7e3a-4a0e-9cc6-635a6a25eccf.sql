-- Fix RLS policy for clientes to allow authenticated users to access all client data
-- This barbershop system appears to be single-tenant, so all authenticated users should access all clients

DROP POLICY IF EXISTS "Allow authenticated access" ON public.clientes;

CREATE POLICY "Allow authenticated users full access" 
ON public.clientes 
FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);