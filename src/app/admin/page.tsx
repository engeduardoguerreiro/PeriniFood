import Link from "next/link";
import { AlertTriangle, Building2, CalendarPlus, CircleDollarSign, Repeat, ShieldOff } from "lucide-react";
import { listUserEmails, requirePlatformAdmin } from "@/lib/platform-admin";
import { listSubscriptions, methodLabel, monthKey, planLabel, statusLabelSub, statusToneSub } from "@/lib/platform-billing";
import { moduleName } from "@/lib/platform-modules";
import { money } from "@/lib/utils";
import type { Restaurant } from "@/lib/types";

function StatTile({ icon: Icon, label, value, hint, tone = "brand" }: { icon: typeof Building2; label: string; value: string; hint?: string; tone?: "brand" | "warn" | "danger" }) {
  const badge = tone === "warn" ? "bg-amber-50 text-amber-700" : tone === "danger" ? "bg-rose-50 text-rose-700" : "bg-[#f6ece9] text-[#c5362e]";
  return (
    <div className="rounded-2xl border border-[#e7e4dd] bg-white p-4 shadow-[0_1px_2px_rgba(27,26,23,0.04)]">
      <div className="flex items-center gap-2">
        <span className={`grid h-6 w-6 place-items-center rounded-full ${badge}`}><Icon size={13} /></span>
        <p className="text-xs font-semibold uppercase tracking-wide text-[#6d6a63]">{label}</p>
      </div>
      <p className="mt-2 text-2xl font-semibold tracking-tight [font-variant-numeric:tabular-nums]">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-[#9c988f]">{hint}</p>}
    </div>
  );
}

export default async function AdminOverviewPage() {
  const { service } = await requirePlatformAdmin();

  const [{ data: restaurants }, emailById, { subs, ready }, { data: payments }] = await Promise.all([
    service.from("restaurants").select("id, name, slug, city, state, owner_id, created_at").order("created_at", { ascending: true }),
    listUserEmails(service),
    listSubscriptions(),
    service.from("platform_payments").select("amount, paid_on").then((r) => (r.error ? { data: [] } : r)),
  ]);

  const rows = (restaurants ?? []) as unknown as Restaurant[];
  const subByRestaurant = new Map(subs.map((s) => [s.restaurant_id, s]));

  const thisMonth = monthKey(new Date());
  const receivedThisMonth = (payments ?? [])
    .filter((p) => monthKey(p.paid_on as string) === thisMonth)
    .reduce((sum, p) => sum + Number(p.amount), 0);

  const billable = subs.filter((s) => s.status === "active" || s.status === "trial" || s.status === "past_due");
  const mrr = billable.reduce((sum, s) => sum + s.monthly_amount, 0);
  const pastDue = subs.filter((s) => s.status === "past_due").length;
  const suspended = subs.filter((s) => s.status === "suspended").length;
  const since30 = new Date(new Date().getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const newClients = rows.filter((r) => r.created_at >= since30).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Assinantes</h1>
        <p className="text-sm text-[#9c988f]">Contrato, módulos e mensalidade de cada cliente PeriniFood.</p>
      </div>

      {!ready && (
        <div className="flex items-start gap-2.5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          <p>
            As tabelas de assinatura ainda não existem no banco. Aplique a migration{" "}
            <code className="rounded bg-amber-100 px-1 py-0.5 text-xs">supabase/migrations/20260728000100_platform_billing.sql</code> para ativar plano,
            módulos, suspensão e faturamento.
          </p>
        </div>
      )}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatTile icon={Building2} label="Assinantes" value={String(rows.length)} hint={`${newClients} novos em 30 dias`} />
        <StatTile icon={Repeat} label="Receita recorrente" value={money(mrr)} hint="MRR contratado" />
        <StatTile icon={CircleDollarSign} label="Recebido no mês" value={money(receivedThisMonth)} hint="Mensalidades quitadas" />
        <StatTile icon={CalendarPlus} label="Em atraso" value={String(pastDue)} tone="warn" hint="Aguardando pagamento" />
        <StatTile icon={ShieldOff} label="Suspensos" value={String(suspended)} tone="danger" hint="Sem acesso ao sistema" />
      </section>

      <section className="overflow-hidden rounded-2xl border border-[#e7e4dd] bg-white shadow-[0_1px_2px_rgba(27,26,23,0.04)]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[880px] text-sm">
            <thead>
              <tr className="border-b border-[#efece6] text-left text-xs font-semibold uppercase tracking-wide text-[#6d6a63]">
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3">Contato</th>
                <th className="px-4 py-3">Plano</th>
                <th className="px-4 py-3">Situação</th>
                <th className="px-4 py-3 text-right">Mensalidade</th>
                <th className="px-4 py-3">Vencimento</th>
                <th className="px-4 py-3">Módulos</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const sub = subByRestaurant.get(r.id);
                const status = sub?.status ?? "trial";
                const mods = sub?.modules ?? [];
                return (
                  <tr key={r.id} className="border-b border-[#efece6] last:border-0 hover:bg-[#faf9f6]">
                    <td className="px-4 py-3">
                      <Link href={`/admin/clientes/${r.id}`} className="font-semibold text-[#1b1a17] transition hover:text-[#c5362e]">
                        {r.name}
                      </Link>
                      <p className="text-xs text-[#9c988f]">{[r.city, r.state].filter(Boolean).join(" / ") || `/${r.slug}`}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-[#6d6a63]">{sub?.contact_email || emailById.get(r.owner_id) || "—"}</td>
                    <td className="px-4 py-3 text-xs font-medium text-[#2b2925]">{planLabel[sub?.plan ?? ""] ?? sub?.plan ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-[0.65rem] font-medium ${statusToneSub[status]}`}>{statusLabelSub[status]}</span>
                    </td>
                    <td className="px-4 py-3 text-right font-medium [font-variant-numeric:tabular-nums]">{money(sub?.monthly_amount ?? 0)}</td>
                    <td className="px-4 py-3 text-xs text-[#6d6a63]">{sub ? `Dia ${sub.billing_day}` : "—"}</td>
                    <td className="px-4 py-3">
                      <div className="flex max-w-[240px] flex-wrap gap-1">
                        {mods.slice(0, 3).map((m) => (
                          <span key={m} className="rounded-full bg-[#f1efea] px-2 py-0.5 text-[0.65rem] font-medium text-[#6d6a63]">{moduleName(m)}</span>
                        ))}
                        {mods.length > 3 && <span className="rounded-full bg-[#f6ece9] px-2 py-0.5 text-[0.65rem] font-medium text-[#c5362e]">+{mods.length - 3}</span>}
                        {!mods.length && <span className="text-xs text-[#b0aaa0]">Nenhum</span>}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!rows.length && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-sm text-[#9c988f]">Nenhum assinante cadastrado.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <p className="text-xs text-[#b0aaa0]">
        Em respeito à LGPD, este painel não exibe faturamento, pedidos ou dados de consumidores dos clientes — apenas a relação comercial deles com a PeriniFood.
        {(payments ?? []).length > 0 && ` Formas de recebimento aceitas: ${Object.values(methodLabel).join(", ")}.`}
      </p>
    </div>
  );
}
