-- Atualizar função para usar Igor como padrão
CREATE OR REPLACE FUNCTION public.get_current_barbeiro_id()
RETURNS uuid AS $$
  SELECT COALESCE(
    (SELECT id FROM public.barbeiros WHERE usuario = current_setting('request.jwt.claims', true)::json->>'sub'),
    -- Usar Igor como padrão em vez do primeiro barbeiro
    (SELECT id FROM public.barbeiros WHERE usuario = 'admin' LIMIT 1),
    (SELECT id FROM public.barbeiros WHERE is_proprietario = true LIMIT 1)
  );
$$ LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public;