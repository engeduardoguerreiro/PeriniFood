alter table public.customers
add column if not exists address_number text,
add column if not exists complement text,
add column if not exists reference text;
