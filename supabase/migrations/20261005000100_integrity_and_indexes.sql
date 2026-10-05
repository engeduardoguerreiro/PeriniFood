-- Integridade de integrações + índices das consultas quentes. Idempotente e
-- tolerante a drift: pode rodar mais de uma vez e roda antes ou depois do deploy.
begin;

-- 1. Um merchantId/loja externa só pode pertencer a UMA loja por provider. Sem isso,
--    um lojista que cadastrasse o merchantId de outro fazia o evento do iFood ser
--    descartado (duas linhas) ou roteado para a loja errada. Se já houver duplicatas,
--    o índice não é criado e o aviso lista o que precisa ser resolvido à mão.
do $$
declare dup record; has_dup boolean := false;
begin
  for dup in
    select provider, external_store_id, count(*) as total
    from public.integrations
    where external_store_id is not null and external_store_id <> ''
    group by provider, external_store_id
    having count(*) > 1
  loop
    has_dup := true;
    raise notice 'Duplicado: provider=% external_store_id=% (% linhas)', dup.provider, dup.external_store_id, dup.total;
  end loop;
  if has_dup then
    raise notice 'Índice integrations_provider_store_unique NÃO criado: resolva as duplicatas acima e rode de novo.';
  else
    create unique index if not exists integrations_provider_store_unique
      on public.integrations (provider, external_store_id)
      where external_store_id is not null and external_store_id <> '';
  end if;
end $$;

-- 2. Pedidos do iFood já importados antes deste deploy ganham o vínculo em
--    integration_orders (o código agora só sincroniza status com o iFood quando ele existe).
insert into public.integration_orders (restaurant_id, integration_id, order_id, external_order_id, external_code, external_status, raw_payload)
select o.restaurant_id, i.id, o.id, o.external_order_id, o.external_order_code, 'BACKFILL', '{}'::jsonb
from public.orders o
join lateral (
  select id from public.integrations
  where restaurant_id = o.restaurant_id and provider = 'ifood'
  order by created_at
  limit 1
) i on true
where o.external_platform = 'ifood'
  and o.external_order_id is not null
  and o.status not in ('completed', 'canceled')
on conflict (integration_id, external_order_id) do nothing;

-- 3. Índices: quadro de pedidos, dashboard e relatórios filtram por loja + data;
--    getSessionContext busca o vínculo por user_id a cada requisição do painel.
create index if not exists orders_restaurant_created_idx on public.orders (restaurant_id, created_at desc);
create index if not exists orders_restaurant_external_idx on public.orders (restaurant_id, external_order_id) where external_order_id is not null;
create index if not exists restaurant_users_user_idx on public.restaurant_users (user_id, created_at);

commit;
