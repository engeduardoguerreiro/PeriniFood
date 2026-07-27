import { IFOOD_BASE_URL } from "./config";
import { getClientCredentialsToken } from "./auth";

// Token para chamadas à API. No modo centralizado (homologação atual) usamos
// client_credentials. Distribuído usará o refresh token por loja (fase futura).
export async function getIFoodAccessToken(): Promise<string> {
  const token = await getClientCredentialsToken();
  return token.accessToken;
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
