import "server-only";
import { after } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { logIntegrationEvent } from "@/lib/integrations/external-order";
import { isTrackingToken, money, orderCode } from "@/lib/utils";
import { sendText, whatsappNumber } from "./evolution";
import { appendConversation } from "@/lib/ai/attendant";
import { DEFAULT_TEMPLATES, renderTemplate, type TemplateKey } from "./templates";

// Avisos automáticos de status pelo WhatsApp da própria loja. Rodam depois da
// resposta (after), então nunca atrasam a tela de pedidos; falhas só vão para o log.

function templateFor(status: string, type: string): TemplateKey | null {
  if (status === "pending" || status === "accepted") return "confirmed";
  if (status === "preparing") return "preparing";
  if (status === "ready") return type === "delivery" ? null : "ready"; // na entrega, o aviso útil é "saiu"
  if (status === "out_for_delivery") return "dispatched";
  if (status === "completed") return "completed";
  return null;
}

export async function notifyOrderStatus(orderId: string) {
  const service = createServiceClient();
  const { data: order } = await service
    .from("orders")
    .select("id, restaurant_id, status, type, code, order_number, customer_name, customer_phone, total, external_platform")
    .eq("id", orderId)
    .maybeSingle();
  if (!order || !order.customer_phone || order.external_platform === "ifood") return;

  const key = templateFor(order.status, order.type);
  if (!key) return;

  const { data: integration } = await service
    .from("integrations")
    .select("id, is_enabled, enabled, settings, config")
    .eq("restaurant_id", order.restaurant_id)
    .eq("provider", "whatsapp")
    .maybeSingle();
  if (!integration || !(integration.is_enabled ?? integration.enabled)) return;

  // Não repete o mesmo aviso (ex.: "recebido" em pending e depois em accepted).
  const eventType = `auto_${key}`;
  const { data: already } = await service
    .from("integration_logs")
    .select("id")
    .eq("restaurant_id", order.restaurant_id)
    .eq("provider", "whatsapp")
    .eq("event_type", eventType)
    .eq("external_id", order.id)
    .limit(1);
  if (already?.length) return;

  const [{ data: restaurant }, { data: tracking }] = await Promise.all([
    service.from("restaurants").select("name").eq("id", order.restaurant_id).maybeSingle(),
    service.from("delivery_tracking").select("delivery_code").eq("order_id", order.id).maybeSingle(),
  ]);
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "https://perinifood.com.br").replace(/\/+$/, "");
  const link = isTrackingToken(order.code) ? `${appUrl}/pedido/${order.code}` : "";
  const code = (tracking?.delivery_code as string | null) ?? "";

  const settings = (integration.settings ?? integration.config ?? {}) as { whatsappMessages?: Partial<Record<TemplateKey, string>> };
  let template = settings.whatsappMessages?.[key]?.trim() || DEFAULT_TEMPLATES[key];
  // Sem link/código, remove as linhas que dependem deles em vez de mandar "Código: **".
  template = template.split("\n").filter((line) => (link || !line.includes("{link}")) && (code || !line.includes("{codigo}"))).join("\n");

  const text = renderTemplate(template, {
    nome: String(order.customer_name ?? "").trim().split(/\s+/)[0] || "cliente",
    pedido: orderCode(order as { code: string | null; order_number: number | null; id: string }),
    loja: restaurant?.name ?? "",
    link,
    codigo: code,
    total: money(order.total),
  });
  if (!text) return;

  const result = await sendText(order.restaurant_id, order.customer_phone, text).catch((error: Error) => ({ ok: false, reason: error.message }));
  // Registra o aviso na conversa: a IA usa como contexto e não confunde a
  // própria mensagem com resposta manual da equipe.
  const contact = whatsappNumber(order.customer_phone);
  if (result.ok && contact) await appendConversation(order.restaurant_id, "whatsapp", contact, [{ role: "assistant", text, at: new Date().toISOString() }]).catch(() => {});
  await logIntegrationEvent({
    restaurantId: order.restaurant_id,
    integrationId: integration.id,
    provider: "whatsapp",
    direction: "OUTBOUND",
    eventType,
    externalId: order.id,
    status: result.ok ? "ok" : "error",
    requestPayload: { status: order.status, template: key },
    errorMessage: result.ok ? null : `Aviso não enviado: ${result.reason}`,
  });
}

// Agenda o aviso para depois da resposta (Server Actions e rotas de API).
export function queueOrderNotification(orderId: string | null | undefined) {
  if (!orderId) return;
  after(() => notifyOrderStatus(orderId).catch((error) => console.error("[whatsapp] aviso falhou", orderId, error)));
}
