import { requireIntegrationToken } from "@/lib/integrations/ingress";
import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

// Mantém o projeto Supabase ativo (o plano gratuito pausa após ~7 dias sem
// atividade no banco). O Vercel Cron chama esta rota diariamente e ela faz
// uma consulta trivial, o que conta como atividade e evita a pausa.
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const denied = requireIntegrationToken(request, process.env.CRON_SECRET);
  if (denied) return denied;
  try {
    const supabase = createServiceClient();
    const { error } = await supabase.from("restaurants").select("id").limit(1);
    if (error) throw error;
    const cleanup = await supabase.rpc("cleanup_security_data");
    if (cleanup.error) throw cleanup.error;
    return NextResponse.json({ ok: true, pingedAt: new Date().toISOString() });
  } catch {
    const message = "Serviço temporariamente indisponível";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
