-- Rastreamento do motoboy por link (sem cadastro, sem app). Cada pedido de entrega
-- tem no máximo um link ativo; quem tem o link envia a posição daquele pedido.
-- Acesso só pelo servidor (service role): RLS ligada e sem grants para anon/authenticated.
-- Idempotente: pode rodar mais de uma vez. Aplicar ANTES do deploy do código.
begin;

create table if not exists public.delivery_tracking (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  order_id uuid not null unique references public.orders(id) on delete cascade,
  token text not null unique,
  courier_name text,
  dest_lat double precision,
  dest_lng double precision,
  last_lat double precision,
  last_lng double precision,
  last_accuracy real,
  last_heading real,
  last_speed real,
  last_seen_at timestamptz,
  started_at timestamptz,
  delivered_at timestamptz,
  expires_at timestamptz not null default (now() + interval '12 hours'),
  created_at timestamptz not null default now()
);

create table if not exists public.delivery_locations (
  id bigserial primary key,
  tracking_id uuid not null references public.delivery_tracking(id) on delete cascade,
  lat double precision not null,
  lng double precision not null,
  accuracy real,
  recorded_at timestamptz not null default now()
);

create index if not exists delivery_tracking_restaurant_idx on public.delivery_tracking (restaurant_id, created_at desc);
create index if not exists delivery_locations_tracking_idx on public.delivery_locations (tracking_id, recorded_at);

alter table public.delivery_tracking enable row level security;
alter table public.delivery_locations enable row level security;
revoke all on public.delivery_tracking from anon, authenticated;
revoke all on public.delivery_locations from anon, authenticated;

commit;
