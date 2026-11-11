import { randomUUID } from "node:crypto";
import { requireIntegrationToken } from "@/lib/integrations/ingress";
import { NextResponse } from "next/server";
import { pollAndProcessIFood } from "@/lib/integrations/ifood/polling";
import { createServiceClient } from "@/lib/supabase/service";

// Teto da função; a trava abaixo dura um pouco menos, então some sozinha se a função morrer.
export const maxDuration = 60;
const LOCK = "ifood-poll";
const LOCK_SECONDS = 55;

// Chamado a cada 30 s pelo pg_cron do Supabase (deploy/ifood-poller/supabase-cron.sql) para puxar
// os pedidos/eventos do iFood e manter as lojas abertas (heartbeat).
// Protegido por token: header Authorization: Bearer IFOOD_POLL_SECRET.
// Trava (job_locks): se a rodada anterior ainda está rodando, esta é pulada em vez de
// reprocessar os mesmos eventos. Se a trava falhar (ex.: migration ausente), segue sem ela:
// o índice único de pedidos externos ainda impede duplicata.
export async function GET(request: Request) {
  const denied = requireIntegrationToken(request, process.env.IFOOD_POLL_SECRET);
  if (denied) return denied;
  const supabase = createServiceClient();
  const holder = randomUUID();
  const { data: acquired, error: lockError } = await supabase.rpc("try_acquire_job_lock", { p_name: LOCK, p_holder: holder, p_seconds: LOCK_SECONDS });
  if (lockError) console.warn("[ifood] trava do polling indisponível, seguindo sem ela:", lockError.message);
  else if (!acquired) return NextResponse.json({ ok: true, skipped: "rodada anterior ainda em andamento" });
  try {
    const result = await pollAndProcessIFood();
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  } finally {
    if (!lockError) await supabase.rpc("release_job_lock", { p_name: LOCK, p_holder: holder });
  }
}
