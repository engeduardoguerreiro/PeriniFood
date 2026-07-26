import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { deleteCustomer, saveCustomer } from "@/app/actions";
import { AppShell } from "@/components/app-shell";
import { ActionFeedback } from "@/components/action-feedback";
import { SettingsCepLookup } from "@/components/settings-cep-lookup";
import { requireRestaurant } from "@/lib/auth";
import { loyaltySummary, withLoyaltyCampaign } from "@/lib/loyalty";
import { money, orderCode, statusLabel } from "@/lib/utils";
import type { Customer, Order, OrderStatus } from "@/lib/types";

const inputClass = "h-9 w-full rounded-lg border border-[#e7e4dd] bg-white px-3 text-sm text-[#1b1a17] outline-none transition focus:border-[#c5362e] focus:ring-2 focus:ring-[#c5362e]/12";
const cardClass = "rounded-2xl border border-[#e7e4dd] bg-white p-5 shadow-[0_1px_2px_rgba(27,26,23,0.04)]";

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="space-y-1">
      <span className="block text-[0.7rem] font-medium uppercase tracking-[0.08em] text-[#9c988f]">{label}</span>
      {children}
    </label>
  );
}

function shortDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo" }).format(new Date(value));
}

// Alguns clientes têm o endereço inteiro salvo no campo "address" (ex.:
// "Rua X - n 30 - Bairro - Cidade/UF - Ref.: ... - CEP 00000000"). Aqui a
// gente separa de volta cada parte para o campo certo; ao salvar, as colunas
// ficam corrigidas.
function parseStoredAddress(raw: string | null) {
  const out = { street: "", number: "", neighborhood: "", city: "", state: "", zip: "", reference: "" };
  const parts = (raw ?? "").split(" - ").map((part) => part.trim()).filter(Boolean);
  const leftovers: string[] = [];
  parts.forEach((part, index) => {
    if (/^n[º°.]?\s*\d/i.test(part)) { out.number = part.replace(/^n[º°.]?\s*/i, "").trim(); return; }
    if (/^cep\b/i.test(part)) { out.zip = part.replace(/\D/g, ""); return; }
    if (/^ref\b/i.test(part)) { out.reference = part.replace(/^ref[.:]*\s*/i, "").trim(); return; }
    const cityState = part.match(/^(.+?)\s*\/\s*([A-Za-z]{2})$/);
    if (cityState) { out.city = cityState[1].trim(); out.state = cityState[2].toUpperCase(); return; }
    if (index === 0) { out.street = part; return; }
    leftovers.push(part);
  });
  if (leftovers.length) out.neighborhood = leftovers.shift() ?? "";
  if (leftovers.length) out.reference = [out.reference, ...leftovers].filter(Boolean).join(" - ");
  return out;
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

  const hasStructured = Boolean(current.address_number || current.neighborhood || current.city || current.state);
  const looksCombined = (current.address ?? "").includes(" - ") && !hasStructured;
  const parsed = looksCombined ? parseStoredAddress(current.address) : null;
  const addr = {
    street: parsed?.street ?? current.address ?? "",
    number: parsed?.number ?? current.address_number ?? "",
    neighborhood: parsed?.neighborhood ?? current.neighborhood ?? "",
    city: parsed?.city ?? current.city ?? "",
    state: parsed?.state ?? current.state ?? "",
    zip: parsed?.zip ?? current.zip_code ?? "",
    reference: parsed?.reference ?? current.reference ?? "",
    complement: current.complement ?? "",
  };

  const fullAddress = [
    addr.street,
    addr.number ? `nº ${addr.number}` : null,
    addr.neighborhood,
    addr.city && addr.state ? `${addr.city}/${addr.state}` : addr.city || addr.state,
    addr.zip ? `CEP ${addr.zip}` : null,
  ].filter(Boolean).join(" - ");

  const loyaltyInfo = loyaltySummary(withLoyaltyCampaign(loyalty, restaurant.opening_hours as Record<string, unknown> | null), (orders ?? []) as Order[]);

  return (
    <div className="space-y-5">
      <ActionFeedback status={status} error={error} />

      <section className={cardClass}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <Link href="/clientes" className="text-sm font-medium text-[#c5362e] transition hover:text-[#9f2b24]">← Voltar para clientes</Link>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-[#1b1a17]">{current.name}</h1>
            <p className="text-sm text-[#9c988f]">{current.phone || current.whatsapp || "Sem telefone"}</p>
            <p className="mt-1 text-sm text-[#9c988f]">{fullAddress || "Endereço não informado."}</p>
          </div>
          <form action={deleteCustomer}>
            <input type="hidden" name="id" value={current.id} />
            <input type="hidden" name="return_to" value="/clientes" />
            <button className="h-9 rounded-lg border border-[#eeccc7] bg-white px-4 text-sm font-medium text-[#c5362e] transition hover:bg-[#f6ece9]">
              Excluir cliente
            </button>
          </form>
        </div>
      </section>

      <form action={saveCustomer} className="grid gap-5 xl:grid-cols-[1fr_340px]">
        <input type="hidden" name="id" value={current.id} />
        <input type="hidden" name="return_to" value={returnTo} />

        <section className={cardClass}>
          <h2 className="text-[0.95rem] font-semibold text-[#1b1a17]">Editar cliente</h2>
          <p className="mt-0.5 text-xs text-[#9c988f]">Atualize dados pessoais, contato e endereço usados nos pedidos.</p>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <Field label="Nome">
              <input className={inputClass} name="name" defaultValue={current.name} required />
            </Field>
            <input type="hidden" name="email" value={current.email ?? ""} />
            <Field label="Telefone">
              <input className={inputClass} name="phone" defaultValue={current.phone ?? current.whatsapp ?? ""} />
            </Field>
            <Field label="CPF">
              <input className={inputClass} name="cpf" defaultValue={current.cpf ?? ""} />
            </Field>
            <Field label="Data de nascimento">
              <input className={inputClass} name="birth_date" type="date" defaultValue={current.birth_date?.slice(0, 10) ?? ""} />
            </Field>
          </div>

          <div className="mt-5 border-t border-[#efece6] pt-4">
            <h3 className="text-sm font-semibold text-[#1b1a17]">Endereço</h3>
            <div className="mt-3 grid gap-3 md:grid-cols-6">
              <div className="md:col-span-2">
                <Field label="CEP">
                  <SettingsCepLookup defaultValue={addr.zip} buttonLabel="Buscar" />
                </Field>
              </div>
              <div className="md:col-span-3">
                <Field label="Endereço (rua/avenida)">
                  <input className={inputClass} name="address" defaultValue={addr.street} placeholder="Rua, avenida, praça…" />
                </Field>
              </div>
              <Field label="Número">
                <input className={inputClass} name="address_number" defaultValue={addr.number} placeholder="Nº" />
              </Field>
              <div className="md:col-span-2">
                <Field label="Bairro">
                  <input className={inputClass} name="neighborhood" defaultValue={addr.neighborhood} />
                </Field>
              </div>
              <div className="md:col-span-2">
                <Field label="Cidade">
                  <input className={inputClass} name="city" defaultValue={addr.city} />
                </Field>
              </div>
              <Field label="UF">
                <input className={`${inputClass} uppercase`} name="state" maxLength={2} defaultValue={addr.state} />
              </Field>
              <div className="md:col-span-3">
                <Field label="Complemento">
                  <input className={inputClass} name="complement" defaultValue={addr.complement} placeholder="Apto, bloco, casa…" />
                </Field>
              </div>
              <div className="md:col-span-3">
                <Field label="Ponto de referência">
                  <input className={inputClass} name="reference" defaultValue={addr.reference} placeholder="Ex.: em frente à padaria" />
                </Field>
              </div>
            </div>
          </div>

          <div className="mt-5">
            <Field label="Observações internas">
              <textarea className={`${inputClass} min-h-20 py-2 leading-snug`} name="notes" defaultValue={current.notes ?? ""} />
            </Field>
          </div>

          <button className="mt-5 h-10 w-full rounded-lg bg-[#211d19] px-5 text-sm font-medium text-white transition hover:bg-[#37312a]">
            Salvar alterações
          </button>
        </section>

        <aside className="space-y-5">
          <section className={cardClass}>
            <h2 className="text-[0.95rem] font-semibold text-[#1b1a17]">Resetar senha</h2>
            <p className="mt-0.5 text-xs text-[#9c988f]">Preencha uma nova senha para o cliente acessar a conta no cardápio online.</p>
            <div className="mt-3">
              <Field label="Nova senha">
                <input className={inputClass} name="new_password" type="password" minLength={6} placeholder="Mínimo 6 caracteres" />
              </Field>
            </div>
            <p className="mt-3 rounded-lg bg-[#faf9f6] p-2.5 text-xs text-[#6d6a63]">Se deixar em branco, a senha atual não será alterada.</p>
          </section>

          <section className={cardClass}>
            <h2 className="text-[0.95rem] font-semibold text-[#1b1a17]">Resumo</h2>
            <div className="mt-3 space-y-2 text-sm text-[#6d6a63]">
              <p><strong className="font-medium text-[#1b1a17]">Cliente desde:</strong> {new Date(current.created_at).toLocaleDateString("pt-BR")}</p>
              <p><strong className="font-medium text-[#1b1a17]">Pedidos:</strong> {(orders ?? []).length}</p>
              <p><strong className="font-medium text-[#1b1a17]">Total comprado:</strong> {money(((orders ?? []) as Order[]).reduce((sum, order) => sum + Number(order.total ?? 0), 0))}</p>
              <p><strong className="font-medium text-[#1b1a17]">Pontos de fidelidade:</strong> {loyaltyInfo.points}</p>
              <p><strong className="font-medium text-[#1b1a17]">Benefícios disponíveis:</strong> {loyaltyInfo.rewardsAvailable}</p>
              <p><strong className="font-medium text-[#1b1a17]">Validade:</strong> {loyaltyInfo.pointsValidityMonths} meses após cada pedido</p>
              <p><strong className="font-medium text-[#1b1a17]">Campanha:</strong> {loyaltyInfo.campaignStartsAt ? shortDate(loyaltyInfo.campaignStartsAt) : "sem início"} até {loyaltyInfo.campaignEndsAt ? shortDate(loyaltyInfo.campaignEndsAt) : "sem fim"}</p>
              {Boolean(loyaltyInfo.expiredPoints) && <p><strong className="font-medium text-[#1b1a17]">Pontos vencidos:</strong> {loyaltyInfo.expiredPoints}</p>}
            </div>
          </section>

          <section className={cardClass}>
            <h2 className="text-[0.95rem] font-semibold text-[#1b1a17]">Validade dos pontos</h2>
            <div className="mt-3 space-y-2 text-sm text-[#6d6a63]">
              {loyaltyInfo.expiringBatches.map((batch) => (
                <p key={`${batch.orderId ?? batch.expiresAt}-${batch.points}`} className="rounded-lg bg-amber-50 p-2.5 font-medium text-amber-900">
                  {batch.points} ponto(s) vencem em {shortDate(batch.expiresAt)}
                </p>
              ))}
              {!loyaltyInfo.expiringBatches.length && <p className="rounded-lg bg-[#faf9f6] p-2.5 text-[#9c988f]">Nenhum ponto válido para vencer.</p>}
            </div>
          </section>
        </aside>
      </form>

      <section className="overflow-hidden rounded-2xl border border-[#e7e4dd] bg-white shadow-[0_1px_2px_rgba(27,26,23,0.04)]">
        <div className="border-b border-[#efece6] px-5 py-3.5">
          <h2 className="text-[0.95rem] font-semibold text-[#1b1a17]">Histórico de pedidos</h2>
        </div>
        <div>
          <div className="grid grid-cols-[120px_minmax(140px,1fr)_130px_110px] gap-3 border-b border-[#efece6] bg-[#faf9f6] px-5 py-2.5 text-[0.7rem] font-medium uppercase tracking-[0.08em] text-[#9c988f] max-md:hidden">
            <span>Pedido</span>
            <span>Data</span>
            <span>Status</span>
            <span className="text-right">Total</span>
          </div>
          <div className="divide-y divide-[#efece6]">
            {((orders ?? []) as Order[]).map((order) => (
              <Link key={order.id} href={`/pedidos/${order.id}`} className="grid gap-2 px-5 py-2.5 text-sm transition hover:bg-[#faf9f6] md:grid-cols-[120px_minmax(140px,1fr)_130px_110px] md:items-center">
                <span className="font-medium text-[#1b1a17]">#{orderCode(order)}</span>
                <span className="text-[#9c988f]">{new Date(order.created_at).toLocaleString("pt-BR")}</span>
                <span className="justify-self-start rounded-full bg-[#f4f1ec] px-2.5 py-0.5 text-xs font-medium text-[#6d6a63]">{statusLabel[order.status as OrderStatus] ?? order.status}</span>
                <strong className="font-semibold text-[#1b1a17] [font-variant-numeric:tabular-nums] md:text-right">{money(order.total)}</strong>
              </Link>
            ))}
            {!(orders ?? []).length && <p className="px-5 py-8 text-center text-sm text-[#9c988f]">Nenhum pedido vinculado ainda.</p>}
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
