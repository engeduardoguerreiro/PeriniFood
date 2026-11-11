-- Pedidos externos (iFood) sem duplicata e gravados de uma vez só.
--
-- 1) Índice ÚNICO por loja + plataforma + id externo: webhook e polling (ou duas
--    rodadas de polling sobrepostas) não criam mais o mesmo pedido duas vezes.
-- 2) create_external_order_atomic: pedido + vínculo integration_orders + itens
--    numa única transação (antes eram 3 chamadas; se uma falhava, o pedido ficava
--    sem itens ou sem vínculo e o evento era confirmado assim mesmo).
-- 3) job_locks: trava do polling do iFood (pg_cron chama a cada 30 s; se uma
--    rodada demora, a seguinte é pulada em vez de reprocessar os mesmos eventos).
--
-- Aplicar ANTES do deploy (o código novo chama a função). Idempotente.
-- Se o passo 1 acusar duplicatas, apague o pedido repetido e rode de novo.

do $$
begin
  if exists (
    select 1 from public.orders where external_order_id is not null
    group by restaurant_id, coalesce(external_platform, ''), external_order_id having count(*) > 1
  ) then
    raise exception 'Há pedidos externos duplicados: select restaurant_id, external_platform, external_order_id, count(*) from public.orders where external_order_id is not null group by 1,2,3 having count(*) > 1;';
  end if;
end $$;

create unique index if not exists orders_external_unique_idx
  on public.orders (restaurant_id, (coalesce(external_platform, '')), external_order_id)
  where external_order_id is not null;

create or replace function public.create_external_order_atomic(order_data jsonb, item_data jsonb, link_data jsonb)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  tenant uuid := (order_data->>'restaurant_id')::uuid;
  platform text := order_data->>'external_platform';
  external_id text := order_data->>'external_order_id';
  order_id_value uuid;
  item jsonb;
begin
  if tenant is null or nullif(external_id, '') is null then raise exception 'Invalid external order'; end if;
  if jsonb_typeof(item_data) <> 'array' or jsonb_array_length(item_data) > 200 then raise exception 'Invalid items'; end if;

  insert into public.orders(restaurant_id, source, code, type, status, payment_status, payment_method, subtotal, delivery_fee, total,
    customer_name, customer_phone, delivery_address, external_order_id, external_order_code, external_platform, notes)
  values (tenant, (order_data->>'source')::public.order_source, order_data->>'code', (order_data->>'type')::public.order_type, 'pending',
    (order_data->>'payment_status')::public.payment_status, (order_data->>'payment_method')::public.payment_method,
    (order_data->>'subtotal')::numeric, (order_data->>'delivery_fee')::numeric, (order_data->>'total')::numeric,
    order_data->>'customer_name', order_data->>'customer_phone', order_data->>'delivery_address',
    external_id, order_data->>'external_order_code', platform, order_data->>'notes')
  on conflict (restaurant_id, (coalesce(external_platform, '')), external_order_id) where external_order_id is not null do nothing
  returning id into order_id_value;

  if order_id_value is null then
    -- Outro processo já criou: devolve o existente sem tocar em nada.
    select id into order_id_value from public.orders
    where restaurant_id = tenant and coalesce(external_platform, '') = coalesce(platform, '') and external_order_id = external_id;
    return jsonb_build_object('order_id', order_id_value, 'created', false);
  end if;

  if link_data is not null then
    insert into public.integration_orders(restaurant_id, integration_id, order_id, external_order_id, external_code, external_status, raw_payload)
    values (tenant, (link_data->>'integration_id')::uuid, order_id_value, link_data->>'external_order_id', link_data->>'external_code',
      link_data->>'external_status', coalesce(link_data->'raw_payload', '{}'::jsonb))
    on conflict (integration_id, external_order_id) do update
      set order_id = excluded.order_id, external_code = excluded.external_code, external_status = excluded.external_status,
          raw_payload = excluded.raw_payload, updated_at = now();
  end if;

  for item in select value from jsonb_array_elements(item_data) loop
    insert into public.order_items(restaurant_id, order_id, product_id, product_name, quantity, unit_price, total_price, notes, selected_options)
    values (tenant, order_id_value, nullif(item->>'product_id', '')::uuid, item->>'product_name', (item->>'quantity')::integer,
      (item->>'unit_price')::numeric, (item->>'total_price')::numeric, item->>'notes', item->'selected_options');
  end loop;

  return jsonb_build_object('order_id', order_id_value, 'created', true);
end $$;

revoke all on function public.create_external_order_atomic(jsonb, jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.create_external_order_atomic(jsonb, jsonb, jsonb) to service_role;

create table if not exists public.job_locks (
  name text primary key,
  holder text not null,
  locked_until timestamptz not null
);
alter table public.job_locks enable row level security;
revoke all on public.job_locks from public, anon, authenticated;
grant all on public.job_locks to service_role;

-- true = pegou a trava (livre ou vencida). A validade cobre a função que morre no meio.
create or replace function public.try_acquire_job_lock(p_name text, p_holder text, p_seconds integer)
returns boolean language plpgsql security invoker set search_path = '' as $$
declare got integer;
begin
  insert into public.job_locks(name, holder, locked_until)
  values (p_name, p_holder, now() + make_interval(secs => greatest(1, least(p_seconds, 600))))
  on conflict (name) do update set holder = excluded.holder, locked_until = excluded.locked_until
    where public.job_locks.locked_until < now();
  get diagnostics got = row_count;
  return got > 0;
end $$;

create or replace function public.release_job_lock(p_name text, p_holder text)
returns void language sql security invoker set search_path = '' as $$
  delete from public.job_locks where name = p_name and holder = p_holder;
$$;

revoke all on function public.try_acquire_job_lock(text, text, integer) from public, anon, authenticated;
revoke all on function public.release_job_lock(text, text) from public, anon, authenticated;
grant execute on function public.try_acquire_job_lock(text, text, integer) to service_role;
grant execute on function public.release_job_lock(text, text) to service_role;
