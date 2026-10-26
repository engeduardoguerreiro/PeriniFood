-- Impressão automática dos pedidos do site e do iFood no painel: o computador marcado como
-- "estação de impressão" reserva o pedido (auto_printed_at) antes de imprimir, então
-- vários computadores/abas abertos não imprimem a mesma comanda duas vezes.
-- Aditiva e idempotente. Aplicar ANTES do deploy.
begin;

alter table public.orders add column if not exists auto_printed_at timestamptz;

-- Consulta do alerta: pedidos recentes do site e do iFood da loja.
create index if not exists orders_alert_recent_idx on public.orders (restaurant_id, created_at desc) where source in ('site', 'ifood');

commit;
