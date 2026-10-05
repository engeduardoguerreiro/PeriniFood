import { CUSTOMER_FIELDS } from "@/lib/public-data";
import Link from "next/link";
import { BarChart3, ClipboardList, Radio, ReceiptText, Trophy, TrendingUp } from "lucide-react";
import { requireRestaurant } from "@/lib/auth";
import { money, orderCode, statusLabel } from "@/lib/utils";
import type { Order, OrderItem } from "@/lib/types";
import { addDaysToDateParts, keyFromParts, storeDayKey as dayKey, zonedDateParts, zonedLocalTimeToUtc } from "@/lib/timezone";

function sourceName(order: Order) {
  const labels: Record<string, string> = {
    pdv: "PDV", mesa: "Mesa", delivery: "Delivery", site: "Cardápio próprio", manual: "Manual",
    ifood: "iFood", "99food": "99Food", keeta: "Keeta", rappi: "Rappi", whatsapp: "WhatsApp", webhook: "API",
  };
  const value = order.external_platform ?? order.source;
  return labels[value] ?? value.toUpperCase();
}

function StatCard({ title, value, delta }: { title: string; value: string; delta?: { text: string; up: boolean } | null }) {
  return (
    <div className="rounded-2xl border border-line bg-white p-4">
      <p className="text-[0.7rem] font-medium uppercase tracking-[0.09em] text-ink-faint">{title}</p>
      <strong className="mt-2 block text-[1.7rem] font-semibold leading-none tracking-tight text-ink [font-variant-numeric:tabular-nums]">{value}</strong>
      {delta && <p className={`mt-1.5 text-xs font-medium ${delta.up ? "text-[#1f8a54]" : "text-ink-faint"}`}>{delta.text}</p>}
    </div>
  );
}

function Panel({ title, icon: Icon, action, children }: { title: string; icon: typeof BarChart3; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-line bg-white shadow-[0_1px_2px_rgba(27,26,23,0.04)]">
      <div className="flex items-center justify-between border-b border-line-soft px-5 py-3.5">
        <h2 className="flex items-center gap-2 text-[0.95rem] font-semibold text-ink"><Icon className="h-4 w-4 text-ink-faint" />{title}</h2>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

function TrendChart({ series }: { series: { revenue: number }[] }) {
  const W = 640, H = 150, pad = 10;
  const max = Math.max(1, ...series.map((s) => s.revenue));
  const n = series.length;
  const px = (i: number) => pad + (n <= 1 ? 0 : (i / (n - 1)) * (W - pad * 2));
  const py = (v: number) => pad + (1 - v / max) * (H - pad * 2);
  const line = series.map((s, i) => `${i ? "L" : "M"}${px(i).toFixed(1)} ${py(s.revenue).toFixed(1)}`).join(" ");
  const last = n - 1;
  const area = `${line} L${px(last).toFixed(1)} ${H - pad} L${px(0).toFixed(1)} ${H - pad} Z`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="block h-40 w-full" role="img" aria-label="Faturamento por dia">
      {[0.25, 0.5, 0.75].map((g) => (
        <line key={g} x1={pad} x2={W - pad} y1={pad + g * (H - pad * 2)} y2={pad + g * (H - pad * 2)} stroke="#efece6" strokeWidth="1" />
      ))}
      <path d={area} fill="rgba(197,54,46,0.07)" />
      <path d={line} fill="none" stroke="#c5362e" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={px(last)} cy={py(series[last]?.revenue ?? 0)} r="3.5" fill="#c5362e" />
    </svg>
  );
}

function BarList({ rows, empty }: { rows: { label: string; value: number; hint: string }[]; empty: string }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  if (!rows.length) return <p className="rounded-xl bg-[#faf9f6] p-4 text-center text-sm text-ink-faint">{empty}</p>;
  return (
    <div className="space-y-3">
      {rows.map((row) => (
        <div key={row.label}>
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="truncate font-medium text-ink">{row.label}</span>
            <span className="shrink-0 text-ink-soft [font-variant-numeric:tabular-nums]">{row.hint}</span>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[#f1efea]">
            <div className="h-full rounded-full bg-brand" style={{ width: `${Math.max(4, (row.value / max) * 100)}%` }} />
          </div>
        </div>
      ))}
    </div>
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
  const averageTicket = activeToday.length ? revenueToday / activeToday.length : 0;
  const deltaPct = revenueYesterday > 0 ? Math.round(((revenueToday - revenueYesterday) / revenueYesterday) * 100) : null;

  const pending = activeToday.filter((order) => order.status === "pending").length;
  const preparing = activeToday.filter((order) => order.status === "preparing").length;

  const days = Array.from({ length: 14 }, (_, i) => keyFromParts(addDaysToDateParts(todayParts, -(13 - i))));
  const revenueByDay = new Map<string, number>();
  rangeOrders.filter(paid).forEach((order) => {
    const key = dayKey(order.created_at);
    revenueByDay.set(key, (revenueByDay.get(key) ?? 0) + Number(order.total));
  });
  const series = days.map((key) => ({ key, revenue: revenueByDay.get(key) ?? 0 }));
  const axisLabels = [days[0], days[6], days[13]].map((key) => key.slice(8) + "/" + key.slice(5, 7));

  const channels = Object.entries(rangeOrders.filter(notCanceled).reduce<Record<string, { count: number; revenue: number }>>((acc, order) => {
    const name = sourceName(order);
    acc[name] = acc[name] ?? { count: 0, revenue: 0 };
    acc[name].count += 1;
    acc[name].revenue += paid(order) ? Number(order.total) : 0;
    return acc;
  }, {})).map(([label, data]) => ({ label, value: data.count, hint: `${data.count} • ${money(data.revenue)}` })).sort((a, b) => b.value - a.value).slice(0, 6);

  const topProducts = Object.values(items.reduce<Record<string, { name: string; quantity: number; revenue: number }>>((acc, item) => {
    const current = acc[item.product_name] ?? { name: item.product_name, quantity: 0, revenue: 0 };
    current.quantity += Number(item.quantity);
    current.revenue += Number(item.total_price);
    acc[item.product_name] = current;
    return acc;
  }, {})).sort((a, b) => b.revenue - a.revenue).slice(0, 6)
    .map((product) => ({ label: product.name, value: product.revenue, hint: `${product.quantity} un • ${money(product.revenue)}` }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">Olá, {restaurant.name}</h1>
          <p className="text-sm text-ink-faint">Resumo da operação e vendas dos últimos 14 dias.</p>
        </div>
        <Link href="/pedidos/novo" className="rounded-xl bg-btn px-4 py-2.5 text-sm font-medium text-white transition hover:bg-btn-hover">Novo pedido</Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Faturamento hoje" value={money(revenueToday)} delta={deltaPct === null ? { text: "sem base de ontem", up: false } : { text: `${deltaPct >= 0 ? "+" : ""}${deltaPct}% vs. ontem`, up: deltaPct >= 0 }} />
        <StatCard title="Pedidos hoje" value={String(activeToday.length)} delta={{ text: `${pending} aguardando • ${preparing} em preparo`, up: false }} />
        <StatCard title="Ticket médio hoje" value={money(averageTicket)} />
        <StatCard title="Faturamento 7 dias" value={money(revenueWeek)} />
      </div>

      <Panel title="Faturamento — últimos 14 dias" icon={TrendingUp} action={<span className="text-sm font-semibold text-ink">{money(series.reduce((s, d) => s + d.revenue, 0))}</span>}>
        <TrendChart series={series} />
        <div className="mt-2 flex justify-between text-[0.7rem] font-medium uppercase tracking-wide text-ink-faint">
          {axisLabels.map((label, index) => <span key={index}>{label}</span>)}
        </div>
      </Panel>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Vendas por canal" icon={Radio}>
          <BarList rows={channels} empty="Sem pedidos no período." />
        </Panel>
        <Panel title="Produtos mais vendidos (14 dias)" icon={Trophy}>
          <BarList rows={topProducts} empty="Sem vendas no período." />
        </Panel>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_1.2fr]">
        <Panel title="Operação de hoje" icon={ClipboardList} action={<Link href="/pedidos" className="text-xs font-medium text-brand">Ver painel</Link>}>
          <div className="grid grid-cols-2 gap-3">
            {[["Pendentes", pending], ["Em preparo", preparing], ["Pedidos hoje", activeToday.length], ["Produtos ativos", productCount ?? 0]].map(([label, value]) => (
              <div key={label} className="rounded-xl border border-line-soft bg-[#faf9f6] p-4">
                <p className="text-[0.7rem] font-medium uppercase tracking-[0.08em] text-ink-faint">{label}</p>
                <p className="mt-2 text-2xl font-semibold text-ink [font-variant-numeric:tabular-nums]">{value}</p>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs text-ink-faint">{customerCount ?? 0} clientes cadastrados.</p>
        </Panel>

        <Panel title="Últimos pedidos de hoje" icon={ReceiptText}>
          {todayOrders.length ? (
            <div className="divide-y divide-line-soft">
              {todayOrders.slice(0, 6).map((order) => (
                <div key={order.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-ink">{order.customer_name ?? "Cliente balcão"}</p>
                    <p className="text-xs text-ink-faint">#{orderCode(order)} • {sourceName(order)} • {statusLabel[order.status]}</p>
                  </div>
                  <strong className="shrink-0 font-medium text-ink [font-variant-numeric:tabular-nums]">{money(order.total)}</strong>
                </div>
              ))}
            </div>
          ) : (
            <p className="rounded-xl bg-[#faf9f6] p-4 text-center text-sm text-ink-faint">Nenhum pedido hoje.</p>
          )}
        </Panel>
      </div>
    </div>
  );
}
