"use client";

import Link from "next/link";
import { Bike, CheckCircle2, CreditCard, Mail, MapPin, Search, UserRound } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { createPublicOrder } from "@/app/actions";
import { MoneyInput } from "@/components/money-input";
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

  return (
    <main className="min-h-screen bg-[#f1f1f1] px-5 py-8 text-[#243640]">
      {checkoutError && <p role="alert" className="mx-auto mb-5 max-w-[1280px] rounded-lg bg-red-50 p-4 text-red-700">{checkoutError}</p>}
      {!restaurant.is_open && (
        <div className="mx-auto mb-6 max-w-[1280px] rounded-lg border border-red-200 bg-red-50 p-4 font-bold text-red-700">
          A loja está fechada no momento. Volte ao cardápio para consultar os produtos disponíveis.
        </div>
      )}
      <form
        action={createPublicOrder}
        className="mx-auto grid max-w-[1280px] gap-8 lg:grid-cols-[360px_1fr]"
      >
        {Object.entries(address).map(([key,value]) => <input key={key} type="hidden" name={key} value={value} />)}
        <input type="hidden" name="restaurant_id" value={restaurant.id} />
        <input type="hidden" name="slug" value={restaurant.slug} />
        <input type="hidden" name="cart" value={JSON.stringify(cart)} />
        <input type="hidden" name="customer_id" value={customerId} />
        <input type="hidden" name="delivery_fee" value={deliveryFee} />
        <input type="hidden" name="delivery_address" value={fullAddress(address)} />
        <input type="hidden" name="payment_method" value={payment} />
        <input type="hidden" name="type" value={type} />

        <aside>
          <h1 className="text-2xl font-black">Seus dados</h1>
          <div className="mt-6 space-y-4">
            {[
              ["1", "Identifique-se", UserRound],
              ["2", "Modo de entrega", Bike],
              ["3", "Forma de pagamento", CreditCard],
              ["4", "Confira seu pedido", CheckCircle2],
            ].map(([number, label, Icon]) => (
              <div key={String(number)} className="flex items-center gap-4 rounded-lg bg-white p-4 shadow-sm">
                <span className="grid h-7 w-7 place-items-center rounded-full bg-[#243640] text-sm font-black text-white">{String(number)}</span>
                <Icon className="h-4 w-4 text-red-600" />
                <span className="font-semibold">{String(label)}</span>
              </div>
            ))}
          </div>
          <Link href={`/cardapio/${restaurant.slug}`} className="mt-6 inline-flex font-black text-red-600">Voltar para a loja</Link>
        </aside>

        <section className="space-y-5">
          <div className="rounded-lg bg-white p-6 shadow-sm">
            <div className="mx-auto mb-5 grid h-16 w-16 place-items-center overflow-hidden rounded-xl bg-white shadow">
              {restaurant.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={restaurant.logo_url} alt="" className="h-full w-full object-cover" />
              ) : restaurant.name.slice(0, 2)}
            </div>
            <h2 className="text-center text-2xl font-black">Entre ou crie sua conta</h2>
            <p className="mx-auto mt-2 max-w-xl text-center text-sm text-slate-500">Use e-mail e senha para recuperar seus dados nos próximos pedidos.</p>

            <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
                <input className="field-light" type="email" autoComplete="email" aria-label="E-mail da conta" placeholder="E-mail da conta" value={authEmail} onChange={(event) => setAuthEmail(event.target.value)} />
                <input className="field-light" type="password" autoComplete="current-password" aria-label="Senha" placeholder="Senha" value={authPassword} onChange={(event) => setAuthPassword(event.target.value)} />
                <button
                  type="button"
                  onClick={() => submitCustomerAuth("login")}
                  disabled={authLoading}
                  className="rounded-lg bg-[#243640] px-5 py-3 font-black text-white transition hover:bg-[#16252d] disabled:opacity-60"
                >
                  Entrar
                </button>
              </div>
              {authStatus && (
                <p className={authStatus.includes("Não") || authStatus.includes("inválid") ? "mt-3 text-sm font-bold text-red-600" : "mt-3 text-sm font-bold text-emerald-700"}>
                  {authStatus}
                </p>
              )}
            </div>

            <div className="mt-6 grid gap-3 md:grid-cols-2">
              <input className="field-light" name="customer_name" autoComplete="name" aria-label="Nome completo" placeholder="Nome completo" value={customerDraft.name} onChange={(event) => setCustomerDraft({ ...customerDraft, name: event.target.value })} required />
              <input className="field-light" name="customer_phone" type="tel" inputMode="tel" autoComplete="tel" aria-label="Celular ou WhatsApp" placeholder="Celular/WhatsApp" value={customerDraft.phone} onChange={(event) => setCustomerDraft({ ...customerDraft, phone: event.target.value })} required />
              <div className="relative md:col-span-2">
                <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input className="field-light pl-11" name="customer_email" type="email" autoComplete="email" aria-label="E-mail" placeholder="E-mail" value={customerDraft.email} onChange={(event) => setCustomerDraft({ ...customerDraft, email: event.target.value })} required />
              </div>
            </div>
            <button
              type="button"
              onClick={() => submitCustomerAuth("register")}
              disabled={authLoading}
              className="mt-4 w-full rounded-lg border border-red-200 bg-white px-4 py-3 font-black text-red-600 transition hover:bg-red-50 disabled:opacity-60"
            >
              Salvar cadastro com senha
            </button>
          </div>

          <div className="rounded-lg bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-black">Modo de entrega</h2>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              <button type="button" aria-pressed={type === "delivery"} onClick={() => setType("delivery")} className={type === "delivery" ? "rounded-lg border border-red-500 bg-red-50 p-4 text-left" : "rounded-lg border border-slate-200 bg-white p-4 text-left"}>
                <strong>Entrega</strong>
                <span className="block text-sm text-slate-500">Nós levamos o pedido até você</span>
              </button>
              <button type="button" aria-pressed={type === "pickup"} onClick={() => setType("pickup")} className={type === "pickup" ? "rounded-lg border border-red-500 bg-red-50 p-4 text-left" : "rounded-lg border border-slate-200 bg-slate-50 p-4 text-left"}>
                <strong>Retirada</strong>
                <span className="block text-sm text-slate-500">Você retira o pedido na loja</span>
              </button>
            </div>

            {type === "delivery" && (
              <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="mb-3 flex items-center gap-2 font-black">
                  <MapPin className="h-4 w-4 text-red-600" />
                  Endereço de entrega
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="grid grid-cols-[1fr_auto] gap-2 md:col-span-2">
                    <input className="field-light" inputMode="numeric" autoComplete="postal-code" aria-label="CEP" value={address.cep} onChange={(event) => setAddress({ ...address, cep: event.target.value })} placeholder="CEP" required />
                    <button type="button" onClick={lookupCep} aria-label="Buscar endereço pelo CEP" title="Buscar CEP" className="rounded-lg border border-slate-200 bg-white px-4 font-black hover:border-red-300"><Search className="h-4 w-4" /></button>
                  </div>
                  <input className="field-light md:col-span-2" aria-label="Endereço" autoComplete="address-line1" value={address.street} onChange={(event) => setAddress({ ...address, street: event.target.value })} placeholder="Endereço" required />
                  <input className="field-light" aria-label="Número" inputMode="numeric" value={address.number} onChange={(event) => setAddress({ ...address, number: event.target.value })} placeholder="Número" required />
                  <input className="field-light" aria-label="Bairro" value={address.neighborhood} onChange={(event) => setAddress({ ...address, neighborhood: event.target.value })} placeholder="Bairro" required />
                  <input className="field-light" aria-label="Cidade" autoComplete="address-level2" value={address.city} onChange={(event) => setAddress({ ...address, city: event.target.value })} placeholder="Cidade" required />
                  <input className="field-light" aria-label="UF" autoComplete="address-level1" value={address.state} onChange={(event) => setAddress({ ...address, state: event.target.value.toUpperCase() })} placeholder="UF" maxLength={2} required />
                  <input className="field-light" aria-label="Complemento" autoComplete="address-line2" value={address.complement} onChange={(event) => setAddress({ ...address, complement: event.target.value })} placeholder="Complemento" />
                  <input className="field-light" aria-label="Ponto de referência" value={address.reference} onChange={(event) => setAddress({ ...address, reference: event.target.value })} placeholder="Ponto de referência" />
                  <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 md:col-span-2">
                    <span className="block text-xs font-black uppercase text-slate-500">Frete automático</span>
                    <strong className="mt-1 block text-slate-900">
                      {deliveryCalculating
                        ? "Calculando..."
                        : addressIsComplete
                          ? selectedDeliveryRule
                            ? `${selectedDeliveryRule.name || "Faixa cadastrada"} - ${selectedDeliveryRule.free_delivery ? "grátis" : money(selectedDeliveryRule.fee)}`
                            : `Taxa padrão - ${money(restaurant.delivery_fee ?? 0)}`
                          : "Preencha o endereço completo"}
                    </strong>
                  </div>
                </div>
                {addressStatus && <p className="mt-2 text-sm font-semibold text-slate-600">{addressStatus}</p>}
                {addressIsComplete && <p className="mt-3 rounded-lg bg-white p-3 text-sm font-bold text-slate-700">Frete calculado: {money(deliveryFee)}</p>}
              </div>
            )}
          </div>

          <div className="rounded-lg bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-black">Forma de pagamento</h2>
            <div role="radiogroup" aria-label="Forma de pagamento" className="mt-4 grid gap-3 md:grid-cols-2">
              {paymentMethods.map((method) => (
                <label key={method} className={payment === method ? "rounded-lg border border-red-500 bg-red-50 p-4 font-black" : "rounded-lg border border-slate-200 p-4 font-bold"}>
                  <input className="mr-2" type="radio" name="payment_ui" checked={payment === method} onChange={() => {
                    setPayment(method);
                    if (method !== "cash") setNeedsChange("no");
                  }} />
                  {paymentLabels[method] ?? method}
                </label>
              ))}
            </div>
            {payment === "cash" && (
              <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <span className="block text-sm font-black text-slate-800">Precisa de troco</span>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <label className={needsChange === "yes" ? "rounded-lg border border-red-500 bg-red-50 p-3 font-black" : "rounded-lg border border-slate-200 bg-white p-3 font-bold"}>
                    <input className="mr-2" type="radio" name="change_ui" checked={needsChange === "yes"} onChange={() => setNeedsChange("yes")} />
                    Sim
                  </label>
                  <label className={needsChange === "no" ? "rounded-lg border border-red-500 bg-red-50 p-3 font-black" : "rounded-lg border border-slate-200 bg-white p-3 font-bold"}>
                    <input className="mr-2" type="radio" name="change_ui" checked={needsChange === "no"} onChange={() => setNeedsChange("no")} />
                    Não
                  </label>
                </div>
                {needsChange === "yes" && <MoneyInput className="field-light mt-3" name="change_for" placeholder="Para quanto" required />}
              </div>
            )}
            <textarea className="field-light mt-3" name="notes" aria-label="Observações do pedido" placeholder="Observações do pedido" />
          </div>

          <div className="rounded-lg bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-black">Confira seu pedido</h2>
            <div className="mt-4 divide-y divide-slate-100">
              {cart.map((item, index) => (
                <div key={`${item.id}-${index}`} className="flex justify-between gap-4 py-3">
                  <div>
                    <strong>{item.quantity}x {item.name}{item.variantName ? ` - ${item.variantName}` : ""}</strong>
                    {item.flavors && item.flavors.length > 1 && <p className="text-sm text-slate-500">Sabores: {item.flavors.join(" / ")}</p>}
                    {item.crust?.name && <p className="text-sm text-slate-500">Borda: {item.crust.name}</p>}
                    {item.additions.length > 0 && <p className="text-sm text-slate-500">Adicionais: {item.additions.map((addition) => addition.name).join(", ")}</p>}
                  </div>
                  <strong>{money(lineTotal(item))}</strong>
                </div>
              ))}
              {!cart.length && <p className="rounded bg-slate-50 p-4 text-sm text-slate-500">Seu carrinho está vazio.</p>}
            </div>
            <div className="mt-5 space-y-2 border-t border-slate-100 pt-4">
              <div className="flex justify-between"><span>Subtotal</span><strong>{money(subtotal)}</strong></div>
              <div className="flex justify-between"><span>Entrega</span><strong>{money(deliveryFee)}</strong></div>
              <div className="flex justify-between text-2xl font-black"><span>Total</span><strong>{money(total)}</strong></div>
            </div>
            {checkoutBlockReason && <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm font-bold text-amber-800">{checkoutBlockReason}</p>}
            <FinalizeButton disabled={!canSubmit} label={restaurant.is_open ? "Finalizar pedido" : "Loja fechada"} />
          </div>
        </section>
      </form>
    </main>
  );
}

// Estado de envio no botão final: sem ele o cliente não via retorno e clicava de
// novo, gerando pedido em dobro.
function FinalizeButton({ disabled, label }: { disabled: boolean; label: string }) {
  const { pending } = useFormStatus();
  return (
    <button className="mt-5 w-full rounded-lg bg-red-600 px-4 py-4 font-black uppercase text-white transition hover:bg-red-700 disabled:bg-slate-300" disabled={disabled || pending}>
      {pending ? "Enviando pedido…" : label}
    </button>
  );
}
