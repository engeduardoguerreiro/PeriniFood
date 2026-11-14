"use client";

import { useEffect, useState } from "react";
import { Bike, ShoppingBag, UtensilsCrossed } from "lucide-react";
import type { OrderStatus } from "@/lib/types";

// Tipos, rótulos e pequenos componentes usados pelas telas do Gestor de Pedidos.

export type Schedule = { start: string; end: string } | null;
export type CourierState = "waiting" | "on_route" | "delivered" | "expired";
export type ListOrder = {
  id: string; label: string; source: string; type: "delivery" | "pickup" | "dine_in"; status: OrderStatus; total: number;
  customer: string | null; address: string | null; payment: string; paymentDetail: string | null;
  createdAt: string; updatedAt: string; printed: boolean; schedule: Schedule;
  courier: { name: string | null; state: CourierState } | null;
};
export type StoreMode = "auto" | "open" | "closed" | "offline";
export type StoreInfo = { name: string; logo: string | null; slug: string; open: boolean; text: string; mode: StoreMode };
export type Detail = {
  id: string; updatedAt: string; phone: string; phoneDigits: string; address: string | null; notes: string | null;
  subtotal: number; deliveryFee: number; discount: number; total: number; paymentMethod: string; paymentStatus: string;
  paymentNote: string | null; changeFor: number | null; externalId: string | null; schedule: Schedule;
  trackingCode: string | null;
  courier: { token: string; name: string | null; state: CourierState; deliveryCode: string | null } | null;
  items: Array<{ id: string; name: string; quantity: number; total: number; notes: string | null; lines: string[] }>;
};

// Canais em que o cliente pediu sozinho: tocam alerta e abrem o aviso de pedido novo.
export const ALERT_SOURCES = new Set(["site", "ifood", "99food", "keeta", "rappi"]);
export const CLOSED_STATUSES: OrderStatus[] = ["completed", "canceled"];

export const sourceInfo: Record<string, { label: string; className: string }> = {
  ifood: { label: "iFood", className: "bg-red-600 text-white" },
  "99food": { label: "99Food", className: "bg-yellow-400 text-black" },
  keeta: { label: "Keeta", className: "bg-amber-500 text-white" },
  rappi: { label: "Rappi", className: "bg-orange-500 text-white" },
  site: { label: "Cardápio", className: "bg-brand text-white" },
  pdv: { label: "Loja", className: "bg-zinc-700 text-white" },
  mesa: { label: "Mesa", className: "bg-zinc-700 text-white" },
  manual: { label: "Manual", className: "bg-zinc-500 text-white" },
  delivery: { label: "Delivery", className: "bg-zinc-500 text-white" },
};

export const typeInfo = {
  delivery: { label: "Entrega", icon: Bike },
  pickup: { label: "Retirada", icon: ShoppingBag },
  dine_in: { label: "Mesa", icon: UtensilsCrossed },
} as const;

export const paymentLabel: Record<string, string> = {
  cash: "Dinheiro", credit_card: "Cartão de crédito", debit_card: "Cartão de débito", pix: "Pix", online: "Pago online", other: "Outro",
};

export const statusInfo: Record<OrderStatus, { label: string; className: string }> = {
  pending: { label: "Novo", className: "bg-red-100 text-red-700" },
  accepted: { label: "Confirmado", className: "bg-sky-100 text-sky-700" },
  preparing: { label: "Em preparo", className: "bg-amber-100 text-amber-800" },
  ready: { label: "Pronto", className: "bg-emerald-100 text-emerald-700" },
  out_for_delivery: { label: "Em entrega", className: "bg-indigo-100 text-indigo-700" },
  completed: { label: "Concluído", className: "bg-zinc-100 text-zinc-600" },
  canceled: { label: "Cancelado", className: "bg-zinc-200 text-zinc-600" },
};

export const courierStateInfo: Record<CourierState, { label: string; className: string }> = {
  waiting: { label: "Motoboy ainda não saiu", className: "bg-zinc-100 text-zinc-600" },
  on_route: { label: "Em rota", className: "bg-sky-100 text-sky-800" },
  delivered: { label: "Entregue", className: "bg-emerald-100 text-emerald-800" },
  expired: { label: "Link expirado", className: "bg-amber-100 text-amber-800" },
};

export const timeFormat = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" });
export const dateTimeFormat = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

export function isAlertable(order: ListOrder) {
  return ALERT_SOURCES.has(order.source);
}
export function isIFood(order: Pick<ListOrder, "source">) {
  return order.source === "ifood";
}
export function isClosed(order: Pick<ListOrder, "status">) {
  return CLOSED_STATUSES.includes(order.status);
}
export function scheduled(order: ListOrder, now: number) {
  return Boolean(order.schedule && new Date(order.schedule.start).getTime() > now);
}
export function minutesSince(iso: string, now: number) {
  return Math.max(0, Math.floor((now - new Date(iso).getTime()) / 60_000));
}
export function elapsedLabel(minutes: number) {
  if (minutes < 60) return `${minutes} min`;
  return `${Math.floor(minutes / 60)}h${String(minutes % 60).padStart(2, "0")}`;
}
export function elapsedClass(order: ListOrder, minutes: number) {
  if (order.status === "pending") return minutes >= 5 ? "bg-red-600 text-white" : "bg-red-100 text-red-700";
  if (minutes >= 50) return "bg-red-100 text-red-700";
  if (minutes >= 30) return "bg-amber-100 text-amber-800";
  return "bg-zinc-100 text-zinc-600";
}

// Telefone em formato wa.me (DDI 55 quando faltar).
export function waNumber(digits: string | null | undefined) {
  const value = (digits ?? "").replace(/\D/g, "");
  if (value.length < 10) return "";
  return value.startsWith("55") && value.length >= 12 ? value : `55${value}`;
}
export function waLink(digits: string | null | undefined, text: string) {
  const number = waNumber(digits);
  return `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
}

export function readLocal(key: string) {
  try { return window.localStorage.getItem(key); } catch { return null; }
}
export function writeLocal(key: string, value: string) {
  try { window.localStorage.setItem(key, value); } catch {}
}

// Próxima etapa do pedido (botão principal). Pedido do iFood não é concluído pela
// loja: o iFood finaliza sozinho depois da entrega/retirada.
export function nextStep(order: ListOrder, now: number): { status: OrderStatus; label: string } | { blocked: string } | null {
  switch (order.status) {
    case "pending":
      return { status: "preparing", label: "Aceitar pedido" };
    case "accepted":
      return { status: "preparing", label: "Iniciar preparo" };
    case "preparing":
      return { status: "ready", label: "Pedido pronto" };
    case "ready":
      if (order.type === "delivery") {
        if (isIFood(order) && scheduled(order, now)) return { blocked: "Agendado: despacho liberado no início da janela" };
        return { status: "out_for_delivery", label: "Despachar" };
      }
      return isIFood(order) ? { blocked: "Aguardando retirada — o iFood conclui" } : { status: "completed", label: "Concluir" };
    case "out_for_delivery":
      return isIFood(order) ? { blocked: "Em entrega — o iFood conclui" } : { status: "completed", label: "Concluir entrega" };
    default:
      return null;
  }
}

export function SourceBadge({ source }: { source: string }) {
  const info = sourceInfo[source] ?? { label: source.toUpperCase(), className: "bg-zinc-500 text-white" };
  return <span className={`inline-flex h-5 items-center rounded px-1.5 text-[0.68rem] font-bold uppercase tracking-wide ${info.className}`}>{info.label}</span>;
}

// Detalhe do pedido: recarrega quando o pedido muda no servidor (updatedAt) ou
// quando a tela pede (version, ex.: depois de gerar o link do motoboy).
export function useOrderDetail(id: string | null, updatedAt: string | undefined, version = 0) {
  const [details, setDetails] = useState<Record<string, { detail: Detail; key: string }>>({});
  const [error, setError] = useState<string | null>(null);
  const key = `${updatedAt ?? ""}:${version}`;
  const cached = id ? details[id] : undefined;
  const fresh = cached?.key === key;
  useEffect(() => {
    if (!id || fresh) return;
    let alive = true;
    fetch(`/api/gestor/pedidos/${id}`, { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json() as { ok: boolean; order?: Detail; error?: string };
        if (!alive) return;
        if (data.ok && data.order) { setError(null); setDetails((current) => ({ ...current, [id]: { detail: data.order!, key } })); }
        else setError(data.error ?? "Não foi possível abrir o pedido.");
      })
      .catch(() => { if (alive) setError("Sem conexão para abrir o pedido."); });
    return () => { alive = false; };
  }, [id, key, fresh]);
  return { detail: cached?.detail, error: cached ? null : error };
}
