-- Relax mutations on public.barbeiros to support current app model (no Supabase Auth)
DROP POLICY IF EXISTS "barbeiros insert authenticated" ON public.barbeiros;
DROP POLICY IF EXISTS "barbeiros update authenticated" ON public.barbeiros;
DROP POLICY IF EXISTS "barbeiros delete authenticated" ON public.barbeiros;

-- Re-create policies allowing anon and authenticated
CREATE POLICY "barbeiros insert public"
ON public.barbeiros
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "barbeiros update public"
ON public.barbeiros
FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "barbeiros delete public"
ON public.barbeiros
FOR DELETE
TO anon, authenticated
USING (true);