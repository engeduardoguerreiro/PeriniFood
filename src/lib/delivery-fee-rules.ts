import type { DeliveryFeeRule, Restaurant } from "@/lib/types";

export function deliveryRulesFromRestaurant(restaurant: Pick<Restaurant, "id" | "opening_hours">) {
  const stored = restaurant.opening_hours && typeof restaurant.opening_hours === "object" ?
     (restaurant.opening_hours as Record<string, unknown>)._delivery_fee_rules
    : null;

  if (!Array.isArray(stored)) return [];

  return stored
    .map((rule, index) => {
      const item = rule as Partial<DeliveryFeeRule>;
      return {
        id: item.id ?? `fallback-${index}`,
        restaurant_id: item.restaurant_id ?? restaurant.id,
        name: item.name ?? `Até ${item.max_km ?? index + 2} km`,
        min_km: Number(item.min_km ?? 0),
        max_km: item.max_km === null || item.max_km === undefined ? null : Number(item.max_km),
        fee: Number(item.fee ?? 0),
        free_delivery: Boolean(item.free_delivery),
        active: item.active !== false,
        created_at: item.created_at ?? new Date(0).toISOString(),
      } satisfies DeliveryFeeRule;
    })
    .filter((rule) => rule.active);
}

export function mergeDeliveryRulesIntoOpeningHours(openingHours: Restaurant["opening_hours"], rules: DeliveryFeeRule[] | Array<Omit<DeliveryFeeRule, "id" | "created_at">>) {
  return {
    ...((openingHours && typeof openingHours === "object" ? openingHours : {}) as Record<string, unknown>),
    _delivery_fee_rules: rules,
  };
}
