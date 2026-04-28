-- Habilitar Realtime para as tabelas necessárias
ALTER TABLE public.user_permissions REPLICA IDENTITY FULL;
ALTER TABLE public.barbeiros REPLICA IDENTITY FULL;

-- Verificar se as tabelas estão na publicação do realtime
-- Primeiro vamos tentar adicionar à publicação (se não existir, será ignorado)
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_permissions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.barbeiros;