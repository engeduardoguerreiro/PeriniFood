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

// Telefone de cliente é gravado sempre como DDD + número, só dígitos (ex.: 11971915600).
// O índice único (restaurant_id, phone) compara texto: "11 97191-5600" e "11971915600"
// virariam dois clientes. Remove o +55 quando vier junto.
export function normalizePhone(value: string | null | undefined) {
  const only = digits(value);
  return (only.length === 12 || only.length === 13) && only.startsWith("55") ? only.slice(2) : only;
}

export function isValidPhone(value: string | null | undefined) {
  // DDD não tem zero (11–99): barra 0800 de plataformas como iFood.
  return /^[1-9]{2}\d{8,9}$/.test(normalizePhone(value));
}

// Máscara exibida e preenchida enquanto digita: (11) 97191-5600 ou (11) 3456-7890.
export function formatPhone(value: string | null | undefined) {
  const only = normalizePhone(value).slice(0, 11);
  if (only.length <= 2) return only.length ? `(${only}` : "";
  const ddd = only.slice(0, 2), rest = only.slice(2);
  const split = rest.length > 8 ? 5 : 4;
  return rest.length > split ? `(${ddd}) ${rest.slice(0, split)}-${rest.slice(split)}` : `(${ddd}) ${rest}`;
}

// Exibição de telefone já gravado: formata o que é DDD + número, mantém o resto (0800 do iFood).
export function displayPhone(value: string | null | undefined) {
  return isValidPhone(value) ? formatPhone(value) : String(value ?? "");
}

// onChange de campo mascarado: backspace sobre "-", ")" ou espaço apaga o dígito anterior,
// senão a máscara recolocaria o separador e o cursor ficaria preso.
export function maskPhoneInput(previous: string, next: string) {
  const nextDigits = digits(next);
  const erasedSeparator = next.length < previous.length && nextDigits === digits(previous);
  return formatPhone(erasedSeparator ? nextDigits.slice(0, -1) : nextDigits);
}

export const PHONE_PATTERN = "\\(\\d{2}\\) \\d{4,5}-\\d{4}";

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

// Sigla do canal antes do número: IF-3267 (iFood, número que o cliente vê no app),
// 99-…, KT-…; pedidos da própria loja (site, PDV, balcão) saem como LJ-0042.
const CHANNEL_PREFIX: Record<string, string> = { ifood: "IF", "99food": "99", keeta: "KT", rappi: "RP" };

export type OrderCodeFields = {
  id: string;
  code: string | null;
  order_number: number | null;
  source?: string | null;
  external_platform?: string | null;
  external_order_code?: string | null;
};

export function orderCode(order: OrderCodeFields) {
  const channel = order.external_platform ?? (order.source && order.source in CHANNEL_PREFIX ? order.source : null);
  const prefix = channel ? CHANNEL_PREFIX[channel] ?? channel.slice(0, 2).toUpperCase() : "LJ";
  const number = (channel && order.external_order_code)
    || (order.code && !isTrackingToken(order.code) && !channel ? order.code : null)
    || (order.order_number ? String(order.order_number).padStart(4, "0") : String(order.id ?? "").replace(/-/g, "").slice(0, 8).toUpperCase());
  return `${prefix}-${number}`;
}

export function nextStatus(status: OrderStatus): OrderStatus | null {
  const flow: OrderStatus[] = ["pending", "accepted", "preparing", "ready", "out_for_delivery", "completed"];
  const index = flow.indexOf(status);
  return index >= 0 ? flow[index + 1] ?? null : null;
}
