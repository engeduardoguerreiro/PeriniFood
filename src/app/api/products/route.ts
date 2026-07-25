import { NextResponse } from "next/server";
import { jsonBody, requireApiRestaurant } from "@/lib/api-helpers";

export async function GET() {
  const auth = await requireApiRestaurant();
  if (auth.error) return auth.error;
  const { supabase, restaurant } = auth.context;
  const { data, error } = await supabase.from("products").select("*, categories(name)").eq("restaurant_id", restaurant.id).order("sort_order");
  return NextResponse.json({ ok: !error, data, error: error?.message });
}

export async function POST(request: Request) {
  const auth = await requireApiRestaurant();
  if (auth.error) return auth.error;
  const { supabase, restaurant } = auth.context;
  const body = await jsonBody<Record<string, unknown>>(request);
  const { data, error } = await supabase.from("products").insert({
    restaurant_id: restaurant.id,
    category_id: body.categoryId ?? null,
    name: body.name,
    description: body.description ?? null,
    price: body.price,
    image_url: body.imageUrl ?? null,
    active: body.active ?? true,
    featured: body.featured ?? false,
    preparation_time: body.preparationTime ?? 15,
    sort_order: body.sortOrder ?? 0,
  }).select("*").single();
  return NextResponse.json({ ok: !error, data, error: error?.message }, { status: error ? 400 : 201 });
}
