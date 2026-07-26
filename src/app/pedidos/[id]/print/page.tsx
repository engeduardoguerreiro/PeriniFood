/* eslint-disable @next/next/no-img-element */
import { OrderPrintClient } from "@/components/order-print-client";
import { BrowserAutoPrint } from "@/components/browser-auto-print";
import { loyaltySummary, withLoyaltyCampaign } from "@/lib/loyalty";
import { createServiceClient } from "@/lib/supabase/service";
import { money, orderCode, statusLabel } from "@/lib/utils";
import type { Order, OrderItem } from "@/lib/types";
import Link from "next/link";
import { ClipboardList, Pizza } from "lucide-react";
import { readFile } from "fs/promises";
import path from "path";

async function toDataUri(url: string): Promise<string> {
  try {
    if (/^https?:\/\//.test(url)) {
      const res = await fetch(url, { cache: "force-cache" });
      if (!res.ok) return "";
      const buffer = Buffer.from(await res.arrayBuffer());
      const type = res.headers.get("content-type") || "image/png";
      return `data:${type};base64,${buffer.toString("base64")}`;
    }
    const buffer = await readFile(path.join(process.cwd(), "public", url.replace(/^\//, "")));
    return `data:image/png;base64,${buffer.toString("base64")}`;
  } catch {
    return "";
  }
}

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

function printableReceipt(order: Order, items: OrderItem[], restaurantName: string, loyaltyPoints: number, nextExpiry: string | null, footerMessage: string) {
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
    footerMessage,
    "Volte sempre!",
    "",
    "",
  );

  return lines.join("\n");
}

export default async function PrintOrderPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ auto?: string }> }) {
  const { id } = await params;
  const auto = (await searchParams)?.auto === "1";
  const supabase = createServiceClient();
  const [{ data: order }, { data: items }] = await Promise.all([
    supabase.from("orders").select("*").eq("id", id).single(),
    supabase.from("order_items").select("*").eq("order_id", id),
  ]);

  const current = order as Order;
  const orderItems = (items ?? []) as OrderItem[];
  const [{ data: restaurant }, { data: customerById }, { data: customerByPhone }, { data: loyalty }] = await Promise.all([
    supabase.from("restaurants").select("name, opening_hours, logo_url, cnpj, menu_footer_message").eq("id", current.restaurant_id).maybeSingle(),
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
  const footerMessage = (restaurant?.menu_footer_message || "").trim() || "Agradecemos a sua preferência!";
  const logoUrl = restaurant?.logo_url || "/brand/perinifood-logo.png";
  const logoDataUri = (await toDataUri(logoUrl)) || logoUrl;
  const cnpj = restaurant?.cnpj || "";
  const receiptText = printableReceipt(current, orderItems, restaurant?.name ?? "PeriniFood", loyaltyPoints, nextLoyaltyExpiry, footerMessage);

  const comanda = (
    <section id="pf-comanda" className="thermal-receipt mx-auto w-[80mm] max-w-full bg-white p-3 text-[13px] font-medium leading-snug text-black">
      <div className="flex justify-center">
        <img src={logoDataUri} alt="" className="h-60 w-auto object-contain" />
      </div>
      <div className="text-center -mt-12">
        <p className="text-base font-black uppercase leading-tight">{restaurant?.name ?? "PeriniFood"}</p>
        {cnpj && <p className="text-[12px]">CNPJ: {cnpj}</p>}
      </div>

      <div className="my-2 border-t border-dashed border-black" />

      <div className="flex items-center justify-between border-y-2 border-black py-1.5">
        <span className="flex items-center gap-1.5 text-[14px] font-black uppercase"><ClipboardList className="h-4 w-4" /> Comanda</span>
        <span className="text-[15px] font-black">#{orderCode(current)}</span>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-1.5 py-1.5 text-[12px] font-semibold">
        <span>{new Date(current.created_at).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}</span>
        <span>·</span>
        <span>{new Date(current.created_at).toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" })}</span>
        <span>·</span>
        <span className="uppercase">{statusLabel[current.status]}</span>
      </div>

      <div className="border-t border-black" />

      <div className="space-y-0.5 py-2 text-[13px]">
        <p><strong>Cliente:</strong> {current.customer_name || "Cliente balcão"}</p>
        <p><strong>Telefone:</strong> {current.customer_phone || "-"}</p>
        <p><strong>Fidelidade:</strong> {loyaltyPoints} pts{nextLoyaltyExpiry ? ` · vence ${shortDate(nextLoyaltyExpiry)}` : ""}</p>
        <p><strong>Endereço:</strong> {cleanAddress(current.delivery_address)}</p>
        <p><strong>Tipo:</strong> {typeLabel(current.type)}</p>
      </div>

      <div className="border-t border-black" />

      <p className="flex items-center gap-1.5 py-1.5 text-[14px] font-black uppercase"><Pizza className="h-4 w-4" /> Itens</p>
      <div className="space-y-1">
        {orderItems.map((item) => (
          <div key={item.id} className="border-b border-dashed border-black/40 pb-1.5 last:border-0">
            <div className="flex justify-between gap-2 font-bold">
              <span className="uppercase">{item.quantity}x {item.product_name}</span>
              <span>{money(item.total_price)}</span>
            </div>
            {itemOptionLines(item).map((line) => <p key={line} className="pl-3 text-[12px]">- {line}</p>)}
          </div>
        ))}
      </div>

      <div className="space-y-0.5 py-1.5 text-[13px]">
        <div className="flex justify-between"><span>Subtotal</span><strong>{money(current.subtotal)}</strong></div>
        <div className="flex justify-between"><span>Entrega</span><strong>{money(current.delivery_fee)}</strong></div>
        <div className="flex justify-between"><span>Desconto</span><strong>{money(current.discount)}</strong></div>
      </div>

      <div className="flex items-center justify-between border-2 border-black px-2 py-1.5">
        <span className="text-[15px] font-black uppercase">Total</span>
        <strong className="text-[17px]">{money(current.total)}</strong>
      </div>

      <div className="space-y-0.5 py-2 text-[13px]">
        <p><strong>Pagamento:</strong> {paymentLabel(current.payment_method)}</p>
        <p><strong>Obs.:</strong> {current.notes || "Sem observações"}</p>
      </div>

      <div className="border-t border-dashed border-black" />

      <div className="pt-2 text-center">
        <p className="text-[15px] italic" style={{ fontFamily: '"Segoe Script","Brush Script MT",cursive' }}>{footerMessage}</p>
        <p className="mt-0.5 text-[12px] font-black uppercase">Volte sempre!</p>
      </div>
    </section>
  );

  const printStyles = `
    @page { size: 80mm auto; margin: 2mm; }
    @media print {
      html, body { width: 80mm; background: #fff !important; }
      .print-hide { display: none !important; }
      .thermal-receipt { width: 76mm !important; box-shadow: none !important; }
      .thermal-receipt * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  `;

  // Método "Navegador": imprime direto pelo Chrome (silencioso com --kiosk-printing)
  // e volta para os pedidos. Não depende de agente local nem de .exe instalado.
  if (auto && printerSettings.method === "browser") {
    return (
      <main className="min-h-screen bg-white print:bg-white">
        <style>{printStyles}</style>
        <BrowserAutoPrint />
        <div className="mx-auto w-[80mm] max-w-full">{comanda}</div>
      </main>
    );
  }

  if (auto) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#f7f6f3] p-6">
        <div className="w-full max-w-sm rounded-2xl border border-[#e7e4dd] bg-white p-6 shadow-sm">
          <OrderPrintClient content={receiptText} settings={printerSettings} auto />
        </div>
        <div className="pointer-events-none fixed left-[-9999px] top-0" aria-hidden="true">{comanda}</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f1efea] py-6 print:bg-white print:py-0">
      <style>{printStyles}</style>
      <nav className="print-hide mx-auto mb-4 flex w-[80mm] max-w-full flex-wrap gap-2" aria-label="Navegação da impressão">
        <Link href={`/pedidos/${current.id}`} className="rounded-lg bg-[#211d19] px-3 py-2 text-xs font-black text-white shadow-sm transition hover:-translate-y-0.5">
          Voltar ao pedido
        </Link>
        <Link href="/pedidos" className="rounded-lg border border-[#e7e4dd] bg-white px-3 py-2 text-xs font-black text-[#2b2925] shadow-sm transition hover:-translate-y-0.5">
          Voltar para pedidos
        </Link>
      </nav>
      <div className="print-hide mx-auto mb-4 w-[80mm] max-w-full">
        <OrderPrintClient content={receiptText} settings={printerSettings} />
      </div>
      <div className="mx-auto w-[80mm] max-w-full overflow-hidden rounded-xl bg-white shadow-2xl print:rounded-none print:shadow-none">
        {comanda}
      </div>
    </main>
  );
}
