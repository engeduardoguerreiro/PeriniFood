import { NextResponse } from "next/server";
import { pollAndProcessIFood } from "@/lib/integrations/ifood/polling";

// Endpoint acionado pelo cron do Vercel (e sob demanda) para puxar os
// pedidos/eventos do iFood via polling e processá-los.
export async function GET() {
  try {
    const result = await pollAndProcessIFood();
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
