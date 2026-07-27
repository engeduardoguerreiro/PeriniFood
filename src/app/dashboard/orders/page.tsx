import Link from "next/link";
import { Bike, Check, Clock3, Flame, PackageCheck, Pencil, Printer, Trash2, X } from "lucide-react";
import { deleteOrder, updateOrderStatus } from "@/app/actions";
import { requireRestaurant } from "@/lib/auth";
import { money, orderCode, statusLabel } from "@/lib/utils";
import { Suspense } from "react";
import { PrintToast } from "@/components/print-toast";
import { OrdersAutoRefresh } from "@/components/orders-auto-refresh";
import type { Order, OrderStatus } from "@/lib/types";

type OperationColumn = {
  title: string;
  statuses: OrderStatus[];
  tone: string;
  icon: typeof Clock3;
};

const operationColumns: OperationColumn[] = [
  { title: "Pendentes", statuses: ["pending", "accepted"], tone: "bg-rose-100 text-rose-700", icon: Clock3 },
  { title: "Em produção", statuses: ["preparing"], tone: "bg-amber-100 text-amber-700", icon: Flame },
  { title: "Pronto", statuses: ["ready"], tone: "bg-emerald-100 text-emerald-700", icon: Check },
  { title: "Saiu p/ entrega", statuses: ["out_for_delivery"], tone: "bg-indigo-100 text-indigo-700", icon: Bike },
];

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

const typeLabel: Record<Order["type"], string> = {
  dine_in: "Mesa",
  delivery: "Entrega",
  pickup: "Retirada",
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

// Próxima etapa lógica do pedido — vira o botão primário de cada card.
function nextStep(order: Order): { status: OrderStatus; label: string } | null {
  switch (order.status) {
    case "pending":
    case "accepted":
      return { status: "preparing", label: "Preparar" };
    case "preparing":
      return { status: "ready", label: "Pronto" };
    case "ready":
      return order.type === "delivery"
        ? { status: "out_for_delivery", label: "Saiu" }
        : { status: "completed", label: "Concluir" };
    case "out_for_delivery":
      return { status: "completed", label: "Concluir" };
    default:
      return null;
  }
}

const iconBtn =
  "grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-[#e7e4dd] bg-white text-[#6d6a63] transition hover:border-[#c5362e] hover:text-[#c5362e]";

function OrderCard({ order }: { order: Order }) {
  const step = nextStep(order);
  return (
    <article className="rounded-xl border border-[#e7e4dd] bg-white p-3 transition hover:border-[#dcd8cf] hover:shadow-[0_1px_2px_rgba(27,26,23,0.05)]">
      <div className="flex items-center justify-between gap-2">
        <Link href={`/pedidos/${order.id}`} className="text-sm font-semibold text-[#1b1a17] transition hover:text-[#c5362e]">
          #{orderCode(order)}
        </Link>
        <strong className="text-sm font-semibold text-[#1b1a17] [font-variant-numeric:tabular-nums]">{money(order.total)}</strong>
      </div>

      <p className="mt-1 truncate text-sm text-[#2b2925]">{order.customer_name || "Cliente balcão"}</p>
      <p className="mt-0.5 text-[0.7rem] font-medium uppercase tracking-wide text-[#b0aaa0]">
        {orderSource(order)} • {typeLabel[order.type]} • {orderTime(order)}
      </p>

      <div className="mt-3 flex items-center gap-1.5">
        {step && (
          <form action={updateOrderStatus} className="flex-1">
            <input type="hidden" name="id" value={order.id} />
            <input type="hidden" name="status" value={step.status} />
            <button className="flex h-9 w-full items-center justify-center rounded-lg bg-[#211d19] px-2 text-xs font-medium text-white transition hover:bg-[#37312a]">
              {step.label}
            </button>
          </form>
        )}
        <Link href={`/pedidos/${order.id}/print`} target="_blank" aria-label="Imprimir" className={iconBtn}>
          <Printer size={15} />
        </Link>
        <Link href={`/pedidos/${order.id}/editar`} aria-label="Editar" className={iconBtn}>
          <Pencil size={15} />
        </Link>
        <form action={updateOrderStatus}>
          <input type="hidden" name="id" value={order.id} />
          <input type="hidden" name="status" value="canceled" />
          <button aria-label="Cancelar" className={iconBtn}>
            <X size={15} />
          </button>
        </form>
      </div>
    </article>
  );
}

function HistoryRow({ order }: { order: Order }) {
  return (
    <div className="grid gap-3 border-t border-[#efece6] px-4 py-3 text-sm md:grid-cols-[100px_minmax(200px,1fr)_130px_110px_100px] md:items-center">
      <Link href={`/pedidos/${order.id}`} className="font-semibold text-[#1b1a17] transition hover:text-[#c5362e]">#{orderCode(order)}</Link>
      <div className="min-w-0">
        <p className="truncate font-medium text-[#2b2925]">{order.customer_name || "Cliente balcão"}</p>
        <p className="text-[0.7rem] font-medium uppercase tracking-wide text-[#b0aaa0]">{orderSource(order)} • {typeLabel[order.type]} • {orderTime(order)}</p>
      </div>
      <span className={order.status === "completed" ? "justify-self-start rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700" : "justify-self-start rounded-full bg-[#f6ece9] px-2.5 py-0.5 text-xs font-medium text-[#c5362e]"}>
        {statusLabel[order.status]}
      </span>
      <strong className="font-semibold text-[#1b1a17] [font-variant-numeric:tabular-nums]">{money(order.total)}</strong>
      <form action={deleteOrder} className="md:justify-self-end">
        <input type="hidden" name="id" value={order.id} />
        <button className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[#eeccc7] px-2.5 text-xs font-medium text-[#c5362e] transition hover:bg-[#f6ece9]">
          <Trash2 size={13} />
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
    <div className="space-y-6">
      <Suspense fallback={null}><PrintToast /></Suspense>
      <OrdersAutoRefresh />

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight text-[#1b1a17]">Pedidos</h1>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
              <span className="relative flex h-1.5 w-1.5"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" /><span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" /></span>
              Ao vivo
            </span>
          </div>
          <p className="text-sm text-[#9c988f]">Acompanhe cada pedido por etapa. Entregues e cancelados ficam no histórico do dia.</p>
        </div>
        <Link href="/pedidos/novo" className="rounded-xl bg-[#211d19] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#37312a]">
          Novo pedido
        </Link>
      </div>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {operationColumns.map((column) => {
          const Icon = column.icon;
          const columnOrders = activeOrders.filter((order) => column.statuses.includes(order.status));

          return (
            <div key={column.title} className="rounded-2xl border border-[#e7e4dd] bg-[#faf9f6] p-2.5">
              <div className="mb-2.5 flex items-center justify-between px-1.5 pt-1">
                <div className="flex items-center gap-2">
                  <span className={`grid h-6 w-6 place-items-center rounded-full ${column.tone}`}><Icon size={13} /></span>
                  <h2 className="text-xs font-semibold uppercase tracking-wide text-[#6d6a63]">{column.title}</h2>
                </div>
                <span className="rounded-full bg-white px-2 py-0.5 text-[0.7rem] font-semibold text-[#6d6a63] [font-variant-numeric:tabular-nums]">{columnOrders.length}</span>
              </div>

              <div className="space-y-2.5">
                {columnOrders.map((order) => <OrderCard key={order.id} order={order} />)}
                {!columnOrders.length && (
                  <div className="grid min-h-[110px] place-items-center rounded-xl border border-dashed border-[#e2ddd3] text-center">
                    <p className="text-xs text-[#b0aaa0]">Sem pedidos</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </section>

      <section className="overflow-hidden rounded-2xl border border-[#e7e4dd] bg-white shadow-[0_1px_2px_rgba(27,26,23,0.04)]">
        <div className="flex items-center justify-between gap-3 border-b border-[#efece6] px-4 py-3">
          <h2 className="text-[0.95rem] font-semibold text-[#1b1a17]">Histórico do dia</h2>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#faf9f6] px-2.5 py-1 text-xs font-medium text-[#6d6a63]">
            <PackageCheck size={13} />
            {todayHistory.length}
          </span>
        </div>
        <div>
          {todayHistory.map((order) => <HistoryRow key={order.id} order={order} />)}
          {!todayHistory.length && <p className="p-8 text-center text-sm text-[#9c988f]">Nenhum pedido no histórico de hoje.</p>}
        </div>
      </section>
    </div>
  );
}
