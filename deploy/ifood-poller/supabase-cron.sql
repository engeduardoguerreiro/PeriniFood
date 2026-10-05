-- Agendador do iFood dentro do Supabase (sem servidor próprio).
-- Chama o polling do PeriniFood a cada 30 s: pedidos novos + loja aberta no iFood.
-- Colar no SQL Editor do Supabase, trocando COLE_AQUI pelo IFOOD_POLL_SECRET da Vercel.
-- Pode rodar de novo: remove os agendamentos antigos e recria.

create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

select cron.unschedule(jobid) from cron.job where jobname = 'perinifood-ifood-poll';

select cron.schedule(
  'perinifood-ifood-poll',
  '30 seconds',
  $$
  select net.http_get(
    url := 'https://perinifood.com.br/api/integrations/ifood/poll',
    headers := '{"Authorization": "Bearer COLE_AQUI"}'::jsonb,
    timeout_milliseconds := 25000
  );
  $$
);

-- Deve mostrar 1 linha "perinifood-ifood-poll" e tamanho_do_segredo = 64.
select jobname, schedule, length(substring(command from 'Bearer ([0-9a-f]+)')) as tamanho_do_segredo
from cron.job where jobname = 'perinifood-ifood-poll';
