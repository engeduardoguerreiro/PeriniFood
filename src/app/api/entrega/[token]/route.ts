import { revalidatePath } from "next/cache";
import { assertSameOrigin, privateJson, publicFailure, PublicError, readObject } from "@/lib/security";
import { rateLimit } from "@/lib/customer-session";
import { createServiceClient } from "@/lib/supabase/service";
import { recordLocation, trackingByToken, trackingState } from "@/lib/delivery-tracking";

// Link do motoboy: o token na URL é a credencial (um por pedido, sem cadastro).
// Ações: "start" (saiu para entrega), "location" (posição GPS) e "finish" (entregue).
export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    assertSameOrigin(request);
    const { token } = await params;
    const row = await trackingByToken(token);
    if (!row) throw new PublicError("Link de entrega inválido ou substituído por um novo.", 404);
    const state = trackingState(row);
    if (state === "delivered") throw new PublicError("Esta entrega já foi concluída.", 409);
    if (state === "expired") throw new PublicError("Este link expirou. Peça um novo para a loja.", 410);

    const body = await readObject(request, 2048);
    const action = String(body.action ?? "");
    const service = createServiceClient();
    const { data: order } = await service.from("orders").select("id, status, external_platform").eq("id", row.order_id).maybeSingle();
    if (!order || order.status === "canceled") throw new PublicError("Pedido cancelado pela loja.", 409);
    // Pedido do iFood: o status é controlado pela loja/iFood, o link só rastreia.
    const ownsStatus = order.external_platform !== "ifood";

    if (action === "location") {
      await rateLimit("courier-location", row.id, 40, 60);
      await recordLocation(row, body);
      return privateJson({ ok: true });
    }
    if (action === "start") {
      const now = new Date().toISOString();
      await service.from("delivery_tracking").update({ started_at: row.started_at ?? now }).eq("id", row.id);
      if (ownsStatus && ["pending", "accepted", "preparing", "ready"].includes(order.status)) {
        await service.from("orders").update({ status: "out_for_delivery" }).eq("id", order.id);
      }
      revalidatePath("/pedidos");
      return privateJson({ ok: true });
    }
    if (action === "finish") {
      const now = new Date().toISOString();
      await service.from("delivery_tracking").update({ delivered_at: now, started_at: row.started_at ?? now }).eq("id", row.id);
      if (ownsStatus) await service.from("orders").update({ status: "completed" }).eq("id", order.id);
      revalidatePath("/pedidos");
      return privateJson({ ok: true });
    }
    throw new PublicError("Ação inválida.");
  } catch (error) {
    return publicFailure(error);
  }
}
