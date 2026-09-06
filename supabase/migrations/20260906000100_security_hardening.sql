-- Apply with the matching application release. Public reads/writes now use
-- validated server endpoints, never direct anonymous table access.
begin;

-- As políticas abaixo dependem destas funções. Elas vivem em schema.sql, mas o
-- banco de São Paulo já pulou migrations antes — por isso são recriadas aqui
-- (create or replace é idempotente) para o script não depender do que existe.
create schema if not exists app_private;

create or replace function app_private.is_restaurant_member(target_restaurant_id uuid)
returns boolean language sql security definer set search_path = public stable as $$
  select exists (
    select 1 from public.restaurant_users ru
    where ru.restaurant_id = target_restaurant_id and ru.user_id = auth.uid()
  );
$$;

create or replace function app_private.user_restaurant_role(target_restaurant_id uuid)
returns public.restaurant_role language sql security definer set search_path = public stable as $$
  select ru.role from public.restaurant_users ru
  where ru.restaurant_id = target_restaurant_id and ru.user_id = auth.uid()
  limit 1;
$$;


create table if not exists public.customer_sessions (
  token_hash text primary key check (token_hash ~ '^[a-f0-9]{64}$'),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index if not exists customer_sessions_expiry_idx on public.customer_sessions(expires_at);
create table if not exists public.security_rate_limits (
  key text primary key,
  count integer not null,
  expires_at timestamptz not null
);
alter table public.customer_sessions enable row level security;
alter table public.security_rate_limits enable row level security;
revoke all on public.customer_sessions, public.security_rate_limits from public, anon, authenticated;
grant all on public.customer_sessions, public.security_rate_limits to service_role;

create or replace function public.consume_security_rate_limit(bucket_key text, max_requests integer, window_seconds integer)
returns boolean language plpgsql security definer set search_path = '' as $$
declare current_count integer;
begin
  if max_requests < 1 or max_requests > 1000 or window_seconds < 1 or window_seconds > 86400 or length(bucket_key) <> 64 then
    raise exception 'Invalid limiter configuration';
  end if;
  insert into public.security_rate_limits as counters(key, count, expires_at)
    values(bucket_key, 1, now() + make_interval(secs => window_seconds))
    on conflict(key) do update set
      count = case when counters.expires_at <= now() then 1 else counters.count + 1 end,
      expires_at = case when counters.expires_at <= now() then now() + make_interval(secs => window_seconds) else counters.expires_at end
    returning count into current_count;
  return current_count <= max_requests;
end $$;
revoke all on function public.consume_security_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.consume_security_rate_limit(text, integer, integer) to service_role;

-- Revoke table AND column grants so an old anonymous policy cannot bypass the DAL.
do $$ declare t record; c record;
begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('revoke all on table public.%I from anon', t.tablename);
    for c in select column_name from information_schema.columns where table_schema='public' and table_name=t.tablename loop
      execute format('revoke select (%I), insert (%I), update (%I), references (%I) on public.%I from anon', c.column_name,c.column_name,c.column_name,c.column_name,t.tablename);
    end loop;
  end loop;
  -- These policies applied to PUBLIC, including logged-in users from other tenants.
  for t in select tablename, policyname from pg_policies where schemaname='public' and policyname like 'public %' loop
    execute format('drop policy %I on public.%I', t.policyname, t.tablename);
  end loop;
end $$;

-- O cadastro do consumidor faz apenas INSERT e conta com o conflito de unicidade
-- (23505) para nunca sobrescrever uma conta. Os índices vivem em migrations
-- anteriores que o banco de SP pode ter pulado — garantidos aqui (idempotente).
create unique index if not exists customers_restaurant_email_unique
  on public.customers (restaurant_id, lower(email)) where email is not null;
create unique index if not exists customers_restaurant_phone_unique
  on public.customers (restaurant_id, phone) where phone is not null;

-- delivery_fee_rules vive na migration 20260522000300, que o banco de SP pulou
-- (o app vinha usando o fallback em restaurants.opening_hours). Recriada aqui
-- de forma idempotente para o código de frete e as políticas abaixo terem a tabela.
create table if not exists public.delivery_fee_rules (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  name text not null,
  min_km numeric(8,2) not null default 0,
  max_km numeric(8,2),
  fee numeric(12,2) not null default 0,
  free_delivery boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists delivery_fee_rules_restaurant_idx on public.delivery_fee_rules (restaurant_id, active);
alter table public.delivery_fee_rules enable row level security;
grant select, insert, update, delete on public.delivery_fee_rules to authenticated;
drop policy if exists "members manage delivery fee rules" on public.delivery_fee_rules;
create policy "members manage delivery fee rules" on public.delivery_fee_rules
for all using (app_private.is_restaurant_member(restaurant_id))
with check (app_private.is_restaurant_member(restaurant_id));

create or replace function app_private.owns_restaurant(target uuid)
returns boolean language sql security definer set search_path = '' stable as $$
  select exists(select 1 from public.restaurants where id=target and owner_id=auth.uid());
$$;
revoke all on function app_private.owns_restaurant(uuid) from public;
grant execute on function app_private.owns_restaurant(uuid) to authenticated;
grant usage on schema app_private to authenticated;

drop policy if exists "owner inserts initial membership" on public.restaurant_users;
create policy "owner inserts initial membership" on public.restaurant_users for insert to authenticated
  with check (user_id=auth.uid() and role='owner' and app_private.owns_restaurant(restaurant_id));
-- Team creation/role changes need a dedicated server-authorized workflow.
drop policy if exists "owners manage memberships" on public.restaurant_users;
create policy "owners manage memberships" on public.restaurant_users for update to authenticated
  using (app_private.owns_restaurant(restaurant_id))
  with check (app_private.owns_restaurant(restaurant_id));
drop policy if exists "members read restaurants" on public.restaurants;
create policy "members read restaurants" on public.restaurants for select to authenticated
  using (owner_id=auth.uid() or app_private.is_restaurant_member(id));

-- Never let staff read or replace consumer credentials through PostgREST.
do $$ declare cols text;
begin
  select string_agg(quote_ident(attname), ',') into cols from pg_attribute
    where attrelid='public.customers'::regclass and attnum>0 and not attisdropped and attname<>'password_hash';
  revoke select, insert, update on public.customers from authenticated;
  execute format('grant select (%s), insert (%s), update (%s) on public.customers to authenticated',cols,cols,cols);
end $$;

-- Every write preserves tenant identity, including privileged application writes.
create or replace function app_private.guard_tenant_links()
returns trigger language plpgsql security definer set search_path = '' as $$
declare row_data jsonb := to_jsonb(new); target uuid; tenant uuid; linked_tenant uuid; pair jsonb; previous_tenant uuid;
begin
  tenant := nullif(row_data->>'restaurant_id','')::uuid;
  if tg_op='UPDATE' and to_jsonb(old)->>'restaurant_id' is distinct from row_data->>'restaurant_id' then
    raise exception 'Tenant reassignment is not permitted';
  end if;
  if tg_table_name='restaurants' and tg_op='UPDATE' and row_data->>'owner_id' is distinct from to_jsonb(old)->>'owner_id' and auth.role()<>'service_role' then
    raise exception 'Owner reassignment is not permitted';
  end if;
  for pair in select value from jsonb_array_elements(tg_argv[0]::jsonb) loop
    target := nullif(row_data->>(pair->>0),'')::uuid;
    if target is not null then
      execute format('select restaurant_id from public.%I where id=$1', pair->>1) into linked_tenant using target;
      if tg_op='UPDATE' and tenant is null then
        execute format('select restaurant_id from public.%I where id=$1',pair->>1) into previous_tenant using nullif(to_jsonb(old)->>(pair->>0),'')::uuid;
        if previous_tenant is not null and previous_tenant<>linked_tenant then raise exception 'Tenant reassignment is not permitted'; end if;
      end if;
      if linked_tenant is null or (tenant is not null and linked_tenant<>tenant) then raise exception 'Invalid tenant reference'; end if;
      if tenant is null then tenant := linked_tenant; end if;
    end if;
  end loop;
  return new;
end $$;
-- Triggers de isolamento de tenant, só nas tabelas que existirem neste banco.
do $$ declare spec record;
begin
  for spec in select * from (values
    ('restaurants_guard_owner','restaurants','before update','[]'),
    ('products_guard_tenant','products','before insert or update','[["category_id","categories"],["product_type_id","product_types"]]'),
    ('orders_guard_tenant','orders','before insert or update','[["customer_id","customers"],["table_id","tables"],["integration_id","integrations"]]'),
    ('items_guard_tenant','order_items','before insert or update','[["order_id","orders"],["product_id","products"]]'),
    ('options_guard_tenant','product_options','before insert or update','[["product_id","products"]]'),
    ('option_items_guard_tenant','product_option_items','before insert or update','[["option_id","product_options"]]'),
    ('sessions_guard_tenant','customer_sessions','before insert or update','[["customer_id","customers"]]'),
    ('item_addons_guard_tenant','order_item_addons','before insert or update','[["order_item_id","order_items"],["addon_id","product_addons"]]'),
    ('variants_guard_tenant','product_variants','before insert or update','[["product_id","products"]]'),
    ('addresses_guard_tenant','customer_addresses','before insert or update','[["customer_id","customers"]]'),
    ('recipes_guard_tenant','product_recipes','before insert or update','[["product_id","products"]]'),
    ('product_maps_guard_tenant','integration_product_maps','before insert or update','[["integration_id","integrations"],["product_id","products"]]'),
    ('payment_maps_guard_tenant','integration_payment_maps','before insert or update','[["integration_id","integrations"]]'),
    ('integration_orders_guard_tenant','integration_orders','before insert or update','[["integration_id","integrations"],["order_id","orders"]]')
  ) as v(trigger_name, table_name, timing, links) loop
    if to_regclass('public.'||spec.table_name) is null then raise notice 'security: tabela % ausente, trigger % pulado', spec.table_name, spec.trigger_name; continue; end if;
    execute format('drop trigger if exists %I on public.%I', spec.trigger_name, spec.table_name);
    execute format('create trigger %I %s on public.%I for each row execute function app_private.guard_tenant_links(%L)', spec.trigger_name, spec.timing, spec.table_name, spec.links);
  end loop;
end $$;

-- Restrictive policies supplement existing membership checks (never replace them).
do $$ declare t text; operation text;
begin
  foreach t in array array['restaurants','categories','products','product_options','product_option_items','product_types','product_addons','pizza_options','delivery_fee_rules','coupons','loyalty_programs','product_recipes'] loop
    if to_regclass('public.'||t) is null then raise notice 'security: tabela % ausente neste banco, políticas puladas', t; continue; end if;
    foreach operation in array array['INSERT','UPDATE','DELETE'] loop
      -- Initial restaurant creation is already constrained to owner_id=auth.uid().
      if t='restaurants' and operation='INSERT' then continue; end if;
      execute format('drop policy if exists %I on public.%I', 'security_role_'||lower(operation), t);
      execute format('create policy %I on public.%I as restrictive for %s to authenticated %s',
        'security_role_'||lower(operation),t,operation,
        case when operation='INSERT' then 'with check (app_private.user_restaurant_role(restaurant_id) in (''owner'',''admin'',''manager''))'
        when t='restaurants' then 'using (app_private.user_restaurant_role(id) in (''owner'',''admin'',''manager''))'
        else 'using (app_private.user_restaurant_role(restaurant_id) in (''owner'',''admin'',''manager''))' end);
    end loop;
  end loop;
  foreach t in array array['integrations','integration_product_maps','integration_payment_maps','integration_logs','integration_orders'] loop
    if to_regclass('public.'||t) is null then raise notice 'security: tabela % ausente neste banco, políticas puladas', t; continue; end if;
    execute format('drop policy if exists security_sensitive_access on public.%I', t);
    execute format('create policy security_sensitive_access on public.%I as restrictive for all to authenticated using (app_private.user_restaurant_role(restaurant_id) in (''owner'',''admin'',''manager''))',t);
  end loop;
  drop policy if exists security_customer_access on public.customers;
  create policy security_customer_access on public.customers as restrictive for all to authenticated
    using (app_private.user_restaurant_role(restaurant_id) in ('owner','admin','manager','cashier'));
end $$;

-- Serialize allocation per restaurant; concurrent orders cannot share a number.
create or replace function public.set_order_number()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform 1 from public.restaurants where id=new.restaurant_id for update;
  if new.order_number is null then
    select coalesce(max(order_number),0)+1 into new.order_number from public.orders where restaurant_id=new.restaurant_id;
  end if;
  return new;
end $$;

-- One transaction for header, lines and extras. Only the validated server DAL
-- can call this RPC; no anonymous/authenticated execute grant is given.
create or replace function public.save_order_atomic(order_data jsonb, item_data jsonb, existing_id uuid default null)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare order_id_value uuid; tenant uuid := (order_data->>'restaurant_id')::uuid; item jsonb; item_id_value uuid; extra jsonb;
begin
  if jsonb_typeof(item_data)<>'array' or jsonb_array_length(item_data) not between 1 and 100 then raise exception 'Invalid items'; end if;
  if existing_id is null then
    insert into public.orders(restaurant_id, customer_id, code, source, type, status, payment_status, payment_method, subtotal, delivery_fee, discount, total, customer_name, customer_phone, delivery_address, notes, change_for)
    values(tenant, nullif(order_data->>'customer_id','')::uuid, order_data->>'code', (order_data->>'source')::public.order_source,
      (order_data->>'type')::public.order_type, 'pending', (order_data->>'payment_status')::public.payment_status,
      (order_data->>'payment_method')::public.payment_method, (order_data->>'subtotal')::numeric,
      (order_data->>'delivery_fee')::numeric, (order_data->>'discount')::numeric, (order_data->>'total')::numeric,
      order_data->>'customer_name',order_data->>'customer_phone',order_data->>'delivery_address',order_data->>'notes',nullif(order_data->>'change_for','')::numeric)
    returning id into order_id_value;
  else
    select id into order_id_value from public.orders where id=existing_id and restaurant_id=tenant and external_order_id is null for update;
    if order_id_value is null then raise exception 'Order unavailable for edit'; end if;
    update public.orders set customer_id=nullif(order_data->>'customer_id','')::uuid, type=(order_data->>'type')::public.order_type,
      payment_method=(order_data->>'payment_method')::public.payment_method, subtotal=(order_data->>'subtotal')::numeric,
      delivery_fee=(order_data->>'delivery_fee')::numeric,discount=(order_data->>'discount')::numeric,total=(order_data->>'total')::numeric,
      customer_name=order_data->>'customer_name',customer_phone=order_data->>'customer_phone',delivery_address=order_data->>'delivery_address',
      notes=order_data->>'notes',change_for=nullif(order_data->>'change_for','')::numeric where id=order_id_value;
    delete from public.order_items where order_id=order_id_value;
  end if;
  for item in select value from jsonb_array_elements(item_data) loop
    insert into public.order_items(restaurant_id,order_id,product_id,product_name,quantity,unit_price,total_price,notes,selected_options)
      values(tenant,order_id_value,(item->>'product_id')::uuid,item->>'product_name',(item->>'quantity')::integer,
      (item->>'unit_price')::numeric,(item->>'total_price')::numeric,item->>'notes',item->'selected_options') returning id into item_id_value;
    for extra in select value from jsonb_array_elements(coalesce(item->'addons','[]'::jsonb)) loop
      insert into public.order_item_addons(order_item_id,addon_id,name,price)
      values(item_id_value,nullif(extra->>'id','')::uuid,extra->>'name',(extra->>'price')::numeric);
    end loop;
  end loop;
  return order_id_value;
end $$;
revoke all on function public.save_order_atomic(jsonb,jsonb,uuid) from public,anon,authenticated;
grant execute on function public.save_order_atomic(jsonb,jsonb,uuid) to service_role;

-- Short-lived security data cleanup can be invoked by the existing protected cron.
create or replace function public.cleanup_security_data()
returns void language sql security definer set search_path = '' as $$
  delete from public.customer_sessions where expires_at < now();
  delete from public.security_rate_limits where expires_at < now();
$$;
revoke all on function public.cleanup_security_data() from public,anon,authenticated;
grant execute on function public.cleanup_security_data() to service_role;
commit;
