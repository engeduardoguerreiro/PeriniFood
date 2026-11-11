-- Índices para escala multi-loja (100+ restaurantes).
-- Só acrescenta índices: não muda dados, políticas nem comportamento.
--
-- Sem CONCURRENTLY porque o SQL Editor roda o script numa transação e as
-- tabelas ainda são pequenas (a criação é instantânea). Quando houver milhões
-- de linhas, criar índices novos com CONCURRENTLY, um comando por execução.

-- 1) integration_logs não tinha NENHUM índice: toda leitura varria a tabela
--    inteira (de todas as lojas). Lida a cada refresh do quadro de pedidos.
-- Quadro de pedidos (último aviso WhatsApp) e /integracoes/[provider].
create index if not exists integration_logs_rest_provider_created_idx
  on public.integration_logs (restaurant_id, provider, created_at desc);
-- /integracoes/logs sem filtro de provider.
create index if not exists integration_logs_rest_created_idx
  on public.integration_logs (restaurant_id, created_at desc);
-- Deduplicação de avisos automáticos (whatsapp/notify.ts).
create index if not exists integration_logs_rest_external_idx
  on public.integration_logs (restaurant_id, provider, external_id)
  where external_id is not null;

-- 2) order_items: dashboard e relatórios filtram por restaurant_id com join em
--    orders; só existia índice em (order_id).
create index if not exists order_items_restaurant_order_idx
  on public.order_items (restaurant_id, order_id);
-- FK ON DELETE SET NULL: excluir produto varria order_items de todas as lojas.
create index if not exists order_items_product_idx
  on public.order_items (product_id) where product_id is not null;

-- 3) order_item_addons.order_item_id é FK ON DELETE CASCADE sem índice: cada
--    edição de pedido (save_order_atomic apaga itens) varria a tabela inteira.
create index if not exists order_item_addons_order_item_idx
  on public.order_item_addons (order_item_id);

-- 4) customers: só havia índices únicos parciais (phone/email), que não servem
--    para listar os clientes de uma loja.
create index if not exists customers_restaurant_created_idx
  on public.customers (restaurant_id, created_at desc);

-- 5) orders.customer_id (FK SET NULL): histórico do cliente e exclusão de cliente.
create index if not exists orders_customer_created_idx
  on public.orders (customer_id, created_at desc) where customer_id is not null;

-- 6) Demais FKs consultadas/afetadas por exclusão em cascata.
create index if not exists integration_orders_order_idx
  on public.integration_orders (order_id) where order_id is not null;
create index if not exists customer_sessions_customer_idx
  on public.customer_sessions (customer_id);
create index if not exists customer_addresses_customer_idx
  on public.customer_addresses (customer_id);

analyze public.integration_logs, public.order_items, public.order_item_addons,
  public.customers, public.orders, public.integration_orders,
  public.customer_sessions, public.customer_addresses;
