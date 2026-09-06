import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { createServiceClient } from "./supabase/service";
import { PublicError, uuid } from "./security";

const ttl = 60 * 60 * 24 * 7;
const digest = (value: string) => createHash("sha256").update(value).digest("hex");
const cookieName = (restaurantId: string) => `${process.env.NODE_ENV === "production" ? "__Host-" : ""}pf_customer_${uuid(restaurantId)}`;

export async function customerSession(restaurantId: string) {
  const token = (await cookies()).get(cookieName(restaurantId))?.value;
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
  const { data, error } = await createServiceClient().from("customer_sessions")
    .select("customer_id, restaurant_id").eq("token_hash", digest(token)).eq("restaurant_id", restaurantId)
    .gt("expires_at", new Date().toISOString()).maybeSingle();
  if (error) throw new PublicError("Acesso temporariamente indisponível.", 503);
  return data as { customer_id: string; restaurant_id: string } | null;
}

export async function requireCustomer(restaurantId: string, claimedId?: unknown) {
  const session = await customerSession(restaurantId);
  if (!session || (claimedId && claimedId !== session.customer_id)) throw new PublicError("Entre na sua conta para continuar.", 401);
  return session;
}

export async function endCustomerSession(restaurantId: string) {
  const jar = await cookies();
  const name = cookieName(restaurantId);
  const token = jar.get(name)?.value;
  if (token) {
    const { error } = await createServiceClient().from("customer_sessions").delete().eq("token_hash", digest(token)).eq("restaurant_id", restaurantId);
    if (error) throw new PublicError("Não foi possível encerrar a sessão.", 503);
  }
  jar.set(name, "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 0 });
}

export async function startCustomerSession(restaurantId: string, customerId: string) {
  await endCustomerSession(restaurantId);
  const token = randomBytes(32).toString("hex");
  const { error } = await createServiceClient().from("customer_sessions").insert({
    restaurant_id: uuid(restaurantId), customer_id: uuid(customerId), token_hash: digest(token), expires_at: new Date(Date.now() + ttl * 1000).toISOString(),
  });
  if (error) throw new PublicError("Não foi possível iniciar uma sessão segura.", 503);
  (await cookies()).set(cookieName(restaurantId), token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: ttl });
}

// Shared PostgreSQL counters work across Vercel instances. No raw IP or email stored.
export async function rateLimit(scope: string, identity: string, limit = 10, seconds = 900) {
  const { data, error } = await createServiceClient().rpc("consume_security_rate_limit", {
    bucket_key: digest(`${scope}:${identity}`), max_requests: limit, window_seconds: seconds,
  });
  if (error) throw new PublicError("Serviço temporariamente indisponível.", 503);
  if (data !== true) throw new PublicError("Muitas tentativas. Aguarde alguns minutos.", 429);
}

export async function authRateLimit(request: Request, restaurantId: string, email: string) {
  // Only the hosting provider's overwritten header is trusted as a client IP.
  const ip = process.env.VERCEL ? request.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() ?? "unknown" : "local";
  await rateLimit("auth-network", `${restaurantId}:${ip}`, 60);
  await rateLimit("auth-account", `${restaurantId}:${email}`, 10);
}
