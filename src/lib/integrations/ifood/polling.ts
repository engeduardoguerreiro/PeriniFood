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
  const processed = processedIds.length;

  if (processedIds.length) await acknowledgeEvents(token, processedIds);

  return { polled: events.length, processed };
}
