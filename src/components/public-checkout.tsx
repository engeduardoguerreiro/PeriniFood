"use client";

import Link from "next/link";
import { Bike, CheckCircle2, CreditCard, Mail, MapPin, Search, UserRound } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { createPublicOrder } from "@/app/actions";
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

function deliveryRuleLabel(rule: DeliveryFeeRule) {
  const range = rule.max_km === null ? `a partir de ${rule.min_km} km` : `${rule.min_km} a ${rule.max_km} km`;
  return `${rule.name || range} - ${rule.free_delivery ? "grátis" : money(rule.fee)}`;
}

function onlyDigits(value: string | null | undefined) {
  return (value ?? "").replace(/\D/g, "");
}

function chooseRuleByDistance(rules: DeliveryFeeRule[], distanceKm: number) {
  return [...rules]
    .sort((a, b) => Number(a.max_km ?? 9999) - Number(b.max_km ?? 9999))
    .find((rule) => distanceKm >= Number(rule.min_km ?? 0) && (rule.max_km === null || distanceKm <= Number(rule.max_km)));
}

function haversineKm(a: { lat: number; lon: number }, b: { lat: number; lon: number }) {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const deltaLat = toRad(b.lat - a.lat);
  const deltaLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const value = Math.sin(deltaLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

async function geocodeAddress(query: string) {
  const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`);
  const data = await response.json() as Array<{ lat: string; lon: string }>;
  const first = data[0];
  if (!first.lat || !first.lon) return null;
  return { lat: Number(first.lat), lon: Number(first.lon) };
}

export function PublicCheckout({ restaurant, deliveryRules }: { restaurant: Restaurant; deliveryRules: DeliveryFeeRule[] }) {
  const [cart, setCart] = useState<CartLine[]>([]);
  const [address, setAddress] = useState<Address>(emptyAddress);
  const [addressStatus, setAddressStatus] = useState("");
  const [type, setType] = useState("delivery");
  const [deliveryRuleId, setDeliveryRuleId] = useState(deliveryRules[0].id ?? "");
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
    const saved = window.sessionStorage.getItem(`gastroflow_cart_${restaurant.slug}`);
    if (saved) setCart(JSON.parse(saved) as CartLine[]);
    const savedCustomer = window.localStorage.getItem(`gastroflow_customer_${restaurant.slug}`);
    if (savedCustomer) {
      try {
        applyCustomerProfile(JSON.parse(savedCustomer) as CustomerProfile, false);
      } catch {
        window.localStorage.removeItem(`gastroflow_customer_${restaurant.slug}`);
      }
    }
  }, [restaurant.slug]);

  function applyCustomerProfile(customer: CustomerProfile, persist = true) {
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
    if (persist) window.localStorage.setItem(`gastroflow_customer_${restaurant.slug}`, JSON.stringify(customer));
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

  async function calculateDeliveryRule(nextAddress: Address, messagePrefix = "Endereço encontrado.") {
    if (!deliveryRules.length) {
      setAddressStatus(`${messagePrefix} Frete padrão aplicado.`);
      return;
    }
    if (!nextAddress.street || !nextAddress.number || !nextAddress.neighborhood || !nextAddress.city || !nextAddress.state) {
      setAddressStatus(`${messagePrefix} Informe o número para calcular o frete automaticamente.`);
      return;
    }
    if (onlyDigits(restaurant.zip_code) && onlyDigits(restaurant.zip_code) === onlyDigits(nextAddress.cep)) {
      const rule = chooseRuleByDistance(deliveryRules, 0);
      if (rule) setDeliveryRuleId(rule.id);
      setAddressStatus(`${messagePrefix} Distância estimada: 0 km. Frete aplicado automaticamente.`);
      return;
    }

    setDeliveryCalculating(true);
    try {
      const customerQuery = `${nextAddress.street}, ${nextAddress.number}, ${nextAddress.neighborhood}, ${nextAddress.city}, ${nextAddress.state}, Brasil`;
      const restaurantQuery = `${restaurant.address ?? ""}, ${restaurant.address_number ?? ""}, ${restaurant.neighborhood ?? ""}, ${restaurant.city ?? ""}, ${restaurant.state ?? ""}, ${restaurant.zip_code ?? ""}, Brasil`;
      const [customerCoords, restaurantCoords] = await Promise.all([geocodeAddress(customerQuery), geocodeAddress(restaurantQuery)]);
      if (customerCoords && restaurantCoords) {
        const distanceKm = haversineKm(restaurantCoords, customerCoords);
        const rule = chooseRuleByDistance(deliveryRules, distanceKm);
        if (rule) {
          setDeliveryRuleId(rule.id);
          setAddressStatus(`${messagePrefix} Distância estimada: ${distanceKm.toFixed(1)} km. Frete aplicado automaticamente.`);
          return;
        }
        setAddressStatus(`${messagePrefix} Distância estimada: ${distanceKm.toFixed(1)} km, fora das faixas de entrega.`);
        return;
      }
      setAddressStatus(`${messagePrefix} Não foi possível estimar a distância. Frete padrão aplicado.`);
    } catch {
      setAddressStatus(`${messagePrefix} Não foi possível estimar a distância. Frete padrão aplicado.`);
    } finally {
      setDeliveryCalculating(false);
    }
  }

  useEffect(() => {
    if (type !== "delivery" || !addressIsComplete) return;
    const timer = window.setTimeout(() => {
      void calculateDeliveryRule(address, "Endereço completo.");
    }, 600);
    return () => window.clearTimeout(timer);
  }, [address.street, address.number, address.neighborhood, address.city, address.state, address.cep, type, addressIsComplete]);

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
      {!restaurant.is_open && (
        <div className="mx-auto mb-6 max-w-[1280px] rounded-lg border border-red-200 bg-red-50 p-4 font-bold text-red-700">
          A loja está fechada no momento. Volte ao cardápio para consultar os produtos disponíveis.
        </div>
      )}
      <form
        action={createPublicOrder}
        onSubmit={() => {
          window.localStorage.setItem(`gastroflow_customer_${restaurant.slug}`, JSON.stringify({
            id: customerId,
            name: customerDraft.name,
            phone: customerDraft.phone,
            whatsapp: customerDraft.phone,
            email: customerDraft.email,
            cpf: customerDraft.cpf,
            birthDate: customerDraft.birthDate,
            address: address.street,
            neighborhood: address.neighborhood,
            city: address.city,
            state: address.state,
            zipCode: address.cep,
          }));
        }}
        className="mx-auto grid max-w-[1280px] gap-8 lg:grid-cols-[360px_1fr]"
      >
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
                <input className="field-light" type="email" placeholder="E-mail da conta" value={authEmail} onChange={(event) => setAuthEmail(event.target.value)} />
                <input className="field-light" type="password" placeholder="Senha" value={authPassword} onChange={(event) => setAuthPassword(event.target.value)} />
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
              <input className="field-light" name="customer_name" placeholder="Nome completo" value={customerDraft.name} onChange={(event) => setCustomerDraft({ ...customerDraft, name: event.target.value })} required />
              <input className="field-light" name="customer_phone" placeholder="Celular/WhatsApp" value={customerDraft.phone} onChange={(event) => setCustomerDraft({ ...customerDraft, phone: event.target.value })} required />
              <div className="relative md:col-span-2">
                <Mail className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input className="field-light pl-11" name="customer_email" type="email" placeholder="E-mail" value={customerDraft.email} onChange={(event) => setCustomerDraft({ ...customerDraft, email: event.target.value })} required />
              </div>
              <input className="field-light" name="customer_cpf" placeholder="CPF" value={customerDraft.cpf} onChange={(event) => setCustomerDraft({ ...customerDraft, cpf: event.target.value })} required />
              <input className="field-light" name="customer_birth_date" type="date" value={customerDraft.birthDate} onChange={(event) => setCustomerDraft({ ...customerDraft, birthDate: event.target.value })} required />
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
              <button type="button" onClick={() => setType("delivery")} className={type === "delivery" ? "rounded-lg border border-red-500 bg-red-50 p-4 text-left" : "rounded-lg border border-slate-200 bg-white p-4 text-left"}>
                <strong>Entrega</strong>
                <span className="block text-sm text-slate-500">Nós levamos o pedido até você</span>
              </button>
              <button type="button" onClick={() => setType("pickup")} className={type === "pickup" ? "rounded-lg border border-red-500 bg-red-50 p-4 text-left" : "rounded-lg border border-slate-200 bg-slate-50 p-4 text-left"}>
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
                    <input className="field-light" value={address.cep} onChange={(event) => setAddress({ ...address, cep: event.target.value })} placeholder="CEP" required />
                    <button type="button" onClick={lookupCep} className="rounded-lg border border-slate-200 bg-white px-4 font-black hover:border-red-300"><Search className="h-4 w-4" /></button>
                  </div>
                  <input className="field-light md:col-span-2" value={address.street} onChange={(event) => setAddress({ ...address, street: event.target.value })} placeholder="Endereço" required />
                  <input className="field-light" value={address.number} onChange={(event) => setAddress({ ...address, number: event.target.value })} placeholder="Número" required />
                  <input className="field-light" value={address.neighborhood} onChange={(event) => setAddress({ ...address, neighborhood: event.target.value })} placeholder="Bairro" required />
                  <input className="field-light" value={address.city} onChange={(event) => setAddress({ ...address, city: event.target.value })} placeholder="Cidade" required />
                  <input className="field-light" value={address.state} onChange={(event) => setAddress({ ...address, state: event.target.value.toUpperCase() })} placeholder="UF" maxLength={2} required />
                  <input className="field-light" value={address.complement} onChange={(event) => setAddress({ ...address, complement: event.target.value })} placeholder="Complemento" />
                  <input className="field-light" value={address.reference} onChange={(event) => setAddress({ ...address, reference: event.target.value })} placeholder="Ponto de referência" />
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
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {paymentMethods.map((method) => (
                <label key={method} className={payment === method ? "rounded-lg border border-red-500 bg-red-50 p-4 font-black" : "rounded-lg border border-slate-200 p-4 font-bold"}>
                  <input className="mr-2" type="radio" checked={payment === method} onChange={() => {
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
                    <input className="mr-2" type="radio" checked={needsChange === "yes"} onChange={() => setNeedsChange("yes")} />
                    Sim
                  </label>
                  <label className={needsChange === "no" ? "rounded-lg border border-red-500 bg-red-50 p-3 font-black" : "rounded-lg border border-slate-200 bg-white p-3 font-bold"}>
                    <input className="mr-2" type="radio" checked={needsChange === "no"} onChange={() => setNeedsChange("no")} />
                    Não
                  </label>
                </div>
                {needsChange === "yes" && <input className="field-light mt-3" name="change_for" type="number" step="0.01" min={total} placeholder="Para quanto" required />}
              </div>
            )}
            <textarea className="field-light mt-3" name="notes" placeholder="Observações do pedido" />
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
            <button className="mt-5 w-full rounded-lg bg-red-600 px-4 py-4 font-black uppercase text-white transition hover:bg-red-700 disabled:bg-slate-300" disabled={!canSubmit}>
              {restaurant.is_open ? "Finalizar pedido" : "Loja fechada"}
            </button>
          </div>
        </section>
      </form>
    </main>
  );
}
