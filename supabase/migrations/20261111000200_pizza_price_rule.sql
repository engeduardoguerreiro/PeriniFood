-- Cobrança da pizza com mais de um sabor (Configurações > Regras do pedido):
--   highest = cobra o sabor de maior valor (comportamento anterior, padrão)
--   average = média: cada fração cobra sua parte do preço do sabor
--             (meia R$ 50 + meia R$ 60 = R$ 25 + R$ 30 = R$ 55; idem 3 e 4 sabores)
-- Vale para cardápio online e PDV; o servidor reprecifica todo pedido.
-- Aditiva e idempotente. Pode ser aplicada antes ou depois do deploy
-- (sem a coluna, o código usa "highest").
begin;

alter table public.restaurants add column if not exists pizza_price_rule text not null default 'highest';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'restaurants_pizza_price_rule_check') then
    alter table public.restaurants add constraint restaurants_pizza_price_rule_check check (pizza_price_rule in ('highest', 'average'));
  end if;
end $$;

commit;
