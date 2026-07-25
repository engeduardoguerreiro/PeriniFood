alter table public.customers
add column if not exists cpf text,
add column if not exists birth_date date,
add column if not exists password_hash text,
add column if not exists last_login_at timestamptz;

create unique index if not exists customers_restaurant_email_unique
on public.customers (restaurant_id, lower(email))
where email is not null and email <> '';
