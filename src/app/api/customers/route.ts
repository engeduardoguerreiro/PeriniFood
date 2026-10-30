import { CUSTOMER_FIELDS } from "@/lib/public-data";
import { NextResponse } from "next/server";
import { jsonBody, requireApiRestaurant } from "@/lib/api-helpers";
import { isValidPhone, normalizePhone } from "@/lib/utils";

export async function GET(request: Request) {
  const auth = await requireApiRestaurant();
  if (auth.error) return auth.error;
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? "").replace(/[^\p{L}\p{N} @+.-]/gu, "").slice(0,100);
  const { supabase, restaurant } = auth.context;
  let query = supabase.from("customers").select(CUSTOMER_FIELDS).eq("restaurant_id", restaurant.id).order("created_at", { ascending: false });
  // Telefones ficam só com dígitos: "97191-5600" precisa achar 11971915600.
  const qPhone = normalizePhone(q);
  if (q) query = query.or(`name.ilike.%${q}%,phone.ilike.%${qPhone.length >= 3 ? qPhone : q}%,whatsapp.ilike.%${qPhone.length >= 3 ? qPhone : q}%`);
  const { data, error } = await query.limit(100);
  return NextResponse.json({ ok: !error, data, error: error?.message });
}

export async function POST(request: Request) {
  const auth = await requireApiRestaurant();
  if (auth.error) return auth.error;
  const { supabase, restaurant } = auth.context;
  const body = await jsonBody<Record<string, unknown>>(request);
  const phone = normalizePhone(typeof body.phone === "string" ? body.phone : null) || null;
  if (phone && !isValidPhone(phone)) return NextResponse.json({ ok: false, error: "Telefone inválido." }, { status: 400 });
  const { data, error } = await supabase.from("customers").insert({
    restaurant_id: restaurant.id,
    name: body.name,
    phone,
    whatsapp: normalizePhone(typeof body.whatsapp === "string" ? body.whatsapp : null) || phone,
    email: body.email ?? null,
    address: body.address ?? null,
    notes: body.notes ?? null,
  }).select(CUSTOMER_FIELDS).single();
  const message = error?.code === "23505" ? "Já existe um cliente com este telefone." : error?.message;
  return NextResponse.json({ ok: !error, data, error: message }, { status: error ? 400 : 201 });
}
