import type { OrderStatus } from "@/lib/types";
import {
  getIFoodAccessToken,
  confirmOrder,
  startPreparation,
  readyToPickupOrder,
  dispatchOrder,
  requestCancellation,
  getCancellationReasons,
} from "./client";

export type StatusSyncResult = { ok: boolean; action: string; detail?: string };

// Empurra o novo status do PeriniFood para o iFood.
// Fluxo iFood: PLACED → (confirm) CONFIRMED → (startPreparation) → (readyToPickup) → (dispatch).
export async function syncOrderStatusToIFood(externalOrderId: string, status: OrderStatus): Promise<StatusSyncResult> {
  const token = await getIFoodAccessToken();

  switch (status) {
    case "accepted": {
      const res = await confirmOrder(externalOrderId, token);
      return { ok: res.ok, action: "confirm", detail: res.ok ? undefined : res.text };
    }
    case "preparing": {
      // "Em produção": aceita o pedido (confirm) e marca em preparo (best-effort).
      const confirmed = await confirmOrder(externalOrderId, token);
      await startPreparation(externalOrderId, token).catch(() => undefined);
      return { ok: confirmed.ok, action: "confirm+startPreparation", detail: confirmed.ok ? undefined : confirmed.text };
    }
    case "ready": {
      const res = await readyToPickupOrder(externalOrderId, token);
      return { ok: res.ok, action: "readyToPickup", detail: res.ok ? undefined : res.text };
    }
    case "out_for_delivery": {
      const res = await dispatchOrder(externalOrderId, token);
      return { ok: res.ok, action: "dispatch", detail: res.ok ? undefined : res.text };
    }
    case "canceled": {
      const reasons = await getCancellationReasons(externalOrderId, token);
      const reason = reasons[0] ?? { cancelCodeId: "501", description: "PROBLEMAS DE SISTEMA" };
      const res = await requestCancellation(externalOrderId, token, {
        reason: reason.description,
        cancellationCode: reason.cancelCodeId,
      });
      return { ok: res.ok, action: "requestCancellation", detail: res.ok ? undefined : res.text };
    }
    case "completed":
      // iFood não aceita "finalizar" pela integração — ele conclui sozinho
      // em até 2h após a entrega. Último passo do lojista é o dispatch.
      return { ok: true, action: "concluded_by_ifood", detail: "iFood finaliza automaticamente após a entrega" };
    default:
      // pending: iFood não requer ação do lojista.
      return { ok: true, action: "none" };
  }
}
