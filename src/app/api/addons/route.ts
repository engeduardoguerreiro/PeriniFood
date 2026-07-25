import { NextResponse } from "next/server";
import { jsonBody, requireApiRestaurant } from "@/lib/api-helpers";

export async function GET() {
  const auth = await requireApiRestaurant();
  if (auth.error) return auth.error;
  const { supabase, restaurant } = auth.context;
  const { data, error } = await supabase.from("product_addons").select("*").eq("restaurant_id", restaurant.id).order("name");
  return NextResponse.json({ ok: !error, data, error: error?.message });
}

export async function POST(request: Request) {
  const auth = await requireApiRestaurant();
  if (auth.error) return auth.error;
  const { supabase, restaurant } = auth.context;
  const body = await jsonBody<{ name: string; price: number; active: boolean }>(request);
  const { data, error } = await supabase.from("product_addons").insert({
    restaurant_id: restaurant.id,
    name: body.name,
    price: body.price ?? 0,
    active: body.active ?? true,
  }).select("*").single();
  return NextResponse.json({ ok: !error, data, error: error?.message }, { status: error ? 400 : 201 });
}
