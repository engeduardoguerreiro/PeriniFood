import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

// Webhook do iFood (modo WEBHOOK / "Per Application").
// O iFood envia eventos aqui, inclusive KEEPALIVE periódico. Responder
// 202 Accepted é o que marca a(s) loja(s) como ONLINE no iFood.
// A criação de pedido a partir de eventos de pedido entra na fase 2.

type IFoodEvent = {
  id?: string;
  code?: string;
  fullCode?: string;
  orderId?: string;
  merchantId?: string;
  createdAt?: string;
};

const ACCEPTED = () => new NextResponse(null, { status: 202 });

export async function POST(request: Request) {
  let events: IFoodEvent[] = [];
  try {
    const body = await request.json();
    events = Array.isArray(body) ? body : [body];
  } catch {
    // Corpo inválido: ainda respondemos 202 para não derrubar a presença.
    return ACCEPTED();
  }

  // Log best-effort — nunca bloqueia o 202.
  try {
    const supabase = createServiceClient();
    for (const event of events) {
      const code = event.fullCode ?? event.code ?? "UNKNOWN";
      const merchantId = event.merchantId ?? null;

      let restaurantId: string | null = null;
      let integrationId: string | null = null;
      if (merchantId) {
        const { data: integration } = await supabase
          .from("integrations")
          .select("id, restaurant_id")
          .eq("provider", "ifood")
          .eq("external_store_id", merchantId)
          .maybeSingle();
        restaurantId = integration?.restaurant_id ?? null;
        integrationId = integration?.id ?? null;
      }

      if (restaurantId) {
        await supabase.from("integration_logs").insert({
          restaurant_id: restaurantId,
          integration_id: integrationId,
          provider: "ifood",
          event_type: String(code),
          status: "ok",
          message: code === "KEEPALIVE" ? "Keepalive iFood (online)" : `Evento iFood: ${code}`,
          payload: event as unknown as Record<string, unknown>,
        });
      }
      // TODO (fase 2): se code for de pedido (PLC/PLACED, CFM, etc.), buscar
      // os detalhes com o token da loja e criar/atualizar o pedido interno.
    }
  } catch {
    // silencioso de propósito
  }

  return ACCEPTED();
}

// Alguns ambientes fazem um GET de verificação — respondemos ok.
export async function GET() {
  return NextResponse.json({ ok: true, provider: "ifood", webhook: "ready" });
}
