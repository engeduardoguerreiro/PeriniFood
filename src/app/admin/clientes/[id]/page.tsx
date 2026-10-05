import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Blocks, CheckCircle2, CreditCard, KeyRound, ReceiptText, Store, Trash2 } from "lucide-react";
import { SubmitButton } from "@/components/submit-button";
import { listUserEmails, requirePlatformAdmin } from "@/lib/platform-admin";
import {
  getSubscription,
  methodLabel,
  monthLabel,
  planLabel,
  PLANS,
  statusLabelSub,
  statusToneSub,
  type Payment,
} from "@/lib/platform-billing";
import { MODULE_GROUPS, PLATFORM_MODULES, stageLabel, stageTone } from "@/lib/platform-modules";
import { money } from "@/lib/utils";
import type { Restaurant } from "@/lib/types";
import { deletePayment, registerPayment, saveClient, saveModules, saveSubscription, setSubscriptionStatus } from "@/app/admin/actions";

const roleLabel: Record<string, string> = {
  owner: "Dono",
  admin: "Administrador",
  manager: "Gerente",
  cashier: "Caixa",
  kitchen: "Cozinha",
};

const field = "mt-1 w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink-body outline-none transition focus:border-brand";
const labelCls = "text-[0.65rem] font-semibold uppercase tracking-wide text-ink-faint";

const feedbackText: Record<string, string> = {
  cliente: "Dados do cliente salvos.",
  assinatura: "Assinatura atualizada.",
  modulos: "Módulos salvos.",
  status: "Situação da assinatura atualizada.",
  pagamento: "Pagamento registrado.",
  "pagamento-removido": "Lançamento removido.",
};

function Card({ title, icon: Icon, children, aside }: { title: string; icon: typeof Store; children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-line bg-white p-5 shadow-[0_1px_2px_rgba(27,26,23,0.04)]">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="grid h-6 w-6 place-items-center rounded-full bg-brand-soft text-brand"><Icon size={13} /></span>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-ink-soft">{title}</h2>
        </div>
        {aside}
      </div>
      {children}
    </section>
  );
}

export default async function AdminClientPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ok?: string }>;
}) {
  const { service } = await requirePlatformAdmin();
  const { id } = await params;
  const { ok } = await searchParams;
  const feedback = ok ? feedbackText[ok] : null;

  const { data: restaurant } = await service.from("restaurants").select("*").eq("id", id).maybeSingle();
  if (!restaurant) notFound();
  const r = restaurant as Restaurant;

  const [{ sub, ready }, { data: paymentRows }, { data: members }, emailById] = await Promise.all([
    getSubscription(id),
    service.from("platform_payments").select("*").eq("restaurant_id", id).order("paid_on", { ascending: false }).limit(24).then((x) => (x.error ? { data: [] } : x)),
    service.from("restaurant_users").select("user_id, role").eq("restaurant_id", id),
    listUserEmails(service),
  ]);

  const payments = (paymentRows ?? []) as unknown as Payment[];
  const status = sub?.status ?? "pending";
  const pending = status === "pending";
  const enabled = new Set(sub?.modules ?? []);
  const suspended = status === "suspended" || status === "canceled";
  const paidTotal = payments.reduce((sum, p) => sum + Number(p.amount), 0);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/admin" className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-faint transition hover:text-brand">
            <ArrowLeft size={13} /> Todos os assinantes
          </Link>
          <div className="mt-1.5 flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">{r.name}</h1>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusToneSub[status]}`}>{statusLabelSub[status]}</span>
            {sub?.suspension_reason && <span className="text-xs text-ink-faint">{sub.suspension_reason}</span>}
          </div>
          <p className="text-sm text-ink-faint">Cliente desde {new Date(r.created_at).toLocaleDateString("pt-BR")} · /{r.slug}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {pending ? (
            <>
              <form action={setSubscriptionStatus}>
                <input type="hidden" name="restaurant_id" value={id} />
                <input type="hidden" name="status" value="active" />
                <button className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700">Ativar loja</button>
              </form>
              <form action={setSubscriptionStatus}>
                <input type="hidden" name="restaurant_id" value={id} />
                <input type="hidden" name="status" value="trial" />
                <button className="rounded-xl border border-sky-300 bg-sky-50 px-4 py-2 text-sm font-medium text-sky-800 transition hover:bg-sky-100">Liberar como teste</button>
              </form>
            </>
          ) : suspended ? (
            <form action={setSubscriptionStatus}>
              <input type="hidden" name="restaurant_id" value={id} />
              <input type="hidden" name="status" value="active" />
              <button className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700">Reativar acesso</button>
            </form>
          ) : (
            <>
              <form action={setSubscriptionStatus}>
                <input type="hidden" name="restaurant_id" value={id} />
                <input type="hidden" name="status" value="past_due" />
                <button className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-800 transition hover:bg-amber-100">
                  Marcar em atraso
                </button>
              </form>
              <form action={setSubscriptionStatus} className="flex items-center gap-2">
                <input type="hidden" name="restaurant_id" value={id} />
                <input type="hidden" name="status" value="suspended" />
                <input name="suspension_reason" placeholder="Motivo (opcional)" className="w-44 rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-brand" />
                <button className="rounded-xl bg-brand px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-strong">Suspender sistema</button>
              </form>
            </>
          )}
        </div>
      </div>

      {feedback && (
        <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
          <CheckCircle2 size={16} className="shrink-0" />
          {feedback}
        </div>
      )}

      {suspended && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
          O acesso deste cliente ao sistema está <strong>bloqueado</strong>. Ele vê um aviso de assinatura suspensa ao entrar. Ao receber o pagamento
          (inclusive em dinheiro), registre abaixo com &quot;reativar&quot; marcado — ou use o botão Reativar acesso.
        </div>
      )}

      {!ready && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Aplique a migration <code className="rounded bg-amber-100 px-1 py-0.5 text-xs">20260728000100_platform_billing.sql</code> para salvar plano, módulos e pagamentos.
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Dados do cliente" icon={Store}>
          <form action={saveClient} className="space-y-3">
            <input type="hidden" name="restaurant_id" value={id} />
            <div>
              <label className={labelCls}>Nome do restaurante</label>
              <input name="name" defaultValue={r.name} className={field} required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className={labelCls}>Telefone</label><input name="phone" defaultValue={r.phone ?? ""} className={field} /></div>
              <div><label className={labelCls}>WhatsApp</label><input name="whatsapp" defaultValue={r.whatsapp ?? ""} className={field} /></div>
            </div>
            <div><label className={labelCls}>E-mail</label><input name="email" type="email" defaultValue={r.email ?? ""} className={field} /></div>
            <div className="grid grid-cols-[1fr_90px] gap-3">
              <div><label className={labelCls}>Cidade</label><input name="city" defaultValue={r.city ?? ""} className={field} /></div>
              <div><label className={labelCls}>UF</label><input name="state" defaultValue={r.state ?? ""} maxLength={2} className={field} /></div>
            </div>
            <SubmitButton>Salvar dados</SubmitButton>
          </form>
        </Card>

        <Card title="Assinatura" icon={CreditCard}>
          <form action={saveSubscription} className="space-y-3">
            <input type="hidden" name="restaurant_id" value={id} />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Plano</label>
                <select name="plan" defaultValue={sub?.plan ?? "basico"} className={field}>
                  {PLANS.map((p) => <option key={p} value={p}>{planLabel[p]}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Mensalidade (R$)</label>
                <input name="monthly_amount" inputMode="decimal" defaultValue={String(sub?.monthly_amount ?? 0)} className={field} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className={labelCls}>Dia de vencimento</label><input name="billing_day" type="number" min={1} max={28} defaultValue={sub?.billing_day ?? 5} className={field} /></div>
              <div><label className={labelCls}>Responsável</label><input name="contact_name" defaultValue={sub?.contact_name ?? ""} className={field} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className={labelCls}>E-mail de cobrança</label><input name="contact_email" type="email" defaultValue={sub?.contact_email ?? ""} className={field} /></div>
              <div><label className={labelCls}>Telefone de cobrança</label><input name="contact_phone" defaultValue={sub?.contact_phone ?? ""} className={field} /></div>
            </div>
            <div><label className={labelCls}>Observações internas</label><textarea name="notes" rows={2} defaultValue={sub?.notes ?? ""} className={field} /></div>
            <SubmitButton>Salvar assinatura</SubmitButton>
          </form>
        </Card>
      </div>

      <Card
        title="Módulos contratados"
        icon={Blocks}
        aside={<span className="text-xs text-ink-faint">{enabled.size} de {PLATFORM_MODULES.length} liberados</span>}
      >
        <form action={saveModules} className="space-y-5">
          <input type="hidden" name="restaurant_id" value={id} />
          {MODULE_GROUPS.map((group) => (
            <div key={group}>
              <p className="mb-2 text-[0.65rem] font-semibold uppercase tracking-wide text-ink-faint">{group}</p>
              <div className="grid gap-2 md:grid-cols-2">
                {PLATFORM_MODULES.filter((m) => m.group === group).map((m) => (
                  <label key={m.key} className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-line p-3 transition hover:border-[#dcd8cf] has-[:checked]:border-brand has-[:checked]:bg-[#fdf7f6]">
                    <input type="checkbox" name="module" value={m.key} defaultChecked={enabled.has(m.key)} className="mt-0.5 h-4 w-4 accent-brand" />
                    <span className="min-w-0">
                      <span className="flex flex-wrap items-center gap-1.5">
                        <span className="text-sm font-medium text-ink-body">{m.name}</span>
                        <span className={`rounded-full px-1.5 py-0.5 text-[0.6rem] font-medium ${stageTone[m.stage]}`}>{stageLabel[m.stage]}</span>
                      </span>
                      <span className="mt-0.5 block text-xs text-ink-faint">{m.description}</span>
                    </span>
                  </label>
                ))}
              </div>
            </div>
          ))}
          <SubmitButton>Salvar módulos</SubmitButton>
        </form>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        <Card title="Registrar pagamento" icon={ReceiptText}>
          <form action={registerPayment} className="space-y-3">
            <input type="hidden" name="restaurant_id" value={id} />
            <div className="grid grid-cols-2 gap-3">
              <div><label className={labelCls}>Valor (R$)</label><input name="amount" inputMode="decimal" defaultValue={String(sub?.monthly_amount ?? 0)} className={field} required /></div>
              <div>
                <label className={labelCls}>Forma</label>
                <select name="method" className={field}>
                  {Object.entries(methodLabel).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className={labelCls}>Data do pagamento</label><input name="paid_on" type="date" defaultValue={today} className={field} /></div>
              <div><label className={labelCls}>Competência</label><input name="reference_month" type="month" defaultValue={today.slice(0, 7)} className={field} /></div>
            </div>
            <div><label className={labelCls}>Observação</label><input name="notes" placeholder="Ex.: pago em dinheiro na loja" className={field} /></div>
            <label className="flex items-center gap-2 text-sm text-ink-body">
              <input type="checkbox" name="reactivate" defaultChecked className="h-4 w-4 accent-brand" />
              Reativar acesso do cliente ao registrar
            </label>
            <SubmitButton pendingLabel="Lançando…">Lançar pagamento</SubmitButton>
          </form>
        </Card>

        <Card title="Histórico de mensalidades" icon={ReceiptText} aside={<span className="text-xs font-medium text-ink-soft">Total {money(paidTotal)}</span>}>
          {payments.length ? (
            <ul className="divide-y divide-line-soft">
              {payments.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div>
                    <p className="text-sm font-medium text-ink-body">{money(Number(p.amount))} <span className="text-xs font-normal text-ink-faint">· {methodLabel[p.method] ?? p.method}</span></p>
                    <p className="text-xs text-ink-faint">
                      Pago em {new Date(`${p.paid_on}T12:00:00`).toLocaleDateString("pt-BR")} · ref. {monthLabel(String(p.reference_month).slice(0, 7))}
                      {p.notes ? ` · ${p.notes}` : ""}
                    </p>
                  </div>
                  <form action={deletePayment}>
                    <input type="hidden" name="restaurant_id" value={id} />
                    <input type="hidden" name="payment_id" value={p.id} />
                    <button aria-label="Excluir lançamento" className="grid h-8 w-8 place-items-center rounded-lg border border-line text-ink-faint transition hover:border-brand hover:text-brand">
                      <Trash2 size={13} />
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-ink-faint">Nenhuma mensalidade registrada.</p>
          )}
        </Card>
      </div>

      <Card title="Acessos do cliente" icon={KeyRound}>
        {(members ?? []).length ? (
          <ul className="grid gap-2 md:grid-cols-2">
            {(members ?? []).map((m) => (
              <li key={m.user_id} className="flex items-center justify-between gap-3 rounded-xl border border-line px-3 py-2">
                <span className="truncate text-sm text-ink-body">{emailById.get(m.user_id) || m.user_id}</span>
                <span className="rounded-full bg-[#f1efea] px-2 py-0.5 text-[0.65rem] font-medium text-ink-soft">{roleLabel[m.role] ?? m.role}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-ink-faint">Nenhum usuário vinculado.</p>
        )}
      </Card>
    </div>
  );
}
