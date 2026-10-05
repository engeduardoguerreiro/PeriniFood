import { assertSameOrigin, privateJson, publicFailure, PublicError, readObject, uuid } from "@/lib/security";
import { clientIp, rateLimit } from "@/lib/customer-session";
import { aiModuleEnabled, aiReply } from "@/lib/ai/attendant";
import { getAccessState } from "@/lib/platform-billing";

// Chat do atendente de IA no cardápio online (módulo pago).
export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const body = await readObject(request, 4096);
    const restaurantId = uuid(body.restaurantId);
    const sessionId = String(body.sessionId ?? "");
    const message = String(body.message ?? "").trim();
    if (!/^[a-z0-9-]{16,64}$/i.test(sessionId)) throw new PublicError("Sessão inválida.");
    if (!message || message.length > 500) throw new PublicError("Escreva uma mensagem de até 500 caracteres.");
    const access = await getAccessState(restaurantId);
    if (access.blocked || !(await aiModuleEnabled(restaurantId))) throw new PublicError("Atendimento indisponível.", 404);
    await rateLimit("ai-chat-ip", `${restaurantId}:${clientIp(request)}`, 30, 600);
    await rateLimit("ai-chat-session", `${restaurantId}:${sessionId}`, 20, 600);
    const reply = await aiReply({ restaurantId, channel: "site", contact: sessionId, text: message });
    return privateJson({ ok: true, reply: reply ?? "Atendimento indisponível no momento." });
  } catch (error) {
    return publicFailure(error);
  }
}
