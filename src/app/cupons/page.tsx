import { deleteCoupon, saveCoupon, saveLoyaltyProgram } from "@/app/actions";
import { ActionFeedback } from "@/components/action-feedback";
import { AppShell } from "@/components/app-shell";
import { requireRestaurant } from "@/lib/auth";
import { loyaltyCampaignFromOpeningHours } from "@/lib/loyalty";
import { money } from "@/lib/utils";
import type { Coupon, LoyaltyProgram } from "@/lib/types";

function discountLabel(coupon: Coupon) {
  return coupon.discount_type === "percent" ? `${Number(coupon.discount_value)}%` : money(coupon.discount_value);
}

function dateLabel(value: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

async function CouponsContent({ searchParams }: { searchParams: Promise<{ status: string; error: string }> }) {
  const sp = await searchParams;
  const { supabase, restaurant, role } = await requireRestaurant();
  const canEdit = role === "owner" || role === "admin" || role === "manager";
  const [{ data: coupons, error: couponsError }, { data: loyalty }] = await Promise.all([
    supabase.from("coupons").select("*").eq("restaurant_id", restaurant.id).order("created_at", { ascending: false }),
    supabase.from("loyalty_programs").select("*").eq("restaurant_id", restaurant.id).maybeSingle(),
  ]);
  const currentLoyalty = (loyalty ?? {
    enabled: false,
    points_per_currency: 1,
    points_to_reward: 10,
    reward_type: "percent",
    reward_value: 0,
  }) as LoyaltyProgram;
  const loyaltyCampaign = loyaltyCampaignFromOpeningHours(restaurant.opening_hours as Record<string, unknown> | null);

  return (
    <div className="space-y-6">
      <ActionFeedback status={sp.status} error={sp.error ?? couponsError?.message} />

      <section className="rounded-2xl bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-slate-900">Cupons e fidelidade</h1>
            <p className="mt-1 text-slate-500">Crie descontos e regras simples para incentivar recompra no cardápio online.</p>
          </div>
          {canEdit && (
            <details className="group relative">
              <summary className="inline-flex cursor-pointer list-none items-center justify-center rounded-xl bg-gradient-to-r from-[#E50914] to-[#FF2A35] px-6 py-3 text-sm font-black text-slate-950 shadow-[0_14px_30px_rgba(229,9,20,0.18)]">
                Adicionar cupom
              </summary>
              <form action={saveCoupon} className="absolute right-0 z-10 mt-3 w-[min(92vw,520px)] rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
                <h2 className="text-xl font-black">Novo cupom</h2>
                <p className="mt-1 text-sm text-slate-500">Defina código, valor do desconto e regras de uso.</p>
                <div className="mt-4 grid gap-3">
                  <input className="field-light uppercase" name="code" placeholder="Código. Ex.: PRIMEIRA10" required />
                  <textarea className="field-light min-h-20" name="description" placeholder="Descrição para o cliente" />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <select className="field-light" name="discount_type" defaultValue="percent">
                      <option value="percent">Percentual</option>
                      <option value="fixed">Valor fixo</option>
                    </select>
                    <input className="field-light" name="discount_value" type="number" min="0" step="0.01" placeholder="Desconto" required />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <input className="field-light" name="minimum_order" type="number" min="0" step="0.01" placeholder="Pedido mínimo" defaultValue="0" />
                    <input className="field-light" name="max_uses" type="number" min="1" step="1" placeholder="Limite de usos" />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="text-sm font-bold text-slate-500">Início<input className="field-light mt-1" name="starts_at" type="datetime-local" /></label>
                    <label className="text-sm font-bold text-slate-500">Fim<input className="field-light mt-1" name="ends_at" type="datetime-local" /></label>
                  </div>
                  <label className="flex items-center gap-2 text-sm font-bold"><input name="active" type="checkbox" defaultChecked /> Cupom ativo</label>
                  <button className="btn-primary">Salvar cupom</button>
                </div>
              </form>
            </details>
          )}
        </div>

        <div className="mt-6 overflow-hidden rounded-xl border border-slate-200">
          <div className="grid grid-cols-[1.4fr_120px_150px_120px_120px_160px] gap-3 border-b border-slate-200 bg-slate-50/80 px-4 py-3 text-[11px] font-black uppercase text-slate-500 max-xl:hidden">
            <span>Código</span>
            <span>Desconto</span>
            <span>Pedido mínimo</span>
            <span>Uso</span>
            <span>Situação</span>
            <span className="text-right">Ações</span>
          </div>
          <div className="divide-y divide-slate-200">
            {((coupons ?? []) as Coupon[]).map((coupon) => (
              <div key={coupon.id} className="grid gap-3 px-4 py-3 transition hover:bg-red-50/50 xl:grid-cols-[1.4fr_120px_150px_120px_120px_160px] xl:items-center">
                <div className="min-w-0">
                  <p className="truncate text-base font-black text-slate-900">{coupon.code}</p>
                  <p className="truncate text-sm text-slate-500">{coupon.description || "Sem descrição"}</p>
                  <p className="mt-1 text-xs text-slate-400">Válido: {dateLabel(coupon.starts_at)} até {dateLabel(coupon.ends_at)}</p>
                </div>
                <strong>{discountLabel(coupon)}</strong>
                <span>{money(coupon.minimum_order)}</span>
                <span>{coupon.used_count}{coupon.max_uses ? ` / ${coupon.max_uses}` : ""}</span>
                <span className={coupon.active ? "inline-flex h-9 items-center justify-center rounded-full bg-emerald-50 px-4 text-xs font-black text-emerald-700" : "inline-flex h-9 items-center justify-center rounded-full bg-slate-100 px-4 text-xs font-black text-slate-500"}>
                  {coupon.active ? "Ativo" : "Inativo"}
                </span>
                <div className="flex justify-start gap-2 xl:justify-end">
                  {canEdit && (
                    <form action={deleteCoupon}>
                      <input type="hidden" name="id" value={coupon.id} />
                      <button className="inline-flex h-10 items-center rounded-lg border border-red-200 px-4 text-sm font-black text-red-600 transition hover:bg-red-50">Excluir</button>
                    </form>
                  )}
                </div>
              </div>
            ))}
            {!(coupons ?? []).length && (
              <div className="px-4 py-10 text-center text-sm font-semibold text-slate-500">Nenhum cupom cadastrado.</div>
            )}
          </div>
        </div>
      </section>

      <section className="rounded-2xl bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black text-slate-900">Programa de fidelidade</h2>
            <p className="mt-1 text-slate-500">Cada pedido pago ou concluído gera 1 ponto, desde que esteja dentro da campanha.</p>
          </div>
          <span className={currentLoyalty.enabled ? "rounded-full bg-emerald-50 px-4 py-2 text-xs font-black text-emerald-700" : "rounded-full bg-slate-100 px-4 py-2 text-xs font-black text-slate-500"}>
            {currentLoyalty.enabled ? "Ativo" : "Inativo"}
          </span>
        </div>

        <form action={saveLoyaltyProgram} className="mt-5 grid gap-3 lg:grid-cols-5">
          <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm font-bold">
            <input name="enabled" type="checkbox" defaultChecked={Boolean(currentLoyalty.enabled)} disabled={!canEdit} />
            Ativo
          </label>
          <input type="hidden" name="points_per_currency" value="1" />
          <div className="flex h-12 items-center rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-black text-slate-700">
            1 ponto por pedido
          </div>
          <input className="field-light" name="points_to_reward" type="number" min="1" step="1" placeholder="Pontos para prêmio" defaultValue={currentLoyalty.points_to_reward ?? 10} disabled={!canEdit} />
          <select className="field-light" name="reward_type" defaultValue={currentLoyalty.reward_type ?? "percent"} disabled={!canEdit}>
            <option value="percent">Desconto percentual</option>
            <option value="fixed">Desconto fixo</option>
          </select>
          <input className="field-light" name="reward_value" type="number" min="0" step="0.01" placeholder="Valor do benefício" defaultValue={currentLoyalty.reward_value ?? 5} disabled={!canEdit} />
          <label className="space-y-1 lg:col-span-2">
            <span className="text-xs font-black uppercase text-slate-500">Início da campanha</span>
            <input className="field-light" name="campaign_starts_at" type="date" defaultValue={loyaltyCampaign.campaign_starts_at ?? ""} disabled={!canEdit} />
          </label>
          <label className="space-y-1 lg:col-span-3">
            <span className="text-xs font-black uppercase text-slate-500">Fim da campanha</span>
            <input className="field-light" name="campaign_ends_at" type="date" defaultValue={loyaltyCampaign.campaign_ends_at ?? ""} disabled={!canEdit} />
          </label>
          <textarea className="field-light min-h-20 lg:col-span-5" name="description" placeholder="Mensagem do programa para o cliente" defaultValue={currentLoyalty.description ?? "Ganhe 1 ponto a cada pedido dentro da campanha e troque por descontos."} disabled={!canEdit} />
          {canEdit && <button className="btn-primary lg:col-span-5">Salvar fidelidade</button>}
        </form>
      </section>
    </div>
  );
}

export default function CouponsPage({ searchParams }: { searchParams: Promise<{ status: string; error: string }> }) {
  return (
    <AppShell>
      <CouponsContent searchParams={searchParams} />
    </AppShell>
  );
}
