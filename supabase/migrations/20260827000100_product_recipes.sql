-- Ficha técnica de produção: documento interno da cozinha, um por produto.
-- Não aparece no cardápio público — é material de operação do restaurante.

create table if not exists public.product_recipes (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  yield_label text,
  ingredients jsonb not null default '[]'::jsonb,
  steps jsonb not null default '[]'::jsonb,
  visual_standard text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_id)
);

create index if not exists product_recipes_restaurant_idx
  on public.product_recipes (restaurant_id);

alter table public.product_recipes enable row level security;

grant select, insert, update, delete on public.product_recipes to authenticated;

-- Só a equipe do restaurante enxerga e edita as próprias fichas.
drop policy if exists "members manage product recipes" on public.product_recipes;
create policy "members manage product recipes" on public.product_recipes
for all using (app_private.is_restaurant_member(restaurant_id))
with check (app_private.is_restaurant_member(restaurant_id));
