import "server-only";
import { randomBytes } from "node:crypto";
import { createServiceClient } from "./supabase/service";
import { geocode } from "./shipping";
import { PublicError } from "./security";

// Rastreamento do motoboy por link: cada pedido de entrega tem um token próprio
// (sem cadastro de entregador). Quem tem o link envia a posição só daquele pedido.

const TOKEN = /^[A-Za-z0-9_-]{24}$/;
const TRAIL_POINTS = 300;

export type TrackingRow = {
  id: string; restaurant_id: string; order_id: string; token: string; courier_name: string | null;
  dest_lat: number | null; dest_lng: number | null; last_lat: number | null; last_lng: number | null;
  last_accuracy: number | null; last_heading: number | null; last_seen_at: string | null;
  started_at: string | null; delivered_at: string | null; expires_at: string; created_at: string;
};

export type TrackingSnapshot = {
  state: "waiting" | "on_route" | "delivered" | "expired";
  courierName: string | null;
  last: { lat: number; lng: number; accuracy: number | null; heading: number | null; at: string } | null;
  dest: { lat: number; lng: number } | null;
  trail: Array<[number, number]>;
};

export function isTrackingMissing(error: { code?: string; message?: string } | null) {
  return Boolean(error && (error.code === "42P01" || /delivery_tracking|schema cache/i.test(error.message ?? "")));
}

export async function createTrackingLink(restaurantId: string, orderId: string, courierName: string | null) {
  const service = createServiceClient();
  const { data: order } = await service.from("orders").select("id, type, status, delivery_address").eq("id", orderId).eq("restaurant_id", restaurantId).maybeSingle();
  if (!order) throw new PublicError("Pedido não encontrado.");
  if (order.type !== "delivery") throw new PublicError("O rastreamento é só para pedidos de entrega.");
  if (order.status === "canceled" || order.status === "completed") throw new PublicError("Pedido já encerrado.");

  // Destino no mapa: geocodifica o endereço uma vez (falha não impede o link).
  let dest: { lat: number; lon: number } | null = null;
  if (order.delivery_address) dest = await geocode(String(order.delivery_address)).catch(() => null);

  const token = randomBytes(18).toString("base64url");
  const { error } = await service.from("delivery_tracking").upsert({
    restaurant_id: restaurantId,
    order_id: orderId,
    token,
    courier_name: courierName,
    dest_lat: dest?.lat ?? null,
    dest_lng: dest?.lon ?? null,
    last_lat: null, last_lng: null, last_accuracy: null, last_heading: null, last_speed: null, last_seen_at: null,
    started_at: null, delivered_at: null,
    expires_at: new Date(Date.now() + 12 * 3600_000).toISOString(),
    created_at: new Date().toISOString(),
  }, { onConflict: "order_id" });
  if (error) throw new PublicError(isTrackingMissing(error) ? "Rastreamento ainda não habilitado no banco (aplique a migration)." : error.message);
  return token;
}

export async function trackingByToken(token: string) {
  if (!TOKEN.test(token)) return null;
  const { data } = await createServiceClient().from("delivery_tracking").select("*").eq("token", token).maybeSingle();
  return (data as TrackingRow | null) ?? null;
}

export async function trackingByOrder(orderId: string, restaurantId?: string) {
  let query = createServiceClient().from("delivery_tracking").select("*").eq("order_id", orderId);
  if (restaurantId) query = query.eq("restaurant_id", restaurantId);
  const { data, error } = await query.maybeSingle();
  if (error && !isTrackingMissing(error)) throw new Error(error.message);
  return (data as TrackingRow | null) ?? null;
}

export function trackingState(row: TrackingRow): TrackingSnapshot["state"] {
  if (row.delivered_at) return "delivered";
  if (new Date(row.expires_at).getTime() < Date.now()) return "expired";
  return row.started_at ? "on_route" : "waiting";
}

export async function trackingSnapshot(row: TrackingRow, withTrail = true): Promise<TrackingSnapshot> {
  let trail: Array<[number, number]> = [];
  if (withTrail && row.started_at) {
    const { data } = await createServiceClient()
      .from("delivery_locations").select("lat, lng").eq("tracking_id", row.id)
      .order("recorded_at", { ascending: false }).limit(TRAIL_POINTS);
    trail = (data ?? []).reverse().map((p) => [Number(p.lat), Number(p.lng)]);
  }
  return {
    state: trackingState(row),
    courierName: row.courier_name,
    last: row.last_lat !== null && row.last_lng !== null && row.last_seen_at
      ? { lat: row.last_lat, lng: row.last_lng, accuracy: row.last_accuracy, heading: row.last_heading, at: row.last_seen_at }
      : null,
    dest: row.dest_lat !== null && row.dest_lng !== null ? { lat: row.dest_lat, lng: row.dest_lng } : null,
    trail,
  };
}

function coordinate(value: unknown, limit: number) {
  const n = Number(value);
  if (!Number.isFinite(n) || Math.abs(n) > limit) throw new PublicError("Localização inválida.");
  return n;
}

type Point = { lat: number; lng: number; accuracy: number | null; heading: number | null; speed: number | null; recordedAt: string };

function parsePoint(body: Record<string, unknown>, now: number): Point {
  const optional = (v: unknown, max: number) => (v !== null && v !== "" && Number.isFinite(Number(v)) && Number(v) >= 0 && Number(v) <= max ? Number(v) : null);
  // Horário da leitura (fila offline): aceito até 12h atrás e no máximo 1 min no futuro.
  const at = typeof body.at === "string" ? Date.parse(body.at) : NaN;
  const recordedAt = Number.isFinite(at) && at <= now + 60_000 && at >= now - 12 * 3600_000 ? at : now;
  return {
    lat: coordinate(body.lat, 90),
    lng: coordinate(body.lng, 180),
    accuracy: optional(body.accuracy, 100000),
    heading: optional(body.heading, 360),
    speed: optional(body.speed, 100),
    recordedAt: new Date(recordedAt).toISOString(),
  };
}

// Grava uma ou várias posições (a página do motoboy reenvia em lote o que leu sem
// internet). A última posição do lote vira a posição atual no mapa.
export async function recordLocations(row: TrackingRow, raw: Array<Record<string, unknown>>) {
  if (!raw.length || raw.length > 60) throw new PublicError("Lote de localização inválido.");
  const now = Date.now();
  const points = raw.map((p) => parsePoint(p, now)).sort((a, b) => a.recordedAt.localeCompare(b.recordedAt));
  const latest = points[points.length - 1];
  const service = createServiceClient();
  const stale = row.last_seen_at && row.last_seen_at > latest.recordedAt;
  const [update, insert] = await Promise.all([
    stale
      ? Promise.resolve({ error: null })
      : service.from("delivery_tracking").update({
          last_lat: latest.lat, last_lng: latest.lng, last_accuracy: latest.accuracy, last_heading: latest.heading,
          last_speed: latest.speed, last_seen_at: latest.recordedAt, started_at: row.started_at ?? new Date(now).toISOString(),
        }).eq("id", row.id),
    service.from("delivery_locations").insert(points.map((p) => ({ tracking_id: row.id, lat: p.lat, lng: p.lng, accuracy: p.accuracy, recorded_at: p.recordedAt }))),
  ]);
  if (update.error || insert.error) throw new PublicError("Não foi possível salvar a localização.", 503);
}
