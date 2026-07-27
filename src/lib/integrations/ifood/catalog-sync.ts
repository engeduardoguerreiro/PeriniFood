import { randomUUID } from "crypto";
import { createServiceClient } from "@/lib/supabase/service";
import { getClientCredentialsToken } from "./auth";
import { getCatalogId, ensureCategory, uploadImage, upsertItem } from "./catalog";

type ServiceClient = ReturnType<typeof createServiceClient>;

async function ifoodContext(supabase: ServiceClient, restaurantId: string) {
  const { data: integration } = await supabase
    .from("integrations")
    .select("id, external_store_id")
    .eq("restaurant_id", restaurantId)
    .eq("provider", "ifood")
    .maybeSingle();
  if (!integration?.external_store_id) return { error: "iFood não conectado nesta loja." as const };
  const token = (await getClientCredentialsToken()).accessToken;
  const catalogId = await getCatalogId(integration.external_store_id, token);
  if (!catalogId) return { error: "Catálogo do iFood não encontrado." as const };
  return { integration, merchantId: integration.external_store_id, token, catalogId };
}

// Fase A: envia um lote de PRODUTOS SIMPLES (sem variantes/tamanhos) para o iFood
// como um item cada — com categoria, preço e imagem. Pizzas (com tamanhos) ficam
// para a fase de template. Chame de novo até done = true.
export async function pushCatalogBatch(restaurantId: string, limit = 3) {
  const supabase = createServiceClient();
  const ctx = await ifoodContext(supabase, restaurantId);
  if ("error" in ctx) return { ok: false, error: ctx.error };
  const { integration, merchantId, token, catalogId } = ctx;

  const [{ data: maps }, { data: allProducts }, { data: categories }, { data: variantRows }] = await Promise.all([
    supabase.from("integration_product_maps").select("product_id").eq("restaurant_id", restaurantId).eq("integration_id", integration.id),
    supabase.from("products").select("id, name, description, price, image_url, category_id").eq("restaurant_id", restaurantId).eq("active", true).order("name"),
    supabase.from("categories").select("id, name").eq("restaurant_id", restaurantId),
    supabase.from("product_variants").select("product_id").eq("active", true),
  ]);

  const mapped = new Set((maps ?? []).map((m) => m.product_id));
  const hasVariants = new Set((variantRows ?? []).map((v) => v.product_id));
  const pending = (allProducts ?? []).filter((p) => !mapped.has(p.id) && !hasVariants.has(p.id));
  const batch = pending.slice(0, limit);
  if (!batch.length) return { ok: true, pushed: 0, remaining: 0, done: true, failed: 0, errors: [] as string[] };

  const catName = new Map((categories ?? []).map((c) => [c.id, c.name]));
  const categoryIdCache = new Map<string, string>();
  async function categoryId(name: string) {
    if (categoryIdCache.has(name)) return categoryIdCache.get(name)!;
    const id = await ensureCategory(merchantId, catalogId, token, name);
    if (id) categoryIdCache.set(name, id);
    return id;
  }

  let pushed = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const product of batch) {
    const catId = await categoryId(catName.get(product.category_id ?? "") ?? "Outros");
    if (!catId) { failed += 1; errors.push(`Categoria de ${product.name}`); continue; }

    const imagePath = product.image_url ? await uploadImage(merchantId, token, product.image_url) : null;
    const productUuid = randomUUID();
    const res = await upsertItem(merchantId, token, {
      productId: productUuid,
      name: product.name,
      description: product.description,
      price: Number(product.price),
      categoryId: catId,
      externalCode: `pf-${product.id}`,
      imagePath,
    });

    if (res.ok) {
      pushed += 1;
      await supabase.from("integration_product_maps").insert({
        restaurant_id: restaurantId,
        integration_id: integration.id,
        product_id: product.id,
        product_variant_id: null,
        external_product_id: res.itemId,
        external_variant_id: productUuid,
        external_product_name: product.name,
        is_active: true,
      });
    } else {
      failed += 1;
      errors.push(`${product.name}: ${(res.error ?? "").slice(0, 80)}`);
    }
  }

  return { ok: true, pushed, remaining: pending.length - batch.length, done: pending.length <= batch.length, failed, errors: errors.slice(0, 5) };
}
