"use client";

import Link from "next/link";
import { Gift, LockKeyhole, Mail, MapPin, PackageCheck, Search, UserCircle2, Zap } from "lucide-react";
import { StoreTopBar } from "@/components/storefront/store-top-bar";
import { Icon3D, type Tone } from "@/components/ui/icon-3d";
import { useCallback, useEffect, useState } from "react";
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


  const fillDraft = useCallback((customer: CustomerProfile) => {
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
  }, []);

  const saveProfile = useCallback((customer: CustomerProfile) => {
    setProfile(customer);
    fillDraft(customer);
  }, [fillDraft]);

  useEffect(() => {
    window.localStorage.removeItem(accountStorageKey(restaurant.slug));
    const controller = new AbortController();
    fetch('/api/customer-auth/profile?restaurantId=' + restaurant.id, { signal: controller.signal })
      .then(async response => response.ok ? response.json() : null)
      .then(data => { if (data?.ok) { setAccount(data); saveProfile(data.customer); } })
      .catch(() => {});
    return () => controller.abort();
  }, [restaurant.id, restaurant.slug, saveProfile]);


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

  async function logout() {
    const response = await fetch("/api/customer-auth/logout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ restaurantId: restaurant.id }) });
    if (!response.ok) { setStatus("Não foi possível sair. Tente novamente."); return; }
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

  const field = "h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-[0.95rem] text-ink shadow-[inset_0_1px_2px_rgba(0,0,0,0.05)] outline-none transition placeholder:text-slate-400 focus:border-brand focus:ring-4 focus:ring-brand/10 read-only:bg-slate-50";
  const label = "mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500";
  const primary = "flex h-12 w-full items-center justify-center rounded-xl bg-gradient-to-b from-brand-bright to-brand font-bold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.3),0_12px_26px_-12px_rgba(207,74,10,0.85)] transition hover:to-brand-strong disabled:from-slate-300 disabled:to-slate-300 disabled:shadow-none";
  const visibleCode = (order: CustomerOrder) => (order.code && !/^[a-f0-9]{48}$/.test(order.code) ? order.code : null);

  return (
    <main className="min-h-screen bg-[#f6f5f2] text-ink">
      <StoreTopBar slug={restaurant.slug} name={restaurant.name} logo={restaurant.logo_url} title={loggedIn ? "Minha conta" : mode === "login" ? "Entrar" : "Criar conta"} />

      <div className="mx-auto max-w-5xl px-4 py-6">
        {status && (
          <p role={statusIsError ? "alert" : "status"} className={`mx-auto mb-5 max-w-md rounded-xl border p-3 text-sm font-semibold ${statusIsError ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>
            {status}
          </p>
        )}

        {!loggedIn ? (
          <div className="mx-auto max-w-md">
            <section className="rounded-3xl bg-white p-6 shadow-[0_18px_40px_-24px_rgba(0,0,0,0.45)] ring-1 ring-black/[0.04] sm:p-8">
              <div className="flex flex-col items-center text-center">
                <span className="grid h-16 w-16 place-items-center overflow-hidden rounded-full border-4 border-white bg-white shadow-[0_10px_24px_-10px_rgba(0,0,0,0.5)]">
                  {restaurant.logo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={restaurant.logo_url} alt="" className="h-full w-full object-contain" />
                  ) : (
                    <UserCircle2 className="h-8 w-8 text-brand" />
                  )}
                </span>
                <h1 className="mt-4 text-2xl font-black tracking-tight">{mode === "login" ? "Que bom te ver de novo!" : "Crie sua conta"}</h1>
                <p className="mt-1 text-sm text-slate-500">{mode === "login" ? `Entre para pedir mais rápido no ${restaurant.name}.` : "Seus dados ficam salvos para os próximos pedidos."}</p>
              </div>

              <div role="tablist" aria-label="Entrar ou criar conta" className="mt-6 grid grid-cols-2 rounded-2xl bg-slate-100 p-1">
                {(["login", "register"] as const).map((tab) => (
                  <button key={tab} type="button" role="tab" aria-selected={mode === tab} onClick={() => setMode(tab)} className={`h-11 rounded-xl text-sm font-bold transition ${mode === tab ? "bg-white text-ink shadow-[0_4px_12px_-4px_rgba(0,0,0,0.2)]" : "text-slate-500 hover:text-ink"}`}>
                    {tab === "login" ? "Entrar" : "Criar conta"}
                  </button>
                ))}
              </div>

              <form className="mt-5 space-y-4" onSubmit={(event) => { event.preventDefault(); submitAuth(); }}>
                {mode === "register" && (
                  <>
                    <label className="block"><span className={label}>Nome completo</span><input className={field} autoComplete="name" required value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} placeholder="Como devemos te chamar" /></label>
                    <label className="block"><span className={label}>Celular / WhatsApp</span><input className={field} type="tel" inputMode="tel" autoComplete="tel" required value={draft.phone} onChange={(event) => setDraft({ ...draft, phone: event.target.value })} placeholder="(11) 99999-9999" /></label>
                  </>
                )}
                <label className="block">
                  <span className={label}>E-mail</span>
                  <span className="relative block">
                    <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input className={`${field} pl-11`} type="email" autoComplete="email" required readOnly={Boolean(profile)} value={draft.email} onChange={(event) => setDraft({ ...draft, email: event.target.value })} placeholder="voce@email.com" />
                  </span>
                </label>
                <label className="block">
                  <span className={label}>Senha</span>
                  <span className="relative block">
                    <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input className={`${field} pl-11`} type="password" required autoComplete={mode === "register" ? "new-password" : "current-password"} minLength={mode === "register" ? 12 : undefined} maxLength={128} placeholder={mode === "register" ? "Mínimo de 12 caracteres" : "Sua senha"} value={draft.password} onChange={(event) => setDraft({ ...draft, password: event.target.value })} />
                  </span>
                </label>
                <button type="submit" disabled={loading} className={primary}>
                  {loading ? "Aguarde…" : mode === "login" ? "Entrar" : "Criar minha conta"}
                </button>
              </form>

              <p className="mt-5 text-center text-sm text-slate-500">
                {mode === "login" ? "Ainda não tem conta? " : "Já tem conta? "}
                <button type="button" onClick={() => setMode(mode === "login" ? "register" : "login")} className="font-bold text-brand hover:underline">{mode === "login" ? "Criar agora" : "Entrar"}</button>
              </p>
            </section>

            <ul className="mt-5 grid grid-cols-3 gap-2 text-center text-xs font-semibold text-slate-600">
              {[[Zap, "Pedido em segundos", "orange"], [PackageCheck, "Histórico de pedidos", "blue"], [Gift, "Pontos de fidelidade", "pink"]].map(([Icon, text, tone]) => (
                <li key={text as string} className="flex flex-col items-center gap-2 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-black/[0.04]">
                  <Icon3D icon={Icon as typeof Gift} tone={tone as Tone} size="sm" />
                  {text as string}
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="grid gap-5 lg:grid-cols-[340px_1fr]">
            <aside className="space-y-5">
              <div className="rounded-3xl bg-gradient-to-br from-[#1f1f22] to-[#0b0b0c] p-5 text-white shadow-[0_18px_40px_-20px_rgba(0,0,0,0.7)]">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/50">Minha conta</p>
                <p className="mt-1 text-xl font-black">Olá, {profile?.name?.split(" ")[0] || "cliente"}!</p>
                <p className="mt-1 text-sm text-white/65">Conta ativa neste dispositivo.</p>
                <div className="mt-4 flex gap-2">
                  <Link href={`/cardapio/${restaurant.slug}`} className="inline-flex h-10 flex-1 items-center justify-center rounded-xl bg-gradient-to-b from-brand-bright to-brand text-sm font-bold">Fazer pedido</Link>
                  <button type="button" onClick={logout} className="h-10 rounded-xl border border-white/15 px-4 text-sm font-semibold text-white/85 hover:bg-white/10">Sair</button>
                </div>
              </div>

              <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-black/[0.04]">
                <div className="flex items-center gap-3 font-black"><Icon3D icon={Gift} tone="pink" size="sm" /> Programa de fidelidade</div>
                {loyalty.enabled ? (
                  <>
                    <p className="mt-4 text-4xl font-black [font-variant-numeric:tabular-nums]">{loyalty.points}</p>
                    <p className="text-sm text-slate-500">pontos acumulados</p>
                    <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full bg-gradient-to-r from-brand-bright to-brand" style={{ width: `${progress}%` }} />
                    </div>
                    <p className="mt-2 text-sm font-semibold text-ink">
                      {loyalty.rewardsAvailable > 0 ? `Você tem ${loyalty.rewardsAvailable} benefício(s) disponível(is)!` : `Faltam ${pointsToNextReward} pontos para o próximo benefício.`}
                    </p>
                    <p className="mt-3 rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
                      1 ponto por pedido dentro da campanha. A cada {loyalty.pointsToReward} pontos você ganha {rewardLabel(loyalty)}. Pontos valem por {loyalty.pointsValidityMonths ?? 6} meses.
                    </p>
                    {(loyalty.campaignStartsAt || loyalty.campaignEndsAt) && (
                      <p className="mt-2 text-xs text-slate-500">Campanha: {loyalty.campaignStartsAt ? shortDate(loyalty.campaignStartsAt) : "sem início"} até {loyalty.campaignEndsAt ? shortDate(loyalty.campaignEndsAt) : "sem fim"}</p>
                    )}
                    {!!loyalty.expiringBatches?.length && (
                      <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-semibold text-amber-900">
                        <p className="text-sm font-black">Validade dos pontos</p>
                        {loyalty.expiringBatches.slice(0, 4).map((batch) => (
                          <p key={`${batch.orderId ?? batch.expiresAt}-${batch.points}`} className="mt-1">{batch.points} ponto(s) vencem em {shortDate(batch.expiresAt)}</p>
                        ))}
                      </div>
                    )}
                    {Boolean(loyalty.expiredPoints) && <p className="mt-2 text-xs text-slate-400">{loyalty.expiredPoints} ponto(s) já venceram.</p>}
                  </>
                ) : (
                  <p className="mt-3 text-sm text-slate-500">O programa de fidelidade ainda não está ativo nesta loja.</p>
                )}
              </div>
            </aside>

            <div className="space-y-5">
              <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-black/[0.04]">
                <h2 className="flex items-center gap-3 text-lg font-black"><Icon3D icon={PackageCheck} tone="blue" size="sm" /> Meus pedidos</h2>
                <ul className="mt-4 divide-y divide-slate-100">
                  {orders.map((order) => (
                    <li key={order.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3">
                      <div className="min-w-0 flex-1">
                        <p className="font-bold">Pedido #{order.order_number ?? visibleCode(order) ?? order.id.slice(0, 6)}</p>
                        <p className="text-sm text-slate-500">{order.created_at ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(order.created_at)) : ""} · {orderTypeLabel(order.type)}</p>
                      </div>
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">{statusLabel(order.status)}</span>
                      <strong className="w-24 text-right [font-variant-numeric:tabular-nums]">{money(order.total ?? 0)}</strong>
                      {order.code && /^[a-f0-9]{48}$/.test(order.code) && (
                        <Link href={`/pedido/${order.code}`} className="text-sm font-bold text-brand hover:underline">Acompanhar</Link>
                      )}
                    </li>
                  ))}
                  {!orders.length && <li className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">Você ainda não fez pedidos com esta conta.</li>}
                </ul>
              </section>

              <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-black/[0.04]">
                <h2 className="flex items-center gap-3 text-lg font-black"><Icon3D icon={MapPin} tone="orange" size="sm" /> Meus dados e endereço</h2>
                <form className="mt-4 grid gap-3 sm:grid-cols-2" onSubmit={(event) => { event.preventDefault(); saveAccount(); }}>
                  <label className="block"><span className={label}>Nome completo</span><input className={field} autoComplete="name" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /></label>
                  <label className="block"><span className={label}>Celular / WhatsApp</span><input className={field} type="tel" inputMode="tel" autoComplete="tel" value={draft.phone} onChange={(event) => setDraft({ ...draft, phone: event.target.value })} /></label>
                  <label className="block"><span className={label}>E-mail</span><input className={field} type="email" readOnly={Boolean(profile)} value={draft.email} onChange={(event) => setDraft({ ...draft, email: event.target.value })} /></label>
                  <label className="block">
                    <span className={label}>CEP</span>
                    <span className="grid grid-cols-[1fr_auto] gap-2">
                      <input className={field} inputMode="numeric" autoComplete="postal-code" value={draft.zipCode} onChange={(event) => setDraft({ ...draft, zipCode: event.target.value })} />
                      <button type="button" onClick={lookupCep} className="grid h-12 w-12 place-items-center rounded-xl border border-slate-200 bg-white hover:border-brand" aria-label="Buscar endereço pelo CEP"><Search className="h-4 w-4" /></button>
                    </span>
                  </label>
                  <label className="block sm:col-span-2"><span className={label}>Endereço</span><input className={field} autoComplete="address-line1" value={draft.address} onChange={(event) => setDraft({ ...draft, address: event.target.value })} /></label>
                  <label className="block"><span className={label}>Número</span><input className={field} inputMode="numeric" value={draft.addressNumber} onChange={(event) => setDraft({ ...draft, addressNumber: event.target.value })} /></label>
                  <label className="block"><span className={label}>Bairro</span><input className={field} value={draft.neighborhood} onChange={(event) => setDraft({ ...draft, neighborhood: event.target.value })} /></label>
                  <label className="block"><span className={label}>Cidade</span><input className={field} autoComplete="address-level2" value={draft.city} onChange={(event) => setDraft({ ...draft, city: event.target.value })} /></label>
                  <label className="block"><span className={label}>UF</span><input className={field} autoComplete="address-level1" maxLength={2} value={draft.state} onChange={(event) => setDraft({ ...draft, state: event.target.value.toUpperCase() })} /></label>
                  <label className="block"><span className={label}>Complemento</span><input className={field} autoComplete="address-line2" value={draft.complement} onChange={(event) => setDraft({ ...draft, complement: event.target.value })} /></label>
                  <label className="block"><span className={label}>Ponto de referência</span><input className={field} value={draft.reference} onChange={(event) => setDraft({ ...draft, reference: event.target.value })} /></label>
                  <button type="submit" disabled={loading} className={`${primary} sm:col-span-2`}>{loading ? "Salvando…" : "Salvar meus dados"}</button>
                </form>
              </section>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
