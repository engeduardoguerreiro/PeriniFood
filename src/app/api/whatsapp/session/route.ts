import { requireApiRestaurant } from "@/lib/api-helpers";
import { isAdminRole } from "@/lib/integrations/security";
import { privateJson } from "@/lib/security";
import { connectionState, disconnect, startConnection } from "@/lib/whatsapp/evolution";

// Conexão do WhatsApp da loja (QR Code). Só owner/admin/manager.
async function guard() {
  const auth = await requireApiRestaurant();
  if (auth.error) return { error: auth.error };
  if (!isAdminRole(auth.context.role)) return { error: privateJson({ ok: false, message: "Sem permissão." }, 403) };
  return { restaurantId: auth.context.restaurant.id };
}

// Erros do cliente Evolution trazem só texto seguro (nunca a chave).
const failure = (error: unknown) => (error instanceof Error ? error.message : "Falha ao falar com o servidor de WhatsApp.");

export async function GET() {
  const g = await guard();
  if (g.error) return g.error;
  try {
    return privateJson({ ok: true, state: await connectionState(g.restaurantId) });
  } catch (error) {
    return privateJson({ ok: false, message: failure(error) }, 502);
  }
}

export async function POST() {
  const g = await guard();
  if (g.error) return g.error;
  try {
    return privateJson({ ok: true, ...(await startConnection(g.restaurantId)) });
  } catch (error) {
    return privateJson({ ok: false, message: failure(error) }, 502);
  }
}

export async function DELETE() {
  const g = await guard();
  if (g.error) return g.error;
  try {
    await disconnect(g.restaurantId);
  } catch (error) {
    return privateJson({ ok: false, message: failure(error) }, 502);
  }
  return privateJson({ ok: true, state: "missing" });
}
