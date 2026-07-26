import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

// Mantém o projeto Supabase ativo (o plano gratuito pausa após ~7 dias sem
// atividade no banco). O Vercel Cron chama esta rota diariamente e ela faz
// uma consulta trivial, o que conta como atividade e evita a pausa.
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ ok: false, error: "não autorizado" }, { status: 401 });
    }
  }

  try {
    const supabase = createServiceClient();
    const { error } = await supabase.from("restaurants").select("id").limit(1);
    if (error) throw error;
    return NextResponse.json({ ok: true, pingedAt: new Date().toISOString() });
  } catch (error) {
    const message = error instanceof Error ? error.message : "erro desconhecido";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
