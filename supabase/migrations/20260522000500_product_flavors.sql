alter table public.products
add column if not exists max_flavors integer not null default 1;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'products_max_flavors_check'
  ) then
    alter table public.products
    add constraint products_max_flavors_check
    check (max_flavors between 1 and 4) not valid;
  end if;
end $$;
