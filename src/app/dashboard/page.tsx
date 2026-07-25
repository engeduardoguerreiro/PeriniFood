import Link from "next/link";
import {
  ArrowRightFromLine,
  BarChart3,
  Building2,
  Car,
  ChefHat,
  ClipboardList,
  FileText,
  Layers3,
  ReceiptText,
  Store,
  Trophy,
} from "lucide-react";
import { requireRestaurant } from "@/lib/auth";
import { money, orderCode, statusLabel } from "@/lib/utils";
import type { Order, OrderItem } from "@/lib/types";

const dashboardTimeZone = "America/Sao_Paulo";

function zonedDateParts(date: Date, timeZone = dashboardTimeZone) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(date);
  const pick = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? 0);
  return {
    year: pick("year"),
    month: pick("month"),
    day: pick("day"),
    hour: pick("hour"),
    minute: pick("minute"),
    second: pick("second"),
  };
}

function addDaysToDateParts(parts: { year: number; month: number; day: number }, days: number) {
  const date = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + days, 12, 0, 0));
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  };
}

function zonedLocalTimeToUtc(parts: { year: number; month: number; day: number; hour?: number; minute?: number; second?: number }, timeZone = dashboardTimeZone) {
  const utcGuess = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour ?? 0, parts.minute ?? 0, parts.second ?? 0);
  const rendered = zonedDateParts(new Date(utcGuess), timeZone);
  const renderedAsUtc = Date.UTC(rendered.year, rendered.month - 1, rendered.day, rendered.hour, rendered.minute, rendered.second);
  return new Date(utcGuess - (renderedAsUtc - utcGuess));
}

function dashboardRanges(now = new Date()) {
  const todayParts = zonedDateParts(now);
  const tomorrowParts = addDaysToDateParts(todayParts, 1);
  const weekDay = new Date(Date.UTC(todayParts.year, todayParts.month - 1, todayParts.day, 12, 0, 0)).getUTCDay();
  const weekStartParts = addDaysToDateParts(todayParts, -weekDay);

  return {
    todayStart: zonedLocalTimeToUtc({ year: todayParts.year, month: todayParts.month, day: todayParts.day }).toISOString(),
    tomorrowStart: zonedLocalTimeToUtc(tomorrowParts).toISOString(),
    weekStart: zonedLocalTimeToUtc(weekStartParts).toISOString(),
  };
}

function sourceName(order: Order) {
  const labels: Record<string, string> = {
    pdv: "PDV",
    mesa: "Mesa",
    delivery: "Delivery",
    site: "Cardápio próprio",
    manual: "Manual",
    ifood: "iFood",
    "99food": "99Food",
    keeta: "Keeta",
    rappi: "Rappi",
    whatsapp: "WhatsApp",
    webhook: "API",
  };
  const value = order.external_platform ?? order.source;
  return labels[value] ?? value.toUpperCase();
}

function Panel({ title, icon: Icon, action, children }: { title: string; icon: typeof BarChart3; action?: string; children: React.ReactNode }) {
  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between bg-[#232A31] px-4 py-3 text-white">
        <h2 className="flex items-center gap-2 text-base font-bold">
          <Icon className="h-5 w-5" />
          {title}
        </h2>
        {action && <span className="font-secondary text-sm font-semibold">{action}</span>}
      </div>
      {children}
    </section>
  );
}

function MetricCard({ title, value, href = "/dashboard" }: { title: string; value: string; href?: string }) {
  const content = (
    <>
      <div className="relative overflow-hidden rounded-xl border border-[#E50914]/30 bg-white p-4">
        <ArrowRightFromLine className="absolute right-3 top-3 h-14 w-14 text-[#E50914] opacity-15" />
        <p className="font-secondary text-sm leading-5 text-slate-600">{title}</p>
        <strong className="mt-3 block text-2xl text-[#232A31]">{value}</strong>
      </div>
      {href && <span className="block rounded-b-xl bg-[#E50914] px-3 py-1 text-center text-xs font-black text-white">Mais detalhes</span>}
    </>
  );

  return href ? <Link href={href}>{content}</Link> : <div>{content}</div>;
}

function EmptyBox({ children }: { children: React.ReactNode }) {
  return <p className="rounded-xl bg-slate-50 p-4 text-center text-sm text-slate-500">{children}</p>;
}

export default async function DashboardPage() {
  const { supabase, restaurant } = await requireRestaurant();
  const { todayStart, tomorrowStart, weekStart } = dashboardRanges();

  const [{ data: todayOrders }, { data: weekOrders }, { count: productCount }, { count: customerCount }] = await Promise.all([
    supabase
      .from("orders")
      .select("*")
      .eq("restaurant_id", restaurant.id)
      .gte("created_at", todayStart)
      .lt("created_at", tomorrowStart)
      .order("created_at", { ascending: false }),
    supabase
      .from("orders")
      .select("*")
      .eq("restaurant_id", restaurant.id)
      .gte("created_at", weekStart)
      .order("created_at", { ascending: false }),
    supabase.from("products").select("*", { count: "exact", head: true }).eq("restaurant_id", restaurant.id).eq("active", true),
    supabase.from("customers").select("*", { count: "exact", head: true }).eq("restaurant_id", restaurant.id),
  ]);

  const orders = (todayOrders ?? []) as Order[];
  const weekRows = (weekOrders ?? []) as Order[];
  const usefulOrders = orders.filter((order) => order.status !== "canceled");
  const orderIds = usefulOrders.map((order) => order.id);
  const { data: orderItems } = orderIds.length ?
     await supabase.from("order_items").select("*").eq("restaurant_id", restaurant.id).in("order_id", orderIds)
    : { data: [] as OrderItem[] };
  const items = (orderItems ?? []) as OrderItem[];

  const paidOrCompleted = (order: Order) => order.status === "completed" || order.payment_status === "paid";
  const revenue = orders.filter(paidOrCompleted).reduce((sum, order) => sum + Number(order.total), 0);
  const weekRevenue = weekRows.filter(paidOrCompleted).reduce((sum, order) => sum + Number(order.total), 0);
  const pending = orders.filter((order) => order.status === "pending").length;
  const preparing = orders.filter((order) => order.status === "preparing").length;
  const completed = orders.filter((order) => order.status === "completed").length;
  const averageTicket = orders.length ? revenue / orders.length : 0;

  const topProducts = Object.values(items.reduce<Record<string, { name: string; quantity: number; revenue: number }>>((acc, item) => {
    const current = acc[item.product_name] ?? { name: item.product_name, quantity: 0, revenue: 0 };
    current.quantity += Number(item.quantity);
    current.revenue += Number(item.total_price);
    acc[item.product_name] = current;
    return acc;
  }, {})).sort((a, b) => b.revenue - a.revenue).slice(0, 5);

  const bySource = Object.entries(usefulOrders.reduce<Record<string, number>>((acc, order) => {
    const source = sourceName(order);
    acc[source] = (acc[source] ?? 0) + 1;
    return acc;
  }, {})).sort((a, b) => b[1] - a[1]);

  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-2xl font-black text-slate-800">Olá, {restaurant.name}</h1>
        <div className="mt-7 grid gap-5 xl:grid-cols-3">
          <Link href="/pedidos" className="flex min-h-28 items-center justify-between overflow-hidden rounded-xl bg-[#12161B] p-5 text-white">
            <div>
              <strong className="block text-lg">Pedidos em tempo real</strong>
              <span className="mt-1 block max-w-xs text-sm text-white/75">Acompanhe novos pedidos, preparo e entrega no painel operacional.</span>
            </div>
            <ClipboardList className="h-12 w-12 text-white/70" />
          </Link>
          <Link href={`/cardapio/${restaurant.slug}`} target="_blank" rel="noreferrer" className="flex min-h-28 items-center justify-between overflow-hidden rounded-xl bg-[#E50914] p-5 text-white">
            <div>
              <strong className="block text-lg">Cardápio digital ativo</strong>
              <span className="mt-1 block max-w-xs text-sm text-white/80">Compartilhe o link e receba pedidos direto no PeriniFood.</span>
            </div>
            <ChefHat className="h-12 w-12 text-white/80" />
          </Link>
          <Link href="/configuracoes" className="flex min-h-28 items-center justify-between overflow-hidden rounded-xl bg-[#232A31] p-5 text-white">
            <div>
              <strong className="block text-lg">{restaurant.is_open ? "Loja aberta" : "Loja fechada"}</strong>
              <span className="mt-1 block max-w-xs text-sm text-white/80">Configure taxas, pedido mínimo, WhatsApp e status da loja.</span>
            </div>
            <Store className="h-12 w-12 text-white/80" />
          </Link>
        </div>
      </section>

      <div className="grid gap-7 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Faturamento hoje" value={money(revenue)} href="/dashboard/reports" />
        <MetricCard title="Faturamento na semana" value={money(weekRevenue)} href="/dashboard/reports" />
        <MetricCard title="Pedidos hoje" value={String(orders.length)} href="/pedidos" />
        <MetricCard title="Ticket médio hoje" value={money(averageTicket)} />
      </div>

      <div className="grid gap-8 xl:grid-cols-[1.4fr_1fr]">
        <div className="space-y-8">
          <Panel title="Operação de hoje" icon={ClipboardList}>
            <div className="grid gap-4 p-5 md:grid-cols-4">
              {[
                ["Pendentes", pending],
                ["Em preparo", preparing],
                ["Finalizados", completed],
                ["Produtos ativos", productCount ?? 0],
              ].map(([label, value]) => (
                <div key={label} className="rounded bg-slate-50 p-4">
                  <p className="font-secondary text-xs font-bold uppercase text-slate-500">{label}</p>
                  <p className="mt-2 text-2xl font-black text-[#232A31]">{value}</p>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="Quadro de avisos" icon={FileText}>
            <div className="space-y-3 p-5 font-secondary text-sm text-slate-600">
              <p className="flex items-center gap-2"><Layers3 className="h-5 w-5 text-[#E50914]" /> Há {productCount ?? 0} produtos ativos no cardápio.</p>
              <p className="flex items-center gap-2"><Building2 className="h-5 w-5 text-[#E50914]" /> Há {customerCount ?? 0} clientes cadastrados.</p>
              <p className="flex items-center gap-2"><ArrowRightFromLine className="h-5 w-5 text-[#22C55E]" /> Há {pending} pedidos aguardando aceite.</p>
              <p className="flex items-center gap-2"><Car className="h-5 w-5 text-[#E50914]" /> Há {preparing} pedidos em preparo.</p>
            </div>
          </Panel>

          <Panel title="Últimos pedidos de hoje" icon={ReceiptText}>
            <div className="p-5">
              {orders.length ? (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[680px] text-left text-sm">
                    <thead className="font-secondary text-slate-500">
                      <tr><th className="p-3">Pedido</th><th>Cliente</th><th>Status</th><th>Origem</th><th className="text-right">Total</th></tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {orders.slice(0, 6).map((order) => (
                        <tr key={order.id}>
                          <td className="p-3 font-black">#{orderCode(order)}</td>
                          <td>{order.customer_name ?? "Cliente balcão"}</td>
                          <td>{statusLabel[order.status]}</td>
                          <td>{sourceName(order)}</td>
                          <td className="text-right font-black">{money(order.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <EmptyBox>Nenhum pedido hoje.</EmptyBox>
              )}
            </div>
          </Panel>
        </div>

        <div className="space-y-8">
          <Panel title="Top produtos vendidos hoje" icon={Trophy}>
            <div className="space-y-3 p-5">
              {topProducts.length ? topProducts.map((product, index) => (
                <div key={product.name} className="flex items-center justify-between rounded-xl bg-slate-50 p-4">
                  <div>
                    <p className="font-black">{index + 1}. {product.name}</p>
                    <p className="text-sm text-slate-500">{product.quantity} unidade(s)</p>
                  </div>
                  <strong>{money(product.revenue)}</strong>
                </div>
              )) : (
                <EmptyBox>Sem vendas de produtos hoje.</EmptyBox>
              )}
            </div>
          </Panel>

          <Panel title="Origem dos pedidos" icon={BarChart3}>
            <div className="space-y-3 p-5">
              {bySource.length ? bySource.map(([source, count]) => (
                <div key={source} className="flex items-center justify-between rounded-xl bg-slate-50 p-4">
                  <span className="font-bold">{source}</span>
                  <strong>{count}</strong>
                </div>
              )) : (
                <EmptyBox>Sem pedidos hoje.</EmptyBox>
              )}
            </div>
          </Panel>

          <Panel title="Ações rápidas" icon={ChefHat}>
            <div className="grid gap-3 p-5">
              <Link href="/pedidos/novo" className="btn-primary">Novo pedido</Link>
              <Link href="/cardapio/produtos/novo" className="btn-muted">Cadastrar produto</Link>
              <Link href={`/cardapio/${restaurant.slug}`} target="_blank" rel="noreferrer" className="btn-muted">Abrir cardápio público</Link>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
