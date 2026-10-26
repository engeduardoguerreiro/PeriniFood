-- Regras da loja para a borda e os adicionais no pedido do site (Cardápio > Opções de pizza):
--   optional = cliente pode seguir sem responder
--   ask      = precisa responder (borda: escolher uma ou "sem borda"; adicionais: sim ou não)
--   required = precisa escolher uma borda recheada / ao menos um adicional
-- O servidor confere as regras em todo pedido do site. Aditiva e idempotente.
-- Aplicar ANTES do deploy.
begin;

alter table public.restaurants add column if not exists crust_choice_rule text not null default 'ask';
alter table public.restaurants add column if not exists addon_choice_rule text not null default 'ask';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'restaurants_crust_choice_rule_check') then
    alter table public.restaurants add constraint restaurants_crust_choice_rule_check check (crust_choice_rule in ('optional', 'ask', 'required'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'restaurants_addon_choice_rule_check') then
    alter table public.restaurants add constraint restaurants_addon_choice_rule_check check (addon_choice_rule in ('optional', 'ask', 'required'));
  end if;
end $$;

commit;
