-- Pagamento do pedido do site (Configurações > Pagamento). Nada é cobrado online:
-- "Pix agora" mostra ao cliente um código Pix gerado só com a chave da loja; os
-- demais meios são pagos na entrega/retirada (cartão: motoboy leva a maquininha).
--   restaurants.pix_*      chave Pix da loja e nome/cidade que vão no código
--   orders.payment_detail  pix_online | pix_entrega | maquininha | dinheiro
-- payment_methods (jsonb) passa a aceitar "pix_online" e "pix_delivery"; "pix" antigo
-- continua valendo como Pix na entrega. Aditiva e idempotente. Aplicar ANTES do deploy.
begin;

alter table public.restaurants add column if not exists pix_key text;
alter table public.restaurants add column if not exists pix_key_type text;
alter table public.restaurants add column if not exists pix_receiver_name text;
alter table public.restaurants add column if not exists pix_city text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'restaurants_pix_key_type_check') then
    alter table public.restaurants add constraint restaurants_pix_key_type_check check (pix_key_type is null or pix_key_type in ('cpf', 'cnpj', 'phone', 'email', 'random'));
  end if;
end $$;

alter table public.orders add column if not exists payment_detail text;

commit;
