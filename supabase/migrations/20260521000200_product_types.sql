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

alter table public.product_types enable row level security;

grant select on public.product_types to anon;
grant select, insert, update, delete on public.product_types to authenticated;

drop policy if exists "public read active product types" on public.product_types;
create policy "public read active product types" on public.product_types
for select using (active or app_private.is_restaurant_member(restaurant_id));

drop policy if exists "members manage product types" on public.product_types;
create policy "members manage product types" on public.product_types
for all using (app_private.is_restaurant_member(restaurant_id))
with check (app_private.is_restaurant_member(restaurant_id));

create index if not exists product_types_restaurant_idx on public.product_types (restaurant_id, active);
