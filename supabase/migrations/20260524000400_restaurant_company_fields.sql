alter table public.restaurants
add column if not exists legal_name text,
add column if not exists cnpj text,
add column if not exists state_registration text;
