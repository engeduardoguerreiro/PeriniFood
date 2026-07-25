import { normalizeGenericExternalOrder } from "@/integrations/core/normalize";

export function mapKeetaPayload(payload: unknown) {
  return normalizeGenericExternalOrder("keeta", payload);
}
