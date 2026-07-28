import Link from "next/link";
import { Building2, CalendarPlus, Receipt, TrendingUp, Zap } from "lucide-react";
import { listUserEmails, requirePlatformAdmin } from "@/lib/platform-admin";
import { isRestaurantOpen } from "@/lib/opening-hours";
import { money } from "@/lib/utils";
import type { Restaurant } from "@/lib/types";

const providerLabel: Record<string, string> = {
  ifood: "iFood",
  "99food": "99Food",
  keeta: "Keeta",
  whatsapp: "WhatsApp",
  own_menu: "Cardápio",
  webhook: "API",
  rappi: "Rappi",
};

const DAYS_30 = 30 * 24 * 60 * 60 * 1000;

function StatTile({ icon: Icon, label, value, hint }: { icon: typeof Building2; label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-[#e7e4dd] bg-white p-4 shadow-[0_1px_2px_rgba(27,26,23,0.04)]">
      <div className="flex items-center gap-2">
        <span className="grid h-6 w-6 place-items-center rounded-full bg-[#f6ece9] text-[#c5362e]"><Icon size={13} /></span>
        <p className="text-xs font-semibold uppercase tracking-wide text-[#6d6a63]">{label}</p>
      </div>
      <p className="mt-2 text-2xl font-semibold tracking-tight [font-variant-numeric:tabular-nums]">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-[#9c988f]">{hint}</p>}
    </div>
  );
}

function FeatureBadge({ label, tone = "neutral" }: { label: string; tone?: "neutral" | "on" | "integration" }) {
  const cls =
    tone === "on"
      ? "bg-emerald-50 text-emerald-700"
      : tone === "integration"
        ? "bg-[#f6ece9] text-[#c5362e]"
        : "bg-[#f1efea] text-[#6d6a63]";
  return <span className={`rounded-full px-2 py-0.5 text-[0.65rem] font-medium ${cls}`}>{label}</span>;
}

export default async function AdminOverviewPage() {
  const { service } = await requirePlatformAdmin();
  const since30 = new Date(Date.now() - DAYS_30).toISOString();

  const [{ data: restaurants }, { data: products }, { data: orders30 }, { data: recentOrders }, { data: integrations }, emailById] =
    await Promise.all([
      service.from("restaurants").select("*").order("created_at", { ascending: true }),
      service.from("products").select("id, restaurant_id, active"),
      service.from("orders").select("restaurant_id, total, status, created_at").gte("created_at", since30),
      service.from("orders").select("restaurant_id, created_at").order("created_at", { ascending: false }).limit(1500),
      service.from("integrations").select("restaurant_id, provider, status"),
      listUserEmails(service),
    ]);
  const rows = (restaurants ?? []) as Restaurant[];

  const productCount = new Map<string, number>();
  for (const p of products ?? []) {
    if (!p.active) continue;
    productCount.set(p.restaurant_id, (productCount.get(p.restaurant_id) ?? 0) + 1);
  }

  const orders30Count = new Map<string, number>();
  const revenue30 = new Map<string, number>();
  for (const o of orders30 ?? []) {
    orders30Count.set(o.restaurant_id, (orders30Count.get(o.restaurant_id) ?? 0) + 1);
    if (o.status !== "canceled") revenue30.set(o.restaurant_id, (revenue30.get(o.restaurant_id) ?? 0) + Number(o.total));
  }

  const lastOrder = new Map<string, string>();
  for (const o of recentOrders ?? []) {
    if (!lastOrder.has(o.restaurant_id)) lastOrder.set(o.restaurant_id, o.created_at);
  }

  const connectedIntegrations = new Map<string, string[]>();
  for (const i of integrations ?? []) {
    if (i.status !== "connected" && i.status !== "active") continue;
    const arr = connectedIntegrations.get(i.restaurant_id) ?? [];
    arr.push(providerLabel[i.provider] ?? i.provider);
    connectedIntegrations.set(i.restaurant_id, arr);
  }

  const totalClients = rows.length;
  const activeClients = rows.filter((r) => (orders30Count.get(r.id) ?? 0) > 0).length;
  const newClients = rows.filter((r) => r.created_at >= since30).length;
  const totalOrders30 = (orders30 ?? []).length;
  const totalRevenue30 = [...revenue30.values()].reduce((s, v) => s + v, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Clientes da plataforma</h1>
        <p className="text-sm text-[#9c988f]">Visão geral dos restaurantes que usam o PeriniFood.</p>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatTile icon={Building2} label="Clientes" value={String(totalClients)} />
        <StatTile icon={Zap} label="Ativos (30d)" value={String(activeClients)} hint="Com pedidos nos últimos 30 dias" />
        <StatTile icon={CalendarPlus} label="Novos (30d)" value={String(newClients)} />
        <StatTile icon={Receipt} label="Pedidos (30d)" value={String(totalOrders30)} />
        <StatTile icon={TrendingUp} label="Receita (30d)" value={money(totalRevenue30)} hint="Somatório dos clientes" />
      </section>

      <section className="overflow-hidden rounded-2xl border border-[#e7e4dd] bg-white shadow-[0_1px_2px_rgba(27,26,23,0.04)]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr className="border-b border-[#efece6] text-left text-xs font-semibold uppercase tracking-wide text-[#6d6a63]">
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3">Dono</th>
                <th className="px-4 py-3">Desde</th>
                <th className="px-4 py-3 text-right">Produtos</th>
                <th className="px-4 py-3 text-right">Pedidos 30d</th>
                <th className="px-4 py-3 text-right">Receita 30d</th>
                <th className="px-4 py-3">Último pedido</th>
                <th className="px-4 py-3">Recursos</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const open = isRestaurantOpen(r);
                const last = lastOrder.get(r.id);
                const active = (orders30Count.get(r.id) ?? 0) > 0;
                return (
                  <tr key={r.id} className="border-b border-[#efece6] last:border-0 hover:bg-[#faf9f6]">
                    <td className="px-4 py-3">
                      <Link href={`/admin/clientes/${r.id}`} className="font-semibold text-[#1b1a17] transition hover:text-[#c5362e]">
                        {r.name}
                      </Link>
                      <p className="text-xs text-[#9c988f]">{[r.city, r.state].filter(Boolean).join(" / ") || r.slug}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-[#6d6a63]">{emailById.get(r.owner_id) || "—"}</td>
                    <td className="px-4 py-3 text-xs text-[#6d6a63]">{new Date(r.created_at).toLocaleDateString("pt-BR")}</td>
                    <td className="px-4 py-3 text-right [font-variant-numeric:tabular-nums]">{productCount.get(r.id) ?? 0}</td>
                    <td className="px-4 py-3 text-right [font-variant-numeric:tabular-nums]">{orders30Count.get(r.id) ?? 0}</td>
                    <td className="px-4 py-3 text-right font-medium [font-variant-numeric:tabular-nums]">{money(revenue30.get(r.id) ?? 0)}</td>
                    <td className="px-4 py-3 text-xs text-[#6d6a63]">{last ? new Date(last).toLocaleDateString("pt-BR") : "—"}</td>
                    <td className="px-4 py-3">
                      <div className="flex max-w-[260px] flex-wrap gap-1">
                        <FeatureBadge label={active ? "Ativo" : "Inativo"} tone={active ? "on" : "neutral"} />
                        <FeatureBadge label={open ? "Aberta" : "Fechada"} tone={open ? "on" : "neutral"} />
                        {r.delivery_enabled && <FeatureBadge label="Entrega" />}
                        {r.pickup_enabled && <FeatureBadge label="Retirada" />}
                        {r.table_service_enabled && <FeatureBadge label="Mesa" />}
                        {(connectedIntegrations.get(r.id) ?? []).map((p) => (
                          <FeatureBadge key={p} label={p} tone="integration" />
                        ))}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!rows.length && (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-sm text-[#9c988f]">Nenhum cliente cadastrado.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
