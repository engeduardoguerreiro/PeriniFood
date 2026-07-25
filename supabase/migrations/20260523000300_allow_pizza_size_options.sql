alter table public.pizza_options
drop constraint if exists pizza_options_kind_check;

alter table public.pizza_options
add constraint pizza_options_kind_check
check (kind in ('tamanho', 'massa', 'borda', 'adicional'));
