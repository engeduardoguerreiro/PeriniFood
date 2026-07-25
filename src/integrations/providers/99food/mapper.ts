import { normalizeGenericExternalOrder } from "@/integrations/core/normalize";

export function map99FoodPayload(payload: unknown) {
  return normalizeGenericExternalOrder("99food", payload);
}
