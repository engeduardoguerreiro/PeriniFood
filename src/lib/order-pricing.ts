import { boundedText, PublicError, uuid } from "./security";
import type { Product, ProductVariant, ProductAddon, ProductOption, PizzaOption } from "./types";

type Selection = { name: string; price: number };
export type PricedItem = { id: string; name: string; variantId: string | null; variantName: string | null; price: number; quantity: number; total: number; notes: string;
  dough: Selection | null; crust: Selection | null; flavors: string[]; flavorCount: number; addons: { id: string | null; name: string; price: number }[] };
export type PricingCatalog = { products: Product[]; variants: ProductVariant[]; addons: ProductAddon[]; options: ProductOption[]; pizzaOptions: PizzaOption[]; maxFlavors: number };

export function amount(value: unknown) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0 || number > 1_000_000) throw new PublicError("Valor inválido.");
  return Math.round(number * 100) / 100;
}
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new PublicError("Item inválido.");
  return value as Record<string, unknown>;
}
function list(value: unknown, max: number): unknown[] {
  if (value == null) return [];
  if (!Array.isArray(value) || value.length > max) throw new PublicError("Quantidade de opções inválida.");
  return value;
}

export function priceCart(input: unknown, catalog: PricingCatalog, orderType: string): PricedItem[] {
  const cart = list(input, 100);
  if (!cart.length) throw new PublicError("Carrinho vazio.");
  return cart.map(value => {
    const item = object(value);
    const product = catalog.products.find(p => p.id === uuid(item.id) && p.active);
    if (!product) throw new PublicError("Produto indisponível.");
    const availability = orderType === "delivery" ? product.delivery_available : orderType === "pickup" ? product.pickup_available : product.dine_in_available;
    if (availability === false) throw new PublicError("Produto indisponível para esta modalidade.");
    const quantity = Number(item.quantity);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 100) throw new PublicError("Quantidade inválida.");
    const variants = catalog.variants.filter(v => v.product_id === product.id && v.active);
    const variant = item.variantId ? variants.find(v => v.id === uuid(item.variantId)) : null;
    if ((item.variantId && !variant) || (variants.length && !variant)) throw new PublicError("Selecione um tamanho válido para o produto.");
    const flavors = list(item.flavors, Math.min(product.max_flavors ?? catalog.maxFlavors, catalog.maxFlavors)).map(f => boundedText(f, 150, true));
    if (new Set(flavors).size !== flavors.length) throw new PublicError("Sabores repetidos.");
    let base = amount(variant?.price ?? product.price);
    for (const flavor of flavors) {
      const candidate = catalog.products.find(p => p.active && p.name === flavor && p.category_id === product.category_id);
      if (!candidate) throw new PublicError("Sabor indisponível.");
      const sizes = catalog.variants.filter(v => v.active && v.product_id === candidate.id);
      const sameSize = sizes.find(v => v.name === variant?.name);
      if (sizes.length && !sameSize) throw new PublicError("Sabor indisponível neste tamanho.");
      base = Math.max(base, amount(sameSize?.price ?? candidate.price));
    }
    function selectOption(raw: unknown, groupName: string, kind: "massa" | "borda" | "adicional"): Selection | null {
      if (!raw) return null;
      const name = boundedText(object(raw).name, 150, true);
      const global = catalog.pizzaOptions.find(o => o.active && o.kind === kind && o.name === name);
      const group = catalog.options.find(o => o.product_id === product!.id && o.name === groupName);
      if (!global || (kind !== "borda" && !group?.product_option_items?.some(o => o.active && o.name === name))) throw new PublicError("Opção indisponível para o produto.");
      return { name, price: amount(global.price) };
    }
    const dough = selectOption(item.dough, "Tipos de Massas", "massa");
    const crust = selectOption(item.crust, "Bordas", "borda");
    const additions = list(item.additions, 30).map(a => selectOption(a, "Adicionais", "adicional")!);
    if (new Set(additions.map(a=>a.name)).size !== additions.length) throw new PublicError("Adicionais repetidos.");
    const addonIds = list(item.addonIds, 30).map(uuid);
    if (new Set(addonIds).size !== addonIds.length) throw new PublicError("Adicionais repetidos.");
    const addons: PricedItem["addons"] = addonIds.map(id => {
      const addon = catalog.addons.find(a => a.id === id && a.active);
      if (!addon) throw new PublicError("Adicional indisponível.");
      return { id: addon.id, name: addon.name, price: amount(addon.price) };
    });
    addons.push(...additions.map(a => ({ id: null, ...a })));
    for (const group of catalog.options.filter(o=>o.product_id===product.id)) {
      const count = group.name === "Tipos de Massas" ? Number(Boolean(dough)) : group.name === "Bordas" ? Number(Boolean(crust)) : group.name === "Adicionais" ? additions.length : 0;
      if (count < (group.required ? Math.max(1, group.min_choices) : group.min_choices) || (group.max_choices != null && count > group.max_choices)) throw new PublicError("Confira as opções obrigatórias do produto.");
    }
    return { id: product.id, name: variant ? `${product.name} - ${variant.name}` : product.name, variantId: variant?.id ?? null, variantName: variant?.name ?? null,
      price: base, quantity, total: amount((base + (dough?.price ?? 0) + (crust?.price ?? 0) + addons.reduce((sum,a)=>sum+a.price,0))*quantity),
      notes: boundedText(item.notes, 500), dough, crust, flavors, flavorCount: Math.max(1, flavors.length), addons };
  });
}
