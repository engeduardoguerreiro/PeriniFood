import { ManualOrderBuilder } from "@/components/manual-order-builder";
import { requireRestaurant } from "@/lib/auth";
import { deliveryRulesFromRestaurant } from "@/lib/delivery-fee-rules";
import type { Category, DeliveryFeeRule, PizzaOption, Product, ProductOption, ProductType, ProductVariant } from "@/lib/types";

export default async function PdvPage() {
  const { supabase, restaurant } = await requireRestaurant();
  const [{ data: products }, { data: types }, { data: categories }, { data: variants }, { data: options }, { data: deliveryRules }, { data: pizzaOptions }] = await Promise.all([
    supabase.from("products").select("*").eq("restaurant_id", restaurant.id).eq("active", true).order("name"),
    supabase.from("product_types").select("*").eq("restaurant_id", restaurant.id).eq("active", true).order("name"),
    supabase.from("categories").select("*").eq("restaurant_id", restaurant.id).eq("active", true).order("display_order"),
    supabase.from("product_variants").select("*").eq("active", true).order("name"),
    supabase.from("product_options").select("*, product_option_items(*)").eq("restaurant_id", restaurant.id),
    supabase.from("delivery_fee_rules").select("*").eq("restaurant_id", restaurant.id).eq("active", true).order("min_km"),
    supabase.from("pizza_options").select("*").eq("restaurant_id", restaurant.id).eq("active", true),
  ]);
  return (
    <ManualOrderBuilder
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
  );
}
