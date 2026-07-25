import Link from "next/link";
import { Bike, CheckCheck, Coffee, Filter, Maximize, MoreHorizontal, Search, Settings, ShoppingBag, SlidersHorizontal, Timer, UserRound } from "lucide-react";
import { requireRestaurant } from "@/lib/auth";
import { money, orderCode } from "@/lib/utils";
import type { Order, OrderStatus } from "@/lib/types";

const columns: Array<{
  title: string;
  statuses: OrderStatus[];
  icon: typeof Coffee;
  empty: string;
  action?: string;
}> = [
  {
    title: "Em preparo",
    statuses: ["pending", "accepted", "preparing"],
    icon: Coffee,
    empty: "Aproveite o momento de tranquilidade para aprender mais sobre os novos modos de gestão de pedidos",
    action: "Conhecer o Painel",
  },
  {
    title: "Pronto",
    statuses: ["ready"],
    icon: ShoppingBag,
    empty: "Aqui ficam os pedidos prontos para coleta",
  },
  {
    title: "Em rota",
    statuses: ["out_for_delivery"],
    icon: UserRound,
    empty: "Aqui ficam os pedidos que estão indo para o cliente",
  },
  {
    title: "Finalizados",
    statuses: ["completed", "canceled"],
    icon: CheckCheck,
    empty: "Aqui ficam os pedidos entregues e finalizados",
  },
];

function OrderCard({ order }: { order: Order }) {
  return (
    <Link href={`/pedidos/${order.id}`} className="block rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div>
          <strong>#{orderCode(order)}</strong>
          <p className="mt-1 text-sm text-slate-500">{order.customer_name || "Cliente"}</p>
        </div>
        <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-bold text-slate-600">{order.payment_method}</span>
      </div>
      <div className="mt-3 text-sm text-slate-500">
        <p>{order.delivery_address || "Endereço não informado"}</p>
        <p>{order.customer_phone}</p>
      </div>
      <div className="mt-4 flex items-center justify-between">
        <span className="text-xs font-bold uppercase text-slate-400">{new Date(order.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span>
        <strong>{money(order.total)}</strong>
      </div>
    </Link>
  );
}

export default async function DeliveryPage({ searchParams }: { searchParams: Promise<{ q: string }> }) {
  const { supabase, restaurant } = await requireRestaurant();
  const sp = await searchParams;
  const q = sp.q.trim().toLowerCase();
  const { data } = await supabase
    .from("orders")
    .select("*")
    .eq("restaurant_id", restaurant.id)
    .eq("type", "delivery")
    .order("created_at", { ascending: false })
    .limit(120);

  const orders = ((data ?? []) as Order[]).filter((order) => {
    if (!q) return true;
    return [
      orderCode(order),
      order.customer_name,
      order.customer_phone,
      order.delivery_address,
    ].some((value) => String(value ?? "").toLowerCase().includes(q));
  });

  return (
    <div className="fixed inset-x-0 bottom-0 top-[70px] overflow-hidden bg-white lg:left-[70px]">
      <div className="flex h-14 items-center justify-between gap-3 border-b border-slate-200 bg-white px-4">
        <form className="flex h-10 min-w-0 max-w-md flex-1 overflow-hidden rounded-lg border border-slate-200 bg-white">
          <label className="flex min-w-0 flex-1 items-center gap-2 px-3">
            <Search className="h-4 w-4 text-slate-500" />
            <input name="q" defaultValue={sp.q ?? ""} placeholder="Buscar" className="min-w-0 flex-1 bg-transparent text-sm outline-none" />
          </label>
          <button className="flex items-center gap-2 border-l border-slate-200 px-4 text-sm font-semibold">
            <SlidersHorizontal className="h-4 w-4" />
            Filtros
          </button>
        </form>

        <div className="hidden items-center gap-3 xl:flex">
          <button className="rounded-lg border border-red-200 px-4 py-2 text-sm font-bold text-slate-900">
            <Coffee className="mr-2 inline h-4 w-4" /> Confira as novidades
          </button>
          <Link href="/configuracoes" className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-bold">
            <Settings className="mr-2 inline h-4 w-4" /> Configurações
          </Link>
          <span className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-bold">
            <Timer className="mr-2 inline h-4 w-4" /> {restaurant.estimated_delivery_time ?? "70 min"}
          </span>
          <Link href="/pedidos" className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-bold">
            <Filter className="mr-2 inline h-4 w-4" /> Quadros
          </Link>
          <button className="rounded-lg border border-slate-200 p-2"><MoreHorizontal className="h-5 w-5" /></button>
          <button className="rounded-lg border border-slate-200 p-2"><Maximize className="h-5 w-5" /></button>
        </div>
      </div>

      <div className="grid h-[calc(100%-3.5rem)] gap-3 overflow-x-auto bg-white p-3 xl:grid-cols-4">
        {columns.map((column) => {
          const columnOrders = orders.filter((order) => column.statuses.includes(order.status));
          const Icon = column.icon;
          return (
            <section key={column.title} className="flex min-h-[620px] min-w-[300px] flex-col rounded-2xl bg-[#f4f4f5]">
              <header className="flex items-center gap-2 px-5 py-4 text-sm font-bold text-slate-700">
                <span>{column.title}</span>
                <span className="rounded-full bg-slate-600 px-2 py-0.5 text-xs text-white">{columnOrders.length}</span>
              </header>
              <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-4 pb-4">
                {columnOrders.map((order) => <OrderCard key={order.id} order={order} />)}
                {!columnOrders.length && (
                  <div className="grid flex-1 place-items-center px-8 text-center text-slate-400">
                    <div>
                      <Icon className="mx-auto mb-4 h-9 w-9" />
                      <p className="font-bold leading-snug">{column.empty}</p>
                      {column.action && <button className="mt-4 rounded-lg border border-slate-200 bg-white px-4 py-2 font-semibold text-slate-900">{column.action}</button>}
                    </div>
                  </div>
                )}
              </div>
            </section>
          );
        })}
      </div>

      <Link href="/pedidos/novo" className="fixed bottom-6 right-6 inline-flex items-center gap-2 rounded-full bg-[#E50914] px-5 py-3 font-bold text-white shadow-xl">
        <Bike className="h-5 w-5" />
        Nova entrega
      </Link>
    </div>
  );
}
