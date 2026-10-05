import { privateJson } from "@/lib/security";
import { createServiceClient } from "@/lib/supabase/service";
import { trackingByOrder, trackingSnapshot } from "@/lib/delivery-tracking";

// Mapa do cliente: o código de acompanhamento (48 hex, secreto) identifica o pedido.
// Não expõe telefone nem dados do motoboy além do primeiro nome.
export async function GET(_request: Request, { params }: { params: Promise<{ codigo: string }> }) {
  const { codigo } = await params;
  if (!/^[a-f0-9]{48}$/.test(codigo)) return privateJson({ ok: false }, 404);
  const { data: order } = await createServiceClient().from("orders").select("id, status").eq("code", codigo).maybeSingle();
  if (!order) return privateJson({ ok: false }, 404);
  const row = await trackingByOrder(order.id);
  const snapshot = row ? await trackingSnapshot(row) : null;
  return privateJson({
    ok: true,
    status: order.status,
    tracking: snapshot ? { ...snapshot, courierName: snapshot.courierName?.split(" ")[0] ?? null } : null,
  });
}
