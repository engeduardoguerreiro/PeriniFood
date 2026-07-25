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

alter table public.pizza_options enable row level security;

grant select on public.pizza_options to anon;
grant select, insert, update, delete on public.pizza_options to authenticated;

drop policy if exists "public read active pizza options" on public.pizza_options;
create policy "public read active pizza options" on public.pizza_options
for select using (active or app_private.is_restaurant_member(restaurant_id));

drop policy if exists "members manage pizza options" on public.pizza_options;
create policy "members manage pizza options" on public.pizza_options
for all using (app_private.is_restaurant_member(restaurant_id))
with check (app_private.is_restaurant_member(restaurant_id));

create index if not exists pizza_options_restaurant_kind_idx on public.pizza_options (restaurant_id, kind, active);
