import { NextResponse } from "next/server";
import { pollAndProcessIFood } from "@/lib/integrations/ifood/polling";

// Endpoint acionado por um cron externo (cron-job.org) para puxar os
// pedidos/eventos do iFood via polling e processá-los.
// Protegido por token: use ?key=IFOOD_POLL_SECRET.
export async function GET(request: Request) {
  const secret = process.env.IFOOD_POLL_SECRET;
  if (secret) {
    const key = new URL(request.url).searchParams.get("key");
    if (key !== secret) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }
  }
  try {
    const result = await pollAndProcessIFood();
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
