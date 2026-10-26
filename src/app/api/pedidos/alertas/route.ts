import { requireApiRestaurant, jsonBody } from "@/lib/api-helpers";
import { privateJson, uuid } from "@/lib/security";
import { orderCode } from "@/lib/utils";

// Alerta de pedido novo no painel (NewOrderAlerts): site e iFood. GET lista os
// pedidos dos últimos 15 minutos; POST reserva um pedido para a impressão automática
// (só um computador consegue: auto_printed_at passa de null para agora).
const WINDOW_MS = 15 * 60 * 1000;
const ALERT_SOURCES = ["site", "ifood"];

type AlertRow = { id: string; order_number: number | null; code: string | null; source: string; external_platform: string | null; external_order_code: string | null; created_at: string; customer_name: string | null; total: number; type: string; status: string; auto_printed_at?: string | null };

export async function GET() {
  const auth = await requireApiRestaurant();
  if (auth.error) return auth.error;
  const { supabase, restaurant } = auth.context;
  const since = new Date(Date.now() - WINDOW_MS).toISOString();
  const query = (fields: string) => supabase.from("orders").select(fields).eq("restaurant_id", restaurant.id).in("source", ALERT_SOURCES)
    .gte("created_at", since).neq("status", "canceled").order("created_at", { ascending: true }).limit(20);
  const base = "id,order_number,code,source,external_platform,external_order_code,created_at,customer_name,total,type,status";
  let claimSupported = true;
  let result = await query(`${base},auto_printed_at`);
  // Sem a migration 20261026000300 a coluna não existe: alerta funciona, impressão automática não.
  if (result.error && /auto_printed_at/.test(result.error.message)) {
    claimSupported = false;
    result = await query(base);
  }
  if (result.error) return privateJson({ ok: false, error: "Não foi possível consultar os pedidos." }, 503);
  const orders = ((result.data ?? []) as unknown as AlertRow[]).map((order) => ({
    id: order.id,
    label: orderCode(order),
    source: order.source,
    createdAt: order.created_at,
    customer: order.customer_name,
    total: Number(order.total),
    type: order.type,
    printed: claimSupported ? Boolean(order.auto_printed_at) : true,
  }));
  return privateJson({ ok: true, claimSupported, orders });
}

export async function POST(request: Request) {
  const auth = await requireApiRestaurant();
  if (auth.error) return auth.error;
  const { supabase, restaurant } = auth.context;
  let id: string;
  try {
    id = uuid((await jsonBody<{ id?: string }>(request)).id);
  } catch {
    return privateJson({ ok: false, error: "Pedido inválido." }, 400);
  }
  const { data, error } = await supabase.from("orders").update({ auto_printed_at: new Date().toISOString() })
    .eq("id", id).eq("restaurant_id", restaurant.id).in("source", ALERT_SOURCES).is("auto_printed_at", null).select("id");
  if (error) return privateJson({ ok: false, error: "Não foi possível reservar a impressão." }, 503);
  return privateJson({ ok: true, claimed: Boolean(data?.length) });
}
