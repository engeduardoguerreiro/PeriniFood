alter table public.restaurants
add column if not exists payment_methods jsonb not null default '["pix", "cash", "credit_card", "debit_card"]'::jsonb;

alter table public.customers
add column if not exists birth_date date;
