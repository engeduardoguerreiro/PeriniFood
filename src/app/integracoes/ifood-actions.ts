"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRestaurant } from "@/lib/auth";
import { isAdminRole } from "@/lib/integrations/security";
import { createServiceClient } from "@/lib/supabase/service";
import { exchangeAuthorizationCode, requestUserCode } from "@/lib/integrations/ifood/auth";
import { listMerchants } from "@/lib/integrations/ifood/client";
import { saveToken } from "@/lib/integrations/ifood/tokens";
import { logIntegrationEvent } from "@/lib/integrations/external-order";

// Vínculo da loja com o iFood no modelo distribuído:
// 1) gera o código (userCode) que o lojista digita no Portal do Parceiro;
// 2) o lojista autoriza e cola aqui o código de autorização;
// 3) trocamos pelo token da loja e descobrimos o merchantId sozinhos.
const PAGE = "/integracoes/ifood";

async function manager() {
  const context = await requireRestaurant();
  if (!isAdminRole(context.role)) throw new Error("Seu perfil não tem permissão para esta operação.");
  return context;
}

function back(error?: string): never {
  redirect(error ? `${PAGE}?error=${encodeURIComponent(error)}` : `${PAGE}?status=saved`);
}

async function currentIntegration(restaurantId: string) {
  const { data } = await createServiceClient()
    .from("integrations")
    .select("id, credentials, external_store_id")
    .eq("restaurant_id", restaurantId)
    .eq("provider", "ifood")
    .maybeSingle();
  return data as { id: string; credentials: Record<string, unknown> | null; external_store_id: string | null } | null;
}

export async function ifoodStartLink() {
  const { restaurant } = await manager();
  let code;
  try {
    code = await requestUserCode();
  } catch (error) {
    console.error("[ifood] userCode falhou", error);
    back("Não foi possível gerar o código no iFood. Tente de novo em instantes.");
  }
  const service = createServiceClient();
  const existing = await currentIntegration(restaurant.id);
  const pendingLink = {
    userCode: code.userCode,
    verifier: code.authorizationCodeVerifier,
    url: code.verificationUrlComplete || code.verificationUrl,
    expiresAt: new Date(Date.now() + code.expiresIn * 1000).toISOString(),
  };
  const credentials = { ...(existing?.credentials ?? {}), mode: "distributed", pendingLink };
  const { error } = existing
    ? await service.from("integrations").update({ credentials, updated_at: new Date().toISOString() }).eq("id", existing.id)
    : await service.from("integrations").insert({
      restaurant_id: restaurant.id, provider: "ifood", name: "iFood", status: "pending", auth_type: "oauth2",
      environment: process.env.IFOOD_ENVIRONMENT?.trim() || "production", credentials, settings: {}, config: {},
      is_enabled: false, enabled: false, receive_orders: true, send_order_status: true,
    });
  if (error) back(error.message);
  revalidatePath(PAGE);
  back();
}

export async function ifoodFinishLink(formData: FormData) {
  const { restaurant } = await manager();
  const authorizationCode = String(formData.get("authorization_code") ?? "").trim();
  if (!authorizationCode) back("Cole o código de autorização que o iFood mostrou.");
  const existing = await currentIntegration(restaurant.id);
  const pending = existing?.credentials?.pendingLink as { verifier?: string; expiresAt?: string } | undefined;
  if (!existing || !pending?.verifier) back("Gere um novo código de vínculo e tente de novo.");

  let token;
  let merchants: Array<{ id: string; name?: string }> = [];
  try {
    token = await exchangeAuthorizationCode(authorizationCode, pending.verifier);
    merchants = await listMerchants(token.accessToken);
  } catch (error) {
    console.error("[ifood] vínculo falhou", error instanceof Error ? error.message : error);
    back("O iFood recusou o código. Confira se copiou o código inteiro ou gere um novo vínculo.");
  }
  const merchant = merchants[0];
  if (!merchant) back("A conta autorizada não tem nenhuma loja no iFood.");

  const service = createServiceClient();
  // Uma loja do iFood só pode estar ligada a um restaurante do PeriniFood.
  const { data: taken } = await service.from("integrations").select("id").eq("provider", "ifood").eq("external_store_id", merchant.id).neq("id", existing.id).limit(1);
  if (taken?.length) back("Essa loja do iFood já está vinculada a outro restaurante do PeriniFood.");

  const credentials = { ...(existing.credentials ?? {}) };
  delete credentials.pendingLink;
  credentials.connectedAt = new Date().toISOString();
  const { error } = await service.from("integrations").update({
    external_store_id: merchant.id,
    external_store_name: merchant.name ?? null,
    status: "connected",
    auth_type: "oauth2",
    is_enabled: true,
    enabled: true,
    receive_orders: true,
    send_order_status: true,
    last_error: null,
  }).eq("id", existing.id);
  if (error) back(error.message);
  await saveToken(existing.id, token, credentials);
  await logIntegrationEvent({
    restaurantId: restaurant.id, integrationId: existing.id, provider: "ifood", direction: "OUTBOUND",
    eventType: "store_linked", externalId: merchant.id, status: "ok",
    requestPayload: { merchantId: merchant.id, merchants: merchants.length },
  });
  revalidatePath(PAGE);
  back();
}

export async function ifoodUnlink() {
  const { restaurant } = await manager();
  const existing = await currentIntegration(restaurant.id);
  if (!existing) back();
  const credentials = { ...(existing.credentials ?? {}) };
  delete credentials.pendingLink;
  delete credentials.accessTokenExpiresAt;
  const { error } = await createServiceClient().from("integrations").update({
    access_token: null, refresh_token: null, status: "disconnected", is_enabled: false, enabled: false, credentials,
  }).eq("id", existing.id);
  if (error) back(error.message);
  revalidatePath(PAGE);
  back();
}
