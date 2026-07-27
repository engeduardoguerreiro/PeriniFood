import { randomUUID } from "crypto";
import { createServiceClient } from "@/lib/supabase/service";
import { getClientCredentialsToken } from "./auth";
import { getCatalogId, uploadImage, putFullItem } from "./catalog";
import { ifoodContext } from "./catalog-sync";

// Fase B: envia PIZZAS para o iFood usando o template nativo (type PIZZA).
// Cada CATEGORIA cujo nome contém "pizza" vira UM item "monte sua pizza" com os
// 4 grupos obrigatórios: Tamanho (SIZE), Massa (CRUST), Borda (EDGE) e Sabores (TOPPING).
// - Tamanhos vêm das variantes dos produtos-sabor.
// - Preço por sabor×tamanho sai no contextModifiers do sabor (parentOptionId = id do tamanho).
// - Massas e bordas vêm de pizza_options. A regra de fração (meia-a-meia) usa max_pizza_flavors.

type Row = Record<string, string | number | boolean | null>;

function norm(v: string | null | undefined) {
  return (v ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

function n(v: unknown) {
  return Number(v ?? 0);
}

// Preço de um sabor num tamanho (espelha flavorPrice do cardápio):
// variante do mesmo nome → seu preço; senão menor variante; senão preço base.
function flavorPriceAt(flavorVariants: Row[], sizeName: string, basePrice: number) {
  const same = flavorVariants.find((v) => v.name === sizeName);
  if (same) return n(same.price);
  if (flavorVariants.length) return Math.min(...flavorVariants.map((v) => n(v.price)));
  return basePrice;
}

export async function pushPizzaBatch(restaurantId: string, limit = 1) {
  const supabase = createServiceClient();
  const ctx = await ifoodContext(supabase, restaurantId);
  if ("error" in ctx) return { ok: false, error: ctx.error };
  const { integration, merchantId, token, catalogId } = ctx;
  void catalogId; // pizza cria a categoria automaticamente; catálogo validado no contexto

  const [{ data: restaurant }, { data: categories }, { data: products }, { data: variants }, { data: pizzaOptions }, { data: maps }] =
    await Promise.all([
      supabase.from("restaurants").select("max_pizza_flavors").eq("id", restaurantId).maybeSingle(),
      supabase.from("categories").select("id, name").eq("restaurant_id", restaurantId).eq("active", true),
      supabase.from("products").select("id, name, description, price, image_url, category_id").eq("restaurant_id", restaurantId).eq("active", true).order("name"),
      // Obs.: NÃO selecionar sort_order/slices — colunas ausentes em alguns bancos
      // (migração de região). Ordenamos os tamanhos por preço (menor primeiro).
      supabase.from("product_variants").select("id, product_id, name, price, active").eq("active", true),
      supabase.from("pizza_options").select("id, kind, name, price, active").eq("restaurant_id", restaurantId).eq("active", true),
      supabase.from("integration_product_maps").select("external_variant_id").eq("restaurant_id", restaurantId).eq("integration_id", integration.id),
    ]);

  const maxFlavors = Math.min(4, Math.max(1, n(restaurant?.max_pizza_flavors) || 1));
  const done = new Set((maps ?? []).map((m) => (m as Row).external_variant_id).filter(Boolean) as string[]);

  const pizzaCats = (categories ?? []).filter((c) => norm((c as Row).name as string).includes("pizza"));
  const pending = pizzaCats.filter((c) => {
    if (done.has(`pzcat:${(c as Row).id}`)) return false;
    return (products ?? []).some((p) => (p as Row).category_id === (c as Row).id);
  });
  const batch = pending.slice(0, limit);
  if (!batch.length) return { ok: true, pushed: 0, remaining: 0, done: true, failed: 0, errors: [] as string[] };

  const massas = (pizzaOptions ?? []).filter((o) => (o as Row).kind === "massa") as Row[];
  const bordas = (pizzaOptions ?? []).filter((o) => (o as Row).kind === "borda") as Row[];

  let pushed = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const category of batch) {
    const cat = category as Row;
    const flavors = ((products ?? []) as Row[]).filter((p) => p.category_id === cat.id);
    const variantsByProduct = new Map<string, Row[]>();
    for (const v of (variants ?? []) as Row[]) {
      const arr = variantsByProduct.get(v.product_id as string) ?? [];
      arr.push(v);
      variantsByProduct.set(v.product_id as string, arr);
    }

    // Tamanhos canônicos: união dos nomes de variante entre os sabores.
    // Ordenados pelo MENOR preço visto (ex.: BROTO antes de GRANDE) — sem depender
    // de sort_order, que pode não existir no banco.
    const sizeMap = new Map<string, number>();
    for (const f of flavors) {
      for (const v of variantsByProduct.get(f.id as string) ?? []) {
        const name = v.name as string;
        const price = n(v.price);
        if (!sizeMap.has(name) || price < (sizeMap.get(name) as number)) sizeMap.set(name, price);
      }
    }
    let sizeNames = [...sizeMap.entries()].sort((a, b) => a[1] - b[1] || a[0].localeCompare(b[0], "pt-BR")).map(([name]) => name);
    if (!sizeNames.length) sizeNames = ["Único"]; // categoria sem variantes: tamanho único pelo preço base

    const fractions = Array.from({ length: maxFlavors }, (_, i) => i + 1); // [1..maxFlavors]

    // ---- monta ids ----
    const pizzaPid = randomUUID();
    const gSize = randomUUID(), gCrust = randomUUID(), gEdge = randomUUID(), gFlavor = randomUUID();

    const sizeOpts = sizeNames.map((name, i) => ({ optId: randomUUID(), prodId: randomUUID(), name, index: i }));
    // Massas: se não houver, uma "Tradicional" grátis.
    const crustSrc = massas.length ? massas.map((m) => ({ name: m.name as string, price: n(m.price) })) : [{ name: "Tradicional", price: 0 }];
    const crustOpts = crustSrc.map((c, i) => ({ optId: randomUUID(), prodId: randomUUID(), name: c.name, price: c.price, index: i }));
    // Bordas: sempre com "Sem borda" grátis primeiro + as bordas cadastradas.
    const edgeSrc = [{ name: "Sem borda", price: 0 }, ...bordas.map((b) => ({ name: b.name as string, price: n(b.price) }))];
    const edgeOpts = edgeSrc.map((e, i) => ({ optId: randomUUID(), prodId: randomUUID(), name: e.name, price: e.price, index: i }));

    // Imagens dos sabores (best-effort, em paralelo pra caber no tempo).
    const flavorImages = await Promise.all(
      flavors.map((f) => (f.image_url ? uploadImage(merchantId, token, f.image_url as string).catch(() => null) : Promise.resolve(null))),
    );
    const flavorOpts = flavors.map((f, i) => ({
      optId: randomUUID(),
      prodId: randomUUID(),
      product: f,
      variants: variantsByProduct.get(f.id as string) ?? [],
      imagePath: flavorImages[i],
      index: i,
    }));

    // ---- products[] ----
    const productsPayload: Record<string, unknown>[] = [
      {
        id: pizzaPid,
        type: "PIZZA",
        name: (cat.name as string).slice(0, 100),
        externalCode: `pf-pzcat-${cat.id}`,
        optionGroups: [
          { id: gSize, min: 1, max: 1 },
          { id: gCrust, min: 1, max: 1 },
          { id: gEdge, min: 1, max: 1 },
          { id: gFlavor, min: 1, max: maxFlavors },
        ],
      },
      ...sizeOpts.map((s) => ({ id: s.prodId, name: s.name.slice(0, 100), externalCode: `pf-sz-${cat.id}-${norm(s.name).replace(/\W+/g, "")}` })),
      ...crustOpts.map((c) => ({ id: c.prodId, name: c.name.slice(0, 100), externalCode: `pf-ma-${cat.id}-${norm(c.name).replace(/\W+/g, "")}` })),
      ...edgeOpts.map((e) => ({ id: e.prodId, name: e.name.slice(0, 100), externalCode: `pf-bo-${cat.id}-${norm(e.name).replace(/\W+/g, "")}` })),
      ...flavorOpts.map((f) => {
        const p: Record<string, unknown> = { id: f.prodId, name: (f.product.name as string).slice(0, 100), externalCode: `pf-fl-${f.product.id}` };
        if (f.product.description) p.description = (f.product.description as string).slice(0, 1000);
        if (f.imagePath) p.imagePath = f.imagePath;
        return p;
      }),
    ];

    // ---- optionGroups[] ----
    const optionGroups = [
      { id: gSize, name: "Tamanho", status: "AVAILABLE", index: 0, optionGroupType: "SIZE", optionIds: sizeOpts.map((s) => s.optId) },
      { id: gCrust, name: "Massa", status: "AVAILABLE", index: 1, optionGroupType: "CRUST", optionIds: crustOpts.map((c) => c.optId) },
      { id: gEdge, name: "Borda", status: "AVAILABLE", index: 2, optionGroupType: "EDGE", optionIds: edgeOpts.map((e) => e.optId) },
      { id: gFlavor, name: "Sabores", status: "AVAILABLE", index: 3, optionGroupType: "TOPPING", optionIds: flavorOpts.map((f) => f.optId) },
    ];

    // ---- options[] ----
    const options: Record<string, unknown>[] = [
      ...sizeOpts.map((s) => ({ id: s.optId, status: "AVAILABLE", index: s.index, productId: s.prodId, fractions })),
      ...crustOpts.map((c) => ({ id: c.optId, status: "AVAILABLE", index: c.index, productId: c.prodId, price: { value: c.price } })),
      ...edgeOpts.map((e) => ({ id: e.optId, status: "AVAILABLE", index: e.index, productId: e.prodId, price: { value: e.price } })),
      ...flavorOpts.map((f) => {
        const base = n(f.product.price);
        const basePrice = flavorPriceAt(f.variants, sizeOpts[0].name, base);
        return {
          id: f.optId,
          status: "AVAILABLE",
          index: f.index,
          productId: f.prodId,
          price: { value: basePrice },
          contextModifiers: sizeOpts.map((s) => ({
            parentOptionId: s.optId,
            catalogContext: "DEFAULT",
            status: "AVAILABLE",
            price: { value: flavorPriceAt(f.variants, s.name, base) },
          })),
        };
      }),
    ];

    const body = {
      item: { type: "PIZZA", productId: pizzaPid, status: "AVAILABLE", externalCode: `pf-pzcat-${cat.id}`, index: 0 },
      products: productsPayload,
      optionGroups,
      options,
    };

    const res = await putFullItem(merchantId, token, body);
    if (res.ok) {
      pushed += 1;
      // Sentinela da categoria + um mapa por sabor (para sync de preço futuro).
      const rows = [
        {
          restaurant_id: restaurantId,
          integration_id: integration.id,
          product_id: null,
          product_variant_id: null,
          external_product_id: res.itemId,
          external_variant_id: `pzcat:${cat.id}`,
          external_product_name: cat.name,
          is_active: true,
        },
        ...flavorOpts.map((f) => ({
          restaurant_id: restaurantId,
          integration_id: integration.id,
          product_id: f.product.id,
          product_variant_id: null,
          external_product_id: res.itemId,
          external_variant_id: f.optId,
          external_variant_name: f.product.name,
          external_product_name: f.product.name,
          is_active: true,
        })),
      ];
      await supabase.from("integration_product_maps").insert(rows);
    } else {
      failed += 1;
      errors.push(`${cat.name}: ${(res.error ?? "").slice(0, 120)}`);
    }
  }

  return { ok: true, pushed, remaining: pending.length - batch.length, done: pending.length <= batch.length, failed, errors: errors.slice(0, 5) };
}
