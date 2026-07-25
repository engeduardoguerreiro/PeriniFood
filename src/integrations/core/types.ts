export type IntegrationProvider = "99food" | "ifood" | "keeta" | "whatsapp" | "webhook" | "own_menu";

export type NormalizedExternalOrder = import("@/lib/integrations/external-order").NormalizedExternalOrder;

export type ProviderStatusMap = Record<string, "pending" | "accepted" | "preparing" | "ready" | "out_for_delivery" | "completed" | "canceled">;
