-- Escala, fase 3: políticas RLS por consulta, numeração sem travar a loja,
-- limpeza automática de tabelas que só crescem e diagnóstico do banco.
-- Aditiva/idempotente; pode ser aplicada antes do deploy.

-- 1) RLS: "is_restaurant_member(restaurant_id)" rodava UMA subconsulta POR LINHA
--    (função security definer não é inlinada). Troca por
--    "restaurant_id IN (SELECT member_restaurant_ids())", que o Postgres avalia uma
--    vez por consulta (padrão recomendado pelo Supabase). Mesma regra de acesso:
--    o usuário vê as lojas onde está em restaurant_users.
create or replace function app_private.member_restaurant_ids()
returns setof uuid language sql security definer stable set search_path = '' as $$
  select ru.restaurant_id from public.restaurant_users ru where ru.user_id = (select auth.uid());
$$;
grant execute on function app_private.member_restaurant_ids() to anon, authenticated, service_role;

do $$
declare
  p record;
  -- Também a forma com prefixo de tabela (p.restaurant_id, oi.restaurant_id) dos EXISTS.
  pattern constant text := 'app_private\.is_restaurant_member\(((?:[a-z_]+\.)?(?:restaurant_id|id))\)';
  replacement constant text := '(\1 IN ( SELECT app_private.member_restaurant_ids()))';
  new_qual text;
  new_check text;
  changed integer := 0;
begin
  for p in
    select tablename, policyname, qual, with_check from pg_policies
    where schemaname = 'public' and (coalesce(qual, '') ~ pattern or coalesce(with_check, '') ~ pattern)
  loop
    new_qual := regexp_replace(p.qual, pattern, replacement, 'g');
    new_check := regexp_replace(p.with_check, pattern, replacement, 'g');
    execute format('alter policy %I on public.%I', p.policyname, p.tablename)
      || case when new_qual is not null then format(' using (%s)', new_qual) else '' end
      || case when new_check is not null then format(' with check (%s)', new_check) else '' end;
    changed := changed + 1;
  end loop;
  raise notice 'políticas RLS reescritas: %', changed;
end $$;

-- 2) Número do pedido: antes travava a LINHA da loja (FOR UPDATE), o que também
--    bloqueava abrir/fechar a loja e qualquer insert com FK para restaurants durante
--    a gravação do pedido. Trava consultiva por loja: só serializa a numeração.
create or replace function public.set_order_number()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.order_number is null then
    perform pg_advisory_xact_lock(hashtextextended('order_number:' || new.restaurant_id::text, 0));
    select coalesce(max(order_number), 0) + 1 into new.order_number from public.orders where restaurant_id = new.restaurant_id;
  end if;
  return new;
end $$;

-- 3) Limpeza automática (de hora em hora, pelo pg_cron, em lotes para não travar):
--    - delivery_locations: posição do motoboy a cada poucos segundos; só serve ao
--      mapa ao vivo → 15 dias
--    - integration_logs: eventos iFood/WhatsApp/webhooks com payload → 90 dias
--    - cron.job_run_details: 2.880 linhas/dia só do polling do iFood → 7 dias
create index if not exists delivery_locations_recorded_idx on public.delivery_locations (recorded_at);
create index if not exists integration_logs_created_idx on public.integration_logs (created_at);

create or replace function public.purge_old_data(batch integer default 50000)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  locations integer := 0;
  logs integer := 0;
  cron_runs integer := 0;
begin
  delete from public.delivery_locations where id in (
    select id from public.delivery_locations where recorded_at < now() - interval '15 days' limit batch);
  get diagnostics locations = row_count;

  delete from public.integration_logs where id in (
    select id from public.integration_logs where created_at < now() - interval '90 days' limit batch);
  get diagnostics logs = row_count;

  if to_regclass('cron.job_run_details') is not null then
    execute 'delete from cron.job_run_details where runid in (select runid from cron.job_run_details where end_time < now() - interval ''7 days'' limit $1)' using batch;
    get diagnostics cron_runs = row_count;
  end if;

  perform public.cleanup_security_data();
  return jsonb_build_object('delivery_locations', locations, 'integration_logs', logs, 'cron_runs', cron_runs);
end $$;
revoke all on function public.purge_old_data(integer) from public, anon, authenticated;
grant execute on function public.purge_old_data(integer) to service_role;

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule(jobid) from cron.job where jobname = 'perinifood-purge';
    perform cron.schedule('perinifood-purge', '17 * * * *', 'select public.purge_old_data()');
  else
    raise notice 'pg_cron ausente: a limpeza roda só pelo /api/keep-alive (diário).';
  end if;
end $$;

-- 4) Diagnóstico (só leitura, só servidor): índices, maiores tabelas e conexões.
create or replace function public.db_health()
returns jsonb language sql security definer stable set search_path = '' as $$
  select jsonb_build_object(
    'indexes', (select jsonb_agg(jsonb_build_object('table', tablename, 'index', indexname) order by tablename, indexname)
                from pg_catalog.pg_indexes where schemaname = 'public'),
    'tables', (select jsonb_agg(t order by (t->>'total_bytes')::bigint desc) from (
                 select jsonb_build_object('table', c.relname, 'rows', c.reltuples::bigint,
                   'total_bytes', pg_catalog.pg_total_relation_size(c.oid),
                   'size', pg_catalog.pg_size_pretty(pg_catalog.pg_total_relation_size(c.oid))) as t
                 from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid = c.relnamespace
                 where n.nspname = 'public' and c.relkind = 'r'
                 order by pg_catalog.pg_total_relation_size(c.oid) desc limit 15) s),
    'connections', (select jsonb_agg(jsonb_build_object('user', usename, 'state', state, 'count', n))
                    from (select usename, coalesce(state, 'background') as state, count(*) as n
                          from pg_catalog.pg_stat_activity group by 1, 2 order by 3 desc) a),
    'max_connections', (select setting::int from pg_catalog.pg_settings where name = 'max_connections')
  );
$$;
revoke all on function public.db_health() from public, anon, authenticated;
grant execute on function public.db_health() to service_role;

-- 5) Pontos de fidelidade da tela Clientes: antes ela baixava TODOS os pedidos da
--    loja (desde sempre) para casar com cada cliente. Agora só os pedidos dos
--    clientes da página aberta. Telefone casa como normalizePhone (src/lib/utils.ts):
--    só dígitos, sem o 55 de 12/13 dígitos (pedidos antigos têm máscara).
--    security invoker: roda com as permissões (RLS) de quem chama.
create or replace function public.customer_loyalty_orders(p_restaurant_id uuid, p_customer_ids uuid[], p_phones text[])
returns table (customer_id uuid, customer_phone text, total numeric, status public.order_status, payment_status public.payment_status, created_at timestamptz)
language sql security invoker stable set search_path = '' as $$
  select o.customer_id, o.customer_phone, o.total, o.status, o.payment_status, o.created_at
  from public.orders o
  where o.restaurant_id = p_restaurant_id
    and (
      o.customer_id = any(p_customer_ids)
      or (o.customer_id is null and o.customer_phone is not null and (
        case when length(regexp_replace(o.customer_phone, '\D', '', 'g')) in (12, 13) and regexp_replace(o.customer_phone, '\D', '', 'g') like '55%'
             then substr(regexp_replace(o.customer_phone, '\D', '', 'g'), 3)
             else regexp_replace(o.customer_phone, '\D', '', 'g') end
      ) = any(p_phones))
    );
$$;
revoke all on function public.customer_loyalty_orders(uuid, uuid[], text[]) from public, anon;
grant execute on function public.customer_loyalty_orders(uuid, uuid[], text[]) to authenticated, service_role;
