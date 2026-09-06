import "server-only";
import { secretMatches, privateJson } from "../security";

// iFood functional verification is deferred. Never expose maintenance endpoints
// merely because a secret was omitted from deployment configuration.
export function requireIntegrationToken(request: Request, secret: string | undefined) {
  if (!secret || secret.length < 32) return privateJson({ ok:false, message:"Endpoint não habilitado com segurança." },503);
  const authorization=request.headers.get("authorization") ?? "";
  const supplied=authorization.startsWith("Bearer ") ? authorization.slice(7) : request.headers.get("x-webhook-secret");
  if (!secretMatches(secret,supplied)) return privateJson({ok:false,message:"Não autorizado."},401);
  return null;
}
