import Link from "next/link";
import { CalendarRange, CircleDollarSign, Repeat, Users } from "lucide-react";
import { requirePlatformAdmin } from "@/lib/platform-admin";
import { listSubscriptions, methodLabel, monthKey, planLabel, statusLabelSub, statusToneSub, type Payment } from "@/lib/platform-billing";
import { money } from "@/lib/utils";

function Tile({ icon: Icon, label, value, hint }: { icon: typeof Users; label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-line bg-white p-4 shadow-[0_1px_2px_rgba(27,26,23,0.04)]">
      <div className="flex items-center gap-2">
        <span className="grid h-6 w-6 place-items-center rounded-full bg-brand-soft text-brand"><Icon size={13} /></span>
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">{label}</p>
      </div>
      <p className="mt-2 text-2xl font-semibold tracking-tight [font-variant-numeric:tabular-nums]">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-ink-faint">{hint}</p>}
    </div>
  );
}

export default async function AdminReportsPage({ searchParams }: { searchParams: Promise<{ ano?: string }> }) {
  const { service } = await requirePlatformAdmin();
  const { ano } = await searchParams;

  const [{ data: paymentRows }, { subs }, { data: restaurants }] = await Promise.all([
    service.from("platform_payments").select("*").order("paid_on", { ascending: false }).then((x) => (x.error ? { data: [] } : x)),
    listSubscriptions(),
    service.from("restaurants").select("id, name"),
  ]);

  const payments = (paymentRows ?? []) as unknown as Payment[];
  const nameById = new Map((restaurants ?? []).map((r) => [r.id as string, r.name as string]));
  const subByRestaurant = new Map(subs.map((s) => [s.restaurant_id, s]));

  const years = [...new Set(payments.map((p) => new Date(`${p.paid_on}T12:00:00`).getFullYear()))].sort((a, b) => b - a);
  const currentYear = new Date().getFullYear();
  if (!years.includes(currentYear)) years.unshift(currentYear);
  const year = Number(ano) || currentYear;

  const ofYear = payments.filter((p) => new Date(`${p.paid_on}T12:00:00`).getFullYear() === year);
  const yearTotal = ofYear.reduce((s, p) => s + Number(p.amount), 0);
  const thisMonthTotal = payments.filter((p) => monthKey(p.paid_on) === monthKey(new Date())).reduce((s, p) => s + Number(p.amount), 0);

  const byMonth = new Map<number, { total: number; count: number }>();
  for (const p of ofYear) {
    const m = new Date(`${p.paid_on}T12:00:00`).getMonth();
    const acc = byMonth.get(m) ?? { total: 0, count: 0 };
    byMonth.set(m, { total: acc.total + Number(p.amount), count: acc.count + 1 });
  }

  const byMethod = new Map<string, number>();
  for (const p of ofYear) byMethod.set(p.method, (byMethod.get(p.method) ?? 0) + Number(p.amount));

  const byPlan = new Map<string, { total: number; clients: Set<string> }>();
  for (const p of ofYear) {
    const plan = subByRestaurant.get(p.restaurant_id)?.plan ?? "—";
    const acc = byPlan.get(plan) ?? { total: 0, clients: new Set<string>() };
    acc.total += Number(p.amount);
    acc.clients.add(p.restaurant_id);
    byPlan.set(plan, acc);
  }

  const billable = subs.filter((s) => ["active", "trial", "past_due"].includes(s.status));
  const mrr = billable.reduce((s, x) => s + x.monthly_amount, 0);
  const inadimplentes = subs.filter((s) => s.status === "past_due" || s.status === "suspended");
  const payingClients = new Set(ofYear.map((p) => p.restaurant_id)).size;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Relatórios de faturamento</h1>
          <p className="text-sm text-ink-faint">Mensalidades recebidas dos assinantes PeriniFood.</p>
        </div>
        <div className="flex items-center gap-1.5">
          {years.map((y) => (
            <Link
              key={y}
              href={`/admin/relatorios?ano=${y}`}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${y === year ? "bg-btn text-white" : "border border-line bg-white text-ink-soft hover:border-brand hover:text-brand"}`}
            >
              {y}
            </Link>
          ))}
        </div>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Tile icon={CalendarRange} label={`Recebido em ${year}`} value={money(yearTotal)} hint={`${ofYear.length} mensalidades`} />
        <Tile icon={CircleDollarSign} label="Recebido no mês" value={money(thisMonthTotal)} />
        <Tile icon={Repeat} label="Receita recorrente" value={money(mrr)} hint={`${billable.length} assinaturas ativas`} />
        <Tile icon={Users} label="Clientes pagantes" value={String(payingClients)} hint={`em ${year}`} />
      </section>

      <section className="overflow-hidden rounded-2xl border border-line bg-white shadow-[0_1px_2px_rgba(27,26,23,0.04)]">
        <div className="border-b border-line-soft px-4 py-3">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-ink-soft">Faturamento mês a mês · {year}</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line-soft text-left text-xs font-semibold uppercase tracking-wide text-ink-soft">
              <th className="px-4 py-2.5">Mês</th>
              <th className="px-4 py-2.5 text-right">Mensalidades</th>
              <th className="px-4 py-2.5 text-right">Recebido</th>
              <th className="px-4 py-2.5 text-right">% do ano</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 12 }, (_, m) => {
              const row = byMonth.get(m) ?? { total: 0, count: 0 };
              const share = yearTotal ? (row.total / yearTotal) * 100 : 0;
              return (
                <tr key={m} className="border-b border-line-soft last:border-0">
                  <td className="px-4 py-2.5 capitalize text-ink-body">{new Date(year, m, 1).toLocaleDateString("pt-BR", { month: "long" })}</td>
                  <td className="px-4 py-2.5 text-right text-ink-soft [font-variant-numeric:tabular-nums]">{row.count || "—"}</td>
                  <td className="px-4 py-2.5 text-right font-medium [font-variant-numeric:tabular-nums]">{row.total ? money(row.total) : "—"}</td>
                  <td className="px-4 py-2.5 text-right text-xs text-ink-faint [font-variant-numeric:tabular-nums]">{row.total ? `${share.toFixed(1)}%` : "—"}</td>
                </tr>
              );
            })}
            <tr className="bg-[#faf9f6] font-semibold">
              <td className="px-4 py-3">Total {year}</td>
              <td className="px-4 py-3 text-right [font-variant-numeric:tabular-nums]">{ofYear.length}</td>
              <td className="px-4 py-3 text-right [font-variant-numeric:tabular-nums]">{money(yearTotal)}</td>
              <td className="px-4 py-3 text-right text-xs text-ink-faint">100%</td>
            </tr>
          </tbody>
        </table>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-line bg-white p-5">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-soft">Por plano · {year}</h2>
          {byPlan.size ? (
            <ul className="divide-y divide-line-soft">
              {[...byPlan.entries()].sort((a, b) => b[1].total - a[1].total).map(([plan, v]) => (
                <li key={plan} className="flex items-center justify-between py-2.5 text-sm">
                  <span className="text-ink-body">{planLabel[plan] ?? plan} <span className="text-xs text-ink-faint">· {v.clients.size} cliente(s)</span></span>
                  <strong className="[font-variant-numeric:tabular-nums]">{money(v.total)}</strong>
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-ink-faint">Sem recebimentos no período.</p>}
        </section>

        <section className="rounded-2xl border border-line bg-white p-5">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-soft">Por forma de pagamento · {year}</h2>
          {byMethod.size ? (
            <ul className="divide-y divide-line-soft">
              {[...byMethod.entries()].sort((a, b) => b[1] - a[1]).map(([m, total]) => (
                <li key={m} className="flex items-center justify-between py-2.5 text-sm">
                  <span className="text-ink-body">{methodLabel[m] ?? m}</span>
                  <strong className="[font-variant-numeric:tabular-nums]">{money(total)}</strong>
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-ink-faint">Sem recebimentos no período.</p>}
        </section>
      </div>

      <section className="rounded-2xl border border-line bg-white p-5">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-soft">Pendências</h2>
        {inadimplentes.length ? (
          <ul className="divide-y divide-line-soft">
            {inadimplentes.map((s) => (
              <li key={s.restaurant_id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <Link href={`/admin/clientes/${s.restaurant_id}`} className="font-medium text-ink-body transition hover:text-brand">
                  {nameById.get(s.restaurant_id) ?? s.restaurant_id}
                </Link>
                <span className="flex items-center gap-3">
                  <span className="text-xs text-ink-faint [font-variant-numeric:tabular-nums]">{money(s.monthly_amount)}/mês · vence dia {s.billing_day}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[0.65rem] font-medium ${statusToneSub[s.status]}`}>{statusLabelSub[s.status]}</span>
                </span>
              </li>
            ))}
          </ul>
        ) : <p className="text-sm text-ink-faint">Nenhum assinante em atraso. 🎉</p>}
      </section>
    </div>
  );
}
