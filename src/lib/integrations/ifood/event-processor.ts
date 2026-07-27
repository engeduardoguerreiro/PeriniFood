import type { createServiceClient } from "@/lib/supabase/service";
import type { OrderStatus } from "@/lib/types";
import { getIFoodAccessToken, getOrderDetails } from "./client";
import { mapIFoodOrder } from "./order-mapper";

type ServiceClient = ReturnType<typeof createServiceClient>;
type IFoodEvent = { id?: string; code?: string; fullCode?: string; orderId?: string; merchantId?: string };

function isCancellation(code: string) {
  return /cancel/i.test(code) || code.toUpperCase() === "CAN";
}

// Status do iFood -> status interno (base igual à do PeriniFood).
const STATUS_MAP: Record<string, OrderStatus> = {
  PLACED: "pending",
  CONFIRMED: "preparing",
  READY_TO_PICKUP: "ready",
  DISPATCHED: "out_for_delivery",
  CONCLUDED: "completed",
  DELIVERED: "completed",
};

function mappedStatus(code: string): OrderStatus | null {
  return STATUS_MAP[code.toUpperCase()] ?? null;
}

const newCode = () => Math.random().toString(36).slice(2, 8).toUpperCase();

// Processa um evento do iFood (usado tanto pelo webhook quanto pelo polling).
// - Sem orderId (presença/keepalive): ignora.
// - Cancelamento: marca o pedido interno como cancelado.
// - Novo pedido: busca detalhes e cria (idempotente).
export async function processIFoodEvent(supabase: ServiceClient, event: IFoodEvent): Promise<void> {
  const code = String(event.fullCode ?? event.code ?? "");
  const orderId = event.orderId;
  if (!orderId) return;
  const merchantId = event.merchantId ?? null;

  const { data: integration } = await supabase
    .from("integrations")
    .select("id, restaurant_id")
    .eq("provider", "ifood")
    .eq("external_store_id", merchantId)
    .maybeSingle();
  if (!integration) return;

  const { data: existing } = await supabase
    .from("orders")
    .select("id, status")
    .eq("restaurant_id", integration.restaurant_id)
    .eq("external_order_id", orderId)
    .maybeSingle();

  if (isCancellation(code)) {
    if (existing && existing.status !== "canceled") {
      await supabase.from("orders").update({ status: "canceled" }).eq("id", existing.id);
      await supabase.from("integration_logs").insert({
        restaurant_id: integration.restaurant_id,
        integration_id: integration.id,
        provider: "ifood",
        event_type: code,
        status: "ok",
        message: `Pedido iFood cancelado: ${orderId}`,
        payload: event as unknown as Record<string, unknown>,
      });
    }
    return;
  }

  if (existing) {
    // Pedido já existe: reflete a mudança de status vinda do iFood.
    const target = mappedStatus(code);
    if (target && existing.status !== target && existing.status !== "canceled") {
      await supabase.from("orders").update({ status: target }).eq("id", existing.id);
      await supabase.from("integration_logs").insert({
        restaurant_id: integration.restaurant_id,
        integration_id: integration.id,
        provider: "ifood",
        event_type: code,
        status: "ok",
        message: `Status iFood → ${target}: ${orderId}`,
        payload: event as unknown as Record<string, unknown>,
      });
    }
    return;
  }

  const token = await getIFoodAccessToken();
  const details = await getOrderDetails(orderId, token);
  const mapped = mapIFoodOrder(details);

  const { data: order, error } = await supabase
    .from("orders")
    .insert({
      restaurant_id: integration.restaurant_id,
      source: "ifood",
      code: newCode(),
      type: mapped.type,
      status: "pending",
      payment_status: mapped.paid ? "paid" : "pending",
      payment_method: "online",
      subtotal: mapped.subtotal,
      delivery_fee: mapped.deliveryFee,
      total: mapped.total,
      customer_name: mapped.customerName,
      customer_phone: mapped.customerPhone,
      delivery_address: mapped.deliveryAddress,
      external_order_id: mapped.externalOrderId,
      external_order_code: mapped.displayId,
      external_platform: "ifood",
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  if (mapped.items.length && order) {
    await supabase.from("order_items").insert(
      mapped.items.map((item) => ({
        restaurant_id: integration.restaurant_id,
        order_id: order.id,
        product_id: null,
        product_name: item.name,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        total_price: item.totalPrice,
        notes: item.notes,
        selected_options: { externalId: item.externalId },
      })),
    );
  }

  await supabase.from("integration_logs").insert({
    restaurant_id: integration.restaurant_id,
    integration_id: integration.id,
    provider: "ifood",
    event_type: code,
    status: "ok",
    message: `Pedido iFood recebido: ${mapped.displayId ?? orderId}`,
    payload: event as unknown as Record<string, unknown>,
  });
}
