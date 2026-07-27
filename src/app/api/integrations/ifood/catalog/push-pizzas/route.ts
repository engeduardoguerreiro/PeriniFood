import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { pushPizzaBatch, resetPizzas } from "@/lib/integrations/ifood/catalog-pizza";

export const maxDuration = 60;

// Envia um lote de PIZZAS (template nativo) para o iFood. Protegido por token.
// Uma categoria de pizza por chamada — chame até done = true.
// ?reset=1 apaga as pizzas já enviadas no iFood e limpa os mapeamentos, para
// reprocessar do zero (ex.: reenviar imagens). Depois chame de novo sem reset.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const secret = process.env.IFOOD_POLL_SECRET;
  if (secret) {
    const key = url.searchParams.get("key");
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
    if (url.searchParams.get("reset") === "1") {
      const reset = await resetPizzas(integration.restaurant_id);
      return NextResponse.json(reset);
    }
    const result = await pushPizzaBatch(integration.restaurant_id);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
