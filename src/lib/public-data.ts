import type { Product, Restaurant } from "./types";

// Explicit allowlist: never serialize printer tokens, legal/company fields or owner IDs.
export function publicRestaurant(row: Restaurant): Restaurant {
  const hours = Object.fromEntries(Object.entries(row.opening_hours ?? {}).filter(([key]) =>
    ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday", "_delivery_fee_rules", "_loyalty_campaign"].includes(key)));
  return {
    id: row.id, name: row.name, slug: row.slug, description: row.description,
    logo_url: row.logo_url, banner_url: row.banner_url, site_cover_url: row.site_cover_url, cover_url: row.cover_url,
    phone: row.phone, whatsapp: row.whatsapp, email: row.email, address: row.address, address_number: row.address_number,
    neighborhood: row.neighborhood, city: row.city, state: row.state, zip_code: row.zip_code,
    is_open: row.is_open, manual_open_status: row.manual_open_status, minimum_order: row.minimum_order,
    delivery_fee: row.delivery_fee, estimated_delivery_time: row.estimated_delivery_time,
    menu_footer_message: row.menu_footer_message, max_pizza_flavors: row.max_pizza_flavors, payment_methods: row.payment_methods,
    opening_hours: hours, delivery_enabled: row.delivery_enabled, pickup_enabled: row.pickup_enabled, table_service_enabled: row.table_service_enabled,
  } as Restaurant;
}

// delivery_available/pickup_available/dine_in_available ficam de fora de propósito: o banco de
// produção pulou a migration 20260522000200 e não tem essas colunas — pedi-las faria o PostgREST
// responder 42703 e o cardápio inteiro ficaria vazio. Sem elas o preço trata o produto como disponível.
export const PUBLIC_PRODUCT_FIELDS = "id,restaurant_id,category_id,product_type_id,name,description,price,image_url,active,featured,max_flavors,preparation_time,sort_order";
export function publicProducts(rows: unknown): Product[] { return (rows ?? []) as Product[]; }
export const CUSTOMER_FIELDS = "id,restaurant_id,name,phone,whatsapp,email,cpf,birth_date,address,address_number,neighborhood,complement,reference,city,state,zip_code,notes,created_at,updated_at";
