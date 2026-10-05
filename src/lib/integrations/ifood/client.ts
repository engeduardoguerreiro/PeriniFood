import { IFOOD_BASE_URL } from "./config";
import { getClientCredentialsToken } from "./auth";
import { integrationToken } from "./tokens";

// Token para chamadas à API: o da loja (distribuído) quando há integração;
// sem ela, client_credentials do app (centralizado).
export async function getIFoodAccessToken(integrationId?: string): Promise<string> {
  if (integrationId) return integrationToken(integrationId);
  const token = await getClientCredentialsToken();
  return token.accessToken;
}

// Lojas que o token acessa (no distribuído: as que o lojista autorizou).
export async function listMerchants(token: string): Promise<Array<{ id: string; name?: string }>> {
  return ifoodGet("/merchant/v1.0/merchants", token);
}

async function ifoodGet(path: string, token: string) {
  const res = await fetch(`${IFOOD_BASE_URL}${path}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`iFood GET ${path} (${res.status}): ${await res.text()}`);
  return res.json();
}

async function ifoodPost(path: string, token: string, body?: unknown) {
  const res = await fetch(`${IFOOD_BASE_URL}${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", Accept: "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { ok: res.ok, status: res.status, text: res.ok ? "" : await res.text() };
}

export function getOrderDetails(orderId: string, token: string) {
  return ifoodGet(`/order/v1.0/orders/${orderId}`, token);
}

// Transições de status.
export const confirmOrder = (orderId: string, token: string) => ifoodPost(`/order/v1.0/orders/${orderId}/confirm`, token);
export const startPreparation = (orderId: string, token: string) => ifoodPost(`/order/v1.0/orders/${orderId}/startPreparation`, token);
export const readyToPickupOrder = (orderId: string, token: string) => ifoodPost(`/order/v1.0/orders/${orderId}/readyToPickup`, token);
export const dispatchOrder = (orderId: string, token: string) => ifoodPost(`/order/v1.0/orders/${orderId}/dispatch`, token);
export const requestCancellation = (orderId: string, token: string, body: Record<string, unknown>) =>
  ifoodPost(`/order/v1.0/orders/${orderId}/requestCancellation`, token, body);

export async function getCancellationReasons(orderId: string, token: string): Promise<Array<{ cancelCodeId: string; description: string }>> {
  try {
    return await ifoodGet(`/order/v1.0/orders/${orderId}/cancellationReasons`, token);
  } catch {
    return [];
  }
}

// Polling de eventos: puxa os eventos pendentes (204 = fila vazia). Cada chamada
// também mantém a loja aberta no iFood (heartbeat); merchants filtra as lojas.
export async function pollEvents(token: string, merchants?: string[]): Promise<Array<Record<string, unknown>>> {
  const res = await fetch(`${IFOOD_BASE_URL}/events/v1.0/events:polling`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json", ...(merchants?.length ? { "x-polling-merchants": merchants.join(",") } : {}) },
    cache: "no-store",
  });
  if (res.status === 204) return [];
  if (!res.ok) throw new Error(`iFood polling (${res.status}): ${await res.text()}`);
  return res.json();
}

// Confirma o recebimento dos eventos para não recebê-los de novo.
export async function acknowledgeEvents(token: string, eventIds: string[]): Promise<void> {
  if (!eventIds.length) return;
  await fetch(`${IFOOD_BASE_URL}/events/v1.0/events/acknowledgment`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(eventIds.map((id) => ({ id }))),
  });
}
