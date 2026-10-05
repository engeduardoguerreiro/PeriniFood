import "server-only";
import { digits } from "@/lib/utils";

// Cliente do servidor de WhatsApp (Evolution API v2, deploy/whatsapp-server).
// Cada loja tem uma instância própria ("pf-<restaurantId>") com o WhatsApp dela,
// conectado por QR Code. Sem EVOLUTION_API_URL/KEY o recurso fica desligado.

export type WhatsAppState = "open" | "connecting" | "close" | "missing" | "disabled";

export function whatsappConfigured() {
  return Boolean(process.env.EVOLUTION_API_URL && process.env.EVOLUTION_API_KEY);
}

export function instanceName(restaurantId: string) {
  return `pf-${restaurantId}`;
}

export function restaurantIdFromInstance(name: unknown) {
  const match = typeof name === "string" ? /^pf-([0-9a-f-]{36})$/i.exec(name) : null;
  return match?.[1] ?? null;
}

async function evolution<T>(method: string, path: string, body?: unknown): Promise<{ ok: boolean; status: number; data: T | null }> {
  const base = process.env.EVOLUTION_API_URL?.replace(/\/+$/, "");
  const key = process.env.EVOLUTION_API_KEY;
  if (!base || !key) return { ok: false, status: 503, data: null };
  const response = await fetch(`${base}${path}`, {
    method,
    headers: { apikey: key, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
  });
  const data = (await response.json().catch(() => null)) as T | null;
  return { ok: response.ok, status: response.status, data };
}

function webhookConfig() {
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "https://perinifood.com.br").replace(/\/+$/, "");
  return {
    enabled: true,
    url: `${appUrl}/api/whatsapp/webhook`,
    byEvents: false,
    base64: false,
    events: ["MESSAGES_UPSERT", "CONNECTION_UPDATE"],
    headers: { "x-webhook-secret": process.env.WHATSAPP_WEBHOOK_SECRET ?? "" },
  };
}

export async function connectionState(restaurantId: string): Promise<WhatsAppState> {
  if (!whatsappConfigured()) return "disabled";
  const result = await evolution<{ instance?: { state?: string } }>("GET", `/instance/connectionState/${instanceName(restaurantId)}`);
  if (result.status === 404) return "missing";
  const state = result.data?.instance?.state;
  return state === "open" || state === "connecting" ? state : "close";
}

type QrCode = { base64?: string; code?: string; pairingCode?: string | null };

// Cria a instância (se ainda não existe) e devolve o QR Code para escanear.
export async function startConnection(restaurantId: string): Promise<{ state: WhatsAppState; qr: string | null }> {
  if (!whatsappConfigured()) return { state: "disabled", qr: null };
  const name = instanceName(restaurantId);
  let state = await connectionState(restaurantId);
  if (state === "open") return { state, qr: null };
  if (state === "missing") {
    const created = await evolution<{ qrcode?: QrCode }>("POST", "/instance/create", {
      instanceName: name,
      integration: "WHATSAPP-BAILEYS",
      qrcode: true,
      webhook: webhookConfig(),
    });
    if (!created.ok) throw new Error("Não foi possível criar a conexão no servidor de WhatsApp.");
    if (created.data?.qrcode?.base64) return { state: "connecting", qr: created.data.qrcode.base64 };
    state = "connecting";
  }
  const connect = await evolution<QrCode>("GET", `/instance/connect/${name}`);
  return { state: "connecting", qr: connect.data?.base64 ?? null };
}

export async function disconnect(restaurantId: string) {
  if (!whatsappConfigured()) return;
  const name = instanceName(restaurantId);
  await evolution("DELETE", `/instance/logout/${name}`);
  await evolution("DELETE", `/instance/delete/${name}`);
}

// Telefone brasileiro em formato internacional só com dígitos (5511999999999).
export function whatsappNumber(phone: string | null | undefined) {
  const clean = digits(phone);
  if (clean.length < 10) return null;
  return clean.startsWith("55") && clean.length >= 12 ? clean : `55${clean}`;
}

export async function sendText(restaurantId: string, phone: string | null | undefined, text: string) {
  const number = whatsappNumber(phone);
  if (!number || !whatsappConfigured()) return { ok: false, reason: "sem número ou WhatsApp não configurado" };
  const result = await evolution("POST", `/message/sendText/${instanceName(restaurantId)}`, { number, text, delay: 800 });
  return { ok: result.ok, reason: result.ok ? null : `HTTP ${result.status}` };
}
