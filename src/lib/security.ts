import { createHash, timingSafeEqual } from "node:crypto";

export class PublicError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}

export function uuid(value: unknown): string {
  if (typeof value !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
    throw new PublicError("Identificador inválido.");
  }
  return value;
}

export function boundedText(value: unknown, max = 200, required = false): string {
  if (value != null && typeof value !== "string") throw new PublicError("Dados inválidos.");
  const result = (value ?? "").trim();
  if (result.length > max || (required && !result)) throw new PublicError("Verifique os campos informados.");
  return result;
}

export function emailAddress(value: unknown) {
  const email = boundedText(value, 254, true).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new PublicError("Informe um e-mail válido.");
  return email;
}

export function secretMatches(expected: unknown, supplied: unknown) {
  if (typeof expected !== "string" || typeof supplied !== "string" || !expected || !supplied) return false;
  return timingSafeEqual(createHash("sha256").update(expected).digest(), createHash("sha256").update(supplied).digest());
}

// Cookies authenticate the caller; the Origin check prevents cross-site mutation.
export function assertSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(request.url).origin || request.headers.get("sec-fetch-site") === "cross-site") {
    throw new PublicError("Origem da solicitação não permitida.", 403);
  }
}

export async function readObject(request: Request, maxBytes = 16_384): Promise<Record<string, unknown>> {
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) throw new PublicError("Envie JSON.", 415);
  if (!request.body) throw new PublicError("Dados inválidos.");
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) { await reader.cancel(); throw new PublicError("Solicitação muito grande.", 413); }
      chunks.push(value);
    }
    const body: unknown = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error();
    return body as Record<string, unknown>;
  } catch (error) {
    if (error instanceof PublicError) throw error;
    throw new PublicError("JSON inválido.");
  } finally { reader.releaseLock(); }
}

export function privateJson(body: unknown, status = 200) {
  return Response.json(body, { status, headers: { "Cache-Control": "private, no-store", "Vary": "Cookie", "X-Content-Type-Options": "nosniff" } });
}

export function publicFailure(error: unknown) {
  return privateJson({ ok: false, message: error instanceof PublicError ? error.message : "Não foi possível concluir a solicitação. Tente novamente." }, error instanceof PublicError ? error.status : 503);
}
