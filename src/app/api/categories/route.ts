import { NextResponse } from "next/server";
import { jsonBody, requireApiRestaurant } from "@/lib/api-helpers";

export async function GET() {
  const auth = await requireApiRestaurant();
  if (auth.error) return auth.error;
  const { supabase, restaurant } = auth.context;
  const { data, error } = await supabase.from("categories").select("*").eq("restaurant_id", restaurant.id).order("display_order");
  return NextResponse.json({ ok: !error, data, error: error?.message });
}

export async function POST(request: Request) {
  const auth = await requireApiRestaurant();
  if (auth.error) return auth.error;
  const { supabase, restaurant } = auth.context;
  const body = await jsonBody<{ name: string; description: string; sortOrder: number; active: boolean }>(request);
  const { data, error } = await supabase.from("categories").insert({
    restaurant_id: restaurant.id,
    name: body.name,
    description: body.description ?? null,
    display_order: body.sortOrder ?? 0,
    active: body.active ?? true,
  }).select("*").single();
  return NextResponse.json({ ok: !error, data, error: error?.message }, { status: error ? 400 : 201 });
}
