-- Agendador do iFood dentro do Supabase (sem servidor próprio).
-- Chama o polling do PeriniFood a cada 30 s: pedidos novos + loja aberta no iFood.
-- Colar no SQL Editor do Supabase, trocando COLE_AQUI pelo IFOOD_POLL_SECRET da Vercel.
-- Pode rodar de novo: recria o segredo e o agendamento.

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Segredo guardado criptografado no Vault (não fica no texto do agendamento).
delete from vault.secrets where name = 'ifood_poll_secret';
select vault.create_secret('COLE_AQUI', 'ifood_poll_secret');

select cron.unschedule('perinifood-ifood-poll') where exists (select 1 from cron.job where jobname = 'perinifood-ifood-poll');

select cron.schedule(
  'perinifood-ifood-poll',
  '30 seconds',
  $$
  select net.http_get(
    url := 'https://perinifood.com.br/api/integrations/ifood/poll',
    headers := jsonb_build_object('Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'ifood_poll_secret')),
    timeout_milliseconds := 25000
  );
  $$
);

-- Conferir depois de 1 minuto (status 200 e corpo {"ok":true,...}):
-- select status_code, left(content, 120), created from net._http_response order by created desc limit 5;
-- Parar: select cron.unschedule('perinifood-ifood-poll');
