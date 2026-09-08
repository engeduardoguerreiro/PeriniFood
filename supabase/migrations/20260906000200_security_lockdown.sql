-- PARTE 2 de 2 — revogações. Roda DEPOIS que o código novo estiver publicado
-- (o código antigo lia o cardápio e gravava pedidos do site com a role anon, que
-- aqui deixa de ter acesso). Pressupõe a PARTE 1 aplicada (delivery_fee_rules e
-- app_private.user_restaurant_role existem). Idempotente: pode rodar mais de uma vez.
begin;

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

-- Never let staff read or replace consumer credentials through PostgREST.
do $$ declare cols text;
begin
  select string_agg(quote_ident(attname), ',') into cols from pg_attribute
    where attrelid='public.customers'::regclass and attnum>0 and not attisdropped and attname<>'password_hash';
  revoke select, insert, update on public.customers from authenticated;
  execute format('grant select (%s), insert (%s), update (%s) on public.customers to authenticated',cols,cols,cols);
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
commit;
