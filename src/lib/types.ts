export type Role = "owner" | "admin" | "manager" | "cashier" | "kitchen";
export type OrderStatus = "pending" | "accepted" | "preparing" | "ready" | "out_for_delivery" | "completed" | "canceled";
export type OrderSource = "pdv" | "mesa" | "delivery" | "site" | "ifood" | "99food" | "keeta" | "rappi" | "manual";
export type PublicOrderStatus = "NEW" | "CONFIRMED" | "PREPARING" | "READY" | "OUT_FOR_DELIVERY" | "DELIVERED" | "CANCELED";

export type Restaurant = {
  id: string;
  owner_id: string;
  name: string;
  legal_name: string | null;
  cnpj: string | null;
  state_registration: string | null;
  slug: string;
  description: string | null;
  logo_url: string | null;
  banner_url: string | null;
  site_cover_url: string | null;
  cover_url: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  address: string | null;
  address_number: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  is_open: boolean;
  manual_open_status: "auto" | "open" | "closed" | null;
  minimum_order: number | null;
  delivery_fee: number | null;
  estimated_delivery_time: string | null;
  menu_footer_message: string | null;
  max_pizza_flavors: number | null;
  payment_methods: string[] | null;
  opening_hours: Record<string, unknown> | null;
  delivery_enabled: boolean;
  pickup_enabled: boolean;
  table_service_enabled: boolean;
  created_at: string;
  updated_at: string;
};

export type Category = {
  id: string;
  restaurant_id: string;
  name: string;
  description: string | null;
  display_order: number;
  sort_order: number;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type Product = {
  id: string;
  restaurant_id: string;
  category_id: string | null;
  product_type_id: string | null;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  active: boolean;
  featured: boolean;
  max_flavors: number | null;
  preparation_time: number | null;
  internal_notes: string | null;
  delivery_available: boolean | null;
  pickup_available: boolean | null;
  dine_in_available: boolean | null;
  sort_order: number;
  stock_control_enabled: boolean;
  stock_quantity: number | null;
  created_at: string;
  updated_at: string;
  categories: Pick<Category, "name"> | null;
};

export type ProductType = {
  id: string;
  restaurant_id: string;
  name: string;
  description: string | null;
  active: boolean;
  created_at: string;
};

export type ProductOptionItem = {
  id: string;
  restaurant_id: string;
  option_id: string;
  name: string;
  additional_price: number;
  active: boolean;
  created_at: string;
};

export type ProductOption = {
  id: string;
  restaurant_id: string;
  product_id: string;
  name: string;
  type: "single" | "multiple";
  required: boolean;
  min_choices: number;
  max_choices: number | null;
  created_at: string;
  product_option_items: ProductOptionItem[];
};

export type PizzaOptionKind = "tamanho" | "massa" | "borda" | "adicional";

export type PizzaOption = {
  id: string;
  restaurant_id: string;
  kind: PizzaOptionKind;
  name: string;
  price: number;
  active: boolean;
  created_at: string;
};

export type ProductVariant = {
  id: string;
  product_id: string;
  name: string;
  price: number;
  active: boolean;
  slices: number | null;
  notes: string | null;
  sort_order: number | null;
  created_at: string;
};

export type ProductAddon = {
  id: string;
  restaurant_id: string;
  name: string;
  price: number;
  active: boolean;
  created_at: string;
};

export type DeliveryFeeRule = {
  id: string;
  restaurant_id: string;
  name: string;
  min_km: number;
  max_km: number | null;
  fee: number;
  free_delivery: boolean;
  active: boolean;
  created_at: string;
};

export type Coupon = {
  id: string;
  restaurant_id: string;
  code: string;
  description: string | null;
  discount_type: "percent" | "fixed";
  discount_value: number;
  minimum_order: number;
  max_uses: number | null;
  used_count: number;
  starts_at: string | null;
  ends_at: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type LoyaltyProgram = {
  id: string;
  restaurant_id: string;
  enabled: boolean;
  points_per_currency: number;
  points_to_reward: number;
  reward_type: "percent" | "fixed";
  reward_value: number;
  description: string | null;
  created_at: string;
  updated_at: string;
};

export type Customer = {
  id: string;
  restaurant_id: string;
  name: string;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  cpf: string | null;
  birth_date: string | null;
  address: string | null;
  address_number: string | null;
  neighborhood: string | null;
  complement: string | null;
  reference: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type CustomerAddress = {
  id: string;
  customer_id: string;
  street: string;
  number: string | null;
  neighborhood: string | null;
  complement: string | null;
  reference: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  created_at: string;
};

export type Order = {
  id: string;
  restaurant_id: string;
  customer_id: string | null;
  order_number: number;
  code: string | null;
  source: OrderSource;
  type: "dine_in" | "delivery" | "pickup";
  status: OrderStatus;
  payment_status: "pending" | "paid" | "refunded";
  payment_method: "cash" | "credit_card" | "debit_card" | "pix" | "online" | "other";
  change_for: number | null;
  subtotal: number;
  delivery_fee: number;
  discount: number;
  total: number;
  customer_name: string | null;
  customer_phone: string | null;
  delivery_address: string | null;
  table_id: string | null;
  notes: string | null;
  external_order_id: string | null;
  external_platform: string | null;
  created_at: string;
  updated_at: string;
};

export type OrderItem = {
  id: string;
  restaurant_id: string;
  order_id: string;
  product_id: string | null;
  variant_id: string | null;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  notes: string | null;
  selected_options: Record<string, unknown> | null;
  created_at: string;
};

export type OrderItemAddon = {
  id: string;
  order_item_id: string;
  addon_id: string | null;
  name: string;
  price: number;
  created_at: string;
};

export type Table = {
  id: string;
  restaurant_id: string;
  number: number;
  name: string | null;
  status: "available" | "occupied" | "reserved" | "closed";
  created_at: string;
};
