import Link from "next/link";
import { Bike, Check, Clock3, Flame, PackageCheck, Printer, Trash2 } from "lucide-react";
import { deleteOrder, updateOrderStatus } from "@/app/actions";
import { requireRestaurant } from "@/lib/auth";
import { money, orderCode, statusLabel } from "@/lib/utils";
import type { Order, OrderStatus } from "@/lib/types";

type OperationColumn = {
  title: string;
  statuses: OrderStatus[];
  tone: string;
  icon: typeof Clock3;
  emptyIcon: typeof Clock3;
};

const operationColumns: OperationColumn[] = [
  {
    title: "Pendentes",
    statuses: ["pending", "accepted"],
    tone: "bg-rose-100 text-rose-700",
    icon: Clock3,
    emptyIcon: Clock3,
  },
  {
    title: "Em produção",
    statuses: ["preparing"],
    tone: "bg-amber-100 text-amber-700",
    icon: Flame,
    emptyIcon: Flame,
  },
  {
    title: "Pronto",
    statuses: ["ready"],
    tone: "bg-red-100 text-red-700",
    icon: Check,
    emptyIcon: Check,
  },
  {
    title: "Saiu p/ entrega",
    statuses: ["out_for_delivery"],
    tone: "bg-indigo-100 text-indigo-700",
    icon: Bike,
    emptyIcon: Bike,
  },
];

const nextStatuses: OrderStatus[] = ["accepted", "preparing", "ready", "out_for_delivery", "completed", "canceled"];
const historyStatuses: OrderStatus[] = ["completed", "canceled"];

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

function todayRange() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start: start.toISOString(), end: end.toISOString() };
}

function orderSource(order: Order) {
  return sourceLabel[order.external_platform ?? order.source] ?? order.source.toUpperCase();
}

function orderTime(order: Order) {
  return new Date(order.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function OrderCard({ order }: { order: Order }) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <Link href={`/pedidos/${order.id}`} className="text-base font-black text-slate-950 hover:text-[#E50914]">
          #{orderCode(order)}
        </Link>
        <strong className="whitespace-nowrap text-sm text-slate-950">{money(order.total)}</strong>
      </div>

      <p className="mt-1 truncate text-sm font-bold text-slate-800">{order.customer_name || "Cliente balcão"}</p>
      <p className="mt-0.5 text-xs font-semibold text-slate-500">
        {orderSource(order)} • {order.type} • {orderTime(order)}
      </p>
      {order.external_order_id && (
        <span className="mt-2 inline-flex rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-black text-red-700">
          Origem externa
        </span>
      )}

      <form action={updateOrderStatus} className="mt-3 grid grid-cols-[1fr_44px] gap-2">
        <input type="hidden" name="id" value={order.id} />
        <select
          name="status"
          className="h-10 min-w-0 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-900 outline-none transition focus:border-[#E50914] focus:ring-2 focus:ring-[#E50914]/15"
          defaultValue={order.status}
        >
          {nextStatuses.map((item) => (
            <option key={item} value={item}>{statusLabel[item]}</option>
          ))}
        </select>
        <button className="h-10 rounded-lg border border-slate-200 bg-slate-50 text-xs font-black text-slate-800 transition hover:border-[#E50914] hover:bg-red-50">
          OK
        </button>
      </form>
      <Link
        href={`/pedidos/${order.id}/print`}
        target="_blank"
        className="mt-2 inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white text-xs font-black text-slate-800 transition hover:border-[#E50914] hover:bg-red-50"
      >
        <Printer size={14} />
        Imprimir
      </Link>
      <Link
        href={`/pedidos/${order.id}/editar`}
        className="mt-2 inline-flex h-9 w-full items-center justify-center rounded-lg border border-slate-200 bg-white text-xs font-black text-slate-800 transition hover:border-[#E50914] hover:bg-red-50"
      >
        Editar
      </Link>
    </article>
  );
}

function HistoryRow({ order }: { order: Order }) {
  return (
    <div className="grid gap-3 border-t border-slate-100 px-4 py-3 text-sm md:grid-cols-[120px_minmax(220px,1fr)_140px_120px_110px] md:items-center">
      <Link href={`/pedidos/${order.id}`} className="font-black text-slate-950">#{orderCode(order)}</Link>
      <div>
        <p className="font-bold text-slate-800">{order.customer_name || "Cliente balcão"}</p>
        <p className="text-xs font-semibold text-slate-500">{orderSource(order)} • {order.type} • {orderTime(order)}</p>
      </div>
      <span className={order.status === "completed" ? "rounded-full bg-emerald-50 px-3 py-1 text-center text-xs font-black text-emerald-700" : "rounded-full bg-red-50 px-3 py-1 text-center text-xs font-black text-red-700"}>
        {statusLabel[order.status]}
      </span>
      <strong>{money(order.total)}</strong>
      <form action={deleteOrder} className="md:justify-self-end">
        <input type="hidden" name="id" value={order.id} />
        <button className="inline-flex h-9 items-center gap-2 rounded-lg border border-red-200 px-3 text-xs font-bold text-red-600 transition hover:bg-red-50">
          <Trash2 size={14} />
          Excluir
        </button>
      </form>
    </div>
  );
}

export default async function OrdersPage() {
  const { supabase, restaurant } = await requireRestaurant();
  const { start, end } = todayRange();

  const { data } = await supabase
    .from("orders")
    .select("*")
    .eq("restaurant_id", restaurant.id)
    .order("created_at", { ascending: false })
    .limit(120);

  const orders = (data ?? []) as Order[];
  const activeOrders = orders.filter((order) => !historyStatuses.includes(order.status));
  const todayHistory = orders.filter((order) => historyStatuses.includes(order.status) && order.created_at >= start && order.created_at < end);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div>
          <h2 className="text-xl font-black tracking-tight text-slate-950">Painel operacional</h2>
          <p className="text-sm text-slate-500">Pedidos ativos por etapa. Entregues ficam apenas no histórico do dia.</p>
        </div>
        <Link href="/pedidos/novo" className="rounded-xl bg-gradient-to-r from-[#232A31] to-[#E50914] px-5 py-3 text-sm font-black text-white shadow-lg shadow-red-500/15 transition hover:-translate-y-0.5">
          Novo pedido
        </Link>
      </div>

      <section className="grid gap-4 xl:grid-cols-4">
        {operationColumns.map((column) => {
          const Icon = column.icon;
          const EmptyIcon = column.emptyIcon;
          const columnOrders = activeOrders.filter((order) => column.statuses.includes(order.status));

          return (
            <div key={column.title} className="min-h-[420px] rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className={`flex items-center justify-between rounded-xl px-4 py-3 ${column.tone}`}>
                <div className="flex items-center gap-2">
                  <Icon size={18} />
                  <h3 className="text-sm font-black uppercase tracking-wide">{column.title}</h3>
                </div>
                <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-950">{columnOrders.length}</span>
              </div>

              <div className="mt-4 space-y-3">
                {columnOrders.map((order) => <OrderCard key={order.id} order={order} />)}
                {!columnOrders.length && (
                  <div className="flex min-h-[260px] flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 text-slate-400">
                    <EmptyIcon size={42} className="opacity-70" />
                    <p className="mt-3 text-sm font-semibold">Vazio</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between gap-3 bg-slate-50 px-4 py-3">
          <div>
            <h3 className="font-black text-slate-950">Histórico do dia</h3>
            <p className="text-xs font-semibold text-slate-500">Pedidos entregues ou cancelados hoje.</p>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-black text-slate-600">
            <PackageCheck size={14} />
            {todayHistory.length}
          </span>
        </div>
        <div>
          {todayHistory.map((order) => <HistoryRow key={order.id} order={order} />)}
          {!todayHistory.length && <p className="border-t border-slate-100 p-8 text-center text-sm font-semibold text-slate-500">Nenhum pedido no histórico de hoje.</p>}
        </div>
      </section>
    </div>
  );
}
