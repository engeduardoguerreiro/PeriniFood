import { NextResponse } from "next/server";
import { jsonBody, requireApiRestaurant } from "@/lib/api-helpers";

export async function GET(request: Request) {
  const auth = await requireApiRestaurant();
  if (auth.error) return auth.error;
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q");
  const { supabase, restaurant } = auth.context;
  let query = supabase.from("customers").select("*").eq("restaurant_id", restaurant.id).order("created_at", { ascending: false });
  if (q) query = query.or(`name.ilike.%${q}%,phone.ilike.%${q}%,whatsapp.ilike.%${q}%`);
  const { data, error } = await query;
  return NextResponse.json({ ok: !error, data, error: error?.message });
}

export async function POST(request: Request) {
  const auth = await requireApiRestaurant();
  if (auth.error) return auth.error;
  const { supabase, restaurant } = auth.context;
  const body = await jsonBody<Record<string, unknown>>(request);
  const { data, error } = await supabase.from("customers").insert({
    restaurant_id: restaurant.id,
    name: body.name,
    phone: body.phone ?? null,
    whatsapp: body.whatsapp ?? null,
    email: body.email ?? null,
    address: body.address ?? null,
    notes: body.notes ?? null,
  }).select("*").single();
  return NextResponse.json({ ok: !error, data, error: error?.message }, { status: error ? 400 : 201 });
}
