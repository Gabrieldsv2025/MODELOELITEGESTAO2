-- Remove todas as tabelas relacionadas ao módulo de agendamentos
DROP TABLE IF EXISTS public.agendamentos CASCADE;
DROP TABLE IF EXISTS public.configuracoes_agendamento CASCADE;
DROP TABLE IF EXISTS public.horarios_agendamento CASCADE;