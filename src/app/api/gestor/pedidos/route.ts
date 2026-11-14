import { requireApiRestaurant } from "@/lib/api-helpers";
import { privateJson } from "@/lib/security";
import { createServiceClient } from "@/lib/supabase/service";
import { storeDayRange } from "@/lib/timezone";
import { storeStatusLabel } from "@/lib/opening-hours";
import { ifoodSchedule } from "@/lib/integrations/ifood/schedule";
import { orderCode } from "@/lib/utils";
import type { OrderStatus } from "@/lib/types";

// Lista do Gestor de Pedidos (/gestor e app desktop): pedidos em andamento + os
// encerrados de hoje, sem itens (o detalhe vem de /api/gestor/pedidos/[id]).
// Consultado a cada poucos segundos, então só traz as colunas que a lista usa.
const ACTIVE: OrderStatus[] = ["pending", "accepted", "preparing", "ready", "out_for_delivery"];
const CLOSED: OrderStatus[] = ["completed", "canceled"];
const FIELDS = "id,order_number,code,source,type,status,total,customer_name,delivery_address,payment_method,payment_detail,external_platform,external_order_code,external_order_id,created_at,updated_at,auto_printed_at";

type Row = {
  id: string; order_number: number | null; code: string | null; source: string; type: string; status: OrderStatus; total: number;
  customer_name: string | null; delivery_address: string | null; payment_method: string; payment_detail: string | null;
  external_platform: string | null; external_order_code: string | null; external_order_id: string | null;
  created_at: string; updated_at: string; auto_printed_at?: string | null;
};

export async function GET() {
  const auth = await requireApiRestaurant();
  if (auth.error) return auth.error;
  const { supabase, restaurant } = auth.context;
  const { start, end } = storeDayRange();

  const select = (fields: string) => Promise.all([
    supabase.from("orders").select(fields).eq("restaurant_id", restaurant.id).in("status", ACTIVE)
      .order("created_at", { ascending: true }).limit(300),
    supabase.from("orders").select(fields).eq("restaurant_id", restaurant.id).in("status", CLOSED)
      .gte("created_at", start.toISOString()).lt("created_at", end.toISOString())
      .order("created_at", { ascending: false }).limit(300),
  ]);
  let [active, closed] = await select(FIELDS);
  // Sem a migration 20261026000300 não há auto_printed_at: a lista funciona igual.
  if (active.error && /auto_printed_at/.test(active.error.message)) {
    [active, closed] = await select(FIELDS.replace(",auto_printed_at", ""));
  }
  if (active.error || closed.error) return privateJson({ ok: false, error: "Não foi possível consultar os pedidos." }, 503);

  const rows = [...(active.data ?? []), ...(closed.data ?? [])] as unknown as Row[];
  const ifoodIds = rows.filter((row) => row.external_platform === "ifood" && ACTIVE.includes(row.status)).map((row) => row.id);
  const { data: links } = ifoodIds.length
    ? await createServiceClient().from("integration_orders")
        .select("order_id, orderTiming:raw_payload->>orderTiming, schedule:raw_payload->schedule")
        .eq("restaurant_id", restaurant.id).in("order_id", ifoodIds)
    : { data: [] };
  const schedules = new Map((links ?? []).map((link) => [link.order_id as string, ifoodSchedule(link)]));

  // Motoboy de cada entrega em andamento (link de rastreio): nome e situação.
  const deliveryIds = rows.filter((row) => row.type === "delivery" && ["ready", "out_for_delivery"].includes(row.status)).map((row) => row.id);
  const { data: trackings } = deliveryIds.length
    ? await createServiceClient().from("delivery_tracking")
        .select("order_id, courier_name, started_at, delivered_at, expires_at")
        .eq("restaurant_id", restaurant.id).in("order_id", deliveryIds)
    : { data: [] };
  const couriers = new Map((trackings ?? []).map((row) => [row.order_id as string, {
    name: (row.courier_name as string | null) ?? null,
    state: row.delivered_at ? "delivered" : new Date(String(row.expires_at)).getTime() < Date.now() ? "expired" : row.started_at ? "on_route" : "waiting",
  }]));

  const store = storeStatusLabel(restaurant);
  const mode = !restaurant.is_open ? "offline" : (restaurant.manual_open_status ?? "auto");

  return privateJson({
    ok: true,
    now: new Date().toISOString(),
    store: { name: restaurant.name, logo: restaurant.logo_url, slug: restaurant.slug, open: store.open, text: store.text, mode },
    orders: rows.map((row) => {
      const schedule = schedules.get(row.id) ?? null;
      return {
        id: row.id,
        label: orderCode(row),
        source: row.external_platform ?? row.source,
        type: row.type,
        status: row.status,
        total: Number(row.total),
        customer: row.customer_name,
        address: row.delivery_address,
        payment: row.payment_method,
        paymentDetail: row.payment_detail,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        printed: row.auto_printed_at === undefined ? true : Boolean(row.auto_printed_at),
        schedule: schedule ? { start: schedule.start.toISOString(), end: schedule.end.toISOString() } : null,
        courier: couriers.get(row.id) ?? null,
      };
    }),
  });
}
