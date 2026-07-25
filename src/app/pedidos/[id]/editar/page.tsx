import { updatePdvOrder } from "@/app/actions";
import { ManualOrderBuilder } from "@/components/manual-order-builder";
import { AppShell } from "@/components/app-shell";
import { requireRestaurant } from "@/lib/auth";
import { deliveryRulesFromRestaurant } from "@/lib/delivery-fee-rules";
import type { Category, Customer, DeliveryFeeRule, Order, OrderItem, PizzaOption, Product, ProductOption, ProductType, ProductVariant } from "@/lib/types";

type SelectedOptions = {
  variantId: string | null;
  flavorCount: number;
  flavors: string[];
  dough: { name: string; price: number } | null;
  crust: { name: string; price: number } | null;
  addons: Array<{ name: string; price: number }>;
};

function selectedOptions(value: OrderItem["selected_options"]): SelectedOptions {
  if (!value || typeof value !== "object") return { variantId: null, flavorCount: 1, flavors: [], dough: null, crust: null, addons: [] };
  return value as SelectedOptions;
}

function parseAddressFromOrder(value: string | null) {
  const result = { cep: "", street: value ?? "", neighborhood: "", city: "", state: "", number: "", complement: "", reference: "" };
  if (!value) return result;
  const parts = value.split(" - ").map((part) => part.trim()).filter(Boolean);
  const cepPart = parts.find((part) => part.toLowerCase().startsWith("cep "));
  const cityPart = parts.find((part) => part.includes("/"));
  const numberPart = parts.find((part) => part.toLowerCase().startsWith("n?") || part.toLowerCase().startsWith("n?") || part.toLowerCase().startsWith("no "));
  return {
    ...result,
    street: parts[0] ?? value,
    number: numberPart?.replace(/^(n?|n?|no)\s*/i, "") ?? "",
    neighborhood: parts.find((part) => part !== parts[0] && part !== cepPart && part !== cityPart && part !== numberPart) ?? "",
    city: cityPart?.split("/")[0]?.trim() ?? "",
    state: cityPart?.split("/")[1]?.trim() ?? "",
    cep: cepPart?.replace(/^cep\s*/i, "") ?? "",
  };
}

export default async function EditOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, restaurant } = await requireRestaurant();
  const [{ data: order }, { data: items }, { data: products }, { data: types }, { data: categories }, { data: variants }, { data: options }, { data: deliveryRules }, { data: pizzaOptions }] = await Promise.all([
    supabase.from("orders").select("*").eq("restaurant_id", restaurant.id).eq("id", id).single(),
    supabase.from("order_items").select("*").eq("restaurant_id", restaurant.id).eq("order_id", id),
    supabase.from("products").select("*").eq("restaurant_id", restaurant.id).eq("active", true).order("name"),
    supabase.from("product_types").select("*").eq("restaurant_id", restaurant.id).eq("active", true).order("name"),
    supabase.from("categories").select("*").eq("restaurant_id", restaurant.id).eq("active", true).order("display_order"),
    supabase.from("product_variants").select("*").eq("active", true).order("name"),
    supabase.from("product_options").select("*, product_option_items(*)").eq("restaurant_id", restaurant.id),
    supabase.from("delivery_fee_rules").select("*").eq("restaurant_id", restaurant.id).eq("active", true).order("min_km"),
    supabase.from("pizza_options").select("*").eq("restaurant_id", restaurant.id).eq("active", true),
  ]);
  const current = order as Order;
  const { data: customer } = current.customer_id ?
     await supabase.from("customers").select("*").eq("restaurant_id", restaurant.id).eq("id", current.customer_id).maybeSingle()
    : { data: null };
  const currentCustomer = customer as Customer | null;
  const address = currentCustomer ?
     {
      cep: currentCustomer.zip_code ?? "",
      street: currentCustomer.address ?? current.delivery_address ?? "",
      neighborhood: currentCustomer.neighborhood ?? "",
      city: currentCustomer.city ?? "",
      state: currentCustomer.state ?? "",
      number: currentCustomer.address_number ?? "",
      complement: currentCustomer.complement ?? "",
      reference: currentCustomer.reference ?? "",
    }
    : parseAddressFromOrder(current.delivery_address);

  const productMap = new Map(((products ?? []) as Product[]).map((product) => [product.id, product]));
  const cart = ((items ?? []) as OrderItem[]).map((item) => {
    const selected = selectedOptions(item.selected_options);
    const product = item.product_id ? productMap.get(item.product_id) : null;
    return {
      id: item.product_id ?? "",
      name: product?.name ?? item.product_name,
      price: Number(item.unit_price ?? 0),
      quantity: Number(item.quantity ?? 1),
      variantId: selected.variantId ?? item.variant_id ?? null,
      variantName: item.product_name?.includes(" - ") ? item.product_name.split(" - ").slice(1).join(" - ") : null,
      flavorCount: selected.flavorCount ?? 1,
      flavors: selected.flavors ?? [],
      dough: selected.dough?.name ? { name: selected.dough.name, price: Number(selected.dough.price ?? 0) } : null,
      crust: selected.crust?.name ? { name: selected.crust.name, price: Number(selected.crust.price ?? 0) } : null,
      additions: (selected.addons ?? []).filter((addon) => addon.name).map((addon) => ({ name: addon.name, price: Number(addon.price ?? 0) })),
      notes: item.notes ?? "",
      confirmed: true,
    };
  }).filter((item) => item.id);

  return (
    <AppShell>
      <ManualOrderBuilder
        action={updatePdvOrder}
        mode="edit"
        initialData={{
          orderId: current.id,
          customerId: current.customer_id,
          customerName: current.customer_name,
          customerPhone: current.customer_phone,
          type: current.type,
          paymentMethod: current.payment_method,
          changeFor: current.change_for,
          discount: Number(current.discount ?? 0),
          deliveryFee: Number(current.delivery_fee ?? 0),
          address,
          notes: current.notes,
          cart,
        }}
        restaurant={restaurant}
        products={(products ?? []) as Product[]}
        types={(types ?? []) as ProductType[]}
        categories={(categories ?? []) as Category[]}
        variants={(variants ?? []) as ProductVariant[]}
        options={(options ?? []) as ProductOption[]}
        defaultDeliveryFee={Number(restaurant.delivery_fee ?? 0)}
        deliveryRules={(((deliveryRules ?? []).length ? deliveryRules : deliveryRulesFromRestaurant(restaurant)) ?? []) as DeliveryFeeRule[]}
        maxPizzaFlavors={Math.min(4, Math.max(1, Number(restaurant.max_pizza_flavors ?? 1)))}
        pizzaOptions={(pizzaOptions ?? []) as PizzaOption[]}
      />
    </AppShell>
  );
}
