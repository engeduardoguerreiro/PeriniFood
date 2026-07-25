import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { providers } from "@/lib/integrations/providers";
import type { ProviderName } from "@/lib/integrations/types";

export async function POST(request: Request, { params }: { params: Promise<{ provider: string }> }) {
  const { provider } = await params;
  if (!(provider in providers)) return NextResponse.json({ ok: false, error: "Provider inválido" }, { status: 400 });

  const payload = await request.json();
  const restaurantId = request.headers.get("x-restaurant-id") ?? payload.restaurant_id;
  if (!restaurantId) return NextResponse.json({ ok: false, error: "Informe x-restaurant-id ou restaurant_id" }, { status: 400 });

  const supabase = createServiceClient();
  const integrationProvider = providers[provider as ProviderName];
  const external = integrationProvider.parseExternalOrder(payload);

  const { data: integration } = await supabase
    .from("integrations")
    .select("id")
    .eq("restaurant_id", restaurantId)
    .eq("provider", provider)
    .maybeSingle();

  const { data: order, error } = await supabase.from("orders").insert({
    restaurant_id: restaurantId,
    source: provider,
    type: external.deliveryAddress ? "delivery" : "pickup",
    status: "pending",
    payment_status: "pending",
    payment_method: "online",
    subtotal: external.total,
    total: external.total,
    customer_name: external.customerName,
    customer_phone: external.customerPhone,
    delivery_address: external.deliveryAddress,
    external_order_id: external.externalOrderId,
    external_platform: provider,
  }).select("id").single();

  await supabase.from("integration_logs").insert({
    restaurant_id: restaurantId,
    integration_id: integration?.id ?? null,
    provider,
    event_type: "webhook_order",
    status: error ? "error" : "ok",
    message: error?.message ?? "Pedido externo recebido",
    payload,
  });

  if (error) return NextResponse.json({ ok: false, error: error?.message }, { status: 500 });

  if (external.items.length && order) {
    await supabase.from("order_items").insert(external.items.map((item) => ({
      restaurant_id: restaurantId,
      order_id: order.id,
      product_id: null,
      product_name: item.name,
      quantity: item.quantity,
      unit_price: item.unitPrice,
      total_price: item.quantity * item.unitPrice,
      notes: item.notes ?? null,
      selected_options: { externalId: item.externalId },
    })));
  }

  return NextResponse.json({ ok: true, order_id: order.id });
}
