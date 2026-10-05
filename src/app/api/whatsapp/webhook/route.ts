import { after } from "next/server";
import { privateJson, secretMatches } from "@/lib/security";
import { rateLimit } from "@/lib/customer-session";
import { aiReply, noteStoreMessage } from "@/lib/ai/attendant";
import { restaurantIdFromInstance, sendText, webhookSecret } from "@/lib/whatsapp/evolution";

// Mensagens que chegam no WhatsApp das lojas (servidor Evolution API).
// Responde rápido ao servidor e processa a IA depois da resposta.
type Key = { remoteJid?: string; fromMe?: boolean; senderPn?: string; remoteJidAlt?: string };
type Upsert = { key?: Key; message?: { conversation?: string; extendedTextMessage?: { text?: string } } };

export async function POST(request: Request) {
  if (!secretMatches(webhookSecret(), request.headers.get("x-webhook-secret")?.trim())) {
    return privateJson({ ok: false }, 401);
  }
  const body = (await request.json().catch(() => null)) as { event?: string; instance?: string; data?: Upsert | Upsert[] } | null;
  if (String(body?.event ?? "").toLowerCase() !== "messages.upsert") return privateJson({ ok: true });

  const restaurantId = restaurantIdFromInstance(body?.instance);
  const data = Array.isArray(body?.data) ? body?.data[0] : body?.data;
  const key = data?.key;
  const jid = key?.remoteJid ?? "";
  // Ignora grupos, status e canais: só conversas individuais.
  if (!restaurantId || !jid || /@(g\.us|broadcast|newsletter)$/.test(jid)) return privateJson({ ok: true });
  const number = (jid.endsWith("@s.whatsapp.net") ? jid : key?.senderPn ?? key?.remoteJidAlt ?? "").split("@")[0].replace(/\D/g, "");
  const text = (data?.message?.conversation ?? data?.message?.extendedTextMessage?.text ?? "").trim();
  if (!number || !text) return privateJson({ ok: true });

  if (key?.fromMe) {
    // Mensagem enviada pelo celular da loja: pausa a IA se foi a equipe que respondeu.
    after(() => noteStoreMessage(restaurantId, number, text).catch(() => {}));
    return privateJson({ ok: true });
  }

  try { await rateLimit("wa-ai", `${restaurantId}:${number}`, 8, 60); } catch { return privateJson({ ok: true }); }
  after(async () => {
    try {
      const reply = await aiReply({ restaurantId, channel: "whatsapp", contact: number, text });
      if (reply) await sendText(restaurantId, number, reply);
    } catch (error) {
      console.error("[whatsapp] resposta da IA falhou", error);
    }
  });
  return privateJson({ ok: true });
}
