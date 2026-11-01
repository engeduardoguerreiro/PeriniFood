import "server-only";
import { digits } from "@/lib/utils";

// Cliente do servidor de WhatsApp (Evolution API v2, deploy/whatsapp-server).
// Cada loja tem uma instância própria ("pf-<restaurantId>") com o WhatsApp dela,
// conectado por QR Code. Sem EVOLUTION_API_URL/KEY o recurso fica desligado.

export type WhatsAppState = "open" | "connecting" | "close" | "missing" | "disabled" | "offline";

// Servidor fora do ar (túnel da Cloudflare caído = HTTP 530, proxy 502/503/504,
// timeout ou erro de rede). Diferente de "desconectado": o WhatsApp da loja
// continua pareado e volta sozinho quando o servidor voltar.
export class WhatsAppServerOffline extends Error {
  constructor(readonly detail: string) {
    super("O servidor de WhatsApp está fora do ar no momento. Tente de novo em alguns minutos.");
  }
}

const TRANSIENT_STATUS = new Set([408, 425, 429, 500, 502, 503, 504, 520, 521, 522, 523, 524, 525, 526, 530]);
const RETRY_DELAYS_MS = [800, 2000];
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Valores colados no painel da Vercel podem vir com espaço ou quebra de linha no
// fim; num header isso faz o fetch falhar com "invalid header value".
function evolutionUrl() {
  return process.env.EVOLUTION_API_URL?.trim().replace(/\/+$/, "") || "";
}

function evolutionKey() {
  return process.env.EVOLUTION_API_KEY?.replace(/\s+/g, "").trim() || "";
}

export function webhookSecret() {
  return process.env.WHATSAPP_WEBHOOK_SECRET?.trim() ?? "";
}

export function whatsappConfigured() {
  return Boolean(evolutionUrl() && evolutionKey());
}

export function instanceName(restaurantId: string) {
  return `pf-${restaurantId}`;
}

export function restaurantIdFromInstance(name: unknown) {
  const match = typeof name === "string" ? /^pf-([0-9a-f-]{36})$/i.exec(name) : null;
  return match?.[1] ?? null;
}

async function evolution<T>(method: string, path: string, body?: unknown): Promise<{ ok: boolean; status: number; data: T | null }> {
  const base = evolutionUrl();
  const key = evolutionKey();
  if (!base || !key) return { ok: false, status: 503, data: null };
  // A chave é gerada com "openssl rand -hex 32". Só o tamanho vai na mensagem, nunca a chave.
  if (!/^[0-9a-f]{64}$/i.test(key)) {
    throw new Error(`EVOLUTION_API_KEY inválida: esperado 64 caracteres hexadecimais, recebido ${key.length}.`);
  }
  // Quedas curtas do túnel/servidor são comuns: tenta de novo antes de desistir.
  let lastFailure = "";
  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    if (attempt > 0) await sleep(RETRY_DELAYS_MS[attempt - 1]);
    let response: Response;
    try {
      response = await fetch(`${base}${path}`, {
        method,
        headers: { apikey: key, "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
        cache: "no-store",
        signal: AbortSignal.timeout(10000),
      });
    } catch (error) {
      lastFailure = error instanceof Error ? `${error.name}: ${error.message}` : "erro de rede";
      continue;
    }
    if (TRANSIENT_STATUS.has(response.status)) {
      lastFailure = `HTTP ${response.status}`;
      continue;
    }
    const data = (await response.json().catch(() => null)) as T | null;
    return { ok: response.ok, status: response.status, data };
  }
  console.error(`[whatsapp] servidor Evolution indisponível em ${method} ${path.split("/").slice(0, 3).join("/")}: ${lastFailure}`);
  throw new WhatsAppServerOffline(lastFailure);
}

function webhookConfig() {
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "https://perinifood.com.br").replace(/\/+$/, "");
  return {
    enabled: true,
    url: `${appUrl}/api/whatsapp/webhook`,
    byEvents: false,
    base64: false,
    events: ["MESSAGES_UPSERT", "CONNECTION_UPDATE"],
    headers: { "x-webhook-secret": webhookSecret() },
  };
}

export async function connectionState(restaurantId: string): Promise<WhatsAppState> {
  if (!whatsappConfigured()) return "disabled";
  let result;
  try {
    result = await evolution<{ instance?: { state?: string } }>("GET", `/instance/connectionState/${instanceName(restaurantId)}`);
  } catch (error) {
    if (error instanceof WhatsAppServerOffline) return "offline";
    throw error;
  }
  if (result.status === 404) return "missing";
  if (result.status === 401 || result.status === 403) throw new Error("O servidor de WhatsApp recusou a chave de acesso (EVOLUTION_API_KEY).");
  const state = result.data?.instance?.state;
  return state === "open" || state === "connecting" ? state : "close";
}

type QrCode = { base64?: string; code?: string; pairingCode?: string | null };

// A Evolution gera o QR de forma assíncrona: logo após criar/conectar a resposta
// pode vir só com {count: 0}. Consulta de novo por alguns segundos antes de desistir.
async function waitForQr(name: string) {
  for (const delay of [0, 1500, 2500, 3500]) {
    if (delay) await sleep(delay);
    const connect = await evolution<QrCode & { instance?: { state?: string } }>("GET", `/instance/connect/${name}`);
    if (connect.data?.base64) return connect.data.base64;
    if (connect.data?.instance?.state === "open") return null;
  }
  return null;
}

// Cria a instância (se ainda não existe) e devolve o QR Code para escanear.
export async function startConnection(restaurantId: string): Promise<{ state: WhatsAppState; qr: string | null }> {
  if (!whatsappConfigured()) return { state: "disabled", qr: null };
  const name = instanceName(restaurantId);
  const state = await connectionState(restaurantId);
  if (state === "open") return { state, qr: null };
  if (state === "offline") throw new WhatsAppServerOffline("connectionState");
  if (state === "missing") {
    const created = await evolution<{ qrcode?: QrCode }>("POST", "/instance/create", {
      instanceName: name,
      integration: "WHATSAPP-BAILEYS",
      qrcode: true,
      webhook: webhookConfig(),
    });
    // 403 "already in use": outra aba criou a instância ao mesmo tempo; segue para o connect.
    if (!created.ok && created.status !== 403) throw new Error(`Não foi possível criar a conexão no servidor de WhatsApp (HTTP ${created.status}).`);
    if (created.data?.qrcode?.base64) return { state: "connecting", qr: created.data.qrcode.base64 };
  }
  const qr = await waitForQr(name);
  if (!qr && (await connectionState(restaurantId)) === "open") return { state: "open", qr: null };
  return { state: "connecting", qr };
}

// Saúde do servidor para o monitor externo e o painel admin: responde, e aceita a chave?
export async function serverHealth(): Promise<"online" | "offline" | "auth_error" | "disabled"> {
  if (!whatsappConfigured()) return "disabled";
  try {
    const result = await evolution("GET", "/instance/fetchInstances");
    if (result.status === 401 || result.status === 403) return "auth_error";
    return result.ok ? "online" : "offline";
  } catch (error) {
    if (error instanceof WhatsAppServerOffline) return "offline";
    return "auth_error"; // chave mal formatada (erro de configuração, não de rede)
  }
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
  try {
    const result = await evolution("POST", `/message/sendText/${instanceName(restaurantId)}`, { number, text, delay: 800 });
    return { ok: result.ok, reason: result.ok ? null : result.status === 404 ? "WhatsApp da loja desconectado (HTTP 404)" : `HTTP ${result.status}` };
  } catch (error) {
    if (error instanceof WhatsAppServerOffline) return { ok: false, reason: `servidor de WhatsApp fora do ar (${error.detail})` };
    throw error;
  }
}
