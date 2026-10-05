import "server-only";
import { createServiceClient } from "@/lib/supabase/service";
import { getClientCredentialsToken, refreshAccessToken } from "./auth";

// Token de acesso de uma loja.
// - Distribuído (app "Teste (D)" / produção): cada loja autoriza o app e guarda o
//   refresh token em integrations.refresh_token; o access token (~6 h) fica em
//   access_token, com a validade em credentials.accessTokenExpiresAt.
// - Centralizado (legado, sem refresh token): client_credentials do app.
type TokenRow = { id: string; access_token: string | null; refresh_token: string | null; credentials: Record<string, unknown> | null };

export async function integrationToken(integrationId: string): Promise<string> {
  const service = createServiceClient();
  const { data, error } = await service
    .from("integrations")
    .select("id, access_token, refresh_token, credentials")
    .eq("id", integrationId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  const row = data as TokenRow | null;
  if (!row?.refresh_token) return (await getClientCredentialsToken()).accessToken;

  const expiresAt = Date.parse(String(row.credentials?.accessTokenExpiresAt ?? ""));
  if (row.access_token && expiresAt - Date.now() > 120_000) return row.access_token;

  const token = await refreshAccessToken(row.refresh_token);
  await saveToken(integrationId, token, row.credentials);
  return token.accessToken;
}

export async function saveToken(
  integrationId: string,
  token: { accessToken: string; refreshToken?: string; expiresIn: number },
  credentials: Record<string, unknown> | null,
) {
  const { error } = await createServiceClient()
    .from("integrations")
    .update({
      access_token: token.accessToken,
      ...(token.refreshToken ? { refresh_token: token.refreshToken } : {}),
      credentials: { ...(credentials ?? {}), mode: "distributed", accessTokenExpiresAt: new Date(Date.now() + token.expiresIn * 1000).toISOString() },
      updated_at: new Date().toISOString(),
    })
    .eq("id", integrationId);
  if (error) throw new Error(error.message);
}
