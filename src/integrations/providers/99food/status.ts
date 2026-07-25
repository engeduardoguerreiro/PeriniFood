import type { ProviderStatusMap } from "@/integrations/core/types";

export const statusMap: ProviderStatusMap = {
  // TODO: confirmar status oficiais da 99Food antes de ativar integração real.
  RECEIVED: "pending",
  ACCEPTED: "accepted",
  PREPARING: "preparing",
  READY: "ready",
  DISPATCHED: "out_for_delivery",
  DELIVERED: "completed",
  CANCELED: "canceled",
};
