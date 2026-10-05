export const IFOOD_BASE_URL = (process.env.IFOOD_API_BASE_URL ?? "https://merchant-api.ifood.com.br").replace(/\/$/, "");
export const IFOOD_CLIENT_ID = process.env.IFOOD_CLIENT_ID?.trim() ?? "";
export const IFOOD_CLIENT_SECRET = process.env.IFOOD_CLIENT_SECRET?.trim() ?? "";

// "distributed": cada loja vincula a própria conta (userCode) e os eventos chegam
// por polling. Padrão "centralized" (app com client_credentials + webhook).
export const IFOOD_AUTH_MODE: "distributed" | "centralized" = process.env.IFOOD_AUTH_MODE?.trim() === "distributed" ? "distributed" : "centralized";

export function ifoodConfigured() {
  return Boolean(IFOOD_CLIENT_ID && IFOOD_CLIENT_SECRET);
}

export function assertIFoodConfigured() {
  if (!ifoodConfigured()) {
    throw new Error("Credenciais do iFood não configuradas. Defina IFOOD_CLIENT_ID e IFOOD_CLIENT_SECRET.");
  }
}
