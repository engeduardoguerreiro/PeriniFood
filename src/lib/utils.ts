import { clsx, type ClassValue } from "clsx";
import type { OrderStatus, Role } from "./types";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function money(value: number | string | null | undefined) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value ?? 0));
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
  preparing: "bg-[#E50914]/15 text-[#232A31] border-[#E50914]/25",
  ready: "bg-purple-100 text-purple-800 border-purple-200",
  out_for_delivery: "bg-red-100 text-red-800 border-red-200",
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
  return `https://wa.me/${withCountry}text=${encodeURIComponent(message)}`;
}

export function orderCode(order: { code: string | null; order_number: number | null; id: string }) {
  if (order.code) return order.code;
  if (order.order_number) return String(order.order_number).padStart(4, "0");
  return String(order.id ?? "").replace(/-/g, "").slice(0, 8).toUpperCase();
}

export function nextStatus(status: OrderStatus): OrderStatus | null {
  const flow: OrderStatus[] = ["pending", "accepted", "preparing", "ready", "out_for_delivery", "completed"];
  const index = flow.indexOf(status);
  return index >= 0 ? flow[index + 1] ?? null : null;
}
