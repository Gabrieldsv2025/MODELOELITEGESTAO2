-- Habilitar extensões necessárias para cron jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Criar o cron job para automação de promoções (executa diariamente às 6:00 AM)
SELECT cron.schedule(
  'promocoes-automation-daily',
  '0 6 * * *', -- Todo dia às 6:00 AM
  $$
  SELECT
    net.http_post(
        url:='https://ufgrjuptapahksatjvtq.supabase.co/functions/v1/promocoes-automation',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVmZ3JqdXB0YXBhaGtzYXRqdnRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzczMjg2NzEsImV4cCI6MjA5MjkwNDY3MX0._6_qpOtsg-_hAL5YWXKprI4Z3bmt1Q-UzqHpuRPlLdU"}'::jsonb,
        body:='{"scheduled": true}'::jsonb
    ) as request_id;
  $$
);