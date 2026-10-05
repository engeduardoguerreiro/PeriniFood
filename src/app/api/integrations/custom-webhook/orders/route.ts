import { readObject, publicFailure } from "@/lib/security";
import { NextRequest, NextResponse } from "next/server";
import {
  createOrderFromExternalPayload,
  findIntegrationForPayload,
  logIntegrationEvent,
  normalizeGenericExternalOrder,
} from "@/lib/integrations/external-order";
import { sanitizeHeaders } from "@/lib/integrations/security";
import { clientIp, rateLimit } from "@/lib/customer-session";

function bearerToken(request: NextRequest) {
  const authorization = request.headers.get("authorization") ?? "";
  if (authorization.toLowerCase().startsWith("bearer ")) return authorization.slice(7).trim();
  return request.headers.get("x-webhook-secret");
}

export async function POST(request: NextRequest) {
  // Rota pública: limita por IP antes de ler o corpo ou gravar log, senão um loop
  // de POSTs com token inválido enchia integration_logs e o banco.
  try { await rateLimit("webhook-ip", clientIp(request), 120, 600); } catch (error) { return publicFailure(error); }
  let payload: unknown;
  try {
    payload = await readObject(request, 65536);
  } catch {
    return NextResponse.json({ ok: false, error: "JSON inválido." }, { status: 400 });
  }

  let normalized;
  try { normalized = normalizeGenericExternalOrder("webhook", payload); } catch(error) { return publicFailure(error); }
  const token = bearerToken(request);
  if (!token) {
    await logIntegrationEvent({
      provider: "webhook",
      eventType: "custom_webhook_order",
      direction: "INBOUND",
      status: "error",
      externalId: normalized.externalOrderId,
      requestPayload: { externalStoreId: normalized.externalStoreId?.slice(0, 64) ?? null },
      errorMessage: "Token secreto ausente.",
    });
    return NextResponse.json({ ok: false, error: "Token obrigatório." }, { status: 401 });
  }

  const integration = await findIntegrationForPayload("webhook", normalized, token);
  if (!integration || !(integration.is_enabled ?? integration.enabled)) {
    await logIntegrationEvent({
      provider: "webhook",
      eventType: "custom_webhook_order",
      direction: "INBOUND",
      status: "error",
      externalId: normalized.externalOrderId,
      requestPayload: { externalStoreId: normalized.externalStoreId?.slice(0, 64) ?? null },
      errorMessage: "Token inválido ou integração inativa.",
    });
    return NextResponse.json({ ok: false, error: "Integração inválida." }, { status: 403 });
  }

  try {
    const orderId = await createOrderFromExternalPayload(normalized, integration);
    await logIntegrationEvent({
      restaurantId: integration.restaurant_id,
      integrationId: integration.id,
      provider: "webhook",
      eventType: "custom_webhook_order",
      direction: "INBOUND",
      status: "ok",
      externalId: normalized.externalOrderId,
      requestHeaders: sanitizeHeaders(request.headers),
      requestPayload: payload,
      responsePayload: { orderId },
    });
    return NextResponse.json({ ok: true, orderId });
  } catch (error) {
    await logIntegrationEvent({
      restaurantId: integration.restaurant_id,
      integrationId: integration.id,
      provider: "webhook",
      eventType: "custom_webhook_order",
      direction: "INBOUND",
      status: "error",
      externalId: normalized.externalOrderId,
      requestHeaders: sanitizeHeaders(request.headers),
      requestPayload: payload,
      errorMessage: error instanceof Error ? error.message : "Erro desconhecido.",
    });
    return NextResponse.json({ ok: false, error: "Não foi possível criar o pedido." }, { status: 500 });
  }
}
