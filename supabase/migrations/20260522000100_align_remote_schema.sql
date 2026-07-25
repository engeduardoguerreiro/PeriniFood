-- Execute this file once in Supabase SQL Editor to align the remote database
-- with the current GastroFlow MVP code. It is intentionally idempotent.

alter table public.restaurants
  add column if not exists banner_url text,
  add column if not exists minimum_order numeric(12,2) not null default 0,
  add column if not exists delivery_fee numeric(12,2) not null default 0,
  add column if not exists estimated_delivery_time text,
  add column if not exists menu_footer_message text,
  add column if not exists updated_at timestamptz not null default now();

update public.restaurants set banner_url = coalesce(banner_url, cover_url);

alter table public.categories
  add column if not exists updated_at timestamptz not null default now();

alter table public.products
  add column if not exists featured boolean not null default false,
  add column if not exists sort_order integer not null default 0,
  add column if not exists updated_at timestamptz not null default now();

alter table public.customers
  add column if not exists whatsapp text,
  add column if not exists updated_at timestamptz not null default now();

alter table public.orders
  add column if not exists code text,
  add column if not exists change_for numeric(12,2);

update public.orders
set code = upper(substr(replace(id::text, '-', ''), 1, 8))
where code is null;

alter table public.orders alter column code set not null;
create unique index if not exists orders_code_unique on public.orders (code);

alter table public.order_items add column if not exists variant_id uuid;

create table if not exists public.product_types (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  name text not null,
  description text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (restaurant_id, name)
);

alter table public.products
  add column if not exists product_type_id uuid references public.product_types(id) on delete set null;

create table if not exists public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  name text not null,
  price numeric(12,2) not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.product_addons (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  name text not null,
  price numeric(12,2) not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.pizza_options (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  kind text not null check (kind in ('tamanho', 'massa', 'borda', 'adicional')),
  name text not null,
  price numeric(12,2) not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (restaurant_id, kind, name)
);

create table if not exists public.order_item_addons (
  id uuid primary key default gen_random_uuid(),
  order_item_id uuid not null references public.order_items(id) on delete cascade,
  addon_id uuid references public.product_addons(id) on delete set null,
  name text not null,
  price numeric(12,2) not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.customer_addresses (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  street text not null,
  number text,
  neighborhood text,
  complement text,
  reference text,
  city text,
  state text,
  zip_code text,
  created_at timestamptz not null default now()
);

alter table public.product_types enable row level security;
alter table public.product_variants enable row level security;
alter table public.product_addons enable row level security;
alter table public.pizza_options enable row level security;
alter table public.order_item_addons enable row level security;
alter table public.customer_addresses enable row level security;

grant select on public.product_types, public.product_variants, public.product_addons, public.pizza_options to anon;
grant select, insert, update, delete on public.product_types, public.product_variants, public.product_addons, public.pizza_options, public.customer_addresses to authenticated;
grant select, insert on public.order_item_addons to anon, authenticated;

create unique index if not exists categories_restaurant_name_unique on public.categories (restaurant_id, name);
create unique index if not exists products_restaurant_name_unique on public.products (restaurant_id, name);
create unique index if not exists product_variants_product_name_unique on public.product_variants (product_id, name);
create unique index if not exists product_addons_restaurant_name_unique on public.product_addons (restaurant_id, name);
create unique index if not exists customers_restaurant_phone_unique on public.customers (restaurant_id, phone) where phone is not null;
create index if not exists product_types_restaurant_idx on public.product_types (restaurant_id, active);
create index if not exists pizza_options_restaurant_kind_idx on public.pizza_options (restaurant_id, kind, active);

drop policy if exists "public read active product types" on public.product_types;
create policy "public read active product types" on public.product_types
for select using (active or app_private.is_restaurant_member(restaurant_id));

drop policy if exists "members manage product types" on public.product_types;
create policy "members manage product types" on public.product_types
for all using (app_private.is_restaurant_member(restaurant_id))
with check (app_private.is_restaurant_member(restaurant_id));

drop policy if exists "public read active variants" on public.product_variants;
create policy "public read active variants" on public.product_variants
for select using (
  active and exists (select 1 from public.products p where p.id = product_id and p.active)
  or exists (select 1 from public.products p where p.id = product_id and app_private.is_restaurant_member(p.restaurant_id))
);

drop policy if exists "members manage variants" on public.product_variants;
create policy "members manage variants" on public.product_variants
for all using (exists (select 1 from public.products p where p.id = product_id and app_private.is_restaurant_member(p.restaurant_id)))
with check (exists (select 1 from public.products p where p.id = product_id and app_private.is_restaurant_member(p.restaurant_id)));

drop policy if exists "public read active addons" on public.product_addons;
create policy "public read active addons" on public.product_addons
for select using (active or app_private.is_restaurant_member(restaurant_id));

drop policy if exists "members manage addons" on public.product_addons;
create policy "members manage addons" on public.product_addons
for all using (app_private.is_restaurant_member(restaurant_id))
with check (app_private.is_restaurant_member(restaurant_id));

drop policy if exists "public read active pizza options" on public.pizza_options;
create policy "public read active pizza options" on public.pizza_options
for select using (active or app_private.is_restaurant_member(restaurant_id));

drop policy if exists "members manage pizza options" on public.pizza_options;
create policy "members manage pizza options" on public.pizza_options
for all using (app_private.is_restaurant_member(restaurant_id))
with check (app_private.is_restaurant_member(restaurant_id));

drop policy if exists "members read item addons" on public.order_item_addons;
create policy "members read item addons" on public.order_item_addons
for select using (
  exists (
    select 1 from public.order_items oi
    where oi.id = order_item_id and app_private.is_restaurant_member(oi.restaurant_id)
  )
);

drop policy if exists "public creates site item addons" on public.order_item_addons;
create policy "public creates site item addons" on public.order_item_addons
for insert with check (
  exists (
    select 1 from public.order_items oi
    join public.orders o on o.id = oi.order_id
    where oi.id = order_item_id and o.source = 'site'
  )
);

drop policy if exists "members manage customer addresses" on public.customer_addresses;
create policy "members manage customer addresses" on public.customer_addresses
for all using (
  exists (
    select 1 from public.customers c
    where c.id = customer_id and app_private.is_restaurant_member(c.restaurant_id)
  )
)
with check (
  exists (
    select 1 from public.customers c
    where c.id = customer_id and app_private.is_restaurant_member(c.restaurant_id)
  )
);
