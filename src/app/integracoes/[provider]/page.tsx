import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { MarketplaceIntegrationSettings, type IntegrationRecord } from "@/components/integrations/integration-ui";
import { requireRestaurant } from "@/lib/auth";
import { isAdminRole } from "@/lib/integrations/security";
import { IFOOD_AUTH_MODE } from "@/lib/integrations/ifood/config";

const providers = ["99food", "ifood", "keeta"] as const;

async function safeRows(query: PromiseLike<{data:IntegrationRecord[]|null;error:unknown}>) {
    const result=await query; return result.error ? [] : result.data ?? [];
  }

export default async function MarketplacePage({ params, searchParams }: { params: Promise<{ provider: string }>; searchParams: Promise<{ status: string; error: string }> }) {
  const { provider } = await params;
  if (!providers.some(value=>value===provider)) notFound();
  const sp = await searchParams;
  const { supabase, restaurant, role } = await requireRestaurant();
  if (!isAdminRole(role)) redirect("/dashboard");
  const requestHeaders = await headers();
  const origin = requestHeaders.get("x-forwarded-host") ?
     `${requestHeaders.get("x-forwarded-proto") ?? "https"}://${requestHeaders.get("x-forwarded-host")}`
    : "http://localhost:3000";
  const { data: integration } = await supabase
    .from("integrations")
    .select("*")
    .eq("restaurant_id", restaurant.id)
    .eq("provider", provider)
    .maybeSingle();
  const integrationId = integration?.id ?? "00000000-0000-0000-0000-000000000000";
  const [{ data: products }, { data: variants }, logs, productMaps, paymentMaps] = await Promise.all([
    supabase.from("products").select("id, name").eq("restaurant_id", restaurant.id).order("name"),
    supabase.from("product_variants").select("id, product_id, name, price").order("name"),
    safeRows(supabase.from("integration_logs").select("*").eq("restaurant_id", restaurant.id).eq("provider", provider).order("created_at", { ascending: false }).limit(8)),
    safeRows(supabase.from("integration_product_maps").select("*").eq("restaurant_id", restaurant.id).eq("integration_id", integrationId)),
    safeRows(supabase.from("integration_payment_maps").select("*").eq("restaurant_id", restaurant.id).eq("integration_id", integrationId)),
  ]);

  return (
    <MarketplaceIntegrationSettings
      provider={provider as "99food" | "ifood" | "keeta"}
      integration={integration ?? null}
      logs={logs}
      products={products ?? []}
      variants={variants ?? []}
      productMaps={productMaps}
      paymentMaps={paymentMaps}
      canEdit={isAdminRole(role)}
      origin={origin}
      status={sp.status}
      error={sp.error}
      ifoodLink={provider === "ifood" && IFOOD_AUTH_MODE === "distributed"}
    />
  );
}
