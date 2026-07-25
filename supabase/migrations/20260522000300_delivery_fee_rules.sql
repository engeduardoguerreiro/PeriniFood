-- Optional structure for delivery fee rules by distance.
-- Browser-only MVP uses the restaurant default fee; this table prepares the SaaS
-- for km-based rules once geocoding/distance calculation is connected.

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

alter table public.delivery_fee_rules enable row level security;

grant select on public.delivery_fee_rules to anon;
grant select, insert, update, delete on public.delivery_fee_rules to authenticated;

drop policy if exists "public read active delivery fee rules" on public.delivery_fee_rules;
create policy "public read active delivery fee rules" on public.delivery_fee_rules
for select using (active or app_private.is_restaurant_member(restaurant_id));

drop policy if exists "members manage delivery fee rules" on public.delivery_fee_rules;
create policy "members manage delivery fee rules" on public.delivery_fee_rules
for all using (app_private.is_restaurant_member(restaurant_id))
with check (app_private.is_restaurant_member(restaurant_id));

create index if not exists delivery_fee_rules_restaurant_idx
on public.delivery_fee_rules (restaurant_id, active, min_km, max_km);
