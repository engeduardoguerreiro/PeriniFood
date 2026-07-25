import type { OrderStatus } from "@/lib/types";

export type ProviderName = "ifood" | "99food" | "keeta" | "rappi" | "webhook";

export type ExternalOrder = {
  externalOrderId: string;
  customerName: string;
  customerPhone?: string;
  deliveryAddress?: string;
  total: number;
  items: Array<{ externalId: string; name: string; quantity: number; unitPrice: number; notes?: string }>;
  raw: unknown;
};

export type IntegrationProvider = {
  connect(): Promise<{ ok: boolean; message: string }>;
  testConnection(): Promise<{ ok: boolean; message: string }>;
  fetchOrders(): Promise<ExternalOrder[]>;
  acceptOrder(externalOrderId: string): Promise<{ ok: boolean; externalOrderId: string }>;
  rejectOrder(externalOrderId: string, reason: string): Promise<{ ok: boolean; externalOrderId: string; reason: string }>;
  updateOrderStatus(externalOrderId: string, status: OrderStatus): Promise<{ ok: boolean; externalOrderId: string; status: OrderStatus }>;
  syncMenu(): Promise<{ ok: boolean; message: string }>;
  parseExternalOrder(payload: unknown): ExternalOrder;
};

export function mockProvider(provider: ProviderName): IntegrationProvider {
  return {
    async connect() { return { ok: true, message: `${provider} pronto para receber credenciais reais.` }; },
    async testConnection() { return { ok: true, message: `Teste mock de ${provider} concluído.` }; },
    async fetchOrders() { return []; },
    async acceptOrder(externalOrderId) { return { ok: true, externalOrderId }; },
    async rejectOrder(externalOrderId, reason) { return { ok: true, externalOrderId, reason }; },
    async updateOrderStatus(externalOrderId, status) { return { ok: true, externalOrderId, status }; },
    async syncMenu() { return { ok: true, message: `Cardápio preparado para sincronização ${provider}.` }; },
    parseExternalOrder(payload) {
      const data = payload as Record<string, unknown>;
      const items = Array.isArray(data.items) ? data.items : [];
      return {
        externalOrderId: String(data.id ?? data.orderId ?? crypto.randomUUID()),
        customerName: String(readNested(data.customer, "name") ?? data.customerName ?? "Cliente marketplace"),
        customerPhone: stringOrUndefined(readNested(data.customer, "phone") ?? data.customerPhone),
        deliveryAddress: stringOrUndefined(readNested(data.delivery, "address") ?? data.deliveryAddress),
        total: Number(data.total ?? data.amount ?? 0),
        items: items.map((entry) => {
          const item = entry as Record<string, unknown>;
          return {
            externalId: String(item.id ?? ""),
            name: String(item.name ?? item.productName ?? "Item externo"),
            quantity: Number(item.quantity ?? 1),
            unitPrice: Number(item.unitPrice ?? item.price ?? 0),
            notes: stringOrUndefined(item.notes),
          };
        }),
        raw: payload,
      };
    },
  };
}

function readNested(value: unknown, key: string) {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>)[key] : undefined;
}

function stringOrUndefined(value: unknown) {
  return typeof value === "string" ? value : undefined;
}
