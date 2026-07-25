-- Allow restaurant members to replace order items while editing an order.
-- The original schema only allowed SELECT and INSERT, so every edit appended
-- a new copy of the cart instead of removing the previous items.

grant select, insert, update, delete on public.order_items to authenticated;
grant select, insert, update, delete on public.order_item_addons to authenticated;

drop policy if exists "members delete order items" on public.order_items;
create policy "members delete order items" on public.order_items
for delete to authenticated
using (app_private.is_restaurant_member(restaurant_id));

drop policy if exists "members manage item addons" on public.order_item_addons;
create policy "members manage item addons" on public.order_item_addons
for all to authenticated
using (
  exists (
    select 1 from public.order_items oi
    where oi.id = order_item_id
      and app_private.is_restaurant_member(oi.restaurant_id)
  )
)
with check (
  exists (
    select 1 from public.order_items oi
    where oi.id = order_item_id
      and app_private.is_restaurant_member(oi.restaurant_id)
  )
);