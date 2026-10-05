import { clsx, type ClassValue } from "clsx";
import type { OrderStatus, Role } from "./types";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

// O Brasil escreve 12,50 — e um <input type="number"> descarta a vírgula em
// silêncio, transformando "12,50" em 1250. Todo valor monetário/decimal que
// chega de formulário passa por aqui: aceita vírgula, ponto e milhar.
export function parseDecimal(value: unknown, fallback = 0) {
  const raw = String(value ?? "").trim();
  if (!raw) return fallback;
  let text = raw.replace(/[^\d.,-]/g, "");
  const comma = text.lastIndexOf(",");
  const dot = text.lastIndexOf(".");
  if (comma >= 0 && dot >= 0) {
    text = comma > dot ? text.replace(/\./g, "").replace(",", ".") : text.replace(/,/g, "");
  } else if (comma >= 0) {
    text = text.replace(/,/g, ".");
  } else if (dot >= 0) {
    const parts = text.split(".");
    // "1.234" e "1.234.567" são milhares; "12.50" é decimal.
    if (parts.length > 2 || (parts.length === 2 && parts[1].length === 3 && parts[0] !== "")) text = parts.join("");
  }
  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : fallback;
}

// Valor inicial de um campo decimal, na escrita que o usuário espera ler.
export function decimalInputValue(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === "") return "";
  const number = typeof value === "number" ? value : parseDecimal(value, Number.NaN);
  if (!Number.isFinite(number)) return "";
  return String(number).replace(".", ",");
}

// Formatador criado uma vez: money() roda centenas de vezes por render no cardápio.
const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function money(value: number | string | null | undefined) {
  return brl.format(Number(value ?? 0));
}

export function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

export const statusLabel: Record<OrderStatus, string> = {
  pending: "Novo",
  accepted: "Confirmado",
  preparing: "Em preparo",
  ready: "Pronto",
  out_for_delivery: "Saiu para entrega",
  completed: "Entregue",
  canceled: "Cancelado",
};

export const publicStatusLabel = {
  NEW: "Novo",
  CONFIRMED: "Confirmado",
  PREPARING: "Em preparo",
  READY: "Pronto",
  OUT_FOR_DELIVERY: "Saiu para entrega",
  DELIVERED: "Entregue",
  CANCELED: "Cancelado",
} as const;

export const statusClass: Record<OrderStatus, string> = {
  pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
  accepted: "bg-blue-100 text-blue-800 border-blue-200",
  preparing: "bg-orange-100 text-orange-800 border-orange-200",
  ready: "bg-purple-100 text-purple-800 border-purple-200",
  out_for_delivery: "bg-sky-100 text-sky-800 border-sky-200",
  completed: "bg-emerald-100 text-emerald-800 border-emerald-200",
  canceled: "bg-red-100 text-red-800 border-red-200",
};

const grants: Record<Role, string[]> = {
  owner: ["*"],
  admin: ["*"],
  manager: ["orders", "menu", "reports", "customers", "tables"],
  cashier: ["orders", "pdv", "cash-register", "customers"],
  kitchen: ["orders"],
};

export function can(role: Role | null | undefined, permission: string) {
  if (!role) return false;
  return grants[role].includes("*") || grants[role].includes(permission);
}

export function digits(value: string | null | undefined) {
  return String(value ?? "").replace(/\D/g, "");
}

export function whatsappLink(phone: string | null | undefined, message: string) {
  const clean = digits(phone);
  if (!clean) return "#";
  const withCountry = clean.startsWith("55") ? clean : `55${clean}`;
  return `https://wa.me/${withCountry}?text=${encodeURIComponent(message)}`;
}

// Pedidos do site/PDV guardam em `code` o token secreto do link /pedido/<code>
// (48 hex): nunca exibir — usa o número sequencial da loja no lugar.
export function isTrackingToken(code: string | null | undefined) {
  return Boolean(code && /^[a-f0-9]{48}$/.test(code));
}

export function orderCode(order: { code: string | null; order_number: number | null; id: string }) {
  if (order.code && !isTrackingToken(order.code)) return order.code;
  if (order.order_number) return String(order.order_number).padStart(4, "0");
  return String(order.id ?? "").replace(/-/g, "").slice(0, 8).toUpperCase();
}

export function nextStatus(status: OrderStatus): OrderStatus | null {
  const flow: OrderStatus[] = ["pending", "accepted", "preparing", "ready", "out_for_delivery", "completed"];
  const index = flow.indexOf(status);
  return index >= 0 ? flow[index + 1] ?? null : null;
}
