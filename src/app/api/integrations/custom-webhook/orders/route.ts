import { NextRequest, NextResponse } from "next/server";
import {
  createOrderFromExternalPayload,
  findIntegrationForPayload,
  logIntegrationEvent,
  normalizeGenericExternalOrder,
} from "@/lib/integrations/external-order";
import { sanitizeHeaders } from "@/lib/integrations/security";

function bearerToken(request: NextRequest) {
  const authorization = request.headers.get("authorization") ?? "";
  if (authorization.toLowerCase().startsWith("bearer ")) return authorization.slice(7).trim();
  return request.headers.get("x-webhook-secret");
}

export async function POST(request: NextRequest) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "JSON inválido." }, { status: 400 });
  }

  const normalized = normalizeGenericExternalOrder("webhook", payload);
  const token = bearerToken(request);
  if (!token) {
    await logIntegrationEvent({
      provider: "webhook",
      eventType: "custom_webhook_order",
      direction: "INBOUND",
      status: "error",
      externalId: normalized.externalOrderId,
      requestHeaders: sanitizeHeaders(request.headers),
      requestPayload: payload,
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
      requestHeaders: sanitizeHeaders(request.headers),
      requestPayload: payload,
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
