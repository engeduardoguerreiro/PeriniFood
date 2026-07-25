import { OrderPrintClient } from "@/components/order-print-client";
import { loyaltySummary, withLoyaltyCampaign } from "@/lib/loyalty";
import { createServiceClient } from "@/lib/supabase/service";
import { money, orderCode, statusLabel } from "@/lib/utils";
import type { Order, OrderItem } from "@/lib/types";
import Link from "next/link";

type PrintedOption = { name: string; price: number | string | null };
type PrintedSelectedOptions = {
  flavorCount: number;
  flavors: string[];
  dough: PrintedOption | null;
  crust: PrintedOption | null;
  addons: PrintedOption[];
};

type PrinterSettings = {
  enabled: boolean;
  method: string;
  printer_name: string | null;
  copies: number;
  auto_print: boolean;
  cut_paper?: boolean;
};

function selectedOptions(value: OrderItem["selected_options"]): PrintedSelectedOptions {
  if (!value || typeof value !== "object") return { flavorCount: 1, flavors: [], dough: null, crust: null, addons: [] };
  return value as PrintedSelectedOptions;
}

function optionLine(label: string, option: PrintedOption | null) {
  if (!option?.name) return null;
  const price = Number(option.price ?? 0);
  return `${label}: ${option.name}${price > 0 ? ` + ${money(price)}` : ""}`;
}

function cleanAddress(value: string | null) {
  if (!value) return "Retirada/balcão";
  const parts = value.split(" - ").map((part) => part.trim()).filter(Boolean);
  return [...new Set(parts)].join(" - ");
}

function typeLabel(type: Order["type"]) {
  return type === "delivery" ? "Delivery" : type === "pickup" ? "Retirada" : "Balcão";
}

function paymentLabel(method: Order["payment_method"]) {
  const labels: Record<string, string> = {
    cash: "Dinheiro",
    credit_card: "Cartão de crédito",
    debit_card: "Cartão de débito",
    pix: "Pix",
    online: "Online",
    other: "Outro",
  };
  return labels[method] ?? method;
}

function shortDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo" }).format(new Date(value));
}

function itemOptionLines(item: OrderItem) {
  const selected = selectedOptions(item.selected_options);
  const addons = (selected.addons ?? [])
    .filter((addon) => addon.name && addon.name !== selected.crust?.name && addon.name !== selected.dough?.name)
    .map((addon) => optionLine("Adicional", addon));

  return [
    selected.flavors && selected.flavors.length > 1 ? `Sabores: ${selected.flavors.join(" / ")}` : null,
    optionLine("Massa", selected.dough),
    optionLine("Borda", selected.crust),
    ...addons,
    item.notes ? `Obs.: ${item.notes}` : null,
  ].filter(Boolean) as string[];
}

function printableReceipt(order: Order, items: OrderItem[], restaurantName: string, loyaltyPoints: number, nextExpiry: string | null) {
  const lines = [
    restaurantName.toUpperCase(),
    "COMANDA DE PEDIDO",
    "==========================================",
    `Pedido #${orderCode(order)}`,
    `${new Date(order.created_at).toLocaleString("pt-BR")} - ${statusLabel[order.status]}`,
    "------------------------------------------",
    `Cliente: ${order.customer_name || "Cliente balcao"}`,
    `Telefone: ${order.customer_phone || "-"}`,
    `Pontos de Fidelidade: ${loyaltyPoints}`,
    nextExpiry ? `Próximo vencimento: ${shortDate(nextExpiry)}` : null,
    `Endereço: ${cleanAddress(order.delivery_address)}`,
    `Tipo: ${typeLabel(order.type)}`,
    "------------------------------------------",
    "Itens",
  ].filter(Boolean) as string[];

  items.forEach((item) => {
    lines.push(`${item.quantity}x ${item.product_name}`);
    itemOptionLines(item).forEach((line) => lines.push(` - ${line}`));
    lines.push(`  ${money(item.total_price)}`);
  });

  lines.push(
    "------------------------------------------",
    `Subtotal: ${money(order.subtotal)}`,
    `Entrega: ${money(order.delivery_fee)}`,
    `Desconto: ${money(order.discount)}`,
    `TOTAL: ${money(order.total)}`,
    `Pagamento: ${paymentLabel(order.payment_method)}`,
    `Observações: ${order.notes || "Sem observações"}`,
    "==========================================",
    "",
    "",
  );

  return lines.join("\n");
}

export default async function PrintOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createServiceClient();
  const [{ data: order }, { data: items }] = await Promise.all([
    supabase.from("orders").select("*").eq("id", id).single(),
    supabase.from("order_items").select("*").eq("order_id", id),
  ]);

  const current = order as Order;
  const orderItems = (items ?? []) as OrderItem[];
  const [{ data: restaurant }, { data: customerById }, { data: customerByPhone }, { data: loyalty }] = await Promise.all([
    supabase.from("restaurants").select("name, opening_hours").eq("id", current.restaurant_id).maybeSingle(),
    current.customer_id
      ? supabase.from("customers").select("id").eq("restaurant_id", current.restaurant_id).eq("id", current.customer_id).maybeSingle()
      : Promise.resolve({ data: null }),
    !current.customer_id && current.customer_phone
      ? supabase.from("customers").select("id").eq("restaurant_id", current.restaurant_id).eq("phone", current.customer_phone).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase.from("loyalty_programs").select("*").eq("restaurant_id", current.restaurant_id).maybeSingle(),
  ]);
  const customerId = customerById?.id ?? customerByPhone?.id ?? null;
  const [{ data: loyaltyOrdersByCustomer }, { data: loyaltyOrdersByPhone }] = await Promise.all([
    customerId
      ? supabase
        .from("orders")
        .select("id, order_number, code, total, status, payment_status, created_at")
        .eq("restaurant_id", current.restaurant_id)
        .eq("customer_id", customerId)
      : Promise.resolve({ data: [] }),
    current.customer_phone
      ? supabase
        .from("orders")
        .select("id, order_number, code, total, status, payment_status, created_at")
        .eq("restaurant_id", current.restaurant_id)
        .eq("customer_phone", current.customer_phone)
      : Promise.resolve({ data: [] }),
  ]);
  const loyaltyOrders = [...new Map([...(loyaltyOrdersByCustomer ?? []), ...(loyaltyOrdersByPhone ?? [])].map((item) => [item.id, item])).values()];
  const loyaltyInfo = loyaltySummary(withLoyaltyCampaign(loyalty, restaurant?.opening_hours as Record<string, unknown> | null), loyaltyOrders);
  const loyaltyPoints = loyaltyInfo.points;
  const nextLoyaltyExpiry = loyaltyInfo.expiringBatches[0]?.expiresAt ?? null;
  const printerSettings = (((restaurant?.opening_hours as Record<string, unknown> | null) ?? {})._printer_settings ?? {}) as PrinterSettings;
  const receiptText = printableReceipt(current, orderItems, restaurant?.name ?? "PeriniFood", loyaltyPoints, nextLoyaltyExpiry);

  return (
    <main className="min-h-screen bg-slate-100 py-6 print:bg-white print:py-0">
      <style>{`
        @page { size: 80mm auto; margin: 3mm; }
        @media print {
          html, body { width: 80mm; background: #fff !important; }
          .thermal-receipt { width: 74mm !important; padding: 0 !important; box-shadow: none !important; border: 0 !important; color: #000 !important; font-size: 14px !important; }
          .thermal-receipt * { color: #000 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>
      <nav className="mx-auto mb-4 flex w-[80mm] max-w-full flex-wrap gap-2 print:hidden" aria-label="Navegação da impressão">
        <Link href={`/pedidos/${current.id}`} className="rounded-lg bg-[#232A31] px-3 py-2 text-xs font-black text-white shadow-sm transition hover:-translate-y-0.5">
          Voltar ao pedido
        </Link>
        <Link href="/pedidos" className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-800 shadow-sm transition hover:-translate-y-0.5">
          Voltar para pedidos
        </Link>
      </nav>
      <section className="thermal-receipt mx-auto w-[80mm] max-w-full bg-white p-4 text-[15px] font-medium leading-snug text-black shadow-2xl print:mx-0">
        <OrderPrintClient content={receiptText} settings={printerSettings} />

        <header className="border-b-2 border-black pb-3 text-center">
          <p className="text-base font-black uppercase">{restaurant?.name ?? "PeriniFood"}</p>
          <p className="mt-1 bg-black px-2 py-1 text-sm font-black uppercase text-white">Comanda de pedido</p>
        </header>

        <section className="border-b border-black py-3">
          <h1 className="text-2xl font-black">Pedido #{orderCode(current)}</h1>
          <p className="mt-1 text-sm">{new Date(current.created_at).toLocaleString("pt-BR")} - {statusLabel[current.status]}</p>
        </section>

        <section className="space-y-1 border-b border-black py-3">
          <p><strong>Cliente:</strong> {current.customer_name || "Cliente balcão"}</p>
          <p><strong>Telefone:</strong> {current.customer_phone || "-"}</p>
          <p><strong>Pontos de Fidelidade:</strong> {loyaltyPoints}</p>
          {nextLoyaltyExpiry && <p><strong>Próximo vencimento:</strong> {shortDate(nextLoyaltyExpiry)}</p>}
          <p><strong>Endereço:</strong> {cleanAddress(current.delivery_address)}</p>
          <p><strong>Tipo:</strong> {typeLabel(current.type)}</p>
        </section>

        <section className="border-b border-black py-3">
          <h2 className="text-base font-black">Itens</h2>
          <div className="mt-2 space-y-2">
            {orderItems.map((item) => (
              <div key={item.id} className="border-b border-dashed border-black/50 pb-2 last:border-0">
                <div className="flex justify-between gap-4">
                  <span className="font-bold">{item.quantity}x {item.product_name}</span>
                  <strong>{money(item.total_price)}</strong>
                </div>
                <div className="mt-1 space-y-0.5 pl-3 text-sm">
                  {itemOptionLines(item).map((line) => <p key={line}>- {line}</p>)}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-1 py-3">
          <div className="flex justify-between"><span>Subtotal</span><strong>{money(current.subtotal)}</strong></div>
          <div className="flex justify-between"><span>Entrega</span><strong>{money(current.delivery_fee)}</strong></div>
          <div className="flex justify-between"><span>Desconto</span><strong>{money(current.discount)}</strong></div>
          <div className="flex justify-between text-xl"><span>Total</span><strong>{money(current.total)}</strong></div>
          <p><strong>Pagamento:</strong> {paymentLabel(current.payment_method)}</p>
          <p><strong>Observações:</strong> {current.notes || "Sem observações"}</p>
        </section>
      </section>
    </main>
  );
}
