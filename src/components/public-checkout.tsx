"use client";

import Link from "next/link";
import { Banknote, Bike, CheckCircle2, ChevronDown, CreditCard, Mail, QrCode, Search, ShoppingBag, Smartphone, Store, UserRound, Wallet } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { createPublicOrder } from "@/app/actions";
import { MoneyInput } from "@/components/money-input";
import { StoreTopBar } from "@/components/storefront/store-top-bar";
import { Icon3D } from "@/components/ui/icon-3d";
import { money } from "@/lib/utils";
import type { DeliveryFeeRule, Restaurant } from "@/lib/types";

type SelectedOption = { name: string; price: number };
type CartLine = {
  id: string;
  name: string;
  price: number;
  quantity: number;
  variantId: string | null;
  variantName: string | null;
  dough: SelectedOption | null;
  crust: SelectedOption | null;
  additions: SelectedOption[];
  flavorCount: number;
  flavors: string[];
  notes: string;
};

type Address = {
  cep: string;
  street: string;
  neighborhood: string;
  city: string;
  state: string;
  number: string;
  complement: string;
  reference: string;
};

const emptyAddress: Address = { cep: "", street: "", neighborhood: "", city: "", state: "", number: "", complement: "", reference: "" };

type CustomerProfile = {
  id: string;
  name: string;
  phone: string;
  whatsapp: string;
  email: string;
  cpf: string;
  birthDate: string;
  address: string;
  neighborhood: string;
  city: string;
  state: string;
  zipCode: string;
};

const paymentLabels: Record<string, string> = {
  pix: "Pix",
  cash: "Dinheiro",
  credit_card: "Cartão de crédito",
  debit_card: "Cartão de débito",
};

function fullAddress(address: Address) {
  return [
    address.street,
    address.number && `nº ${address.number}`,
    address.neighborhood,
    address.city && `${address.city}/${address.state}`,
    address.complement && `Compl.: ${address.complement}`,
    address.reference && `Ref.: ${address.reference}`,
    address.cep && `CEP ${address.cep}`,
  ].filter(Boolean).join(" - ");
}

function lineTotal(item: CartLine) {
  const extras = Number(item.dough?.price ?? 0) + Number(item.crust?.price ?? 0) + item.additions.reduce((sum, addition) => sum + Number(addition.price), 0);
  return (Number(item.price) + extras) * item.quantity;
}

export function PublicCheckout({ restaurant, deliveryRules, checkoutError }: { restaurant: Restaurant; deliveryRules: DeliveryFeeRule[]; checkoutError?: string }) {
  const [cart, setCart] = useState<CartLine[]>([]);
  const [address, setAddress] = useState<Address>(emptyAddress);
  const [addressStatus, setAddressStatus] = useState("");
  const [type, setType] = useState("delivery");
  const [deliveryRuleId, setDeliveryRuleId] = useState(deliveryRules[0]?.id ?? "");
  const [deliveryCalculating, setDeliveryCalculating] = useState(false);
  const [customerId, setCustomerId] = useState("");
  const [customerDraft, setCustomerDraft] = useState({ name: "", phone: "", email: "", cpf: "", birthDate: "" });
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authStatus, setAuthStatus] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [saveAccount, setSaveAccount] = useState(false);
  const paymentMethods = restaurant.payment_methods?.length ? restaurant.payment_methods : ["pix", "cash", "credit_card", "debit_card"];
  const [payment, setPayment] = useState(paymentMethods[0] ?? "pix");
  const [needsChange, setNeedsChange] = useState<"no" | "yes">("no");

  useEffect(() => {
    window.localStorage.removeItem('gastroflow_customer_' + restaurant.slug);
    const controller = new AbortController();
    Promise.resolve().then(() => {
      try { const saved = window.sessionStorage.getItem('gastroflow_cart_' + restaurant.slug); if (saved) setCart(JSON.parse(saved)); } catch { window.sessionStorage.removeItem('gastroflow_cart_' + restaurant.slug); }
    });
    fetch('/api/customer-auth/profile?restaurantId=' + restaurant.id, { signal: controller.signal })
      .then(async response => response.ok ? response.json() : null)
      .then(data => { if (data?.ok) applyCustomerProfile(data.customer); }).catch(() => {});
    return () => controller.abort();
  }, [restaurant.id, restaurant.slug]);

  function applyCustomerProfile(customer: CustomerProfile) {
    setCustomerId(customer.id ?? "");
    setCustomerDraft({
      name: customer.name ?? "",
      phone: customer.whatsapp || customer.phone || "",
      email: customer.email ?? "",
      cpf: customer.cpf ?? "",
      birthDate: customer.birthDate ? customer.birthDate.slice(0, 10) : "",
    });
    setAuthEmail(customer.email ?? "");
    setAddress((current) => ({
      ...current,
      cep: customer.zipCode || current.cep,
      street: customer.address || current.street,
      neighborhood: customer.neighborhood || current.neighborhood,
      city: customer.city || current.city,
      state: customer.state || current.state,
    }));
  }

  async function submitCustomerAuth(mode: "login" | "register") {
    setAuthStatus("");
    setAuthLoading(true);
    try {
      const payload = mode === "login" ?
         { restaurantId: restaurant.id, email: authEmail || customerDraft.email, password: authPassword }
        : {
          restaurantId: restaurant.id,
          name: customerDraft.name,
          phone: customerDraft.phone,
          email: customerDraft.email || authEmail,
          cpf: customerDraft.cpf,
          birthDate: customerDraft.birthDate,
          password: authPassword,
          address: address.street,
          neighborhood: address.neighborhood,
          city: address.city,
          state: address.state,
          zipCode: address.cep,
        };
      const response = await fetch(`/api/customer-auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json() as { ok: boolean; message: string; customer: CustomerProfile };
      if (!response.ok || !data.ok || !data.customer) throw new Error(data.message ?? "Não foi possível autenticar.");
      applyCustomerProfile(data.customer);
      setAuthPassword("");
      setAuthStatus(mode === "login" ? "Conta acessada. Seus dados foram preenchidos." : "Conta criada. Seus dados ficarão salvos para os próximos pedidos.");
    } catch (error) {
      setAuthStatus(error instanceof Error ? error.message : "Não foi possível autenticar.");
    } finally {
      setAuthLoading(false);
    }
  }

  const subtotal = useMemo(() => cart.reduce((sum, item) => sum + lineTotal(item), 0), [cart]);
  const selectedDeliveryRule = deliveryRules.find((rule) => rule.id === deliveryRuleId);
  const addressIsComplete = Boolean(address.street && address.number && address.neighborhood && address.city && address.state);
  const deliveryFee = type === "delivery" && addressIsComplete
    ? selectedDeliveryRule
      ? selectedDeliveryRule.free_delivery ? 0 : Number(selectedDeliveryRule.fee ?? 0)
      : Number(restaurant.delivery_fee ?? 0)
    : 0;
  const total = subtotal + deliveryFee;
  const checkoutBlockReason = !restaurant.is_open ?
     "A loja está fechada no momento."
    : !cart.length ?
       "Seu carrinho está vazio."
      : type === "delivery" && !addressIsComplete ?
         "Informe o endereço completo, incluindo o número."
        : "";
  const canSubmit = !checkoutBlockReason;

  const calculateDeliveryRule = useCallback(async (nextAddress: Address, messagePrefix = "Endereço informado.") => {
    setDeliveryCalculating(true);
    try {
      const response = await fetch("/api/shipping/quote", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({restaurantId:restaurant.id,address:nextAddress}) });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.message ?? "Não foi possível calcular o frete.");
      setDeliveryRuleId(data.ruleId);
      setAddressStatus(messagePrefix + " Frete calculado: " + money(data.fee));
    } catch (error) { setAddressStatus(error instanceof Error ? error.message : "Não foi possível calcular o frete."); }
    finally { setDeliveryCalculating(false); }
  }, [restaurant.id]);

  useEffect(() => {
    if (type !== "delivery" || !addressIsComplete) return;
    const timer = window.setTimeout(() => {
      void calculateDeliveryRule(address, "Endereço completo.");
    }, 600);
    return () => window.clearTimeout(timer);
  }, [address, type, addressIsComplete, calculateDeliveryRule]);

  async function lookupCep() {
    const cep = address.cep.replace(/\D/g, "");
    if (cep.length !== 8) {
      setAddressStatus("Informe um CEP com 8 dígitos.");
      return;
    }
    setAddressStatus("Buscando endereço...");
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await response.json() as { erro: boolean; logradouro: string; bairro: string; localidade: string; uf: string };
      if (data.erro) {
        setAddressStatus("CEP não encontrado.");
        return;
      }
      const nextAddress = {
        ...address,
        street: data.logradouro ?? address.street,
        neighborhood: data.bairro ?? address.neighborhood,
        city: data.localidade ?? address.city,
        state: data.uf ?? address.state,
      };
      setAddress((current) => ({
        ...current,
        ...nextAddress,
      }));
      await calculateDeliveryRule(nextAddress);
    } catch {
      setAddressStatus("Não foi possível consultar o CEP agora.");
    }
  }

  const field = "h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-[0.95rem] text-ink shadow-[inset_0_1px_2px_rgba(0,0,0,0.05)] outline-none transition placeholder:text-slate-400 focus:border-brand focus:ring-4 focus:ring-brand/10";
  const label = "mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500";
  const card = "rounded-3xl bg-white p-5 shadow-[0_10px_30px_-22px_rgba(0,0,0,0.45)] ring-1 ring-black/[0.04] sm:p-6";
  const choice = (active: boolean) => `flex items-center gap-2.5 rounded-2xl border-2 p-3 text-left text-sm transition sm:gap-3 sm:p-4 sm:text-base ${active ? "border-brand bg-brand-soft" : "border-slate-200 bg-white hover:border-slate-300"}`;
  const authError = authStatus.includes("Não") || authStatus.includes("inválid") || authStatus.includes("senha");
  const paymentIcons: Record<string, typeof CreditCard> = { pix: QrCode, cash: Banknote, credit_card: CreditCard, debit_card: CreditCard, online: Smartphone, other: Wallet };

  return (
    <main className="min-h-screen bg-[#f6f5f2] text-ink">
      <StoreTopBar slug={restaurant.slug} name={restaurant.name} logo={restaurant.logo_url} title="Finalizar pedido" />
      <div className="mx-auto max-w-5xl px-4 pt-4">
        {checkoutError && <p role="alert" className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">{checkoutError}</p>}
        {!restaurant.is_open && <p className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-900">A loja está fechada agora. Você pode revisar o pedido, mas ele só pode ser enviado quando a loja abrir.</p>}
      </div>
      <form action={createPublicOrder} className="mx-auto grid max-w-5xl gap-5 px-4 pb-10 lg:grid-cols-[1fr_360px] lg:items-start">
        {Object.entries(address).map(([key,value]) => <input key={key} type="hidden" name={key} value={value} />)}
        <input type="hidden" name="restaurant_id" value={restaurant.id} />
        <input type="hidden" name="slug" value={restaurant.slug} />
        <input type="hidden" name="cart" value={JSON.stringify(cart)} />
        <input type="hidden" name="customer_id" value={customerId} />
        <input type="hidden" name="delivery_fee" value={deliveryFee} />
        <input type="hidden" name="delivery_address" value={fullAddress(address)} />
        <input type="hidden" name="payment_method" value={payment} />
        <input type="hidden" name="type" value={type} />

        <div className="min-w-0 space-y-5">
          <section className={card} aria-labelledby="etapa-dados">
            <h2 id="etapa-dados" className="flex items-center gap-3 text-lg font-black"><Icon3D icon={UserRound} tone="orange" size="sm" /> 1. Seus dados</h2>

            {customerId ? (
              <p className="mt-4 flex items-center gap-2 rounded-2xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-800"><CheckCircle2 className="h-5 w-5 shrink-0" /> Você está conectado. Seus dados já foram preenchidos.</p>
            ) : (
              <div className="mt-4 rounded-2xl bg-slate-50 p-3">
                <button type="button" onClick={() => setShowLogin((v) => !v)} aria-expanded={showLogin} className="flex w-full items-center justify-between text-sm font-semibold text-ink">
                  <span>Já tem conta? <span className="text-brand">Entrar</span> para preencher tudo</span>
                  <ChevronDown className={`h-4 w-4 text-slate-400 transition ${showLogin ? "rotate-180" : ""}`} />
                </button>
                {showLogin && (
                  <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
                    <label className="block"><span className={label}>E-mail</span><input className={field} type="email" autoComplete="email" value={authEmail} onChange={(event) => setAuthEmail(event.target.value)} placeholder="voce@email.com" /></label>
                    <label className="block"><span className={label}>Senha</span><input className={field} type="password" autoComplete="current-password" value={authPassword} onChange={(event) => setAuthPassword(event.target.value)} placeholder="Sua senha" /></label>
                    <button type="button" onClick={() => submitCustomerAuth("login")} disabled={authLoading} className="h-12 rounded-xl bg-ink px-5 font-bold text-white transition hover:bg-black disabled:opacity-60">{authLoading ? "…" : "Entrar"}</button>
                  </div>
                )}
              </div>
            )}

            {authStatus && <p role={authError ? "alert" : "status"} className={`mt-3 rounded-xl p-3 text-sm font-semibold ${authError ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}>{authStatus}</p>}

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="block"><span className={label}>Nome completo</span><input className={field} name="customer_name" autoComplete="name" placeholder="Como devemos te chamar" value={customerDraft.name} onChange={(event) => setCustomerDraft({ ...customerDraft, name: event.target.value })} required /></label>
              <label className="block"><span className={label}>Celular / WhatsApp</span><input className={field} name="customer_phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="(11) 99999-9999" value={customerDraft.phone} onChange={(event) => setCustomerDraft({ ...customerDraft, phone: event.target.value })} required /></label>
              <label className="block sm:col-span-2">
                <span className={label}>E-mail</span>
                <span className="relative block">
                  <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input className={`${field} pl-11`} name="customer_email" type="email" autoComplete="email" placeholder="voce@email.com" value={customerDraft.email} onChange={(event) => setCustomerDraft({ ...customerDraft, email: event.target.value })} required />
                </span>
              </label>
            </div>

            {!customerId && (
              <div className="mt-4 border-t border-slate-100 pt-4">
                <button type="button" onClick={() => setSaveAccount((v) => !v)} aria-expanded={saveAccount} className="flex items-center gap-2 text-left text-sm font-semibold text-ink">
                  <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-md border-2 ${saveAccount ? "border-brand bg-brand text-white" : "border-slate-300"}`}>{saveAccount && <CheckCircle2 className="h-3.5 w-3.5" />}</span>
                  Salvar meus dados com senha para os próximos pedidos
                </button>
                {saveAccount && (
                  <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
                    <label className="block"><span className={label}>Crie uma senha</span><input className={field} type="password" autoComplete="new-password" minLength={12} value={authPassword} onChange={(event) => setAuthPassword(event.target.value)} placeholder="Mínimo de 12 caracteres" /></label>
                    <button type="button" onClick={() => submitCustomerAuth("register")} disabled={authLoading} className="h-12 rounded-xl border-2 border-brand px-5 font-bold text-brand transition hover:bg-brand-soft disabled:opacity-60">Criar conta</button>
                  </div>
                )}
              </div>
            )}
          </section>

          <section className={card} aria-labelledby="etapa-entrega">
            <h2 id="etapa-entrega" className="flex items-center gap-3 text-lg font-black"><Icon3D icon={Bike} tone="blue" size="sm" /> 2. Entrega</h2>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <button type="button" aria-pressed={type === "delivery"} onClick={() => setType("delivery")} className={choice(type === "delivery")}>
                <Bike className={`h-6 w-6 shrink-0 ${type === "delivery" ? "text-brand" : "text-slate-400"}`} />
                <span><strong className="block">Entrega</strong><span className="text-sm text-slate-500">Levamos até você</span></span>
              </button>
              <button type="button" aria-pressed={type === "pickup"} onClick={() => setType("pickup")} className={choice(type === "pickup")}>
                <Store className={`h-6 w-6 shrink-0 ${type === "pickup" ? "text-brand" : "text-slate-400"}`} />
                <span><strong className="block">Retirada</strong><span className="text-sm text-slate-500">Você busca na loja</span></span>
              </button>
            </div>

            {type === "delivery" && (
              <div className="mt-4 grid grid-cols-2 gap-3">
                <label className="col-span-2 block">
                  <span className={label}>CEP</span>
                  <span className="grid grid-cols-[1fr_auto] gap-2">
                    <input className={field} inputMode="numeric" autoComplete="postal-code" value={address.cep} onChange={(event) => setAddress({ ...address, cep: event.target.value })} placeholder="00000-000" required />
                    <button type="button" onClick={lookupCep} aria-label="Buscar endereço pelo CEP" className="flex h-12 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold hover:border-brand"><Search className="h-4 w-4" /> Buscar</button>
                  </span>
                </label>
                <label className="col-span-2 block"><span className={label}>Endereço</span><input className={field} autoComplete="address-line1" value={address.street} onChange={(event) => setAddress({ ...address, street: event.target.value })} placeholder="Rua, avenida…" required /></label>
                <label className="block"><span className={label}>Número</span><input className={field} inputMode="numeric" value={address.number} onChange={(event) => setAddress({ ...address, number: event.target.value })} required /></label>
                <label className="block"><span className={label}>Bairro</span><input className={field} value={address.neighborhood} onChange={(event) => setAddress({ ...address, neighborhood: event.target.value })} required /></label>
                <label className="block"><span className={label}>Cidade</span><input className={field} autoComplete="address-level2" value={address.city} onChange={(event) => setAddress({ ...address, city: event.target.value })} required /></label>
                <label className="block"><span className={label}>UF</span><input className={field} autoComplete="address-level1" value={address.state} onChange={(event) => setAddress({ ...address, state: event.target.value.toUpperCase() })} maxLength={2} required /></label>
                <label className="block"><span className={label}>Complemento</span><input className={field} autoComplete="address-line2" value={address.complement} onChange={(event) => setAddress({ ...address, complement: event.target.value })} placeholder="Apto, bloco…" /></label>
                <label className="block"><span className={label}>Ponto de referência</span><input className={field} value={address.reference} onChange={(event) => setAddress({ ...address, reference: event.target.value })} /></label>
                <div className="col-span-2 flex items-center justify-between gap-3 rounded-2xl bg-slate-50 px-4 py-3">
                  <span className="text-sm text-slate-600">Taxa de entrega</span>
                  <strong className="text-right">
                    {deliveryCalculating ? "Calculando…" : addressIsComplete
                      ? selectedDeliveryRule ? (selectedDeliveryRule.free_delivery ? "Grátis" : money(selectedDeliveryRule.fee)) : money(restaurant.delivery_fee ?? 0)
                      : "Informe o endereço"}
                  </strong>
                </div>
                {addressStatus && <p className="col-span-2 text-sm text-slate-600">{addressStatus}</p>}
              </div>
            )}
          </section>

          <section className={card} aria-labelledby="etapa-pagamento">
            <h2 id="etapa-pagamento" className="flex items-center gap-3 text-lg font-black"><Icon3D icon={CreditCard} tone="green" size="sm" /> 3. Pagamento</h2>
            <p className="mt-1 text-sm text-slate-500">Pagamento na entrega ou retirada.</p>
            <div role="radiogroup" aria-label="Forma de pagamento" className="mt-4 grid grid-cols-2 gap-3">
              {paymentMethods.map((method) => {
                const Icon = paymentIcons[method] ?? Wallet;
                return (
                  <label key={method} className={`${choice(payment === method)} cursor-pointer`}>
                    <input className="sr-only" type="radio" name="payment_ui" checked={payment === method} onChange={() => { setPayment(method); if (method !== "cash") setNeedsChange("no"); }} />
                    <Icon className={`h-6 w-6 shrink-0 ${payment === method ? "text-brand" : "text-slate-400"}`} />
                    <strong>{paymentLabels[method] ?? method}</strong>
                  </label>
                );
              })}
            </div>
            {payment === "cash" && (
              <div className="mt-4 rounded-2xl bg-slate-50 p-4">
                <span className="text-sm font-semibold text-ink">Vai precisar de troco?</span>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  {(["yes", "no"] as const).map((option) => (
                    <label key={option} className={`${choice(needsChange === option)} cursor-pointer justify-center py-3`}>
                      <input className="sr-only" type="radio" name="change_ui" checked={needsChange === option} onChange={() => setNeedsChange(option)} />
                      <strong>{option === "yes" ? "Sim" : "Não"}</strong>
                    </label>
                  ))}
                </div>
                {needsChange === "yes" && <label className="mt-3 block"><span className={label}>Troco para quanto?</span><MoneyInput className={field} name="change_for" placeholder="R$ 0,00" required /></label>}
              </div>
            )}
            <label className="mt-4 block"><span className={label}>Observações do pedido</span><textarea className={`${field} h-24 py-3`} name="notes" placeholder="Ex.: interfone com defeito, sem cebola…" /></label>
          </section>
        </div>

        <aside className="lg:sticky lg:top-20">
          <section className={card} aria-labelledby="resumo">
            <h2 id="resumo" className="flex items-center gap-3 text-lg font-black"><Icon3D icon={ShoppingBag} tone="red" size="sm" /> Resumo do pedido</h2>
            <ul className="mt-4 divide-y divide-slate-100">
              {cart.map((item, index) => (
                <li key={`${item.id}-${index}`} className="flex justify-between gap-3 py-3 text-sm">
                  <div className="min-w-0">
                    <p className="font-semibold">{item.quantity}x {item.name}{item.variantName ? ` · ${item.variantName}` : ""}</p>
                    {item.flavors && item.flavors.length > 1 && <p className="text-xs text-slate-500">Sabores: {item.flavors.join(" / ")}</p>}
                    {item.crust?.name && <p className="text-xs text-slate-500">Borda: {item.crust.name}</p>}
                    {item.additions.length > 0 && <p className="text-xs text-slate-500">Adicionais: {item.additions.map((addition) => addition.name).join(", ")}</p>}
                  </div>
                  <strong className="shrink-0">{money(lineTotal(item))}</strong>
                </li>
              ))}
              {!cart.length && <li className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">Seu carrinho está vazio. <Link href={`/cardapio/${restaurant.slug}`} className="font-semibold text-brand">Voltar ao cardápio</Link></li>}
            </ul>
            <div className="mt-3 space-y-1.5 border-t border-slate-100 pt-3 text-sm">
              <p className="flex justify-between text-slate-600"><span>Subtotal</span><span>{money(subtotal)}</span></p>
              <p className="flex justify-between text-slate-600"><span>Entrega</span><span>{type === "pickup" ? "Retirada" : money(deliveryFee)}</span></p>
              <p className="flex justify-between pt-1 text-xl font-black"><span>Total</span><span>{money(total)}</span></p>
            </div>
            {checkoutBlockReason && <p className="mt-3 rounded-xl bg-amber-50 p-3 text-sm font-semibold text-amber-900">{checkoutBlockReason}</p>}
            <FinalizeButton disabled={!canSubmit} label={restaurant.is_open ? `Enviar pedido · ${money(total)}` : "Loja fechada"} />
          </section>
        </aside>
      </form>
    </main>
  );
}

// Estado de envio no botão final: sem ele o cliente não via retorno e clicava de
// novo, gerando pedido em dobro.
function FinalizeButton({ disabled, label }: { disabled: boolean; label: string }) {
  const { pending } = useFormStatus();
  return (
    <button className="mt-4 flex h-14 w-full items-center justify-center rounded-2xl bg-gradient-to-b from-brand-bright to-brand text-base font-black text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.3),0_14px_30px_-12px_rgba(207,74,10,0.85)] transition hover:to-brand-strong disabled:from-slate-300 disabled:to-slate-300 disabled:shadow-none" disabled={disabled || pending}>
      {pending ? "Enviando pedido…" : label}
    </button>
  );
}
