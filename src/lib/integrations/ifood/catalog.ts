import { IFOOD_BASE_URL } from "./config";
import { isStorageImageUrl } from "@/lib/image-url";

type ApiResult = { ok: boolean; status: number; data: unknown; text: string };

async function api(method: string, path: string, token: string, body?: unknown): Promise<ApiResult> {
  const res = await fetch(`${IFOOD_BASE_URL}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", Accept: "application/json" },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  const text = await res.text();
  let data: unknown = null;
  try { data = text ? JSON.parse(text) : null; } catch { /* mantém null */ }
  return { ok: res.ok, status: res.status, data, text };
}

export async function getCatalogId(merchantId: string, token: string): Promise<string | null> {
  const r = await api("GET", `/catalog/v2.0/merchants/${merchantId}/catalogs`, token);
  if (!r.ok || !Array.isArray(r.data)) return null;
  const list = r.data as Array<{ catalogId: string; context?: string[] }>;
  const def = list.find((c) => (Array.isArray(c.context) ? c.context.includes("DEFAULT") : false)) ?? list[0];
  return def?.catalogId ?? null;
}

export async function listCategories(merchantId: string, catalogId: string, token: string): Promise<Array<{ id: string; name: string }>> {
  const r = await api("GET", `/catalog/v2.0/merchants/${merchantId}/catalogs/${catalogId}/categories`, token);
  return r.ok && Array.isArray(r.data) ? (r.data as Array<{ id: string; name: string }>) : [];
}

export async function ensureCategory(merchantId: string, catalogId: string, token: string, name: string): Promise<string | null> {
  const existing = (await listCategories(merchantId, catalogId, token)).find((c) => c.name.trim().toLowerCase() === name.trim().toLowerCase());
  if (existing) return existing.id;
  const r = await api("POST", `/catalog/v2.0/merchants/${merchantId}/catalogs/${catalogId}/categories`, token, { name, status: "AVAILABLE", template: "DEFAULT" });
  return r.ok ? (r.data as { id?: string })?.id ?? null : null;
}

// Baixa a imagem do produto e envia ao iFood (data URI). Best-effort com timeout.
export async function uploadImage(merchantId: string, token: string, imageUrl: string): Promise<string | null> {
  // Só baixa do nosso Storage (a URL vem de texto livre do lojista) e converte para
  // JPEG: os uploads novos são WebP, formato que o catálogo do iFood não garante aceitar.
  if (!isStorageImageUrl(imageUrl)) return null;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    const resp = await fetch(imageUrl, { signal: controller.signal, redirect: "error" }).finally(() => clearTimeout(timeout));
    if (!resp.ok) return null;
    const { default: sharp } = await import("sharp");
    const jpeg = await sharp(Buffer.from(await resp.arrayBuffer())).flatten({ background: "#ffffff" }).jpeg({ quality: 85 }).toBuffer();
    const r = await api("POST", `/catalog/v2.0/merchants/${merchantId}/image/upload`, token, { image: `data:image/jpeg;base64,${jpeg.toString("base64")}` });
    return r.ok ? (r.data as { imagePath?: string })?.imagePath ?? null : null;
  } catch {
    return null;
  }
}

export type ItemInput = {
  productId: string;      // UUID do produto no iFood (gerado por nós, estável)
  itemId?: string | null; // id do item no iFood (para update)
  name: string;
  description?: string | null;
  price: number;
  categoryId: string;
  externalCode: string;
  imagePath?: string | null;
};

// Envia um item completo (payload FullItemDto pronto) — usado pelo template de pizza,
// que monta item + products + optionGroups + options manualmente.
export async function putFullItem(merchantId: string, token: string, body: unknown) {
  const r = await api("PUT", `/catalog/v2.0/merchants/${merchantId}/items`, token, body);
  const itemId = (r.data as { item?: { id?: string } })?.item?.id ?? null;
  return { ok: r.ok, status: r.status, itemId, data: r.data, error: r.ok ? null : r.text };
}

// Lê um item completo (formato normalizado do iFood: grupos/opções aninhados).
export async function getItem(merchantId: string, token: string, itemId: string) {
  const r = await api("GET", `/catalog/v2.0/merchants/${merchantId}/items/${itemId}`, token);
  return r.ok ? (r.data as Record<string, unknown>) : null;
}

// Define o preço de uma opção. Para SABOR de pizza por tamanho, passe
// parentCustomizationOptionId = id da opção de tamanho onde o sabor será precificado.
export async function patchOptionPrice(merchantId: string, token: string, optionId: string, parentCustomizationOptionId: string | null, value: number) {
  const body: Record<string, unknown> = { optionId, price: { value: Number(value.toFixed(2)) } };
  if (parentCustomizationOptionId) body.parentCustomizationOptionId = parentCustomizationOptionId;
  const r = await api("PATCH", `/catalog/v2.0/merchants/${merchantId}/options/price`, token, body);
  return { ok: r.ok, status: r.status, error: r.ok ? null : r.text };
}

export async function upsertItem(merchantId: string, token: string, input: ItemInput) {
  const product: Record<string, unknown> = { id: input.productId, name: input.name.slice(0, 100), externalCode: input.externalCode };
  if (input.description) product.description = input.description.slice(0, 1000);
  if (input.imagePath) product.imagePath = input.imagePath;
  const item: Record<string, unknown> = {
    productId: input.productId,
    status: "AVAILABLE",
    price: { value: Number(input.price.toFixed(2)) },
    categoryId: input.categoryId,
    externalCode: input.externalCode,
    index: 0,
  };
  if (input.itemId) item.id = input.itemId;
  const r = await api("PUT", `/catalog/v2.0/merchants/${merchantId}/items`, token, { item, products: [product] });
  const itemId = (r.data as { item?: { id?: string } })?.item?.id ?? input.itemId ?? null;
  return { ok: r.ok, status: r.status, itemId, error: r.ok ? null : r.text };
}
