import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { pushCatalogBatch } from "@/lib/integrations/ifood/catalog-sync";

export const maxDuration = 60;

// Envia um lote do cardápio para o iFood. Protegido por token.
// Chame repetidamente (ex.: cron externo ou botão) até done = true.
export async function GET(request: Request) {
  const secret = process.env.IFOOD_POLL_SECRET;
  if (secret) {
    const key = new URL(request.url).searchParams.get("key");
    if (key !== secret) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  try {
    const supabase = createServiceClient();
    const { data: integration } = await supabase
      .from("integrations")
      .select("restaurant_id")
      .eq("provider", "ifood")
      .eq("status", "connected")
      .limit(1)
      .maybeSingle();
    if (!integration?.restaurant_id) return NextResponse.json({ ok: false, error: "Nenhuma loja iFood conectada." }, { status: 404 });
    const result = await pushCatalogBatch(integration.restaurant_id);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
