import { notFound } from "next/navigation";
import { StatusBadge } from "@/components/status-badge";
import { createServiceClient } from "@/lib/supabase/service";
import { money, orderCode } from "@/lib/utils";
import type { Order, OrderItem } from "@/lib/types";

export default async function PublicOrderTrackingPage({ params }: { params: Promise<{ codigo: string }> }) {
  const { codigo } = await params;
  if (!/^[a-f0-9]{48}$/.test(codigo)) notFound();
  const supabase = createServiceClient();
  const { data: order } = await supabase
    .from("orders")
    .select("id,code,order_number,status,type,total")
    .eq("code", codigo)
    .maybeSingle();

  if (!order) {
    return <main className="grid min-h-screen place-items-center bg-[#FFF6E9] px-5 text-[#0F1720]"><div className="rounded-2xl bg-white p-8 shadow-sm">Pedido não encontrado.</div></main>;
  }

  const current = order as Order;
  const { data: items } = await supabase.from("order_items").select("id,product_name,quantity,total_price").eq("order_id", current.id);

  return (
    <main className="min-h-screen bg-[#FFF6E9] px-5 py-10 text-[#0F1720]">
      <section className="mx-auto max-w-3xl rounded-2xl bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-black">Pedido #{orderCode(current)}</h1>
            <p className="text-ink-faint">Acompanhe o status do seu pedido.</p>
          </div>
          <StatusBadge status={current.status} />
        </div>
        <div className="mt-6 grid gap-3 md:grid-cols-3">
          <div className="rounded-xl bg-[#faf9f6] p-4"><strong>Tipo</strong><p>{current.type}</p></div>
          <div className="rounded-xl bg-[#faf9f6] p-4"><strong>Total</strong><p>{money(current.total)}</p></div>
          <div className="rounded-xl bg-[#faf9f6] p-4"><strong>Previsao</strong><p>50 min</p></div>
        </div>
        <h2 className="mt-6 font-black">Itens</h2>
        <div className="mt-3 space-y-2">
          {((items ?? []) as OrderItem[]).map((item) => (
            <div key={item.id} className="flex justify-between rounded-xl border border-line-soft p-3">
              <span>{item.quantity}x {item.product_name}</span>
              <strong>{money(item.total_price)}</strong>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
