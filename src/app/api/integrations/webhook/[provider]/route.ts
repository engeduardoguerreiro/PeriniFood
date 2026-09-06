import { privateJson } from "@/lib/security";

// Legacy unauthenticated ingestion retired. Configured integrations use the
// authenticated /api/integrations/[provider]/webhook contract.
export async function POST() {
  return privateJson({ ok:false, message:"Endpoint desativado. Configure o webhook autenticado." },410);
}
