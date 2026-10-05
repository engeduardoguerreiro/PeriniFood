import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { IFOOD_CLIENT_SECRET } from "@/lib/integrations/ifood/config";
import { createServiceClient } from "@/lib/supabase/service";
import { processIFoodEvent } from "@/lib/integrations/ifood/event-processor";

// Webhook do iFood (modo WEBHOOK / "Per Application").
// - KEEPALIVE (presença): responde 202 + {"merchantIds": [...]} com as lojas
//   ligadas ao PeriniFood; o iFood só gera heartbeat (loja aberta pelo nosso
//   app) para os merchants listados. Sonda sem merchantIds → corpo vazio.
// - Eventos de pedido: cria/cancela o pedido interno (mesma lógica do polling).
// O iFood assina cada chamada: X-IFood-Signature = hex(HMAC-SHA256(corpo bruto,
// client secret)). Assinatura inválida → 401 (critério de homologação).
// Falha ao processar um pedido → 500, para o iFood reenviar o evento (a criação
// é idempotente por external_order_id).

type IFoodEvent = { id?: string; code?: string; fullCode?: string; orderId?: string; merchantId?: string; merchantIds?: unknown };

const ACCEPTED = () => new NextResponse(null, { status: 202 });

function signatureMatches(raw: Buffer, supplied: string | null) {
  const signature = supplied?.trim().toLowerCase() ?? "";
  if (!/^[0-9a-f]{64}$/.test(signature)) return false;
  const expected = createHmac("sha256", IFOOD_CLIENT_SECRET).update(raw).digest();
  return timingSafeEqual(expected, Buffer.from(signature, "hex"));
}

export async function POST(request: Request) {
  if (!IFOOD_CLIENT_SECRET) return NextResponse.json({ ok: false, message: "iFood não configurado." }, { status: 503 });
  const raw = Buffer.from(await request.arrayBuffer());
  if (!signatureMatches(raw, request.headers.get("x-ifood-signature"))) {
    return NextResponse.json({ ok: false, message: "Assinatura inválida." }, { status: 401 });
  }
  let events: IFoodEvent[] = [];
  try {
    const body = JSON.parse(raw.toString("utf8"));
    events = Array.isArray(body) ? body : [body];
  } catch {
    return NextResponse.json({ ok: false, message: "JSON inválido." }, { status: 400 });
  }

  let failed = false;
  let probe = false;
  const asked = new Set<string>();

  for (const event of events) {
    const code = event.fullCode ?? event.code ?? "UNKNOWN";
    if (code === "KEEPALIVE") {
      probe = true;
      if (Array.isArray(event.merchantIds)) for (const id of event.merchantIds) if (typeof id === "string") asked.add(id);
      if (event.merchantId) asked.add(event.merchantId);
      continue;
    }
    if (!event.orderId) continue;
    try {
      const supabase = createServiceClient();
      await processIFoodEvent(supabase, event);
    } catch (error) {
      failed = true;
      console.error("[ifood webhook] evento não processado", event.id, error instanceof Error ? error.message : error);
    }
  }

  if (failed) return NextResponse.json({ ok: false }, { status: 500 });
  if (probe && asked.size) return NextResponse.json({ merchantIds: await connectedMerchants([...asked]) }, { status: 202 });
  return ACCEPTED();
}

// Lojas pedidas pelo iFood que estão ligadas e ativas no PeriniFood.
async function connectedMerchants(ids: string[]) {
  const { data, error } = await createServiceClient()
    .from("integrations")
    .select("external_store_id, is_enabled, enabled")
    .eq("provider", "ifood")
    .in("external_store_id", ids.slice(0, 1000));
  // Erro de banco: responde com a lista pedida, para não derrubar a loja.
  if (error) return ids;
  return (data ?? []).filter((row) => row.is_enabled ?? row.enabled).map((row) => row.external_store_id as string);
}

export async function GET() {
  return NextResponse.json({ ok: true, provider: "ifood", webhook: "ready" });
}
