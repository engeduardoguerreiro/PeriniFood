import { NextRequest, NextResponse } from "next/server";
import {
  createOrderFromExternalPayload,
  findIntegrationForPayload,
  logIntegrationEvent,
  normalizeGenericExternalOrder,
} from "@/lib/integrations/external-order";
import { sanitizeHeaders } from "@/lib/integrations/security";

const allowedProviders = new Set(["99food", "ifood", "keeta"]);

function bearerToken(request: NextRequest) {
  const authorization = request.headers.get("authorization") ?? "";
  if (authorization.toLowerCase().startsWith("bearer ")) return authorization.slice(7).trim();
  return request.headers.get("x-webhook-secret");
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ provider: string }> }) {
  const { provider } = await params;
  if (!allowedProviders.has(provider)) {
    return NextResponse.json({ ok: false, error: "Provider inválido." }, { status: 404 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "JSON inválido." }, { status: 400 });
  }

  const normalized = normalizeGenericExternalOrder(provider, payload);
  const token = bearerToken(request);
  const integration = await findIntegrationForPayload(provider, normalized, token);

  if (!integration) {
    await logIntegrationEvent({
      provider,
      eventType: "webhook_order",
      direction: "INBOUND",
      status: "error",
      externalId: normalized.externalOrderId,
      requestHeaders: sanitizeHeaders(request.headers),
      requestPayload: payload,
      errorMessage: "Integração ativa não encontrada para este payload.",
    });
    return NextResponse.json({ ok: false, error: "Integração não encontrada." }, { status: 404 });
  }

  try {
    const orderId = await createOrderFromExternalPayload(normalized, integration);
    await logIntegrationEvent({
      restaurantId: integration.restaurant_id,
      integrationId: integration.id,
      provider,
      eventType: "webhook_order",
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
      provider,
      eventType: "webhook_order",
      direction: "INBOUND",
      status: "error",
      externalId: normalized.externalOrderId,
      requestHeaders: sanitizeHeaders(request.headers),
      requestPayload: payload,
      errorMessage: error instanceof Error ? error.message : "Erro desconhecido.",
    });
    return NextResponse.json({ ok: false, error: "Não foi possível importar o pedido." }, { status: 500 });
  }
}
