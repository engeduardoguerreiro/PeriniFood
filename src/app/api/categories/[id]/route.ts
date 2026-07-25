import { NextResponse } from "next/server";
import { jsonBody, requireApiRestaurant } from "@/lib/api-helpers";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiRestaurant();
  if (auth.error) return auth.error;
  const { id } = await params;
  const { supabase, restaurant } = auth.context;
  const { data, error } = await supabase.from("categories").select("*").eq("restaurant_id", restaurant.id).eq("id", id).single();
  return NextResponse.json({ ok: !error, data, error: error?.message }, { status: error ? 404 : 200 });
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiRestaurant();
  if (auth.error) return auth.error;
  const { id } = await params;
  const { supabase, restaurant } = auth.context;
  const body = await jsonBody<{ name: string; description: string; sortOrder: number; active: boolean }>(request);
  const { data, error } = await supabase.from("categories").update({
    name: body.name,
    description: body.description ?? null,
    display_order: body.sortOrder,
    active: body.active,
  }).eq("restaurant_id", restaurant.id).eq("id", id).select("*").single();
  return NextResponse.json({ ok: !error, data, error: error?.message }, { status: error ? 400 : 200 });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiRestaurant();
  if (auth.error) return auth.error;
  const { id } = await params;
  const { supabase, restaurant } = auth.context;
  const { error } = await supabase.from("categories").delete().eq("restaurant_id", restaurant.id).eq("id", id);
  return NextResponse.json({ ok: !error, error: error?.message }, { status: error ? 400 : 200 });
}
