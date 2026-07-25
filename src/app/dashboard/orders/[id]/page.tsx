import { updateOrderStatus } from "@/app/actions";
import { requireRestaurant } from "@/lib/auth";
import { money, statusLabel } from "@/lib/utils";
import { StatusBadge } from "@/components/status-badge";
import { orderCode, whatsappLink } from "@/lib/utils";
import type { Order, OrderItem, OrderStatus } from "@/lib/types";

const flow: OrderStatus[] = ["accepted", "preparing", "ready", "out_for_delivery", "completed", "canceled"];
const sourceLabel: Record<string, string> = {
  "99food": "99Food",
  ifood: "iFood",
  keeta: "Keeta",
  whatsapp: "WhatsApp",
  webhook: "API",
  site: "Cardápio próprio",
  pdv: "PDV",
  manual: "Manual",
};

type DetailSelectedOptions = {
  flavors: string[];
  dough: { name: string; price: number | string | null } | null;
  crust: { name: string; price: number | string | null } | null;
  addons: Array<{ name: string; price: number | string | null }>;
};

function selectedOptions(value: OrderItem["selected_options"]): DetailSelectedOptions {
  if (!value || typeof value !== "object") return { flavors: [], dough: null, crust: null, addons: [] };
  return value as DetailSelectedOptions;
}

function optionLine(label: string, option: { name: string; price: number | string | null } | null) {
  if (!option?.name) return null;
  const price = Number(option.price ?? 0);
  return `${label}: ${option.name}${price > 0 ? ` + ${money(price)}` : ""}`;
}

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, restaurant } = await requireRestaurant();
  const [{ data: order }, { data: items }] = await Promise.all([
    supabase.from("orders").select("*").eq("restaurant_id", restaurant.id).eq("id", id).single(),
    supabase.from("order_items").select("*").eq("restaurant_id", restaurant.id).eq("order_id", id),
  ]);
  const current = order as Order;
  const message = `Olá ${current.customer_name || "cliente"}, seu pedido #${orderCode(current)} está com status: ${statusLabel[current.status]}. Total: ${money(current.total)}.`;
  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
      <section className="rounded-2xl bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-black">Pedido #{orderCode(current)}</h2>
            <p className="text-slate-500">{sourceLabel[current.external_platform ?? current.source] ?? current.source.toUpperCase()}  {current.type}</p>
            {current.external_order_id && <p className="mt-1 text-sm font-bold text-red-700">Pedido externo: {current.external_order_id}</p>}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <a className="rounded-xl bg-gradient-to-r from-[#232A31] to-[#E50914] px-4 py-2 text-sm font-black text-white shadow-lg shadow-red-500/15 transition hover:-translate-y-0.5" href={`/pedidos/${current.id}/editar`}>
              Editar pedido
            </a>
            <StatusBadge status={current.status} />
          </div>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-xl bg-slate-50 p-4"><strong>Cliente</strong><p>{current.customer_name}</p><p>{current.customer_phone}</p></div>
          <div className="rounded-xl bg-slate-50 p-4"><strong>Entrega</strong><p>{current.delivery_address || "Retirada/balcão/mesa"}</p></div>
          <div className="rounded-xl bg-slate-50 p-4"><strong>Pagamento</strong><p>{current.payment_method}  {current.payment_status}</p></div>
          <div className="rounded-xl bg-slate-50 p-4"><strong>Observações</strong><p>{current.notes || "Sem observações"}</p></div>
        </div>
        <h3 className="mt-6 font-black">Itens</h3>
        <div className="mt-3 space-y-3">
          {((items ?? []) as OrderItem[]).map((item) => {
            const selected = selectedOptions(item.selected_options);
            const lines = [
              selected.flavors && selected.flavors.length > 1 ? `Sabores: ${selected.flavors.join(" / ")}` : null,
              optionLine("Massa", selected.dough),
              optionLine("Borda", selected.crust),
              ...(selected.addons ?? []).map((addon) => optionLine("Adicional", addon)),
            ].filter(Boolean) as string[];
            return (
              <div key={item.id} className="rounded-xl border border-slate-100 p-4">
                <div className="flex justify-between gap-3">
                  <span>{item.quantity}x {item.product_name}</span>
                  <strong>{money(item.total_price)}</strong>
                </div>
                {!!lines.length && (
                  <div className="mt-2 space-y-1 text-sm font-semibold text-slate-500">
                    {lines.map((line) => <p key={line}>- {line}</p>)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
      <aside className="rounded-2xl bg-white p-5 shadow-sm">
        <h3 className="font-black">Ações</h3>
        <div className="mt-4 space-y-2">
          <a className="btn-muted w-full text-sm" href={`/pedidos/${current.id}/editar`}>Editar pedido</a>
          <a className="btn-primary w-full text-sm" href={whatsappLink(current.customer_phone, message)} target="_blank" rel="noreferrer">Enviar WhatsApp</a>
          <a className="btn-muted w-full text-sm" href={`/pedidos/${current.id}/print`} target="_blank">Imprimir pedido</a>
          {flow.map((status) => (
            <form key={status} action={updateOrderStatus}>
              <input type="hidden" name="id" value={current.id} />
              <input type="hidden" name="status" value={status} />
              <button className="btn-muted w-full text-sm">{statusLabel[status]}</button>
            </form>
          ))}
        </div>
        <div className="mt-6 rounded-xl bg-slate-50 p-4">
          <div className="flex justify-between"><span>Subtotal</span><strong>{money(current.subtotal)}</strong></div>
          <div className="flex justify-between"><span>Entrega</span><strong>{money(current.delivery_fee)}</strong></div>
          <div className="flex justify-between"><span>Desconto</span><strong>{money(current.discount)}</strong></div>
          <div className="mt-3 flex justify-between border-t pt-3 text-lg"><span>Total</span><strong>{money(current.total)}</strong></div>
        </div>
      </aside>
    </div>
  );
}
