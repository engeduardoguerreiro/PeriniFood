"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePlatformAdmin } from "@/lib/platform-admin";
import { SUBSCRIPTION_STATUSES, nextDueDate } from "@/lib/platform-billing";

function text(form: FormData, key: string) {
  return String(form.get(key) ?? "").trim();
}

function num(form: FormData, key: string, fallback = 0) {
  const raw = String(form.get(key) ?? "").replace(/\./g, "").replace(",", ".");
  const value = Number(raw);
  return Number.isFinite(value) ? value : fallback;
}

// Revalida as telas e volta para o cliente com o aviso de confirmação.
function done(id: string, feedback: string): never {
  revalidatePath("/admin");
  revalidatePath("/admin/relatorios");
  revalidatePath(`/admin/clientes/${id}`);
  redirect(`/admin/clientes/${id}?ok=${feedback}`);
}

// Dados cadastrais do cliente (o que a PeriniFood precisa para atendimento).
export async function saveClient(formData: FormData) {
  const { service } = await requirePlatformAdmin();
  const id = text(formData, "restaurant_id");
  if (!id) return;

  await service
    .from("restaurants")
    .update({
      name: text(formData, "name"),
      phone: text(formData, "phone") || null,
      whatsapp: text(formData, "whatsapp") || null,
      email: text(formData, "email") || null,
      city: text(formData, "city") || null,
      state: text(formData, "state") || null,
    })
    .eq("id", id);

  done(id, "cliente");
}

// Plano, valor, vencimento e contato de cobrança.
export async function saveSubscription(formData: FormData) {
  const { service } = await requirePlatformAdmin();
  const id = text(formData, "restaurant_id");
  if (!id) return;

  const billingDay = Math.min(28, Math.max(1, Math.round(num(formData, "billing_day", 5))));
  const payload = {
    restaurant_id: id,
    plan: text(formData, "plan") || "basico",
    monthly_amount: Math.max(0, num(formData, "monthly_amount")),
    billing_day: billingDay,
    next_due_on: nextDueDate(billingDay).toISOString().slice(0, 10),
    contact_name: text(formData, "contact_name") || null,
    contact_email: text(formData, "contact_email") || null,
    contact_phone: text(formData, "contact_phone") || null,
    notes: text(formData, "notes") || null,
    updated_at: new Date().toISOString(),
  };

  await service.from("platform_subscriptions").upsert(payload, { onConflict: "restaurant_id" });
  done(id, "assinatura");
}

// Módulos contratados — inclui os que ainda estão em construção (piloto).
export async function saveModules(formData: FormData) {
  const { service } = await requirePlatformAdmin();
  const id = text(formData, "restaurant_id");
  if (!id) return;

  const modules = formData.getAll("module").map(String).filter(Boolean);
  const { data: existing } = await service.from("platform_subscriptions").select("id").eq("restaurant_id", id).maybeSingle();
  if (existing) {
    await service.from("platform_subscriptions").update({ modules, updated_at: new Date().toISOString() }).eq("restaurant_id", id);
  } else {
    await service.from("platform_subscriptions").insert({ restaurant_id: id, modules, status: "active" });
  }

  done(id, "modulos");
}

// Corta o acesso do cliente ao sistema (inadimplência) ou reativa — inclusive
// quando o pagamento é feito em dinheiro e lançado manualmente.
export async function setSubscriptionStatus(formData: FormData) {
  const { service } = await requirePlatformAdmin();
  const id = text(formData, "restaurant_id");
  const status = text(formData, "status");
  if (!id || !(SUBSCRIPTION_STATUSES as string[]).includes(status)) return;

  const suspending = status === "suspended";
  await service
    .from("platform_subscriptions")
    .upsert(
      {
        restaurant_id: id,
        status,
        suspended_at: suspending ? new Date().toISOString() : null,
        suspension_reason: suspending ? text(formData, "suspension_reason") || "Mensalidade em atraso" : null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "restaurant_id" },
    );

  done(id, "status");
}

// Lança um recebimento da NOSSA mensalidade. Ao registrar, reativa o cliente
// automaticamente se ele estava suspenso/em atraso (caso do pagamento em dinheiro).
export async function registerPayment(formData: FormData) {
  const { service, email } = await requirePlatformAdmin();
  const id = text(formData, "restaurant_id");
  const amount = num(formData, "amount");
  if (!id || amount <= 0) return;

  const paidOn = text(formData, "paid_on") || new Date().toISOString().slice(0, 10);
  const reference = text(formData, "reference_month") || paidOn.slice(0, 7);

  await service.from("platform_payments").insert({
    restaurant_id: id,
    amount,
    paid_on: paidOn,
    reference_month: `${reference}-01`,
    method: text(formData, "method") || "pix",
    notes: text(formData, "notes") || null,
    created_by: email,
  });

  if (formData.get("reactivate") === "on") {
    await service
      .from("platform_subscriptions")
      .upsert(
        { restaurant_id: id, status: "active", suspended_at: null, suspension_reason: null, updated_at: new Date().toISOString() },
        { onConflict: "restaurant_id" },
      );
  }

  done(id, "pagamento");
}

export async function deletePayment(formData: FormData) {
  const { service } = await requirePlatformAdmin();
  const id = text(formData, "restaurant_id");
  const paymentId = text(formData, "payment_id");
  if (!paymentId) return;
  await service.from("platform_payments").delete().eq("id", paymentId);
  done(id, "pagamento-removido");
}
