import { normalizeGenericExternalOrder } from "@/integrations/core/normalize";

export function mapIFoodPayload(payload: unknown) {
  return normalizeGenericExternalOrder("ifood", payload);
}
