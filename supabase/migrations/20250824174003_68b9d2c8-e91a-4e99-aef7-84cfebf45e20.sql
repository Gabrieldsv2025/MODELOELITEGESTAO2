-- Fix invalid RLS setup for public.barbeiros
-- 1) Cleanup old/invalid policies
DROP POLICY IF EXISTS "Permitir login público barbeiros" ON public.barbeiros;
DROP POLICY IF EXISTS "Permitir operações autenticadas barbeiros" ON public.barbeiros;
DROP POLICY IF EXISTS "Permitir login público" ON public.barbeiros;
DROP POLICY IF EXISTS "Apenas administradores podem modificar barbeiros" ON public.barbeiros;

-- 2) Ensure RLS is enabled
ALTER TABLE public.barbeiros ENABLE ROW LEVEL SECURITY;

-- 3) Public SELECT for login (anon + authenticated)
CREATE POLICY "barbeiros select public"
ON public.barbeiros
FOR SELECT
TO anon, authenticated
USING (true);

-- 4) Authenticated-only mutations (separate policies per command)
CREATE POLICY "barbeiros insert authenticated"
ON public.barbeiros
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "barbeiros update authenticated"
ON public.barbeiros
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "barbeiros delete authenticated"
ON public.barbeiros
FOR DELETE
TO authenticated
USING (true);