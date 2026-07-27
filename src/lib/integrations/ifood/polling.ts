import { createServiceClient } from "@/lib/supabase/service";
import { getIFoodAccessToken, pollEvents, acknowledgeEvents } from "./client";
import { processIFoodEvent } from "./event-processor";

// Puxa a fila de eventos do iFood, processa cada um (cria/cancela pedido) e
// confirma o recebimento. Usado pelo cron de polling.
export async function pollAndProcessIFood(): Promise<{ polled: number; processed: number }> {
  const token = await getIFoodAccessToken();
  const events = await pollEvents(token);
  if (!events.length) return { polled: 0, processed: 0 };

  const supabase = createServiceClient();
  let processed = 0;
  for (const event of events) {
    try {
      await processIFoodEvent(supabase, event as Record<string, unknown>);
      processed += 1;
    } catch {
      // não bloqueia os demais
    }
  }

  const ids = events.map((event) => (event as { id?: string }).id).filter((id): id is string => Boolean(id));
  await acknowledgeEvents(token, ids);

  return { polled: events.length, processed };
}
