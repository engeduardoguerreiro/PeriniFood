"use server";

import { unstable_rethrow } from "next/navigation";
import { updateOrderStatus, updateStoreOperationStatus } from "@/app/actions";
import type { OrderStatus } from "@/lib/types";

// Ações do Gestor de Pedidos. Reaproveitam as mesmas Server Actions do painel
// (sincronização com o iFood, aviso por WhatsApp, bloqueio de agendados), só
// devolvendo resultado em vez de erro para a tela mostrar um aviso.
const ORDER_STATUSES: OrderStatus[] = ["pending", "accepted", "preparing", "ready", "out_for_delivery", "completed", "canceled"];

type Result = { ok: true } | { ok: false; error: string };

function failure(error: unknown): Result {
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
