import { IFOOD_BASE_URL, IFOOD_CLIENT_ID, IFOOD_CLIENT_SECRET, assertIFoodConfigured } from "./config";

const AUTH_BASE = `${IFOOD_BASE_URL}/authentication/v1.0/oauth`;

export type IFoodUserCode = {
  userCode: string;
  authorizationCodeVerifier: string;
  verificationUrl: string;
  verificationUrlComplete: string;
  expiresIn: number;
};

export type IFoodToken = {
  accessToken: string;
  refreshToken?: string;
  type: string;
  expiresIn: number;
};

async function postForm<T>(path: string, body: Record<string, string>): Promise<T> {
  const res = await fetch(`${AUTH_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body: new URLSearchParams(body).toString(),
    cache: "no-store",
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`iFood oauth${path} (${res.status}): ${text}`);
  return JSON.parse(text) as T;
}

// Fluxo CENTRALIZADO: um token acessa todas as suas lojas (client_credentials).
// Sem userCode / autorização por loja. Renova só re-solicitando.
export async function getClientCredentialsToken(): Promise<IFoodToken> {
  assertIFoodConfigured();
  return postForm<IFoodToken>("/token", {
    grantType: "client_credentials",
    clientId: IFOOD_CLIENT_ID,
    clientSecret: IFOOD_CLIENT_SECRET,
  });
}

// Passo 1 do fluxo distribuído: gera o código que o lojista digita no Portal do
// Parceiro para autorizar o app. Guarde o authorizationCodeVerifier para o passo 2.
export async function requestUserCode(): Promise<IFoodUserCode> {
  assertIFoodConfigured();
  return postForm<IFoodUserCode>("/userCode", { clientId: IFOOD_CLIENT_ID });
}

// Passo 2: após o lojista autorizar e informar o authorizationCode, troca pelo token.
export async function exchangeAuthorizationCode(authorizationCode: string, authorizationCodeVerifier: string): Promise<IFoodToken> {
  assertIFoodConfigured();
  return postForm<IFoodToken>("/token", {
    grantType: "authorization_code",
    clientId: IFOOD_CLIENT_ID,
    clientSecret: IFOOD_CLIENT_SECRET,
    authorizationCode: authorizationCode.trim(),
    authorizationCodeVerifier,
  });
}

// Renova o access token (validade ~6h) usando o refresh token.
export async function refreshAccessToken(refreshToken: string): Promise<IFoodToken> {
  assertIFoodConfigured();
  return postForm<IFoodToken>("/token", {
    grantType: "refresh_token",
    clientId: IFOOD_CLIENT_ID,
    clientSecret: IFOOD_CLIENT_SECRET,
    refreshToken,
  });
}
