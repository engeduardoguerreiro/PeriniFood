import { createServiceClient } from "@/lib/supabase/service";
import { IFOOD_AUTH_MODE } from "./config";
import { getIFoodAccessToken, pollEvents, acknowledgeEvents } from "./client";
import { processIFoodEvent } from "./event-processor";

type Result = { polled: number; processed: number; stores?: number; failedStores?: number };

// Puxa a fila de eventos do iFood, processa cada um (cria/cancela pedido) e
// confirma o recebimento. Acionado a cada 30 s pelo pg_cron do Supabase
// (deploy/ifood-poller/supabase-cron.sql). No distribuído, cada loja usa o próprio token, e o
// polling é também o heartbeat que mantém a loja aberta no iFood.
export async function pollAndProcessIFood(): Promise<Result> {
  if (IFOOD_AUTH_MODE !== "distributed") return pollOnce(await getIFoodAccessToken());

  const { data, error } = await createServiceClient()
    .from("integrations")
    .select("id, external_store_id")
    .eq("provider", "ifood")
    .eq("is_enabled", true)
    .not("refresh_token", "is", null)
    .not("external_store_id", "is", null);
  if (error) throw new Error(error.message);

  const results = await Promise.allSettled(
    (data ?? []).map(async (row) => pollOnce(await getIFoodAccessToken(row.id), [row.external_store_id as string])),
  );
  const total: Result = { polled: 0, processed: 0, stores: results.length, failedStores: 0 };
  for (const result of results) {
    if (result.status === "fulfilled") {
      total.polled += result.value.polled;
      total.processed += result.value.processed;
    } else {
      total.failedStores! += 1;
      console.error("[ifood] polling da loja falhou", result.reason instanceof Error ? result.reason.message : result.reason);
    }
  }
  return total;
}

async function pollOnce(token: string, merchants?: string[]): Promise<Result> {
  const events = await pollEvents(token, merchants);
  if (!events.length) return { polled: 0, processed: 0 };

  const supabase = createServiceClient();
  // Só confirma o que foi processado: evento que falhou continua na fila do iFood
  // e volta no próximo polling, em vez de o pedido se perder.
  const processedIds: string[] = [];
  for (const event of events) {
    const id = (event as { id?: string }).id;
    try {
      await processIFoodEvent(supabase, event as Record<string, unknown>);
      if (id) processedIds.push(id);
    } catch (error) {
      console.error("[ifood] evento não processado", id, error instanceof Error ? error.message : error);
    }
  }
  if (processedIds.length) await acknowledgeEvents(token, processedIds);
  return { polled: events.length, processed: processedIds.length };
}
