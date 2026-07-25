import { NextResponse } from "next/server";
import { jsonBody, requireApiRestaurant } from "@/lib/api-helpers";
import type { OrderStatus } from "@/lib/types";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiRestaurant();
  if (auth.error) return auth.error;
  const { id } = await params;
  const { status } = await jsonBody<{ status: OrderStatus }>(request);
  const { supabase, restaurant } = auth.context;
  const { data, error } = await supabase.from("orders").update({ status }).eq("restaurant_id", restaurant.id).eq("id", id).select("*").single();
  return NextResponse.json({ ok: !error, data, error: error?.message }, { status: error ? 400 : 200 });
}
