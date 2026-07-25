import { notFound } from "next/navigation";
import { requireRestaurant } from "@/lib/auth";
import { ActionFeedback } from "@/components/action-feedback";
import type { Category, PizzaOption, Product, ProductOption, ProductType, ProductVariant } from "@/lib/types";
import { ProductForm } from "../../product-form";

async function loadProductVariants(supabase: Awaited<ReturnType<typeof requireRestaurant>>["supabase"], productId: string) {
  const ordered = await supabase.from("product_variants").select("*").eq("product_id", productId).order("sort_order");
  if (!ordered.error) return ordered.data ?? [];

  const fallback = await supabase.from("product_variants").select("*").eq("product_id", productId).order("name");
  return fallback.data ?? [];
}

export default async function EditProductPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ status: string; error: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  const { supabase, restaurant } = await requireRestaurant();
  const [{ data: categories }, { data: types }, { data: pizzaOptions }, { data: product }, { data: options }, variants] = await Promise.all([
    supabase.from("categories").select("*").eq("restaurant_id", restaurant.id).order("display_order"),
    supabase.from("product_types").select("*").eq("restaurant_id", restaurant.id).eq("active", true).order("name"),
    supabase.from("pizza_options").select("*").eq("restaurant_id", restaurant.id).eq("active", true).order("kind").order("name"),
    supabase.from("products").select("*").eq("restaurant_id", restaurant.id).eq("id", id).maybeSingle(),
    supabase.from("product_options").select("*, product_option_items(*)").eq("restaurant_id", restaurant.id).eq("product_id", id),
    loadProductVariants(supabase, id),
  ]);
  if (!product) notFound();
  return (
    <>
      <ActionFeedback status={sp.status} error={sp.error} />
      <ProductForm categories={(categories ?? []) as Category[]} types={(types ?? []) as ProductType[]} pizzaOptions={(pizzaOptions ?? []) as PizzaOption[]} product={product as Product} options={(options ?? []) as ProductOption[]} variants={(variants ?? []) as ProductVariant[]} restaurantSlug={restaurant.slug} />
    </>
  );
}
