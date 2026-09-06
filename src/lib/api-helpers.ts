import { NextResponse } from "next/server";
import { getSessionContext } from "@/lib/auth";
import { getAccessState } from "@/lib/platform-billing";
import { headers } from "next/headers";
import type { Restaurant } from "@/lib/types";

export async function requireApiRestaurant() {
  const context = await getSessionContext();
  if (!context.user || !context.restaurant) {
    return { error: NextResponse.json({ ok: false, error: "Não autenticado" }, { status: 401 }) };
  }
  const origin = (await headers()).get("origin");
  const host = (await headers()).get("host");
  if (origin && new URL(origin).host !== host) return { error: NextResponse.json({ ok: false, error: "Origem inválida" }, { status: 403 }) };
  const access = await getAccessState(context.restaurant.id);
  if (access.blocked) return { error: NextResponse.json({ ok: false, error: "Acesso suspenso ou indisponível" }, { status: 403 }) };
  return { context: { ...context, restaurant: context.restaurant as Restaurant } };
}

export async function jsonBody<T extends Record<string, unknown>>(request: Request) {
  try {
    return await request.json() as T;
  } catch {
    return {} as T;
  }
}
