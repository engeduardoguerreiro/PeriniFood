import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getIFoodAccessToken, getOrderDetails } from "@/lib/integrations/ifood/client";
import { mapIFoodOrder } from "@/lib/integrations/ifood/order-mapper";

// Webhook do iFood (modo WEBHOOK / "Per Application").
// - KEEPALIVE e eventos sem pedido: responde 202 (marca a loja ONLINE).
// - Eventos de pedido: busca os detalhes e cria o pedido interno.
// Sempre responde 202 rápido; nunca deixa uma falha derrubar a presença.

type IFoodEvent = {
  id?: string;
  code?: string;
  fullCode?: string;
  orderId?: string;
  merchantId?: string;
  createdAt?: string;
};

type ServiceClient = ReturnType<typeof createServiceClient>;

const ACCEPTED = () => new NextResponse(null, { status: 202 });

async function handleOrderEvent(supabase: ServiceClient, event: IFoodEvent, code: string) {
  const orderId = event.orderId!;
  const merchantId = event.merchantId ?? null;

  const { data: integration } = await supabase
    .from("integrations")
    .select("id, restaurant_id")
    .eq("provider", "ifood")
    .eq("external_store_id", merchantId)
    .maybeSingle();
  if (!integration) return; // loja ainda não mapeada

  const { data: existing } = await supabase
    .from("orders")
    .select("id")
    .eq("restaurant_id", integration.restaurant_id)
    .eq("external_order_id", orderId)
    .maybeSingle();
  if (existing) return; // idempotência: já criado

  const token = await getIFoodAccessToken();
  const details = await getOrderDetails(orderId, token);
  const mapped = mapIFoodOrder(details);

  const { data: order, error } = await supabase
    .from("orders")
    .insert({
      restaurant_id: integration.restaurant_id,
      source: "ifood",
      code: Math.random().toString(36).slice(2, 8).toUpperCase(),
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
    event_type: String(code),
    status: "ok",
    message: `Pedido iFood recebido: ${mapped.displayId ?? orderId}`,
    payload: event as unknown as Record<string, unknown>,
  });
}

export async function POST(request: Request) {
  let events: IFoodEvent[] = [];
  try {
    const body = await request.json();
    events = Array.isArray(body) ? body : [body];
  } catch {
    return ACCEPTED();
  }

  for (const event of events) {
    const code = event.fullCode ?? event.code ?? "UNKNOWN";
    // Presença/keepalive e eventos sem pedido: só confirmamos (202).
    if (code === "KEEPALIVE" || !event.orderId) continue;
    try {
      const supabase = createServiceClient();
      await handleOrderEvent(supabase, event, code);
    } catch {
      // nunca bloqueia o ack
    }
  }

  return ACCEPTED();
}

export async function GET() {
  return NextResponse.json({ ok: true, provider: "ifood", webhook: "ready" });
}
