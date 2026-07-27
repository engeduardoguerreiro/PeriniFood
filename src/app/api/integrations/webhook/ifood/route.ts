import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { processIFoodEvent } from "@/lib/integrations/ifood/event-processor";

// Webhook do iFood (modo WEBHOOK / "Per Application").
// - KEEPALIVE / eventos sem pedido: responde 202 (marca a loja ONLINE).
// - Eventos de pedido: cria/cancela o pedido interno (mesma lógica do polling).
// Responde 202 rápido; falhas nunca derrubam a presença.

type IFoodEvent = { id?: string; code?: string; fullCode?: string; orderId?: string; merchantId?: string };

const ACCEPTED = () => new NextResponse(null, { status: 202 });

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
    if (code === "KEEPALIVE" || !event.orderId) continue;
    try {
      const supabase = createServiceClient();
      await processIFoodEvent(supabase, event);
    } catch {
      // nunca bloqueia o ack
    }
  }

  return ACCEPTED();
}

export async function GET() {
  return NextResponse.json({ ok: true, provider: "ifood", webhook: "ready" });
}
