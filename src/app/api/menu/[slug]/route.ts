import type { Restaurant } from "@/lib/types";
import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { publicRestaurant, PUBLIC_PRODUCT_FIELDS } from "@/lib/public-data";

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = createServiceClient();
  const { data: restaurant, error } = await supabase.from("restaurants").select("*").eq("slug", slug).maybeSingle();
  if (error || !restaurant) return NextResponse.json({ ok: false, error: "Restaurante não encontrado" }, { status: 404 });
  const [{ data: categories }, { data: products }, { data: addons }, { data: variants }, { data: options }] = await Promise.all([
    supabase.from("categories").select("*").eq("restaurant_id", restaurant.id).eq("active", true).order("display_order"),
    supabase.from("products").select(PUBLIC_PRODUCT_FIELDS).eq("restaurant_id", restaurant.id).eq("active", true).order("price", { ascending: true }).order("name", { ascending: true }),
    supabase.from("product_addons").select("*").eq("restaurant_id", restaurant.id).eq("active", true),
    supabase.from("product_variants").select("*, products!inner(restaurant_id)").eq("products.restaurant_id", restaurant.id).eq("active", true),
    supabase.from("product_options").select("*, product_option_items(*)").eq("restaurant_id", restaurant.id),
  ]);
  return NextResponse.json({ ok: true, restaurant: publicRestaurant(restaurant as Restaurant), categories, products, addons, variants, options });
}
