import { CUSTOMER_FIELDS } from "@/lib/public-data";
import Link from "next/link";
import { ArrowDownRight, ArrowUpRight, BarChart3, CalendarDays, ChefHat, CircleDollarSign, Clock3, ClipboardList, Package, Radio, ReceiptText, ShoppingBag, Timer, Trophy, TrendingUp, Users, type LucideIcon, Home } from "lucide-react";
import { requireRestaurant } from "@/lib/auth";
import { money, orderCode } from "@/lib/utils";
import type { Order, OrderItem } from "@/lib/types";
import { addDaysToDateParts, formatStoreTime, keyFromParts, storeDayKey as dayKey, zonedDateParts, zonedLocalTimeToUtc } from "@/lib/timezone";
import { ChannelDonut, HourColumns, RevenueColumns } from "@/components/dashboard/charts";
import { StatusBadge } from "@/components/status-badge";
import { Icon3D } from "@/components/ui/icon-3d";

function sourceName(order: Order) {
  const labels: Record<string, string> = {
    pdv: "PDV", mesa: "Mesa", delivery: "Delivery", site: "Cardápio próprio", manual: "Manual",
    ifood: "iFood", "99food": "99Food", keeta: "Keeta", rappi: "Rappi", whatsapp: "WhatsApp", webhook: "API",
  };
  const value = order.external_platform ?? order.source;
  return labels[value] ?? value.toUpperCase();
}

// Cores das categorias (canais), em ordem fixa — paleta validada (CVD/contraste)
// com o script da skill de visualização; os rótulos ficam sempre visíveis.
const CHANNEL_COLORS = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4"];

function Sparkline({ values }: { values: number[] }) {
  const W = 120, H = 36;
  const max = Math.max(1, ...values);
  const step = values.length > 1 ? W / (values.length - 1) : W;
  const points = values.map((v, i) => `${(i * step).toFixed(1)},${(H - 3 - (v / max) * (H - 6)).toFixed(1)}`);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-9 w-28" aria-hidden="true">
      <polyline points={`0,${H} ${points.join(" ")} ${W},${H}`} fill="rgba(207,74,10,0.10)" stroke="none" />
      <polyline points={points.join(" ")} fill="none" stroke="#cf4a0a" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

function Delta({ value, suffix }: { value: number | null; suffix: string }) {
  if (value === null) return <span className="text-xs text-ink-faint">sem base {suffix}</span>;
  const up = value >= 0;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${up ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
      <Icon className="h-3.5 w-3.5" /> {up ? "+" : ""}{value}% <span className="font-normal opacity-80">{suffix}</span>
    </span>
  );
}

function KpiCard({ title, value, icon: Icon, tone, delta, deltaSuffix, spark }: { title: string; value: string; icon: LucideIcon; tone: string; delta: number | null; deltaSuffix: string; spark: number[] }) {
  return (
    <div className="rounded-2xl border border-line bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[0.72rem] font-semibold uppercase tracking-[0.08em] text-ink-faint">{title}</p>
          <strong className="mt-1.5 block truncate text-[1.75rem] font-semibold leading-none tracking-tight text-ink [font-variant-numeric:tabular-nums]">{value}</strong>
        </div>
        <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-b ${tone} text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_8px_18px_-8px_rgba(0,0,0,0.45)]`}>
          <Icon className="h-5 w-5" />
        </span>
      </div>
      <div className="mt-3 flex items-end justify-between gap-2">
        <Delta value={delta} suffix={deltaSuffix} />
        <Sparkline values={spark} />
      </div>
    </div>
  );
}

function Panel({ title, subtitle, icon: Icon, action, children, className = "" }: { title: string; subtitle?: string; icon: LucideIcon; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={`min-w-0 rounded-2xl border border-line bg-white ${className}`}>
      <div className="flex items-center justify-between gap-3 border-b border-line-soft px-5 py-3.5">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 text-[0.95rem] font-semibold text-ink"><Icon className="h-4 w-4 text-brand" />{title}</h2>
          {subtitle && <p className="mt-0.5 text-xs text-ink-faint">{subtitle}</p>}
        </div>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

function RankList({ rows, empty }: { rows: { label: string; value: number; hint: string }[]; empty: string }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  if (!rows.length) return <p className="rounded-xl bg-[#faf9f6] p-4 text-center text-sm text-ink-faint">{empty}</p>;
  return (
    <ol className="space-y-3">
      {rows.map((row, index) => (
        <li key={row.label} className="flex items-center gap-3">
          <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg text-xs font-semibold ${index === 0 ? "bg-gradient-to-b from-brand-bright to-brand text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.3)]" : "bg-[#f3f0ea] text-ink-soft"}`}>{index + 1}</span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="truncate font-medium text-ink">{row.label}</span>
              <span className="shrink-0 text-ink-soft [font-variant-numeric:tabular-nums]">{row.hint}</span>
            </div>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-[#f1eee8]">
              <div className="h-full rounded-full bg-gradient-to-r from-[#f6b48a] to-brand" style={{ width: `${Math.max(4, (row.value / max) * 100)}%` }} />
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}

export default async function DashboardPage() {
  const { supabase, restaurant } = await requireRestaurant();
  const now = new Date();
  const todayParts = zonedDateParts(now);
  const todayKey = keyFromParts(todayParts);
  const yesterdayKey = keyFromParts(addDaysToDateParts(todayParts, -1));
  const rangeStart = zonedLocalTimeToUtc(addDaysToDateParts(todayParts, -13)).toISOString();
  const week = new Set(Array.from({ length: 7 }, (_, i) => keyFromParts(addDaysToDateParts(todayParts, -i))));

  const [{ data: rangeOrdersData }, { count: productCount }, { count: customerCount }] = await Promise.all([
    supabase.from("orders").select("*").eq("restaurant_id", restaurant.id).gte("created_at", rangeStart).order("created_at", { ascending: false }).limit(5000),
    supabase.from("products").select("*", { count: "exact", head: true }).eq("restaurant_id", restaurant.id).eq("active", true),
    supabase.from("customers").select(CUSTOMER_FIELDS, { count: "exact", head: true }).eq("restaurant_id", restaurant.id),
  ]);
  const rangeOrders = (rangeOrdersData ?? []) as Order[];

  // Pedido do PDV nasce "paid": cancelado não pode entrar no faturamento.
  const paid = (order: Order) => order.status !== "canceled" && (order.status === "completed" || order.payment_status === "paid");
  const notCanceled = (order: Order) => order.status !== "canceled";
  const todayOrders = rangeOrders.filter((order) => dayKey(order.created_at) === todayKey);
  const activeToday = todayOrders.filter(notCanceled);

  // Join em vez de .in(ids): com centenas de pedidos a URL do .in estourava e o
  // "Top produtos" ficava vazio sem aviso.
  const { data: itemsData } = await supabase
    .from("order_items")
    .select("product_name, quantity, total_price, orders!inner(created_at, status)")
    .eq("restaurant_id", restaurant.id)
    .gte("orders.created_at", rangeStart)
    .neq("orders.status", "canceled")
    .limit(20000);
  const items = (itemsData ?? []) as unknown as Pick<OrderItem, "product_name" | "quantity" | "total_price">[];

  const revenueToday = todayOrders.filter(paid).reduce((sum, order) => sum + Number(order.total), 0);
  const revenueYesterday = rangeOrders.filter((order) => dayKey(order.created_at) === yesterdayKey && paid(order)).reduce((sum, order) => sum + Number(order.total), 0);
  const revenueWeek = rangeOrders.filter((order) => week.has(dayKey(order.created_at)) && paid(order)).reduce((sum, order) => sum + Number(order.total), 0);

  const pending = activeToday.filter((order) => order.status === "pending").length;
  const preparing = activeToday.filter((order) => order.status === "preparing").length;

  const days = Array.from({ length: 14 }, (_, i) => keyFromParts(addDaysToDateParts(todayParts, -(13 - i))));
  const revenueByDay = new Map<string, number>();
  rangeOrders.filter(paid).forEach((order) => {
    const key = dayKey(order.created_at);
    revenueByDay.set(key, (revenueByDay.get(key) ?? 0) + Number(order.total));
  });

  const channels = Object.entries(rangeOrders.filter(notCanceled).reduce<Record<string, { count: number; revenue: number }>>((acc, order) => {
    const name = sourceName(order);
    acc[name] = acc[name] ?? { count: 0, revenue: 0 };
    acc[name].count += 1;
    acc[name].revenue += paid(order) ? Number(order.total) : 0;
    return acc;
  }, {})).map(([label, data]) => ({ label, value: data.count, revenue: data.revenue })).sort((a, b) => b.value - a.value);

  const topProducts = Object.values(items.reduce<Record<string, { name: string; quantity: number; revenue: number }>>((acc, item) => {
    const current = acc[item.product_name] ?? { name: item.product_name, quantity: 0, revenue: 0 };
    current.quantity += Number(item.quantity);
    current.revenue += Number(item.total_price);
    acc[item.product_name] = current;
    return acc;
  }, {})).sort((a, b) => b.revenue - a.revenue).slice(0, 6)
    .map((product) => ({ label: product.name, value: product.revenue, hint: `${product.quantity} un • ${money(product.revenue)}` }));

  // Séries para os gráficos e comparações (semana atual x anterior).
  const ordersByDay = new Map<string, number>();
  rangeOrders.filter(notCanceled).forEach((order) => {
    const key = dayKey(order.created_at);
    ordersByDay.set(key, (ordersByDay.get(key) ?? 0) + 1);
  });
  const dayLabel = (key: string) => `${key.slice(8)}/${key.slice(5, 7)}`;
  const columns = days.map((key) => ({ label: dayLabel(key), revenue: revenueByDay.get(key) ?? 0, orders: ordersByDay.get(key) ?? 0, today: key === todayKey }));
  const last7 = columns.slice(7), prev7 = columns.slice(0, 7);
  const sum = (list: typeof columns, field: "revenue" | "orders") => list.reduce((acc, d) => acc + d[field], 0);
  const pct = (current: number, previous: number) => (previous > 0 ? Math.round(((current - previous) / previous) * 100) : null);
  const ordersYesterday = ordersByDay.get(yesterdayKey) ?? 0;
  const ticket7 = sum(last7, "orders") ? sum(last7, "revenue") / sum(last7, "orders") : 0;
  const ticketPrev7 = sum(prev7, "orders") ? sum(prev7, "revenue") / sum(prev7, "orders") : 0;
  const ticketSpark = last7.map((d) => (d.orders ? d.revenue / d.orders : 0));

  const ordersByHour = Array.from({ length: 24 }, () => 0);
  rangeOrders.filter(notCanceled).forEach((order) => { ordersByHour[zonedDateParts(new Date(order.created_at)).hour] += 1; });
  const peakHour = ordersByHour.some(Boolean) ? ordersByHour.indexOf(Math.max(...ordersByHour)) : null;

  const channelTotal = channels.reduce((acc, c) => acc + c.value, 0);
  const channelSlices = [...channels.slice(0, 4), ...(channels.length > 5 ? [{ label: "Outros", value: channels.slice(4).reduce((a, c) => a + c.value, 0), revenue: channels.slice(4).reduce((a, c) => a + c.revenue, 0) }] : channels.slice(4, 5))]
    .map((c, i) => ({ label: c.label, value: c.value, revenue: c.revenue, color: CHANNEL_COLORS[i] }));
  const ready = activeToday.filter((order) => order.status === "ready").length;
  const outForDelivery = activeToday.filter((order) => order.status === "out_for_delivery").length;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand">Visão geral</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink flex items-center gap-3"><Icon3D icon={Home} tone="orange" size="sm" /><span className="min-w-0">Olá, {restaurant.name}</span></h1>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-faint">
            <span className="inline-flex items-center gap-1.5"><CalendarDays className="h-4 w-4" /> Últimos 14 dias</span>
            <span className="inline-flex items-center gap-1.5"><Clock3 className="h-4 w-4" /> Atualizado às {formatStoreTime(now)}</span>
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/relatorios" className="btn-muted text-sm">Relatórios completos</Link>
          <Link href="/pedidos/novo" className="rounded-xl bg-btn px-4 py-2.5 text-sm font-medium text-white transition hover:bg-btn-hover">Novo pedido</Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard title="Faturamento hoje" value={money(revenueToday)} icon={CircleDollarSign} tone="from-[#ff8a3d] to-[#cf4a0a]" delta={pct(revenueToday, revenueYesterday)} deltaSuffix="vs. ontem" spark={last7.map((d) => d.revenue)} />
        <KpiCard title="Pedidos hoje" value={String(activeToday.length)} icon={ShoppingBag} tone="from-[#46a6ff] to-[#1f6fe0]" delta={pct(activeToday.length, ordersYesterday)} deltaSuffix="vs. ontem" spark={last7.map((d) => d.orders)} />
        <KpiCard title="Ticket médio (7 dias)" value={money(ticket7)} icon={ReceiptText} tone="from-[#3ad46b] to-[#169c46]" delta={pct(ticket7, ticketPrev7)} deltaSuffix="vs. semana ant." spark={ticketSpark} />
        <KpiCard title="Faturamento 7 dias" value={money(revenueWeek)} icon={TrendingUp} tone="from-[#9f7bff] to-[#6b46e5]" delta={pct(sum(last7, "revenue"), sum(prev7, "revenue"))} deltaSuffix="vs. semana ant." spark={columns.map((d) => d.revenue)} />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.6fr_1fr]">
        <Panel title="Faturamento por dia" subtitle="Pedidos pagos, sem cancelados" icon={BarChart3} action={<span className="text-right"><span className="block text-lg font-semibold text-ink [font-variant-numeric:tabular-nums]">{money(sum(columns, "revenue"))}</span><span className="text-xs text-ink-faint">{sum(columns, "orders")} pedidos em 14 dias</span></span>}>
          <RevenueColumns data={columns} />
        </Panel>
        <Panel title="Vendas por canal" subtitle="Pedidos e faturamento em 14 dias" icon={Radio}>
          <ChannelDonut data={channelSlices} total={channelTotal} />
        </Panel>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_1.6fr]">
        <Panel title="Produtos mais vendidos" subtitle="Por faturamento, 14 dias" icon={Trophy}>
          <RankList rows={topProducts} empty="Sem vendas no período." />
        </Panel>
        <Panel title="Horário de pico" subtitle={peakHour === null ? "Sem pedidos no período" : `Mais pedidos entre ${peakHour}h e ${peakHour + 1}h`} icon={Timer}>
          <HourColumns data={ordersByHour} />
        </Panel>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_1.4fr]">
        <Panel title="Operação de hoje" icon={ClipboardList} action={<Link href="/pedidos" className="text-xs font-semibold text-brand hover:underline">Abrir quadro</Link>}>
          <div className="grid grid-cols-2 gap-3">
            {([["Pendentes", pending, Clock3, "text-amber-600 bg-amber-50"], ["Em preparo", preparing, ChefHat, "text-orange-600 bg-orange-50"], ["Prontos", ready, Package, "text-emerald-600 bg-emerald-50"], ["Em entrega", outForDelivery, ShoppingBag, "text-sky-600 bg-sky-50"]] as const).map(([label, value, Icon, tone]) => (
              <div key={label} className="flex items-center gap-3 rounded-xl border border-line-soft bg-[#fbfaf7] p-3.5 shadow-[inset_0_1px_0_#fff]">
                <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${tone}`}><Icon className="h-5 w-5" /></span>
                <div>
                  <p className="text-[0.72rem] font-semibold uppercase tracking-[0.06em] text-ink-faint">{label}</p>
                  <p className="text-2xl font-semibold leading-tight text-ink [font-variant-numeric:tabular-nums]">{value}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-faint">
            <span className="inline-flex items-center gap-1.5"><Package className="h-3.5 w-3.5" /> {productCount ?? 0} produtos ativos</span>
            <span className="inline-flex items-center gap-1.5"><Users className="h-3.5 w-3.5" /> {customerCount ?? 0} clientes cadastrados</span>
          </p>
        </Panel>

        <Panel title="Últimos pedidos de hoje" icon={ReceiptText} action={<Link href="/pedidos" className="text-xs font-semibold text-brand hover:underline">Ver todos</Link>}>
          {todayOrders.length ? (
            <div className="-mx-2 overflow-x-auto">
              <table className="w-full min-w-[520px] text-sm">
                <thead>
                  <tr className="text-left text-[0.72rem] font-semibold uppercase tracking-[0.06em] text-ink-faint">
                    <th className="px-2 pb-2">Pedido</th><th className="px-2 pb-2">Cliente</th><th className="px-2 pb-2">Canal</th><th className="px-2 pb-2">Status</th><th className="px-2 pb-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line-soft">
                  {todayOrders.slice(0, 6).map((order) => (
                    <tr key={order.id} className="transition hover:bg-[#fbfaf7]">
                      <td className="px-2 py-2.5"><Link href={`/pedidos/${order.id}`} className="font-semibold text-ink hover:text-brand">#{orderCode(order)}</Link><span className="block text-xs text-ink-faint">{formatStoreTime(order.created_at)}</span></td>
                      <td className="max-w-40 truncate px-2 py-2.5 text-ink-body">{order.customer_name ?? "Cliente balcão"}</td>
                      <td className="px-2 py-2.5 text-ink-soft">{sourceName(order)}</td>
                      <td className="px-2 py-2.5"><StatusBadge status={order.status} /></td>
                      <td className="px-2 py-2.5 text-right font-semibold text-ink [font-variant-numeric:tabular-nums]">{money(order.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="rounded-xl bg-[#faf9f6] p-4 text-center text-sm text-ink-faint">Nenhum pedido hoje.</p>
          )}
        </Panel>
      </div>
    </div>
  );
}
