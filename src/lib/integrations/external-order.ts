import { createServiceClient } from "@/lib/supabase/service";

export type NormalizedExternalOrder = {
  provider: string;
  externalStoreId: string;
  externalOrderId: string;
  externalCode?: string;
  customer: {
    name: string;
    phone?: string;
    document?: string;
  };
  delivery: {
    type: "delivery" | "pickup" | "dine_in";
    address?: {
      street?: string;
      number?: string;
      neighborhood?: string;
      complement?: string;
      reference?: string;
      city?: string;
      state?: string;
      zipCode?: string;
    };
  };
  items: Array<{
    externalProductId?: string;
    productId?: string;
    name: string;
    quantity: number;
    unitPrice: number;
    total: number;
    notes?: string;
    addons: Array<{
      externalAddonId?: string;
      name: string;
      price: number;
      quantity: number;
    }>;
  }>;
  payment: {
    method: string;
    status?: string;
    changeFor?: number;
  };
  totals: {
    subtotal: number;
    deliveryFee: number;
    discount: number;
    total: number;
  };
  notes?: string;
  rawPayload: unknown;
};

export function normalizeGenericExternalOrder(provider: string, payload: unknown): NormalizedExternalOrder {
  const data = payload as Record<string, any>;
  const delivery = data.delivery ?? {};
  const totals = data.totals ?? {};
  const items = Array.isArray(data.items) ? data.items : [];
  const customer = data.customer ?? {};
  const address = delivery.address ?? {};

  return {
    provider,
    externalStoreId: String(data.externalStoreId ?? data.storeId ?? data.merchantId ?? data.restaurantId ?? ""),
    externalOrderId: String(data.externalOrderId ?? data.orderId ?? data.id ?? crypto.randomUUID()),
    externalCode: data.externalCode ? String(data.externalCode) : undefined,
    customer: {
      name: String(customer.name ?? data.customerName ?? "Cliente externo"),
      phone: customer.phone ? String(customer.phone) : undefined,
      document: customer.document ? String(customer.document) : undefined,
    },
    delivery: {
      type: delivery.type === "PICKUP" ? "pickup" : delivery.type === "COUNTER" ? "dine_in" : "delivery",
      address: {
        street: address.street,
        number: address.number,
        neighborhood: address.neighborhood,
        complement: address.complement,
        reference: address.reference,
        city: address.city,
        state: address.state,
        zipCode: address.zipCode,
      },
    },
    items: items.map((entry: Record<string, any>) => {
      const quantity = Number(entry.quantity ?? 1);
      const unitPrice = Number(entry.unitPrice ?? entry.price ?? 0);
      return {
        externalProductId: entry.externalProductId ? String(entry.externalProductId) : undefined,
        productId: entry.productId ? String(entry.productId) : undefined,
        name: String(entry.name ?? entry.productName ?? "Item externo"),
        quantity,
        unitPrice,
        total: Number(entry.total ?? unitPrice * quantity),
        notes: entry.notes ? String(entry.notes) : undefined,
        addons: Array.isArray(entry.addons) ? entry.addons.map((addon: Record<string, any>) => ({
          externalAddonId: addon.externalAddonId ? String(addon.externalAddonId) : undefined,
          name: String(addon.name ?? "Adicional"),
          price: Number(addon.price ?? 0),
          quantity: Number(addon.quantity ?? 1),
        })) : [],
      };
    }),
    payment: {
      method: String((data.payment ?? {}).method ?? "other").toLowerCase(),
      status: (data.payment ?? {}).status,
      changeFor: (data.payment ?? {}).changeFor ? Number((data.payment ?? {}).changeFor) : undefined,
    },
    totals: {
      subtotal: Number(totals.subtotal ?? items.reduce((sum: number, item: any) => sum + Number(item.total ?? item.unitPrice ?? 0), 0)),
      deliveryFee: Number(totals.deliveryFee ?? 0),
      discount: Number(totals.discount ?? 0),
      total: Number(totals.total ?? totals.subtotal ?? 0),
    },
    notes: data.notes,
    rawPayload: payload,
  };
}

export function externalAddressToText(order: NormalizedExternalOrder) {
  const address = order.delivery.address;
  if (!address) return null;
  return [
    address.street,
    address.number && `nº ${address.number}`,
    address.neighborhood,
    address.city && `${address.city}/${address.state ?? ""}`,
    address.zipCode && `CEP ${address.zipCode}`,
    address.complement && `Compl.: ${address.complement}`,
    address.reference && `Ref.: ${address.reference}`,
  ].filter(Boolean).join(" - ");
}

function orderSourceForProvider(provider: string) {
  if (provider === "99food" || provider === "ifood" || provider === "keeta") return provider;
  return "manual";
}

export async function findIntegrationForPayload(provider: string, normalized: NormalizedExternalOrder, token: string | null) {
  const supabase = createServiceClient();
  let query = supabase.from("integrations").select("*").eq("provider", provider);
  if (normalized.externalStoreId) query = query.or(`external_store_id.eq.${normalized.externalStoreId},credentials->>merchantId.eq.${normalized.externalStoreId},credentials->>externalStoreId.eq.${normalized.externalStoreId}`);
  let { data, error } = await query.limit(10);
  if (error) {
    const fallback = await supabase.from("integrations").select("*").eq("provider", provider).limit(50);
    data = (fallback.data ?? []).filter((item) => {
      const storeId = item.credentials.merchantId ?? item.credentials.externalStoreId ?? item.settings.externalStoreId;
      return !normalized.externalStoreId || storeId === normalized.externalStoreId;
    });
  }
  const candidates = data ?? [];
  if (token) {
    const byToken = candidates.find((item) => item.webhook_secret === token || item.credentials.webhookSecret === token || item.settings.webhookSecret === token);
    if (byToken) return byToken;
  }
  return candidates.find((item) => item.is_enabled || item.enabled) ?? candidates[0] ?? null;
}

export async function createOrderFromExternalPayload(normalized: NormalizedExternalOrder, integration: any) {
  const supabase = createServiceClient();
  const restaurantId = integration.restaurant_id;
  const phone = normalized.customer.phone ?? null;
  const { data: existingCustomer } = phone ?
     await supabase.from("customers").select("id").eq("restaurant_id", restaurantId).eq("phone", phone).maybeSingle()
    : { data: null };
  let customerId = existingCustomer?.id ?? null;
  if (!customerId) {
    const { data: customer } = await supabase.from("customers").insert({
      restaurant_id: restaurantId,
      name: normalized.customer.name,
      phone,
      whatsapp: phone,
      address: externalAddressToText(normalized),
    }).select("id").single();
    customerId = customer?.id ?? null;
  }

  const paymentMethod = ["cash", "credit_card", "debit_card", "pix", "online"].includes(normalized.payment.method) ? normalized.payment.method : "other";
  const orderPayload = {
    restaurant_id: restaurantId,
    customer_id: customerId,
    code: Math.random().toString(36).slice(2, 8).toUpperCase(),
    source: orderSourceForProvider(normalized.provider),
    type: normalized.delivery.type,
    status: "pending",
    payment_status: normalized.payment.status === "PAID" ? "paid" : "pending",
    payment_method: paymentMethod,
    subtotal: normalized.totals.subtotal,
    delivery_fee: normalized.totals.deliveryFee,
    discount: normalized.totals.discount,
    total: normalized.totals.total || normalized.totals.subtotal + normalized.totals.deliveryFee - normalized.totals.discount,
    customer_name: normalized.customer.name,
    customer_phone: phone,
    delivery_address: externalAddressToText(normalized),
    notes: normalized.notes ?? null,
    external_order_id: normalized.externalOrderId,
    external_platform: normalized.provider,
  };
  const { data: order, error } = await supabase.from("orders").insert(orderPayload).select("id").single();
  if (error) throw new Error(error.message);

  const { data: items, error: itemsError } = await supabase.from("order_items").insert(normalized.items.map((item) => ({
    restaurant_id: restaurantId,
    order_id: order.id,
    product_id: item.productId ?? null,
    product_name: item.name,
    quantity: item.quantity,
    unit_price: item.unitPrice,
    total_price: item.total,
    notes: item.notes ?? null,
    selected_options: { externalProductId: item.externalProductId, unmapped: !item.productId },
  }))).select("id");
  if (itemsError) throw new Error(itemsError.message);

  const addonRows = normalized.items.flatMap((item, index) => (item.addons ?? []).map((addon) => ({
    order_item_id: items?.[index]?.id,
    addon_id: null,
    name: addon.name,
    price: addon.price * addon.quantity,
  })).filter((addon) => addon.order_item_id));
  if (addonRows.length) await supabase.from("order_item_addons").insert(addonRows);

  const integrationOrder = await supabase.from("integration_orders").insert({
    restaurant_id: restaurantId,
    integration_id: integration.id,
    order_id: order.id,
    external_order_id: normalized.externalOrderId,
    external_code: normalized.externalCode ?? null,
    external_status: "RECEIVED",
    raw_payload: normalized.rawPayload,
    normalized_payload: normalized,
  });
  if (integrationOrder.error) {
    await logIntegrationEvent({
      restaurantId,
      integrationId: integration.id,
      provider: normalized.provider,
      direction: "INBOUND",
      eventType: "integration_order_record_fallback",
      externalId: normalized.externalOrderId,
      status: "warning",
      errorMessage: integrationOrder.error.message,
      requestPayload: normalized.rawPayload,
    });
  }

  return order.id as string;
}

export async function logIntegrationEvent(input: {
  restaurantId?: string | null;
  integrationId?: string | null;
  provider: string | null;
  eventType: string;
  status: string;
  direction: "INBOUND" | "OUTBOUND";
  externalId?: string | null;
  requestHeaders?: Record<string, unknown> | null;
  requestPayload?: unknown;
  responsePayload?: unknown;
  errorMessage?: string | null;
}) {
  const supabase = createServiceClient();
  const payload = {
    restaurant_id: input.restaurantId ?? null,
    integration_id: input.integrationId ?? null,
    provider: input.provider,
    event_type: input.eventType,
    status: input.status,
    message: input.errorMessage ?? null,
    payload: {
      direction: input.direction,
      externalId: input.externalId,
      requestHeaders: input.requestHeaders,
      requestPayload: input.requestPayload,
      responsePayload: input.responsePayload,
      errorMessage: input.errorMessage,
    },
    direction: input.direction,
    external_id: input.externalId ?? null,
    request_headers: input.requestHeaders ?? null,
    request_payload: input.requestPayload ?? null,
    response_payload: input.responsePayload ?? null,
    error_message: input.errorMessage ?? null,
  };
  const first = await supabase.from("integration_logs").insert(payload);
  if (!first.error) return;
  await supabase.from("integration_logs").insert({
    restaurant_id: input.restaurantId,
    integration_id: input.integrationId,
    provider: input.provider,
    event_type: input.eventType,
    status: input.status,
    message: input.errorMessage ?? input.status,
    payload: payload.payload,
  });
}

