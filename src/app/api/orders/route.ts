import { NextResponse } from "next/server";
import { jsonBody, requireApiRestaurant } from "@/lib/api-helpers";

export async function GET(request: Request) {
  const auth = await requireApiRestaurant();
  if (auth.error) return auth.error;
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");
  const { supabase, restaurant } = auth.context;
  let query = supabase.from("orders").select("*").eq("restaurant_id", restaurant.id).order("created_at", { ascending: false });
  if (type) query = query.eq("type", type);
  const { data, error } = await query;
  return NextResponse.json({ ok: !error, data, error: error?.message });
}

export async function POST(request: Request) {
  const auth = await requireApiRestaurant();
  if (auth.error) return auth.error;
  const { supabase, restaurant } = auth.context;
  const body = await jsonBody<Record<string, unknown>>(request);
  const { data, error } = await supabase.from("orders").insert({
    restaurant_id: restaurant.id,
    code: Math.random().toString(36).slice(2, 10).toUpperCase(),
    source: "manual",
    type: body.type ?? "pickup",
    status: "pending",
    payment_status: body.paymentStatus ?? "pending",
    payment_method: body.paymentMethod ?? "other",
    subtotal: body.subtotal ?? 0,
    delivery_fee: body.deliveryFee ?? 0,
    discount: body.discount ?? 0,
    total: body.total ?? 0,
    customer_name: body.customerName ?? null,
    customer_phone: body.customerPhone ?? null,
    delivery_address: body.deliveryAddress ?? null,
    notes: body.notes ?? null,
  }).select("*").single();
  return NextResponse.json({ ok: !error, data, error: error?.message }, { status: error ? 400 : 201 });
}
