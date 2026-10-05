import { requireIntegrationToken } from "@/lib/integrations/ingress";
import { NextResponse } from "next/server";
import { pollAndProcessIFood } from "@/lib/integrations/ifood/polling";

// Chamado a cada 30 s pelo pg_cron do Supabase (deploy/ifood-poller/supabase-cron.sql) para puxar
// os pedidos/eventos do iFood e manter as lojas abertas (heartbeat).
// Protegido por token: header Authorization: Bearer IFOOD_POLL_SECRET.
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
