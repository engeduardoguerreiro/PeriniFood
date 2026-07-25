-- Optional fields used by the professional product builder.
-- The app tolerates these columns being absent, but applying this improves data fidelity.

alter table public.product_types
  add column if not exists slug text;

update public.product_types
set slug = lower(regexp_replace(name, '[^a-zA-Z0-9]+', '-', 'g'))
where slug is null;

create unique index if not exists product_types_restaurant_slug_unique
on public.product_types (restaurant_id, slug)
where slug is not null;

alter table public.products
  add column if not exists internal_notes text,
  add column if not exists delivery_available boolean not null default true,
  add column if not exists pickup_available boolean not null default true,
  add column if not exists dine_in_available boolean not null default true;

alter table public.product_variants
  add column if not exists slices integer,
  add column if not exists notes text,
  add column if not exists sort_order integer not null default 0;

create index if not exists product_variants_product_sort_idx
on public.product_variants (product_id, sort_order, active);
