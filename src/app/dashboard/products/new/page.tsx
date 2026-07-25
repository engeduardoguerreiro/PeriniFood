import { requireRestaurant } from "@/lib/auth";
import { ActionFeedback } from "@/components/action-feedback";
import type { Category, PizzaOption, ProductType } from "@/lib/types";
import { ProductForm } from "../product-form";

export default async function NewProductPage({ searchParams }: { searchParams: Promise<{ status: string; error: string }> }) {
  const sp = await searchParams;
  const { supabase, restaurant } = await requireRestaurant();
  const [{ data: categories }, { data: types }, { data: pizzaOptions }] = await Promise.all([
    supabase.from("categories").select("*").eq("restaurant_id", restaurant.id).order("display_order"),
    supabase.from("product_types").select("*").eq("restaurant_id", restaurant.id).eq("active", true).order("name"),
    supabase.from("pizza_options").select("*").eq("restaurant_id", restaurant.id).eq("active", true).order("kind").order("name"),
  ]);
  return (
    <>
      <ActionFeedback status={sp.status} error={sp.error} />
      <ProductForm categories={(categories ?? []) as Category[]} types={(types ?? []) as ProductType[]} pizzaOptions={(pizzaOptions ?? []) as PizzaOption[]} restaurantSlug={restaurant.slug} />
    </>
  );
}
