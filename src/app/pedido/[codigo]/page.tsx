/* eslint-disable @next/next/no-img-element */
import { notFound } from "next/navigation";
import { MessageCircle } from "lucide-react";
import { CustomerTracking } from "@/components/tracking/customer-tracking";
import { createServiceClient } from "@/lib/supabase/service";
import { money, orderCode, whatsappLink } from "@/lib/utils";
import type { Order, OrderItem } from "@/lib/types";

export const metadata = { title: "Acompanhe seu pedido", robots: { index: false, follow: false } };

export default async function PublicOrderTrackingPage({ params }: { params: Promise<{ codigo: string }> }) {
  const { codigo } = await params;
  if (!/^[a-f0-9]{48}$/.test(codigo)) notFound();
  const supabase = createServiceClient();
  const { data: order } = await supabase
    .from("orders")
    .select("id,code,order_number,status,type,total,subtotal,delivery_fee,restaurant_id")
    .eq("code", codigo)
    .maybeSingle();
  if (!order) notFound();

  const current = order as Order;
  const [{ data: items }, { data: restaurant }] = await Promise.all([
    supabase.from("order_items").select("id,product_name,quantity,total_price").eq("order_id", current.id),
    supabase.from("restaurants").select("name, logo_url, whatsapp, phone, estimated_delivery_time, slug").eq("id", current.restaurant_id).maybeSingle(),
  ]);
  const contact = restaurant?.whatsapp || restaurant?.phone;

  return (
    <main className="min-h-screen bg-[#f6f5f2] px-4 py-6 text-ink">
      <div className="mx-auto max-w-3xl space-y-4">
        <header className="flex items-center gap-3">
          <span className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-full border-2 border-white bg-white shadow">
            {restaurant?.logo_url ? <img src={restaurant.logo_url} alt="" className="h-full w-full object-contain" /> : <span className="font-black">{restaurant?.name?.slice(0, 2)}</span>}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-500">{restaurant?.name}</p>
            <h1 className="text-2xl font-black leading-tight">Pedido #{orderCode(current)}</h1>
          </div>
        </header>

        <CustomerTracking code={codigo} initialStatus={current.status} delivery={current.type === "delivery"} />

        <section className="rounded-2xl bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="font-black">Itens do pedido</h2>
            {current.type === "delivery" && restaurant?.estimated_delivery_time && <span className="text-sm text-slate-500">Previsão: {restaurant.estimated_delivery_time}</span>}
          </div>
          <ul className="mt-3 divide-y divide-slate-100">
            {((items ?? []) as OrderItem[]).map((item) => (
              <li key={item.id} className="flex justify-between gap-3 py-2 text-sm">
                <span>{item.quantity}x {item.product_name}</span>
                <strong>{money(item.total_price)}</strong>
              </li>
            ))}
          </ul>
          <div className="mt-2 space-y-1 border-t border-slate-100 pt-3 text-sm">
            {Number(current.delivery_fee) > 0 && <p className="flex justify-between text-slate-600"><span>Entrega</span><span>{money(current.delivery_fee)}</span></p>}
            <p className="flex justify-between text-base font-black"><span>Total</span><span>{money(current.total)}</span></p>
          </div>
        </section>

        {contact && (
          <a href={whatsappLink(contact, `Olá! Tenho uma dúvida sobre o pedido #${orderCode(current)}.`)} target="_blank" rel="noreferrer" className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-emerald-500 font-bold text-white shadow-[0_10px_24px_-10px_rgba(16,185,129,0.8)]">
            <MessageCircle className="h-5 w-5" /> Falar com a loja
          </a>
        )}
      </div>
    </main>
  );
}
