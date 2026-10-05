import { requireApiRestaurant } from "@/lib/api-helpers";
import { privateJson } from "@/lib/security";
import { trackingByOrder, trackingSnapshot } from "@/lib/delivery-tracking";

// Mapa da loja: posição atual + trajeto do motoboy do pedido.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiRestaurant();
  if (auth.error) return auth.error;
  const { id } = await params;
  const row = await trackingByOrder(id, auth.context.restaurant.id);
  if (!row) return privateJson({ ok: true, tracking: null });
  return privateJson({ ok: true, tracking: await trackingSnapshot(row) });
}
