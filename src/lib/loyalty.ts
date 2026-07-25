type LoyaltyProgramLike = {
  enabled?: boolean | null;
  points_per_currency?: number | string | null;
  points_to_reward?: number | string | null;
  reward_type?: string | null;
  reward_value?: number | string | null;
  description?: string | null;
  campaign_starts_at?: string | null;
  campaign_ends_at?: string | null;
} | null;

export type LoyaltyOrderLike = {
  id?: string | null;
  order_number?: number | string | null;
  code?: string | null;
  total?: number | string | null;
  status?: string | null;
  payment_status?: string | null;
  created_at?: string | null;
};

const LOYALTY_VALIDITY_MONTHS = 6;
const BRASILIA_OFFSET = "-03:00";

export function isLoyaltyEligibleOrder(order: LoyaltyOrderLike) {
  if (order.status === "canceled") return false;
  return order.payment_status === "paid" || order.status === "completed";
}

function addMonths(date: Date, months: number) {
  const next = new Date(date.getTime());
  next.setMonth(next.getMonth() + months);
  return next;
}

function campaignDate(value: string | null | undefined, endOfDay = false) {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const date = /^\d{4}-\d{2}-\d{2}$/.test(trimmed)
    ? new Date(`${trimmed}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}${BRASILIA_OFFSET}`)
    : new Date(trimmed);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function loyaltyCampaignFromOpeningHours(openingHours: Record<string, unknown> | null | undefined) {
  const raw = openingHours && typeof openingHours === "object" ? openingHours._loyalty_campaign : null;
  if (!raw || typeof raw !== "object") return { campaign_starts_at: null, campaign_ends_at: null };
  const campaign = raw as Record<string, unknown>;
  return {
    campaign_starts_at: typeof campaign.starts_at === "string" ? campaign.starts_at : null,
    campaign_ends_at: typeof campaign.ends_at === "string" ? campaign.ends_at : null,
  };
}

export function withLoyaltyCampaign<T extends Record<string, unknown> | null | undefined>(
  loyalty: T,
  openingHours: Record<string, unknown> | null | undefined,
) {
  const campaign = loyaltyCampaignFromOpeningHours(openingHours);
  return loyalty ? { ...loyalty, ...campaign } : loyalty;
}

export function isInsideLoyaltyCampaign(order: LoyaltyOrderLike, loyalty: LoyaltyProgramLike) {
  const orderDate = order.created_at ? new Date(order.created_at) : null;
  if (!orderDate || Number.isNaN(orderDate.getTime())) return false;
  const startsAt = campaignDate(loyalty?.campaign_starts_at, false);
  const endsAt = campaignDate(loyalty?.campaign_ends_at, true);
  if (startsAt && orderDate.getTime() < startsAt.getTime()) return false;
  if (endsAt && orderDate.getTime() > endsAt.getTime()) return false;
  return true;
}

export function loyaltyPointBatches(loyalty: LoyaltyProgramLike, orders: LoyaltyOrderLike[], now = new Date()) {
  if (!loyalty?.enabled) return [];

  return orders
    .filter(isLoyaltyEligibleOrder)
    .filter((order) => isInsideLoyaltyCampaign(order, loyalty))
    .map((order) => {
      const earnedAt = order.created_at ? new Date(order.created_at) : now;
      const expiresAt = addMonths(earnedAt, LOYALTY_VALIDITY_MONTHS);
      return {
        orderId: order.id ?? null,
        orderNumber: order.order_number ?? null,
        code: order.code ?? null,
        points: 1,
        earnedAt: earnedAt.toISOString(),
        expiresAt: expiresAt.toISOString(),
        expired: expiresAt.getTime() < now.getTime(),
      };
    })
    .filter((batch) => batch.points > 0)
    .sort((a, b) => new Date(a.expiresAt).getTime() - new Date(b.expiresAt).getTime());
}

export function calculateLoyaltyPoints(loyalty: LoyaltyProgramLike, orders: LoyaltyOrderLike[]) {
  return loyaltyPointBatches(loyalty, orders)
    .filter((batch) => !batch.expired)
    .reduce((sum, batch) => sum + batch.points, 0);
}

export function loyaltySummary(loyalty: LoyaltyProgramLike, orders: LoyaltyOrderLike[]) {
  const enabled = Boolean(loyalty?.enabled);
  const batches = loyaltyPointBatches(loyalty, orders);
  const activeBatches = batches.filter((batch) => !batch.expired);
  const expiredPoints = batches.filter((batch) => batch.expired).reduce((sum, batch) => sum + batch.points, 0);
  const points = activeBatches.reduce((sum, batch) => sum + batch.points, 0);
  const pointsPerCurrency = 1;
  const pointsToReward = Number(loyalty?.points_to_reward ?? 10);
  const rewardValue = Number(loyalty?.reward_value ?? 0);
  const rewardType = String(loyalty?.reward_type ?? "fixed");
  const campaignStartsAt = loyalty?.campaign_starts_at ?? null;
  const campaignEndsAt = loyalty?.campaign_ends_at ?? null;

  return {
    enabled,
    points,
    pointsPerCurrency,
    pointsToReward,
    rewardValue,
    rewardType,
    rewardsAvailable: enabled && pointsToReward > 0 ? Math.floor(points / pointsToReward) : 0,
    expiredPoints,
    pointsValidityMonths: LOYALTY_VALIDITY_MONTHS,
    campaignStartsAt,
    campaignEndsAt,
    expiringBatches: activeBatches.slice(0, 12),
    description: String(loyalty?.description ?? "Acumule pontos a cada pedido e troque por descontos."),
  };
}
