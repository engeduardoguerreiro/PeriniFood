alter type public.integration_provider add value if not exists 'own_menu';
alter type public.integration_status add value if not exists 'active';
alter type public.integration_status add value if not exists 'disabled';

alter table public.integrations add column if not exists name text;
alter table public.integrations add column if not exists environment text not null default 'production';
alter table public.integrations add column if not exists auth_type text not null default 'manual';
alter table public.integrations add column if not exists external_store_id text;
alter table public.integrations add column if not exists external_store_name text;
alter table public.integrations add column if not exists api_base_url text;
alter table public.integrations add column if not exists client_id text;
alter table public.integrations add column if not exists client_secret text;
alter table public.integrations add column if not exists access_token text;
alter table public.integrations add column if not exists refresh_token text;
alter table public.integrations add column if not exists api_key text;
alter table public.integrations add column if not exists webhook_secret text;
alter table public.integrations add column if not exists webhook_url text;
alter table public.integrations add column if not exists is_enabled boolean not null default false;
alter table public.integrations add column if not exists receive_orders boolean not null default true;
alter table public.integrations add column if not exists send_order_status boolean not null default false;
alter table public.integrations add column if not exists sync_menu boolean not null default false;
alter table public.integrations add column if not exists sync_products boolean not null default false;
alter table public.integrations add column if not exists sync_prices boolean not null default false;
alter table public.integrations add column if not exists auto_accept_orders boolean not null default false;
alter table public.integrations add column if not exists config jsonb not null default '{}'::jsonb;
alter table public.integrations add column if not exists last_error text;
alter table public.integrations add column if not exists updated_at timestamptz not null default now();

create table if not exists public.integration_product_maps (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  integration_id uuid not null references public.integrations(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_variant_id uuid references public.product_variants(id) on delete set null,
  external_product_id text not null,
  external_product_name text,
  external_variant_id text,
  external_variant_name text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (integration_id, external_product_id, external_variant_id)
);

create table if not exists public.integration_payment_maps (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  integration_id uuid not null references public.integrations(id) on delete cascade,
  external_payment_code text not null,
  external_payment_name text,
  internal_payment_method text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (integration_id, external_payment_code)
);

create table if not exists public.integration_orders (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  integration_id uuid not null references public.integrations(id) on delete cascade,
  order_id uuid references public.orders(id) on delete set null,
  external_order_id text not null,
  external_code text,
  external_status text,
  raw_payload jsonb not null,
  normalized_payload jsonb,
  imported_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (integration_id, external_order_id)
);

alter table public.integration_logs add column if not exists direction text;
alter table public.integration_logs add column if not exists external_id text;
alter table public.integration_logs add column if not exists request_headers jsonb;
alter table public.integration_logs add column if not exists request_payload jsonb;
alter table public.integration_logs add column if not exists response_payload jsonb;
alter table public.integration_logs add column if not exists error_message text;

alter table public.orders add column if not exists integration_id uuid references public.integrations(id) on delete set null;
alter table public.orders add column if not exists external_order_code text;

alter table public.integration_product_maps enable row level security;
alter table public.integration_payment_maps enable row level security;
alter table public.integration_orders enable row level security;

drop policy if exists "members manage integration product maps" on public.integration_product_maps;
create policy "members manage integration product maps" on public.integration_product_maps
for all using (app_private.is_restaurant_member(restaurant_id))
with check (app_private.is_restaurant_member(restaurant_id));

drop policy if exists "members manage integration payment maps" on public.integration_payment_maps;
create policy "members manage integration payment maps" on public.integration_payment_maps
for all using (app_private.is_restaurant_member(restaurant_id))
with check (app_private.is_restaurant_member(restaurant_id));

drop policy if exists "members read integration orders" on public.integration_orders;
create policy "members read integration orders" on public.integration_orders
for select using (app_private.is_restaurant_member(restaurant_id));

grant select, insert, update, delete on public.integration_product_maps to authenticated;
grant select, insert, update, delete on public.integration_payment_maps to authenticated;
grant select on public.integration_orders to authenticated;
