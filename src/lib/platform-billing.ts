import { cache } from "react";
import { createServiceClient } from "@/lib/supabase/service";

export type SubscriptionStatus = "trial" | "active" | "past_due" | "suspended" | "canceled";

export type Subscription = {
  id: string;
  restaurant_id: string;
  plan: string;
  status: SubscriptionStatus;
  monthly_amount: number;
  billing_day: number;
  started_on: string;
  next_due_on: string | null;
  modules: string[];
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  notes: string | null;
  suspended_at: string | null;
  suspension_reason: string | null;
};

export type Payment = {
  id: string;
  restaurant_id: string;
  amount: number;
  paid_on: string;
  reference_month: string;
  method: string;
  notes: string | null;
};

export const PLANS = ["basico", "profissional", "premium"] as const;

export const planLabel: Record<string, string> = {
  basico: "Básico",
  profissional: "Profissional",
  premium: "Premium",
};

export const statusLabelSub: Record<SubscriptionStatus, string> = {
  trial: "Teste",
  active: "Ativo",
  past_due: "Em atraso",
  suspended: "Suspenso",
  canceled: "Cancelado",
};

export const statusToneSub: Record<SubscriptionStatus, string> = {
  trial: "bg-sky-50 text-sky-700",
  active: "bg-emerald-50 text-emerald-700",
  past_due: "bg-amber-50 text-amber-700",
  suspended: "bg-rose-50 text-rose-700",
  canceled: "bg-[#f1efea] text-[#6d6a63]",
};

export const methodLabel: Record<string, string> = {
  pix: "PIX",
  dinheiro: "Dinheiro",
  cartao: "Cartão",
  boleto: "Boleto",
  transferencia: "Transferência",
  outro: "Outro",
};

// A migration 20260728000100_platform_billing.sql pode ainda não estar aplicada
// no banco. Nesse caso tratamos como "sem assinatura" em vez de quebrar a tela.
export function isMissingTable(error: { code?: string; message?: string } | null) {
  if (!error) return false;
  return error.code === "42P01" || /does not exist|schema cache/i.test(error.message ?? "");
}

function normalize(row: Record<string, unknown>): Subscription {
  const raw = row.modules;
  const modules = Array.isArray(raw) ? (raw as string[]) : typeof raw === "string" ? (JSON.parse(raw || "[]") as string[]) : [];
  return {
    id: row.id as string,
    restaurant_id: row.restaurant_id as string,
    plan: (row.plan as string) ?? "basico",
    status: (row.status as SubscriptionStatus) ?? "trial",
    monthly_amount: Number(row.monthly_amount ?? 0),
    billing_day: Number(row.billing_day ?? 5),
    started_on: row.started_on as string,
    next_due_on: (row.next_due_on as string) ?? null,
    modules,
    contact_name: (row.contact_name as string) ?? null,
    contact_email: (row.contact_email as string) ?? null,
    contact_phone: (row.contact_phone as string) ?? null,
    notes: (row.notes as string) ?? null,
    suspended_at: (row.suspended_at as string) ?? null,
    suspension_reason: (row.suspension_reason as string) ?? null,
  };
}

export async function listSubscriptions(): Promise<{ subs: Subscription[]; ready: boolean }> {
  const service = createServiceClient();
  const { data, error } = await service.from("platform_subscriptions").select("*");
  if (error) return { subs: [], ready: !isMissingTable(error) };
  return { subs: (data ?? []).map((r) => normalize(r as Record<string, unknown>)), ready: true };
}

export async function getSubscription(restaurantId: string): Promise<{ sub: Subscription | null; ready: boolean }> {
  const service = createServiceClient();
  const { data, error } = await service.from("platform_subscriptions").select("*").eq("restaurant_id", restaurantId).maybeSingle();
  if (error) return { sub: null, ready: !isMissingTable(error) };
  return { sub: data ? normalize(data as Record<string, unknown>) : null, ready: true };
}

// Usado pelo app do cliente para bloquear o acesso quando a assinatura está
// suspensa. Service client porque as tabelas da plataforma têm RLS fechada.
export const getAccessState = cache(async (restaurantId: string) => {
  const service = createServiceClient();
  const { data, error } = await service
    .from("platform_subscriptions")
    .select("status, modules, suspension_reason")
    .eq("restaurant_id", restaurantId)
    .maybeSingle();
  if (error || !data) return { blocked: false, status: null as SubscriptionStatus | null, modules: [] as string[], reason: null as string | null };
  const raw = (data as Record<string, unknown>).modules;
  const modules = Array.isArray(raw) ? (raw as string[]) : [];
  const status = (data as Record<string, unknown>).status as SubscriptionStatus;
  return {
    blocked: status === "suspended" || status === "canceled",
    status,
    modules,
    reason: ((data as Record<string, unknown>).suspension_reason as string) ?? null,
  };
});

// Helper para telas do cliente liberarem features conforme o contrato.
export async function hasModule(restaurantId: string, key: string) {
  const { modules } = await getAccessState(restaurantId);
  return modules.includes(key);
}

// Próximo vencimento a partir do dia de cobrança.
export function nextDueDate(billingDay: number, from = new Date()) {
  const due = new Date(from.getFullYear(), from.getMonth(), billingDay);
  if (due < from) due.setMonth(due.getMonth() + 1);
  return due;
}

export function monthKey(date: Date | string) {
  const d = typeof date === "string" ? new Date(date) : date;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function monthLabel(key: string) {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("pt-BR", { month: "short", year: "numeric" });
}
