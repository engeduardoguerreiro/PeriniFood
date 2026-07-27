import { IFOOD_BASE_URL } from "./config";

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
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    const resp = await fetch(imageUrl, { signal: controller.signal }).finally(() => clearTimeout(timeout));
    if (!resp.ok) return null;
    const ct = resp.headers.get("content-type") || "image/jpeg";
    const b64 = Buffer.from(await resp.arrayBuffer()).toString("base64");
    const r = await api("POST", `/catalog/v2.0/merchants/${merchantId}/image/upload`, token, { image: `data:${ct};base64,${b64}` });
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
