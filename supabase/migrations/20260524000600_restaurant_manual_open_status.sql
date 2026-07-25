alter table public.restaurants
add column if not exists manual_open_status text not null default 'auto';

alter table public.restaurants
drop constraint if exists restaurants_manual_open_status_check;

alter table public.restaurants
add constraint restaurants_manual_open_status_check
check (manual_open_status in ('auto', 'open', 'closed'));
