"use server";

import { revalidatePath } from "next/cache";
import { redirect, unstable_rethrow } from "next/navigation";
import { updateOrderStatus, updateStoreOperationStatus } from "@/app/actions";
import { requireRestaurant } from "@/lib/auth";
import { saveValidatedOrder } from "@/lib/order-service";
import { createTrackingLink } from "@/lib/delivery-tracking";
import { queueOrderNotification } from "@/lib/whatsapp/notify";
import { boundedText } from "@/lib/security";
import type { OrderStatus } from "@/lib/types";

// Ações do Gestor de Pedidos. Reaproveitam as mesmas regras do painel
// (sincronização com o iFood, aviso por WhatsApp, bloqueio de agendados), só
// devolvendo resultado em vez de erro para a tela mostrar um aviso.
const ORDER_STATUSES: OrderStatus[] = ["pending", "accepted", "preparing", "ready", "out_for_delivery", "completed", "canceled"];

type Result = { ok: true } | { ok: false; error: string };

function failure(error: unknown): { ok: false; error: string } {
  unstable_rethrow(error);
  return { ok: false, error: error instanceof Error ? error.message : "Não foi possível concluir. Tente novamente." };
}

export async function gestorUpdateStatus(id: string, status: OrderStatus): Promise<Result> {
  if (typeof id !== "string" || !ORDER_STATUSES.includes(status)) return { ok: false, error: "Dados inválidos." };
  const form = new FormData();
  form.set("id", id);
  form.set("status", status);
  try {
    await updateOrderStatus(form);
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}

export async function gestorStoreMode(mode: "auto" | "open" | "closed" | "offline"): Promise<Result> {
  if (!["auto", "open", "closed", "offline"].includes(mode)) return { ok: false, error: "Modo inválido." };
  const form = new FormData();
  form.set("operation_status", mode);
  try {
    await updateStoreOperationStatus(form);
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}

function backToGestor(id: string, formData: FormData) {
  return `/gestor?pedido=${id}${formData.get("intent") === "print" ? "&imprimir=1" : ""}`;
}

// Pedido tirado pela loja (WhatsApp, telefone, balcão). Já entra "Em preparo":
// quem digitou o pedido já o confirmou com o cliente.
export async function gestorCreateOrder(formData: FormData) {
  const { supabase, restaurant, role } = await requireRestaurant();
  if (role === "kitchen") throw new Error("Seu perfil não pode lançar pedidos.");
  const { id } = await saveValidatedOrder(formData, restaurant.id, "pdv");
  await supabase.from("orders").update({ status: "preparing" }).eq("id", id).eq("restaurant_id", restaurant.id);
  queueOrderNotification(id);
  revalidatePath("/pedidos");
  revalidatePath("/gestor");
  redirect(backToGestor(id, formData));
}

export async function gestorUpdateOrder(formData: FormData) {
  const { restaurant, role } = await requireRestaurant();
  if (role === "kitchen") throw new Error("Seu perfil não pode editar pedidos.");
  const { id } = await saveValidatedOrder(formData, restaurant.id, "pdv", String(formData.get("order_id") ?? ""));
  revalidatePath("/pedidos");
  revalidatePath(`/pedidos/${id}`);
  revalidatePath("/gestor");
  redirect(backToGestor(id, formData));
}

// Link do motoboy (gera ou troca). Trocar invalida o link anterior.
export async function gestorCourierLink(orderId: string, courierName: string): Promise<{ ok: true; token: string } | { ok: false; error: string }> {
  try {
    const { restaurant, role } = await requireRestaurant();
    if (role === "kitchen") return { ok: false, error: "Seu perfil não pode gerar link de entrega." };
    if (typeof orderId !== "string") return { ok: false, error: "Pedido inválido." };
    const token = await createTrackingLink(restaurant.id, orderId, boundedText(courierName, 60) || null);
    revalidatePath(`/pedidos/${orderId}`);
    return { ok: true, token };
  } catch (error) {
    return failure(error);
  }
}
