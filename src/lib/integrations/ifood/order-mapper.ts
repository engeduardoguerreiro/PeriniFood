// Mapeia os detalhes de um pedido do iFood (GET /order/v1.0/orders/{id})
// para o formato interno do PeriniFood. Best-effort e tolerante a campos ausentes.

type IFoodOrder = Record<string, unknown>;

function n(value: unknown): number {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

function obj(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

export type MappedIFoodOrder = {
  externalOrderId: string;
  displayId: string | null;
  type: "delivery" | "pickup" | "dine_in";
  customerName: string;
  customerPhone: string | null;
  deliveryAddress: string | null;
  subtotal: number;
  deliveryFee: number;
  total: number;
  paid: boolean;
  items: Array<{ name: string; quantity: number; unitPrice: number; totalPrice: number; notes: string | null; externalId: string | null }>;
};

export function mapIFoodOrder(order: IFoodOrder): MappedIFoodOrder {
  const typeMap: Record<string, MappedIFoodOrder["type"]> = { DELIVERY: "delivery", TAKEOUT: "pickup", INDOOR: "dine_in" };
  const total = obj(order.total);
  const customer = obj(order.customer);
  const phone = obj(customer.phone);
  const delivery = obj(order.delivery);
  const address = obj(delivery.deliveryAddress);
  const payments = obj(order.payments);

  const rawItems = Array.isArray(order.items) ? order.items : [];
  const items = rawItems.map((raw) => {
    const item = obj(raw);
    const options = Array.isArray(item.options) ? item.options.map((o) => obj(o).name).filter(Boolean) : [];
    const notesParts = [item.observations as string, options.length ? `Adicionais: ${options.join(", ")}` : ""].filter(Boolean);
    return {
      name: String(item.name ?? "Item"),
      quantity: n(item.quantity) || 1,
      unitPrice: n(item.unitPrice) || n(item.price),
      totalPrice: n(item.totalPrice) || n(item.unitPrice) * (n(item.quantity) || 1),
      notes: notesParts.length ? notesParts.join(" · ") : null,
      externalId: item.id ? String(item.id) : null,
    };
  });

  return {
    externalOrderId: String(order.id ?? ""),
    displayId: order.displayId ? String(order.displayId) : null,
    type: typeMap[String(order.orderType)] ?? "delivery",
    customerName: String(customer.name ?? "Cliente iFood"),
    customerPhone: (phone.number as string) ?? (typeof customer.phone === "string" ? customer.phone : null) ?? null,
    deliveryAddress: (address.formattedAddress as string) ?? null,
    subtotal: n(total.subTotal),
    deliveryFee: n(total.deliveryFee),
    total: n(total.orderAmount) || n(total.subTotal),
    paid: n(payments.prepaid) > 0 || n(payments.pending) === 0,
    items,
  };
}
