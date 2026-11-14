import { requireApiRestaurant } from "@/lib/api-helpers";
import { privateJson, uuid } from "@/lib/security";
import { paymentDetailNote } from "@/lib/payments";
import { createServiceClient } from "@/lib/supabase/service";
import { ifoodSchedule } from "@/lib/integrations/ifood/schedule";
import { displayPhone, money } from "@/lib/utils";
import type { Order, OrderItem } from "@/lib/types";

// Detalhe de um pedido para o Gestor de Pedidos: cliente, entrega, pagamento e
// itens já com as linhas de sabores/massa/borda/adicionais prontas para exibir.
type Option = { name?: string; price?: number | string | null } | null | undefined;
type Selected = { flavors?: string[]; dough?: Option; crust?: Option; noCrust?: boolean; addons?: Option[]; size?: Option };

function optionLine(label: string, option: Option) {
  if (!option?.name) return null;
  const price = Number(option.price ?? 0);
  return `${label}: ${option.name}${price > 0 ? ` (+ ${money(price)})` : ""}`;
}

function itemLines(value: OrderItem["selected_options"]) {
  const selected = (value && typeof value === "object" ? value : {}) as Selected;
  return [
    selected.flavors && selected.flavors.length > 1 ? `Sabores: ${selected.flavors.join(" / ")}` : null,
    optionLine("Massa", selected.dough),
    optionLine("Borda", selected.crust) ?? (selected.noCrust ? "Borda: sem borda" : null),
    ...(selected.addons ?? []).map((addon) => optionLine("Adicional", addon)),
  ].filter((line): line is string => Boolean(line));
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiRestaurant();
  if (auth.error) return auth.error;
  const { supabase, restaurant } = auth.context;
  let id: string;
  try {
    id = uuid((await params).id);
  } catch {
    return privateJson({ ok: false, error: "Pedido inválido." }, 400);
  }

  const [{ data: order }, { data: items }] = await Promise.all([
    supabase.from("orders").select("*").eq("restaurant_id", restaurant.id).eq("id", id).maybeSingle(),
    supabase.from("order_items").select("*").eq("restaurant_id", restaurant.id).eq("order_id", id).order("created_at", { ascending: true }),
  ]);
  if (!order) return privateJson({ ok: false, error: "Pedido não encontrado." }, 404);
  const current = order as Order;

  const { data: link } = current.external_platform === "ifood"
    ? await createServiceClient().from("integration_orders").select("raw_payload").eq("order_id", id).eq("restaurant_id", restaurant.id).limit(1).maybeSingle()
    : { data: null };
  const schedule = ifoodSchedule(link?.raw_payload);

  return privateJson({
    ok: true,
    order: {
      id: current.id,
      updatedAt: current.updated_at,
      phone: displayPhone(current.customer_phone),
      phoneDigits: (current.customer_phone ?? "").replace(/\D/g, ""),
      address: current.delivery_address,
      notes: current.notes,
      subtotal: Number(current.subtotal),
      deliveryFee: Number(current.delivery_fee),
      discount: Number(current.discount),
      total: Number(current.total),
      paymentMethod: current.payment_method,
      paymentStatus: current.payment_status,
      paymentNote: paymentDetailNote(current.payment_detail, current.type === "pickup"),
      changeFor: current.change_for == null ? null : Number(current.change_for),
      externalId: current.external_order_id,
      schedule: schedule ? { start: schedule.start.toISOString(), end: schedule.end.toISOString() } : null,
      items: ((items ?? []) as OrderItem[]).map((item) => ({
        id: item.id,
        name: item.product_name,
        quantity: Number(item.quantity),
        total: Number(item.total_price),
        notes: item.notes,
        lines: itemLines(item.selected_options),
      })),
    },
  });
}
