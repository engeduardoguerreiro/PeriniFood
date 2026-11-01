import { serverHealth } from "@/lib/whatsapp/evolution";

// Health check do servidor de WhatsApp para monitor externo (UptimeRobot etc.):
// 200 quando a Evolution API responde e aceita a chave da Vercel, 503 caso contrário.
// Público de propósito (o monitor não loga), por isso só expõe o status e guarda
// o resultado por 30 s para não virar proxy de carga contra o servidor.
let cached: { at: number; status: Awaited<ReturnType<typeof serverHealth>> } | null = null;

export async function GET() {
  if (!cached || Date.now() - cached.at > 30_000) cached = { at: Date.now(), status: await serverHealth() };
  const ok = cached.status === "online";
  return Response.json(
    { ok, status: cached.status, checkedAt: new Date(cached.at).toISOString() },
    { status: ok ? 200 : 503, headers: { "Cache-Control": "no-store" } },
  );
}
