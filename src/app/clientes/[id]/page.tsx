import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { deleteCustomer, saveCustomer } from "@/app/actions";
import { AppShell } from "@/components/app-shell";
import { ActionFeedback } from "@/components/action-feedback";
import { SettingsCepLookup } from "@/components/settings-cep-lookup";
import { requireRestaurant } from "@/lib/auth";
import { loyaltySummary, withLoyaltyCampaign } from "@/lib/loyalty";
import { money, orderCode } from "@/lib/utils";
import type { Customer, Order } from "@/lib/types";

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="space-y-1">
      <span className="text-xs font-black uppercase text-slate-500">{label}</span>
      {children}
    </label>
  );
}

function shortDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo" }).format(new Date(value));
}

async function CustomerDetail({ id, status, error }: { id: string; status: string; error: string }) {
  const { supabase, restaurant } = await requireRestaurant();
  const [{ data: customer }, { data: orders }, { data: loyalty }] = await Promise.all([
    supabase.from("customers").select("*").eq("restaurant_id", restaurant.id).eq("id", id).maybeSingle(),
    supabase.from("orders").select("*").eq("restaurant_id", restaurant.id).eq("customer_id", id).order("created_at", { ascending: false }),
    supabase.from("loyalty_programs").select("*").eq("restaurant_id", restaurant.id).maybeSingle(),
  ]);

  if (!customer) notFound();

  const current = customer as Customer;
  const returnTo = `/clientes/${current.id}`;
  const fullAddress = [
    current.address,
    current.address_number ? `n ${current.address_number}` : null,
    current.neighborhood,
    current.city && current.state ? `${current.city}/${current.state}` : current.city || current.state,
    current.zip_code ? `CEP ${current.zip_code}` : null,
  ].filter(Boolean).join(" - ");
  const loyaltyInfo = loyaltySummary(withLoyaltyCampaign(loyalty, restaurant.opening_hours as Record<string, unknown> | null), (orders ?? []) as Order[]);

  return (
    <div className="space-y-6">
      <ActionFeedback status={status} error={error} />

      <section className="rounded-2xl bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <Link href="/clientes" className="text-sm font-black text-red-600">Voltar para clientes</Link>
            <h2 className="mt-2 text-2xl font-black">{current.name}</h2>
            <p className="text-sm text-slate-500">{current.phone || current.whatsapp || "Sem telefone"}</p>
            <p className="mt-1 text-sm text-slate-500">{fullAddress || "Endereço não informado."}</p>
          </div>
          <form action={deleteCustomer}>
            <input type="hidden" name="id" value={current.id} />
            <input type="hidden" name="return_to" value="/clientes" />
            <button className="h-10 rounded-lg border border-red-200 bg-white px-4 text-sm font-black text-red-600 transition hover:bg-red-50">
              Excluir cliente
            </button>
          </form>
        </div>
      </section>

      <form action={saveCustomer} className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <input type="hidden" name="id" value={current.id} />
        <input type="hidden" name="return_to" value={returnTo} />

        <section className="rounded-2xl bg-white p-5 shadow-sm">
          <h3 className="text-xl font-black">Editar cliente</h3>
          <p className="mt-1 text-sm text-slate-500">Atualize dados pessoais, contato e endereço usados nos pedidos.</p>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <Field label="Nome">
              <input className="field-light h-11" name="name" defaultValue={current.name} required />
            </Field>
            <Field label="E-mail">
              <input className="field-light h-11" name="email" type="email" defaultValue={current.email ?? ""} />
            </Field>
            <Field label="Telefone">
              <input className="field-light h-11" name="phone" defaultValue={current.phone ?? current.whatsapp ?? ""} />
            </Field>
            <Field label="CPF">
              <input className="field-light h-11" name="cpf" defaultValue={current.cpf ?? ""} />
            </Field>
            <Field label="Data de nascimento">
              <input className="field-light h-11" name="birth_date" type="date" defaultValue={current.birth_date?.slice(0, 10) ?? ""} />
            </Field>
          </div>

          <div className="mt-6 border-t border-slate-100 pt-5">
            <h4 className="font-black">Endereço</h4>
            <div className="mt-4 grid gap-4 md:grid-cols-4">
              <div className="md:col-span-2">
                <Field label="CEP">
                  <SettingsCepLookup
                    defaultValue={current.zip_code}
                    inputClassName="field-light h-11"
                    buttonClassName="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 transition hover:border-red-300 hover:text-red-600"
                    buttonLabel="Buscar"
                  />
                </Field>
              </div>
              <Field label="Endereço">
                <input className="field-light h-11 md:col-span-2" name="address" defaultValue={current.address ?? ""} />
              </Field>
              <Field label="Número">
                <input className="field-light h-11" name="address_number" defaultValue={current.address_number ?? ""} />
              </Field>
              <Field label="Bairro">
                <input className="field-light h-11" name="neighborhood" defaultValue={current.neighborhood ?? ""} />
              </Field>
              <Field label="Cidade">
                <input className="field-light h-11" name="city" defaultValue={current.city ?? ""} />
              </Field>
              <Field label="UF">
                <input className="field-light h-11 uppercase" name="state" maxLength={2} defaultValue={current.state ?? ""} />
              </Field>
              <Field label="Complemento">
                <input className="field-light h-11" name="complement" defaultValue={current.complement ?? ""} />
              </Field>
              <div className="md:col-span-4">
                <Field label="Ponto de referência">
                  <input className="field-light h-11" name="reference" defaultValue={current.reference ?? ""} />
                </Field>
              </div>
            </div>
          </div>

          <div className="mt-6">
            <Field label="Observações internas">
              <textarea className="field-light min-h-24" name="notes" defaultValue={current.notes ?? ""} />
            </Field>
          </div>

          <button className="mt-5 h-11 w-full rounded-lg bg-gradient-to-r from-[#2F3740] to-[#E50914] px-5 text-sm font-black text-white shadow-sm transition hover:brightness-105">
            Salvar alterações
          </button>
        </section>

        <aside className="space-y-6">
          <section className="rounded-2xl bg-white p-5 shadow-sm">
            <h3 className="text-xl font-black">Resetar senha</h3>
            <p className="mt-1 text-sm text-slate-500">Preencha uma nova senha para o cliente acessar a conta no cardápio online.</p>
            <Field label="Nova senha">
              <input className="field-light mt-4 h-11" name="new_password" type="password" minLength={6} placeholder="Mínimo 6 caracteres" />
            </Field>
            <p className="mt-3 rounded-lg bg-red-50 p-3 text-xs font-bold text-red-800">Se deixar em branco, a senha atual não será alterada.</p>
          </section>

          <section className="rounded-2xl bg-white p-5 shadow-sm">
            <h3 className="text-xl font-black">Resumo</h3>
            <div className="mt-4 space-y-3 text-sm text-slate-600">
              <p><strong className="text-slate-900">Cliente desde:</strong> {new Date(current.created_at).toLocaleDateString("pt-BR")}</p>
              <p><strong className="text-slate-900">Pedidos:</strong> {(orders ?? []).length}</p>
              <p><strong className="text-slate-900">Total comprado:</strong> {money(((orders ?? []) as Order[]).reduce((sum, order) => sum + Number(order.total ?? 0), 0))}</p>
              <p><strong className="text-slate-900">Pontos de fidelidade:</strong> {loyaltyInfo.points}</p>
              <p><strong className="text-slate-900">Benefícios disponíveis:</strong> {loyaltyInfo.rewardsAvailable}</p>
              <p><strong className="text-slate-900">Validade:</strong> {loyaltyInfo.pointsValidityMonths} meses após cada pedido</p>
              <p><strong className="text-slate-900">Campanha:</strong> {loyaltyInfo.campaignStartsAt ? shortDate(loyaltyInfo.campaignStartsAt) : "sem início"} até {loyaltyInfo.campaignEndsAt ? shortDate(loyaltyInfo.campaignEndsAt) : "sem fim"}</p>
              {Boolean(loyaltyInfo.expiredPoints) && <p><strong className="text-slate-900">Pontos vencidos:</strong> {loyaltyInfo.expiredPoints}</p>}
            </div>
          </section>

          <section className="rounded-2xl bg-white p-5 shadow-sm">
            <h3 className="text-xl font-black">Validade dos pontos</h3>
            <div className="mt-4 space-y-2 text-sm text-slate-600">
              {loyaltyInfo.expiringBatches.map((batch) => (
                <p key={`${batch.orderId ?? batch.expiresAt}-${batch.points}`} className="rounded-lg bg-amber-50 p-3 font-bold text-amber-900">
                  {batch.points} ponto(s) vencem em {shortDate(batch.expiresAt)}
                </p>
              ))}
              {!loyaltyInfo.expiringBatches.length && <p className="rounded-lg bg-slate-50 p-3 font-semibold text-slate-500">Nenhum ponto válido para vencer.</p>}
            </div>
          </section>
        </aside>
      </form>

      <section className="rounded-2xl bg-white p-5 shadow-sm">
        <h3 className="text-xl font-black">Histórico de pedidos</h3>
        <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
          <div className="grid grid-cols-[140px_minmax(140px,1fr)_130px_120px] gap-3 border-b border-slate-200 bg-slate-50 px-4 py-2 text-[11px] font-black uppercase text-slate-500 max-md:hidden">
            <span>Pedido</span>
            <span>Data</span>
            <span>Status</span>
            <span className="text-right">Total</span>
          </div>
          <div className="divide-y divide-slate-200">
            {((orders ?? []) as Order[]).map((order) => (
              <Link key={order.id} href={`/pedidos/${order.id}`} className="grid gap-2 px-4 py-3 text-sm transition hover:bg-slate-50 md:grid-cols-[140px_minmax(140px,1fr)_130px_120px] md:items-center">
                <span className="font-black">#{orderCode(order)}</span>
                <span className="text-slate-500">{new Date(order.created_at).toLocaleString("pt-BR")}</span>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-center text-xs font-black text-slate-600">{order.status}</span>
                <strong className="md:text-right">{money(order.total)}</strong>
              </Link>
            ))}
            {!(orders ?? []).length && <p className="p-5 text-sm text-slate-500">Nenhum pedido vinculado ainda.</p>}
          </div>
        </div>
      </section>
    </div>
  );
}

export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ status: string; error: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  return <AppShell><CustomerDetail id={id} status={sp.status} error={sp.error} /></AppShell>;
}
