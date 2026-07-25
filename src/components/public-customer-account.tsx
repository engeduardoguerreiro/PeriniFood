"use client";

import Link from "next/link";
import { Gift, Mail, MapPin, PackageCheck, Search, UserCircle2 } from "lucide-react";
import { useEffect, useState } from "react";
import { money } from "@/lib/utils";
import type { Restaurant } from "@/lib/types";

type CustomerProfile = {
  id: string;
  name: string;
  phone: string;
  whatsapp: string;
  email: string;
  cpf: string;
  birthDate: string;
  address: string;
  addressNumber: string;
  neighborhood: string;
  complement: string;
  reference: string;
  city: string;
  state: string;
  zipCode: string;
};

type CustomerOrder = {
  id: string;
  order_number: number | null;
  code: string | null;
  status: string | null;
  type: string | null;
  total: number | string | null;
  created_at: string | null;
};

type LoyaltyInfo = {
  enabled: boolean;
  points: number;
  pointsToReward: number;
  rewardValue: number;
  rewardType: "percent" | "fixed" | string;
  rewardsAvailable: number;
  expiredPoints?: number;
  pointsValidityMonths?: number;
  campaignStartsAt?: string | null;
  campaignEndsAt?: string | null;
  expiringBatches?: Array<{
    orderId: string | null;
    orderNumber: number | string | null;
    code: string | null;
    points: number;
    earnedAt: string;
    expiresAt: string;
    expired: boolean;
  }>;
  description: string;
};

type AccountData = {
  customer: CustomerProfile;
  orders: CustomerOrder[];
  loyalty: LoyaltyInfo;
};

const emptyDraft = {
  name: "",
  phone: "",
  email: "",
  password: "",
  cpf: "",
  birthDate: "",
  address: "",
  addressNumber: "",
  neighborhood: "",
  complement: "",
  reference: "",
  city: "",
  state: "",
  zipCode: "",
};

const emptyLoyalty: LoyaltyInfo = {
  enabled: false,
  points: 0,
  pointsToReward: 0,
  rewardValue: 0,
  rewardType: "fixed",
  rewardsAvailable: 0,
  expiredPoints: 0,
  pointsValidityMonths: 6,
  expiringBatches: [],
  description: "",
};

function rewardLabel(loyalty: LoyaltyInfo) {
  if (!loyalty.enabled) return "Programa inativo";
  if (loyalty.rewardType === "percent") return `${loyalty.rewardValue}% de desconto`;
  return `${money(loyalty.rewardValue)} de desconto`;
}

function statusLabel(status: string | null) {
  const labels: Record<string, string> = {
    pending: "Novo",
    accepted: "Confirmado",
    preparing: "Em preparo",
    ready: "Pronto",
    out_for_delivery: "Saiu para entrega",
    completed: "Entregue",
    canceled: "Cancelado",
  };
  return labels[String(status ?? "")] ?? String(status ?? "-");
}

function orderTypeLabel(type: string | null) {
  const labels: Record<string, string> = {
    delivery: "Entrega",
    pickup: "Retirada",
    dine_in: "Consumo no local",
  };
  return labels[String(type ?? "")] ?? "Pedido";
}

function shortDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo" }).format(new Date(value));
}

function accountStorageKey(slug: string) {
  return `gastroflow_customer_${slug}`;
}

export function PublicCustomerAccount({ restaurant }: { restaurant: Restaurant }) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [account, setAccount] = useState<AccountData | null>(null);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [draft, setDraft] = useState(emptyDraft);
  const loyalty = account?.loyalty ?? emptyLoyalty;
  const orders = account?.orders ?? [];

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(accountStorageKey(restaurant.slug));
      if (!saved) return;
      const customer = JSON.parse(saved) as CustomerProfile;
      saveProfile(customer, false);
      void loadAccount(customer);
    } catch {
      window.localStorage.removeItem(accountStorageKey(restaurant.slug));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurant.slug]);

  function fillDraft(customer: CustomerProfile) {
    setDraft((current) => ({
      ...current,
      name: customer.name ?? "",
      phone: customer.whatsapp || customer.phone || "",
      email: customer.email ?? "",
      cpf: customer.cpf ?? "",
      birthDate: customer.birthDate ? customer.birthDate.slice(0, 10) : "",
      address: customer.address ?? "",
      addressNumber: customer.addressNumber ?? "",
      neighborhood: customer.neighborhood ?? "",
      complement: customer.complement ?? "",
      reference: customer.reference ?? "",
      city: customer.city ?? "",
      state: customer.state ?? "",
      zipCode: customer.zipCode ?? "",
      password: "",
    }));
  }

  function saveProfile(customer: CustomerProfile, persist = true) {
    setProfile(customer);
    fillDraft(customer);
    if (persist) window.localStorage.setItem(accountStorageKey(restaurant.slug), JSON.stringify(customer));
  }

  async function loadAccount(customer = profile) {
    if (!customer?.id) return;
    try {
      const response = await fetch(`/api/customer-auth/profile?restaurantId=${restaurant.id}&customerId=${customer.id}`);
      const data = await response.json() as { ok: boolean; message: string } & AccountData;
      if (!response.ok || !data.ok) throw new Error(data.message ?? "Não foi possível carregar sua conta.");
      setAccount(data);
      saveProfile(data.customer);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Não foi possível carregar sua conta.");
    }
  }

  async function submitAuth() {
    setStatus("");
    setLoading(true);
    try {
      const payload = mode === "login" ?
         { restaurantId: restaurant.id, email: draft.email, password: draft.password }
        : {
          restaurantId: restaurant.id,
          name: draft.name,
          phone: draft.phone,
          email: draft.email,
          password: draft.password,
          cpf: draft.cpf,
          birthDate: draft.birthDate,
        };
      const response = await fetch(`/api/customer-auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json() as { ok: boolean; message: string; customer: CustomerProfile };
      if (!response.ok || !data.ok || !data.customer) throw new Error(data.message ?? "Não foi possível acessar sua conta.");
      saveProfile(data.customer);
      await loadAccount(data.customer);
      setStatus(mode === "login" ? "Login realizado com sucesso." : "Cadastro criado com sucesso.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Não foi possível acessar sua conta.");
    } finally {
      setLoading(false);
    }
  }

  async function lookupCep() {
    const cep = draft.zipCode.replace(/\D/g, "");
    if (cep.length !== 8) {
      setStatus("Informe um CEP com 8 dígitos.");
      return;
    }
    setStatus("Buscando CEP...");
    const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
    const data = await response.json() as { erro: boolean; logradouro: string; bairro: string; localidade: string; uf: string };
    if (data.erro) {
      setStatus("CEP não encontrado.");
      return;
    }
    setDraft((current) => ({
      ...current,
      address: data.logradouro ?? current.address,
      neighborhood: data.bairro ?? current.neighborhood,
      city: data.localidade ?? current.city,
      state: data.uf ?? current.state,
    }));
    setStatus("Endereço preenchido. Informe o número.");
  }

  async function saveAccount() {
    if (!profile?.id) return;
    setLoading(true);
    setStatus("");
    try {
      const response = await fetch("/api/customer-auth/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ restaurantId: restaurant.id, customerId: profile.id, ...draft }),
      });
      const data = await response.json() as { ok: boolean; message: string; customer: CustomerProfile };
      if (!response.ok || !data.ok || !data.customer) throw new Error(data.message ?? "Não foi possível salvar seus dados.");
      saveProfile(data.customer);
      await loadAccount(data.customer);
      setStatus("Dados salvos com sucesso.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Não foi possível salvar seus dados.");
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    window.localStorage.removeItem(accountStorageKey(restaurant.slug));
    setProfile(null);
    setAccount(null);
    setDraft(emptyDraft);
    setStatus("Você saiu da conta neste dispositivo.");
  }

  const loggedIn = Boolean(profile?.id);
  const statusIsError = status.includes("Não") || status.includes("inválid") || status.includes("encontrado");
  const pointsToNextReward = loyalty.pointsToReward ?
     Math.max(0, loyalty.pointsToReward - (loyalty.points % loyalty.pointsToReward))
    : 0;
  const progress = loyalty.enabled && loyalty.pointsToReward > 0 ?
     Math.min(100, ((loyalty.points % loyalty.pointsToReward) / loyalty.pointsToReward) * 100)
    : 0;

  return (
    <main className="min-h-screen bg-[#f1f1f1] px-5 py-10 text-[#243640]">
      <div className="mx-auto max-w-[1120px]">
        <Link href={`/cardapio/${restaurant.slug}`} className="font-black text-red-600">Voltar para a loja</Link>
        <section className="mt-5 rounded-xl bg-white p-6 shadow-sm md:p-10">
          <div className="mx-auto grid h-20 w-20 place-items-center overflow-hidden rounded-2xl bg-white shadow">
            {restaurant.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={restaurant.logo_url} alt="" className="h-full w-full object-cover" />
            ) : (
              <UserCircle2 className="h-10 w-10 text-red-600" />
            )}
          </div>

          <div className="mt-6 text-center">
            <h1 className="text-3xl font-black">Minha conta</h1>
            <p className="mt-2 text-sm font-semibold text-slate-500">
              {loggedIn ? `Acompanhe seus dados, pontos e pedidos no ${restaurant.name}.` : "Entre ou cadastre-se para não preencher seus dados novamente."}
            </p>
          </div>

          {status && (
            <p className={statusIsError ? "mx-auto mt-5 max-w-2xl rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700" : "mx-auto mt-5 max-w-2xl rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm font-bold text-emerald-700"}>
              {status}
            </p>
          )}

          {!loggedIn ? (
            <div className="mx-auto mt-8 max-w-2xl">
              <div className="grid grid-cols-2 rounded-xl bg-slate-100 p-1">
                <button type="button" onClick={() => setMode("login")} className={mode === "login" ? "rounded-lg bg-white px-4 py-3 font-black shadow-sm" : "rounded-lg px-4 py-3 font-black text-slate-500"}>Entrar</button>
                <button type="button" onClick={() => setMode("register")} className={mode === "register" ? "rounded-lg bg-white px-4 py-3 font-black shadow-sm" : "rounded-lg px-4 py-3 font-black text-slate-500"}>Cadastre-se</button>
              </div>
              <div className="mt-5 grid gap-3">
                {mode === "register" && (
                  <>
                    <input className="field-light" placeholder="Nome completo" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
                    <input className="field-light" placeholder="Celular/WhatsApp" value={draft.phone} onChange={(event) => setDraft({ ...draft, phone: event.target.value })} />
                  </>
                )}
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input className="field-light pl-11" type="email" placeholder="E-mail" value={draft.email} onChange={(event) => setDraft({ ...draft, email: event.target.value })} />
                </div>
                <input className="field-light" type="password" placeholder="Senha" value={draft.password} onChange={(event) => setDraft({ ...draft, password: event.target.value })} />
                {mode === "register" && (
                  <div className="grid gap-3 md:grid-cols-2">
                    <input className="field-light" placeholder="CPF" value={draft.cpf} onChange={(event) => setDraft({ ...draft, cpf: event.target.value })} />
                    <input className="field-light" type="date" value={draft.birthDate} onChange={(event) => setDraft({ ...draft, birthDate: event.target.value })} />
                  </div>
                )}
                <button type="button" onClick={submitAuth} disabled={loading} className="rounded-lg bg-red-600 px-4 py-4 font-black uppercase text-white transition hover:bg-red-700 disabled:bg-slate-300">
                  {loading ? "Aguarde..." : mode === "login" ? "Entrar na conta" : "Criar cadastro"}
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-8 grid gap-5 lg:grid-cols-[360px_1fr]">
              <aside className="space-y-5">
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-950">
                  <strong>Olá, {profile?.name || "cliente"}.</strong>
                  <p className="mt-1 text-sm font-semibold">Sua conta está ativa neste dispositivo.</p>
                  <button type="button" onClick={logout} className="mt-4 rounded-lg bg-white px-4 py-2 text-sm font-black text-emerald-800 shadow-sm">Sair da conta</button>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-5">
                  <div className="flex items-center gap-2 font-black"><Gift className="h-5 w-5 text-red-600" /> Programa de fidelidade</div>
                  {loyalty.enabled ? (
                    <>
                      <p className="mt-4 text-4xl font-black">{loyalty.points}</p>
                      <p className="text-sm font-semibold text-slate-500">pontos acumulados</p>
                      <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-100">
                        <div className="h-full rounded-full bg-red-600" style={{ width: `${progress}%` }} />
                      </div>
                      <div className="mt-4 rounded-lg bg-slate-50 p-3 text-sm font-bold text-slate-700">
                        Você ganha 1 ponto por pedido dentro da campanha. A cada {loyalty.pointsToReward} pontos você ganha {rewardLabel(loyalty)}. Pontos valem por {loyalty.pointsValidityMonths ?? 6} meses.
                      </div>
                      {(loyalty.campaignStartsAt || loyalty.campaignEndsAt) && (
                        <p className="mt-3 text-xs font-bold text-slate-500">
                          Campanha: {loyalty.campaignStartsAt ? shortDate(loyalty.campaignStartsAt) : "sem início"} até {loyalty.campaignEndsAt ? shortDate(loyalty.campaignEndsAt) : "sem fim"}
                        </p>
                      )}
                      <p className="mt-3 text-sm text-slate-500">
                        {loyalty.rewardsAvailable > 0
                          ? `Você tem ${loyalty.rewardsAvailable} benefício(s) disponível(is).`
                          : `Faltam ${pointsToNextReward} pontos para o próximo benefício.`}
                      </p>
                      {!!loyalty.expiringBatches?.length && (
                        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs font-bold text-amber-900">
                          <p className="text-sm font-black">Validade dos pontos</p>
                          <div className="mt-2 space-y-1">
                            {loyalty.expiringBatches.slice(0, 4).map((batch) => (
                              <p key={`${batch.orderId ?? batch.expiresAt}-${batch.points}`}>
                                {batch.points} ponto(s) vencem em {shortDate(batch.expiresAt)}
                              </p>
                            ))}
                          </div>
                        </div>
                      )}
                      {Boolean(loyalty.expiredPoints) && (
                        <p className="mt-3 text-xs font-bold text-slate-400">{loyalty.expiredPoints} ponto(s) já venceram.</p>
                      )}
                    </>
                  ) : (
                    <p className="mt-3 text-sm font-semibold text-slate-500">Programa de fidelidade ainda não está ativo.</p>
                  )}
                </div>
              </aside>

              <div className="space-y-5">
                <section className="rounded-xl border border-slate-200 bg-white p-5">
                  <h2 className="flex items-center gap-2 text-xl font-black"><MapPin className="h-5 w-5 text-red-600" /> Meus dados e endereço</h2>
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <input className="field-light" placeholder="Nome completo" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
                    <input className="field-light" placeholder="Celular/WhatsApp" value={draft.phone} onChange={(event) => setDraft({ ...draft, phone: event.target.value })} />
                    <input className="field-light" type="email" placeholder="E-mail" value={draft.email} onChange={(event) => setDraft({ ...draft, email: event.target.value })} />
                    <input className="field-light" placeholder="CPF" value={draft.cpf} onChange={(event) => setDraft({ ...draft, cpf: event.target.value })} />
                    <input className="field-light" type="date" value={draft.birthDate} onChange={(event) => setDraft({ ...draft, birthDate: event.target.value })} />
                    <div className="grid grid-cols-[1fr_auto] gap-2">
                      <input className="field-light" placeholder="CEP" value={draft.zipCode} onChange={(event) => setDraft({ ...draft, zipCode: event.target.value })} />
                      <button type="button" onClick={lookupCep} className="rounded-lg border border-slate-200 bg-white px-4 font-black hover:border-red-300" aria-label="Buscar CEP"><Search className="h-4 w-4" /></button>
                    </div>
                    <input className="field-light md:col-span-2" placeholder="Endereço" value={draft.address} onChange={(event) => setDraft({ ...draft, address: event.target.value })} />
                    <input className="field-light" placeholder="Número" value={draft.addressNumber} onChange={(event) => setDraft({ ...draft, addressNumber: event.target.value })} />
                    <input className="field-light" placeholder="Bairro" value={draft.neighborhood} onChange={(event) => setDraft({ ...draft, neighborhood: event.target.value })} />
                    <input className="field-light" placeholder="Cidade" value={draft.city} onChange={(event) => setDraft({ ...draft, city: event.target.value })} />
                    <input className="field-light" placeholder="UF" value={draft.state} onChange={(event) => setDraft({ ...draft, state: event.target.value.toUpperCase() })} maxLength={2} />
                    <input className="field-light" placeholder="Complemento" value={draft.complement} onChange={(event) => setDraft({ ...draft, complement: event.target.value })} />
                    <input className="field-light" placeholder="Ponto de referência" value={draft.reference} onChange={(event) => setDraft({ ...draft, reference: event.target.value })} />
                  </div>
                  <button type="button" onClick={saveAccount} disabled={loading} className="mt-4 w-full rounded-lg bg-red-600 px-4 py-3 font-black text-white transition hover:bg-red-700 disabled:bg-slate-300">
                    {loading ? "Salvando..." : "Salvar meus dados"}
                  </button>
                </section>

                <section className="rounded-xl border border-slate-200 bg-white p-5">
                  <h2 className="flex items-center gap-2 text-xl font-black"><PackageCheck className="h-5 w-5 text-red-600" /> Histórico de pedidos</h2>
                  <div className="mt-4 divide-y divide-slate-100">
                    {orders.map((order) => (
                      <div key={order.id} className="grid gap-2 py-3 md:grid-cols-[1fr_120px_120px] md:items-center">
                        <div>
                          <strong>Pedido #{order.order_number ?? order.code ?? order.id.slice(0, 6)}</strong>
                          <p className="text-sm text-slate-500">
                            {order.created_at ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(order.created_at)) : ""} - {orderTypeLabel(order.type)}
                          </p>
                        </div>
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-center text-xs font-black text-slate-600">{statusLabel(order.status)}</span>
                        <strong className="md:text-right">{money(order.total ?? 0)}</strong>
                      </div>
                    ))}
                    {!orders.length && <p className="rounded-lg bg-slate-50 p-4 text-sm font-semibold text-slate-500">Nenhum pedido encontrado para esta conta.</p>}
                  </div>
                </section>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
