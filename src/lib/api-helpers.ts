import { NextResponse } from "next/server";
import { getSessionContext } from "@/lib/auth";
import type { Restaurant } from "@/lib/types";

export async function requireApiRestaurant() {
  const context = await getSessionContext();
  if (!context.user || !context.restaurant) {
    return { error: NextResponse.json({ ok: false, error: "Não autenticado" }, { status: 401 }) };
  }
  return { context: { ...context, restaurant: context.restaurant as Restaurant } };
}

export async function jsonBody<T extends Record<string, unknown>>(request: Request) {
  try {
    return await request.json() as T;
  } catch {
    return {} as T;
  }
}
