-- Remove funções que dependem das tabelas de agendamentos
DROP FUNCTION IF EXISTS public.calcular_horarios_disponiveis(uuid, date, integer) CASCADE;
DROP FUNCTION IF EXISTS public.check_appointment_conflict(uuid, timestamp with time zone, timestamp with time zone, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.prevent_appointment_conflicts() CASCADE;
DROP FUNCTION IF EXISTS public.aprovar_agendamento_atomico(uuid, uuid, timestamp with time zone, timestamp with time zone) CASCADE;

-- Remove as tabelas do módulo de agendamentos
DROP TABLE IF EXISTS public.agendamentos CASCADE;
DROP TABLE IF EXISTS public.horarios_padrao CASCADE;
DROP TABLE IF EXISTS public.bloqueios_agenda CASCADE;