import { requireIntegrationToken } from "@/lib/integrations/ingress";
import { NextResponse } from "next/server";
import { pollAndProcessIFood } from "@/lib/integrations/ifood/polling";

// Endpoint acionado por um cron externo (cron-job.org) para puxar os
// pedidos/eventos do iFood via polling e processá-los.
// Protegido por token: use ?key=IFOOD_POLL_SECRET.
export async function GET(request: Request) {
  const denied = requireIntegrationToken(request, process.env.IFOOD_POLL_SECRET);
  if (denied) return denied;
  try {
    const result = await pollAndProcessIFood();
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
