"use client";

import { Search, TicketPercent, UserCircle2, X } from "lucide-react";
import { BuildPizzaBanner, CartPanel, CategoryTabs, FeaturedCard, ProductRow, type CartSuggestion, type CartView } from "@/components/storefront/menu-parts";
import { ActiveOrders } from "@/components/storefront/active-orders";
import { PizzaBuilder } from "@/components/storefront/pizza-builder";
import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { money } from "@/lib/utils";
import {
  builderSteps, cartStorageKey, choiceRule, createBuilderContext, draftFromLine, draftToLine, firstIncompleteStep, groupOptions, lineDetails, lineTotal,
  newDraft, normalizeLabel, parseStoredCart, sizeLabel,
  type BuilderCatalog, type BuilderContext, type BuilderDraft, type CartLine, type StepId,
} from "@/lib/pizza-builder";
import type { Category, Coupon, DeliveryFeeRule, LoyaltyProgram, PizzaOption, Product, ProductOption, ProductVariant, Restaurant } from "@/lib/types";

type BuilderState = { product: Product; ctx: BuilderContext; initial: BuilderDraft; startStep: StepId; editIndex: number | null };

export function PublicMenuOrder({
  restaurant,
  categories,
  products,
  variants,
  options,
  pizzaOptions,
  coupons,
  loyalty,
}: {
  restaurant: Restaurant;
  categories: Category[];
  products: Product[];
  variants: ProductVariant[];
  options: ProductOption[];
  deliveryRules: DeliveryFeeRule[];
  pizzaOptions: PizzaOption[];
  coupons: Coupon[];
  loyalty: LoyaltyProgram | null;
}) {
  const [cart, setCart] = useState<CartLine[]>([]);
  // Carrinho só é gravado depois de lido: senão o [] inicial apagaria o salvo.
  const [cartLoaded, setCartLoaded] = useState(false);
  const [cartNotice, setCartNotice] = useState<string | null>(null);
  const [builder, setBuilder] = useState<BuilderState | null>(null);
  const [search, setSearch] = useState("");
  const [cartOpen, setCartOpen] = useState(false);
  const [couponsOpen, setCouponsOpen] = useState(false);
  const [customerName, setCustomerName] = useState("");
  // Tamanho escolhido antes de ver preços: com tamanhos, o card mostrava "a partir de"
  // o menor preço (broto) e o cliente entendia que a pizza custava aquilo.
  const [size, setSizeState] = useState<string | null>(null);
  const sizeKey = `perinifood_size_${restaurant.slug}`;
  function setSize(next: string) {
    setSizeState(next);
    try { window.sessionStorage.setItem(sizeKey, next); } catch {}
  }
  const router = useRouter();

  const subtotal = useMemo(() => cart.reduce((sum, item) => sum + lineTotal(item), 0), [cart]);
  const itemCount = useMemo(() => cart.reduce((sum, item) => sum + item.quantity, 0), [cart]);
  const categoryById = useMemo(() => new Map(categories.map((category) => [category.id, category])), [categories]);
  const builderCatalog = useMemo<BuilderCatalog>(() => ({
    products, variants, options, pizzaOptions, maxFlavors: Number(restaurant.max_pizza_flavors ?? 1),
    rules: { crust: choiceRule(restaurant.crust_choice_rule), addons: choiceRule(restaurant.addon_choice_rule) },
  }), [options, pizzaOptions, products, restaurant.addon_choice_rule, restaurant.crust_choice_rule, restaurant.max_pizza_flavors, variants]);

  const isPizzaProduct = useCallback((product: Product | undefined | null) => {
    if (!product?.category_id) return false;
    return normalizeLabel(categoryById.get(product.category_id)?.name ?? "").includes("pizza");
  }, [categoryById]);

  // Tudo que depende só do catálogo é calculado uma vez. Antes, cada tecla na
  // busca ou na observação do item refazia filtros/ordenações por produto.
  const catalog = useMemo(() => {
    const variantsByProduct = new Map<string, ProductVariant[]>();
    for (const variant of variants) {
      if (!variant.active) continue;
      const list = variantsByProduct.get(variant.product_id) ?? [];
      list.push(variant);
      variantsByProduct.set(variant.product_id, list);
    }
    const info = new Map(products.map((product) => {
      const productVariants = variantsByProduct.get(product.id) ?? [];
      const pizza = isPizzaProduct(product);
      const hasOptions = Boolean(
        productVariants.length
        || (pizza && (groupOptions(options, product.id, "Bordas", pizzaOptions).length || groupOptions(options, product.id, "Tipos de Massas", pizzaOptions).length))
        || groupOptions(options, product.id, "Adicionais", pizzaOptions).length,
      );
      const basePrice = productVariants.length ? Math.min(...productVariants.map((variant) => Number(variant.price))) : Number(product.price);
      const priceBySize = new Map(productVariants.map((variant) => [variant.name, Number(variant.price)]));
      return [product.id, { pizza, hasVariants: productVariants.length > 0, hasOptions, basePrice, priceBySize, searchText: normalizeLabel(`${product.name} ${product.description ?? ""}`) }];
    }));
    // Tamanhos da loja, do mais barato ao mais caro (Broto, Média, Grande…).
    const sizeFloor = new Map<string, number>();
    for (const product of products) {
      for (const variant of variantsByProduct.get(product.id) ?? []) {
        sizeFloor.set(variant.name, Math.min(sizeFloor.get(variant.name) ?? Infinity, Number(variant.price)));
      }
    }
    const sizes = [...sizeFloor.entries()].sort((a, b) => a[1] - b[1]).map(([name]) => name);
    const byCategory = new Map(categories.map((category) => [
      category.id,
      products
        .filter((product) => product.category_id === category.id)
        .sort((a, b) => (info.get(a.id)!.basePrice - info.get(b.id)!.basePrice) || a.name.localeCompare(b.name, "pt-BR")),
    ]));
    return { info, byCategory, sizes };
  }, [categories, isPizzaProduct, options, pizzaOptions, products, variants]);

  const deferredSearch = useDeferredValue(search);
  const searchTerm = normalizeLabel(deferredSearch.trim());

  useEffect(() => {
    try {
      const saved = window.sessionStorage.getItem(sizeKey);
      if (saved && catalog.sizes.includes(saved)) Promise.resolve().then(() => setSizeState(saved));
    } catch {}
  }, [sizeKey, catalog.sizes]);

  // Carrinho do aparelho (o mesmo que o checkout lê): voltar do checkout não o
  // esvazia mais. Cada item é refeito com o catálogo atual; o que saiu do
  // cardápio ou mudou de preço é avisado em vez de chegar errado no envio.
  useEffect(() => {
    let saved: CartLine[] = [];
    try { saved = parseStoredCart(window.sessionStorage.getItem(cartStorageKey(restaurant.slug))); } catch {}
    const kept: CartLine[] = [];
    let removed = 0;
    let repriced = false;
    for (const line of saved) {
      const product = products.find((item) => item.id === line.id);
      if (!product) { removed += 1; continue; }
      const ctx = createBuilderContext(builderCatalog, product, isPizzaProduct(product));
      const rebuilt = draftToLine(ctx, draftFromLine(ctx, line));
      if (!rebuilt) { removed += 1; continue; }
      if (lineTotal(rebuilt) !== lineTotal(line)) repriced = true;
      kept.push(rebuilt);
    }
    const notice = removed
      ? `${removed} item${removed > 1 ? "s foram retirados" : " foi retirado"} do carrinho: saiu do cardápio, ficou indisponível ou precisa ser montado de novo.`
      : repriced ? "Os preços do seu carrinho foram atualizados." : null;
    Promise.resolve().then(() => {
      setCart(kept);
      setCartNotice(notice);
      setCartLoaded(true);
    });
  }, [builderCatalog, isPizzaProduct, products, restaurant.slug]);

  useEffect(() => {
    if (!cartLoaded) return;
    try {
      if (cart.length) window.sessionStorage.setItem(cartStorageKey(restaurant.slug), JSON.stringify(cart));
      else window.sessionStorage.removeItem(cartStorageKey(restaurant.slug));
    } catch {}
  }, [cart, cartLoaded, restaurant.slug]);

  function priceView(product: Product) {
    const info = catalog.info.get(product.id)!;
    if (!info.hasVariants) return { price: info.basePrice };
    if (!size) return { price: null, priceNote: "Escolha o tamanho para ver o preço" };
    const price = info.priceBySize.get(size);
    return price != null ? { price } : { price: null, priceNote: `Não disponível em ${sizeLabel(size)}` };
  }

  useEffect(() => {
    window.localStorage.removeItem('gastroflow_customer_' + restaurant.slug);
    const controller = new AbortController();
    fetch('/api/customer-auth/profile?restaurantId=' + restaurant.id, { signal: controller.signal })
      .then(async response => response.ok ? response.json() : null)
      .then(data => { if (data?.ok) setCustomerName(data.customer.name); }).catch(() => {});
    return () => controller.abort();
  }, [restaurant.id, restaurant.slug]);

  // Pizza clicada = 1º sabor; "Monte sua pizza" (firstFlavor null) começa sem sabor.
  // Com o tamanho já escolhido no topo, a montagem abre direto nos sabores.
  function openBuilder(product: Product, firstFlavor: string | null) {
    if (!restaurant.is_open) return;
    const pizza = isPizzaProduct(product);
    const ctx = createBuilderContext(builderCatalog, product, pizza);
    const initial = newDraft(ctx, { firstFlavor, sizeName: size });
    const steps = builderSteps(ctx, initial);
    const startStep: StepId = pizza ? (initial.sizeName ? "sabores" : steps[0]) : firstIncompleteStep(ctx, initial);
    setBuilder({ product, ctx, initial, startStep, editIndex: null });
  }

  function editLine(index: number) {
    const line = cart[index];
    const product = line && products.find((item) => item.id === line.id);
    if (!product) return;
    const ctx = createBuilderContext(builderCatalog, product, isPizzaProduct(product));
    setCartOpen(false);
    setBuilder({ product, ctx, initial: draftFromLine(ctx, line), startStep: "revisao", editIndex: index });
  }

  const closeBuilder = useCallback(() => setBuilder(null), []);

  function confirmBuilder(line: CartLine) {
    if (!builder) return;
    const editIndex = builder.editIndex;
    setCart((current) => editIndex == null ? [...current, line] : current.map((item, index) => index === editIndex ? line : item));
    if (!size && line.variantName && catalog.sizes.includes(line.variantName)) setSize(line.variantName);
    setBuilder(null);
    setCartNotice(null);
    notifyAdded(editIndex == null ? `${line.flavors.length > 1 ? "Pizza" : line.name} adicionad${line.flavors.length > 1 ? "a" : "o"}` : "Item atualizado");
  }

  // Produto sem nada para escolher (bebida, sobremesa) vai direto para o
  // carrinho: abrir um modal só com "quantidade" é atrito à toa.
  function addSimpleToCart(product: Product) {
    if (!restaurant.is_open) return;
    setCart((current) => {
      // Mesma bebida de novo soma na linha existente.
      const same = current.findIndex((item) => item.id === product.id && !item.variantId && !item.notes && !item.additions.length);
      if (same >= 0) return current.map((item, index) => index === same ? { ...item, quantity: Math.min(100, item.quantity + 1) } : item);
      return [...current, { id: product.id, variantId: null, variantName: null, name: product.name, price: Number(product.price), quantity: 1, dough: null, crust: null, additions: [], flavorCount: 0, flavors: [], notes: "" }];
    });
    notifyAdded(`${product.name} adicionado`);
  }

  // Confirmação discreta ao adicionar (antes o carrinho abria por cima a cada item).
  const [addedName, setAddedName] = useState<string | null>(null);
  const justAdded = Boolean(addedName);
  const addedTimer = useRef<number | null>(null);
  function notifyAdded(message: string) {
    setAddedName(message);
    if (addedTimer.current) window.clearTimeout(addedTimer.current);
    addedTimer.current = window.setTimeout(() => setAddedName(null), 1800);
  }

  function goToCheckout() {
    if (!cart.length || !restaurant.is_open) return;
    try { window.sessionStorage.setItem(cartStorageKey(restaurant.slug), JSON.stringify(cart)); } catch {}
    router.push(`/cardapio/${restaurant.slug}/checkout`);
  }

  function updateCart(index: number, patch: Partial<CartLine>) {
    setCart((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item).filter((item) => item.quantity > 0));
  }

  const cartLines: CartView[] = cart.map((item, index) => {
    const product = products.find((entry) => entry.id === item.id);
    return {
      key: `${item.id}-${index}`,
      title: item.flavors.length > 1 ? `Pizza ${item.flavors.length} sabores${item.variantName ? ` · ${sizeLabel(item.variantName)}` : ""}` : `${item.name}${item.variantName ? ` · ${sizeLabel(item.variantName)}` : ""}`,
      details: lineDetails(item),
      quantity: item.quantity,
      total: lineTotal(item),
      image: product?.image_url ?? null,
      editable: Boolean(product && catalog.info.get(product.id)?.hasOptions),
    };
  });
  // Sugestão discreta de bebida: só com pizza no carrinho e nenhuma bebida ainda.
  const drinkCategory = categories.find((category) => normalizeLabel(category.name).includes("bebida"));
  const drinks = drinkCategory ? (catalog.byCategory.get(drinkCategory.id) ?? []).filter((product) => !catalog.info.get(product.id)?.hasOptions) : [];
  const suggestions: CartSuggestion[] = drinks.length && cart.some((item) => item.flavors.length) && !cart.some((item) => drinks.some((drink) => drink.id === item.id))
    ? drinks.slice(0, 6).map((product) => ({ id: product.id, name: product.name, price: Number(product.price), image: product.image_url }))
    : [];
  const featured = products.filter((product) => product.featured);
  const selectProduct = (product: Product) => {
    const info = catalog.info.get(product.id);
    if (info?.pizza || info?.hasOptions) openBuilder(product, info?.pizza ? product.name : null);
    else addSimpleToCart(product);
  };
  const anyResult = !searchTerm || [...catalog.byCategory.values()].some((list) => list.some((product) => catalog.info.get(product.id)?.searchText.includes(searchTerm)));
  const cartPanel = (onClose?: () => void) => (
    <CartPanel
      lines={cartLines}
      subtotal={subtotal}
      open={restaurant.is_open}
      minimum={Number(restaurant.minimum_order ?? 0)}
      notice={cartNotice}
      suggestions={restaurant.is_open ? suggestions : []}
      onAddSuggestion={(id) => { const product = products.find((item) => item.id === id); if (product) addSimpleToCart(product); }}
      onQuantity={(index, quantity) => updateCart(index, { quantity: Math.min(100, quantity) })}
      onEdit={restaurant.is_open ? editLine : undefined}
      onCheckout={goToCheckout}
      onClose={onClose}
    />
  );

  return (
    <>
      {/* Barra fixa: busca + abas de categoria sempre à mão, mesmo no fim de um cardápio longo. */}
      <div className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/95 shadow-[0_6px_20px_-16px_rgba(0,0,0,0.4)] backdrop-blur">
        <div className="mx-auto max-w-6xl">
          <div className="flex items-center gap-2 px-4 pt-2.5">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                aria-label="Buscar no cardápio"
                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm outline-none transition focus:border-brand focus:bg-white"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={`Buscar em ${restaurant.name}`}
              />
            </div>
            {(coupons.length > 0 || loyalty) && (
              <button type="button" onClick={() => setCouponsOpen(true)} aria-label="Ver cupons e vantagens" className="relative grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand">
                <TicketPercent className="h-5 w-5" />
                {coupons.length > 0 && <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-brand px-1 text-[11px] font-black text-white">{coupons.length}</span>}
              </button>
            )}
            <a href={`/cardapio/${restaurant.slug}/conta`} aria-label={customerName ? `Minha conta (${customerName})` : "Entrar ou cadastrar-se"} className="flex h-11 shrink-0 items-center gap-2 rounded-xl bg-slate-100 px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-200">
              <UserCircle2 className="h-5 w-5" />
              <span className="hidden max-w-28 truncate sm:inline">{customerName ? customerName.split(" ")[0] : "Entrar"}</span>
            </a>
          </div>
          {catalog.sizes.length > 0 && (
            <div className={`mx-4 mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1.5 rounded-xl px-3 py-2 transition ${size ? "bg-slate-50" : "bg-amber-50 ring-1 ring-amber-200"}`}>
              <span className={`shrink-0 text-xs font-bold ${size ? "text-slate-500" : "text-amber-900"}`}>{size ? "Tamanho:" : "Escolha o tamanho da pizza para ver os preços"}</span>
              <div role="radiogroup" aria-label="Tamanho da pizza" className="flex flex-wrap gap-1.5">
                {catalog.sizes.map((name) => (
                  <button
                    key={name}
                    type="button"
                    role="radio"
                    aria-checked={size === name}
                    onClick={() => setSize(name)}
                    className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-bold transition ${size === name ? "bg-brand text-white shadow-[0_6px_14px_-6px_rgba(207,74,10,0.8)]" : "bg-white text-ink ring-1 ring-slate-200 hover:ring-brand"}`}
                  >
                    {sizeLabel(name)}
                  </button>
                ))}
              </div>
            </div>
          )}
          {!searchTerm && <CategoryTabs categories={categories.filter((category) => catalog.byCategory.get(category.id)?.length)} />}
          {searchTerm && <p className="px-4 pb-2.5 pt-1.5 text-sm text-slate-500">Resultados para “{deferredSearch.trim()}”</p>}
        </div>
      </div>

      {!restaurant.is_open && (
        <div className="border-b border-amber-200 bg-amber-50">
          <p className="mx-auto max-w-6xl px-4 py-2.5 text-sm font-semibold text-amber-900">A loja está fechada agora. Você pode ver o cardápio; os pedidos voltam quando ela abrir.</p>
        </div>
      )}

      <div className={`mx-auto max-w-6xl gap-6 px-4 pt-4 lg:grid lg:grid-cols-[1fr_340px] ${itemCount ? "pb-28 lg:pb-10" : "pb-10"}`}>
        <div className="min-w-0 space-y-7">
          <ActiveOrders slug={restaurant.slug} />
          {!searchTerm && featured.length > 0 && (
            <section aria-labelledby="destaques">
              <h2 id="destaques" className="mb-3 text-lg font-black text-ink">Destaques</h2>
              <div className="no-scrollbar -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2">
                {featured.map((product) => {
                  return <FeaturedCard key={product.id} product={product} {...priceView(product)} open={restaurant.is_open} onSelect={() => selectProduct(product)} />;
                })}
              </div>
            </section>
          )}

          {categories.map((category) => {
            const categoryProducts = (catalog.byCategory.get(category.id) ?? []).filter((product) => !searchTerm || catalog.info.get(product.id)?.searchText.includes(searchTerm));
            if (!categoryProducts.length) return null;
            return (
              <section key={category.id} id={`cat-${category.id}`} aria-labelledby={`titulo-${category.id}`} className="scroll-mt-32">
                <h2 id={`titulo-${category.id}`} className="mb-3 flex items-baseline gap-2 text-lg font-black text-ink">
                  {category.name} <span className="text-sm font-medium text-slate-400">{categoryProducts.length}</span>
                </h2>
                {!searchTerm && restaurant.is_open && catalog.info.get(categoryProducts[0].id)?.pizza && categoryProducts.length > 1 && Number(restaurant.max_pizza_flavors ?? 1) > 1 && (
                  <BuildPizzaBanner maxFlavors={Math.min(4, Number(restaurant.max_pizza_flavors ?? 1))} onStart={() => openBuilder(categoryProducts[0], null)} />
                )}
                <div className="grid gap-3 md:grid-cols-2">
                  {categoryProducts.map((product) => {
                    return <ProductRow key={product.id} product={product} {...priceView(product)} open={restaurant.is_open} onSelect={() => selectProduct(product)} />;
                  })}
                </div>
              </section>
            );
          })}
          {!anyResult && <p className="rounded-2xl bg-white p-6 text-center text-sm text-slate-600 shadow-sm">Nenhum item encontrado para “{deferredSearch.trim()}”.</p>}
        </div>

        {/* Desktop: carrinho sempre visível ao lado do cardápio. */}
        <aside className="hidden lg:block" aria-label="Carrinho">
          <div className="sticky top-32 max-h-[calc(100vh-9rem)] overflow-hidden rounded-2xl bg-white shadow-[0_12px_32px_-18px_rgba(0,0,0,0.4)] ring-1 ring-black/[0.05]">
            {cartPanel()}
          </div>
        </aside>
      </div>

      {/* Celular: barra fixa do carrinho que abre o painel por baixo. */}
      {itemCount > 0 && !builder && !cartOpen && (
        <div className="fixed inset-x-0 bottom-0 z-30 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 lg:hidden">
          <button
            type="button"
            onClick={() => setCartOpen(true)}
            className={`flex h-14 w-full items-center justify-between rounded-2xl bg-gradient-to-b from-brand-bright to-brand px-4 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.3),0_14px_30px_-10px_rgba(207,74,10,0.85)] transition ${justAdded ? "scale-[1.02]" : ""}`}
          >
            <span className="flex items-center gap-2 text-sm font-bold"><span className="grid h-7 min-w-7 place-items-center rounded-full bg-white/25 px-1.5">{itemCount}</span> Ver carrinho</span>
            <span className="text-base font-black">{money(subtotal)}</span>
          </button>
        </div>
      )}

      {cartOpen && (
        <div className="fixed inset-0 z-50 flex items-end lg:hidden" role="dialog" aria-modal="true" aria-label="Carrinho">
          <button type="button" aria-label="Fechar carrinho" className="absolute inset-0 bg-black/50" onClick={() => setCartOpen(false)} />
          <div className="relative flex max-h-[85dvh] w-full flex-col rounded-t-3xl bg-white pb-[env(safe-area-inset-bottom)] shadow-2xl">
            <span className="mx-auto mt-2 h-1.5 w-10 rounded-full bg-slate-300" aria-hidden="true" />
            {cartPanel(() => setCartOpen(false))}
          </div>
        </div>
      )}

      {couponsOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center" role="dialog" aria-modal="true" aria-label="Cupons e vantagens">
          <button type="button" aria-label="Fechar" className="absolute inset-0 bg-black/50" onClick={() => setCouponsOpen(false)} />
          <div className="relative w-full max-w-md rounded-t-3xl bg-white p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl md:rounded-3xl">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-lg font-black text-ink"><TicketPercent className="h-5 w-5 text-brand" /> Cupons e vantagens</h2>
              <button type="button" onClick={() => setCouponsOpen(false)} aria-label="Fechar" className="grid h-10 w-10 place-items-center rounded-full text-slate-500 hover:bg-slate-100"><X className="h-5 w-5" /></button>
            </div>
            <div className="mt-4 space-y-3">
              {coupons.map((coupon) => (
                <div key={coupon.id} className="rounded-xl border border-dashed border-brand/40 bg-brand-soft p-3">
                  <p className="font-black tracking-wide text-brand-strong">{coupon.code}</p>
                  <p className="text-sm text-slate-600">{coupon.description || "Cupom disponível para esta loja."}</p>
                  {Number(coupon.minimum_order ?? 0) > 0 && <p className="mt-1 text-xs font-semibold text-slate-500">Pedido mínimo: {money(coupon.minimum_order ?? 0)}</p>}
                </div>
              ))}
              {loyalty && (
                <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-3">
                  <p className="font-black text-emerald-700">Programa de fidelidade</p>
                  <p className="text-sm text-slate-600">{loyalty.description || "Compre e acumule benefícios."}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {addedName && (
        <p role="status" className="fixed bottom-24 left-1/2 z-50 -translate-x-1/2 whitespace-nowrap rounded-full bg-ink lg:bottom-auto lg:top-4 px-4 py-2 text-sm font-semibold text-white shadow-xl">✓ {addedName}</p>
      )}

      {builder && (
        <PizzaBuilder
          key={`${builder.product.id}-${builder.editIndex ?? "novo"}`}
          ctx={builder.ctx}
          product={builder.product}
          initial={builder.initial}
          startStep={builder.startStep}
          editing={builder.editIndex != null}
          onClose={closeBuilder}
          onConfirm={confirmBuilder}
        />
      )}
    </>
  );
}
