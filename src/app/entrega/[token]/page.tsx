import { MapPin, MessageSquareText, Package, Phone, Wallet } from "lucide-react";
import { CourierApp } from "@/components/tracking/courier-app";
import { trackingByToken, trackingState } from "@/lib/delivery-tracking";
import { createServiceClient } from "@/lib/supabase/service";
import { money, orderCode } from "@/lib/utils";
import type { Order } from "@/lib/types";

export const metadata = { title: "Entrega · PeriniFood", robots: { index: false, follow: false } };

const paymentLabel: Record<string, string> = { cash: "Dinheiro", pix: "Pix", credit_card: "Cartão de crédito", debit_card: "Cartão de débito", online: "Pago online", other: "Outro" };

function Shell({ children }: { children: React.ReactNode }) {
  return <main className="min-h-screen bg-[#f6f5f2] px-4 py-5 text-ink"><div className="mx-auto max-w-md space-y-4">{children}</div></main>;
}

// Página do motoboy (link por pedido, sem login). Mostra só o necessário para a
// entrega e controla o envio da localização.
export default async function CourierPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const row = await trackingByToken(token);
  if (!row) {
    return <Shell><div className="rounded-2xl bg-white p-6 text-center shadow-sm"><p className="text-lg font-black">Link de entrega inválido</p><p className="mt-1 text-sm text-slate-600">Este link não existe ou foi substituído por um novo. Peça o link atualizado para a loja.</p></div></Shell>;
  }
  const service = createServiceClient();
  const [{ data: order }, { data: restaurant }, { count: items }] = await Promise.all([
    service.from("orders").select("id, code, order_number, status, customer_name, customer_phone, delivery_address, notes, total, payment_method, payment_status, change_for, external_platform").eq("id", row.order_id).maybeSingle(),
    service.from("restaurants").select("name, phone, whatsapp").eq("id", row.restaurant_id).maybeSingle(),
    service.from("order_items").select("id", { count: "exact", head: true }).eq("order_id", row.order_id),
  ]);
  const current = order as (Order & { change_for?: number | null }) | null;
  const state = trackingState(row);
  if (!current || current.status === "canceled" || state === "expired") {
    return <Shell><div className="rounded-2xl bg-white p-6 text-center shadow-sm"><p className="text-lg font-black">{current?.status === "canceled" ? "Pedido cancelado" : "Link expirado"}</p><p className="mt-1 text-sm text-slate-600">Fale com a loja {restaurant?.name ?? ""} para mais informações.</p></div></Shell>;
  }

  const destination = row.dest_lat !== null && row.dest_lng !== null ? `${row.dest_lat},${row.dest_lng}` : current.delivery_address ?? "";
  const toCollect = current.payment_status !== "paid" && current.payment_method !== "online";

  return (
    <Shell>
      <header className="rounded-2xl bg-ink p-4 text-white shadow-lg">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/60">Entrega · {restaurant?.name}</p>
        <p className="mt-1 text-2xl font-black">Pedido #{orderCode(current)}</p>
        {row.courier_name && <p className="text-sm text-white/70">Motoboy: {row.courier_name}</p>}
      </header>

      <section className="space-y-3 rounded-2xl bg-white p-4 shadow-sm">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Cliente</p>
          <p className="text-lg font-bold">{current.customer_name || "Cliente"}</p>
          {current.customer_phone && <a href={`tel:${current.customer_phone.replace(/\D/g, "")}`} className="mt-1 inline-flex items-center gap-1.5 text-sm font-semibold text-brand"><Phone className="h-4 w-4" /> {current.customer_phone}</a>}
        </div>
        <div className="flex gap-2 border-t border-slate-100 pt-3">
          <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-brand" />
          <p className="text-sm font-medium">{current.delivery_address || "Endereço não informado"}</p>
        </div>
        {destination && (
          <div className="grid grid-cols-2 gap-2">
            <a href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}&travelmode=driving`} target="_blank" rel="noreferrer" className="flex h-11 items-center justify-center rounded-xl border border-slate-200 text-sm font-bold">Google Maps</a>
            <a href={`https://waze.com/ul?${row.dest_lat !== null ? `ll=${encodeURIComponent(destination)}` : `q=${encodeURIComponent(destination)}`}&navigate=yes`} target="_blank" rel="noreferrer" className="flex h-11 items-center justify-center rounded-xl border border-slate-200 text-sm font-bold">Waze</a>
          </div>
        )}
        <div className="grid grid-cols-2 gap-2 border-t border-slate-100 pt-3 text-sm">
          <p className="flex items-center gap-1.5"><Package className="h-4 w-4 text-slate-500" /> {items ?? 0} {items === 1 ? "item" : "itens"}</p>
          <p className="flex items-center gap-1.5"><Wallet className="h-4 w-4 text-slate-500" /> {paymentLabel[current.payment_method] ?? current.payment_method}</p>
        </div>
        {toCollect ? (
          <p className="rounded-xl bg-amber-50 p-3 text-sm font-bold text-amber-900">
            Cobrar do cliente: {money(current.total)}{current.payment_method === "cash" && current.change_for ? ` · troco para ${money(current.change_for)}` : ""}
          </p>
        ) : (
          <p className="rounded-xl bg-emerald-50 p-3 text-sm font-bold text-emerald-800">Pedido já pago · não cobrar</p>
        )}
        {current.notes && <p className="flex gap-2 rounded-xl bg-slate-50 p-3 text-sm"><MessageSquareText className="h-4 w-4 shrink-0 text-slate-500" /> {current.notes}</p>}
      </section>

      <CourierApp token={token} started={Boolean(row.started_at)} delivered={state === "delivered"} codeRequired={Boolean(row.delivery_code) && current.external_platform !== "ifood"} />
    </Shell>
  );
}
