alter table public.restaurants
add column if not exists max_pizza_flavors integer not null default 1;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'restaurants_max_pizza_flavors_check'
  ) then
    alter table public.restaurants
    add constraint restaurants_max_pizza_flavors_check
    check (max_pizza_flavors between 1 and 4) not valid;
  end if;
end $$;
