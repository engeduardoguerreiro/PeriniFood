import { NextResponse } from "next/server";
import { jsonBody, requireApiRestaurant } from "@/lib/api-helpers";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiRestaurant();
  if (auth.error) return auth.error;
  const { id } = await params;
  const { supabase, restaurant } = auth.context;
  const [{ data: order, error }, { data: items }] = await Promise.all([
    supabase.from("orders").select("*").eq("restaurant_id", restaurant.id).eq("id", id).single(),
    supabase.from("order_items").select("*, order_item_addons(*)").eq("restaurant_id", restaurant.id).eq("order_id", id),
  ]);
  return NextResponse.json({ ok: !error, data: { order, items }, error: error?.message }, { status: error ? 404 : 200 });
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiRestaurant();
  if (auth.error) return auth.error;
  const { id } = await params;
  const { supabase, restaurant } = auth.context;
  const body = await jsonBody<Record<string, unknown>>(request);
  const { data, error } = await supabase.from("orders").update(body).eq("restaurant_id", restaurant.id).eq("id", id).select("*").single();
  return NextResponse.json({ ok: !error, data, error: error?.message }, { status: error ? 400 : 200 });
}
