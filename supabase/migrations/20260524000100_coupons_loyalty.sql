create table if not exists public.coupons (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  code text not null,
  description text,
  discount_type text not null default 'percent' check (discount_type in ('percent', 'fixed')),
  discount_value numeric(12,2) not null default 0,
  minimum_order numeric(12,2) not null default 0,
  max_uses integer,
  used_count integer not null default 0,
  starts_at timestamptz,
  ends_at timestamptz,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (restaurant_id, code)
);

create table if not exists public.loyalty_programs (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null unique references public.restaurants(id) on delete cascade,
  enabled boolean not null default false,
  points_per_currency numeric(12,2) not null default 1,
  points_to_reward integer not null default 10,
  reward_type text not null default 'percent' check (reward_type in ('percent', 'fixed')),
  reward_value numeric(12,2) not null default 5,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.coupons enable row level security;
alter table public.loyalty_programs enable row level security;

drop policy if exists "public read active coupons" on public.coupons;
create policy "public read active coupons" on public.coupons
for select using (
  active
  and (starts_at is null or starts_at <= now())
  and (ends_at is null or ends_at >= now())
);

drop policy if exists "members manage coupons" on public.coupons;
create policy "members manage coupons" on public.coupons
for all using (app_private.is_restaurant_member(restaurant_id))
with check (app_private.is_restaurant_member(restaurant_id));

drop policy if exists "public read loyalty programs" on public.loyalty_programs;
create policy "public read loyalty programs" on public.loyalty_programs
for select using (enabled);

drop policy if exists "members manage loyalty programs" on public.loyalty_programs;
create policy "members manage loyalty programs" on public.loyalty_programs
for all using (app_private.is_restaurant_member(restaurant_id))
with check (app_private.is_restaurant_member(restaurant_id));

grant select on public.coupons to anon, authenticated;
grant select on public.loyalty_programs to anon, authenticated;
grant select, insert, update, delete on public.coupons to authenticated;
grant select, insert, update, delete on public.loyalty_programs to authenticated;
