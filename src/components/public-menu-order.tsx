"use client";

/* eslint-disable @next/next/no-img-element */
import { Minus, Plus, Search, TicketPercent, UserCircle2, X } from "lucide-react";
import { CartPanel, CategoryTabs, FeaturedCard, ProductRow, type CartView } from "@/components/storefront/menu-parts";
import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { money } from "@/lib/utils";
import type { Category, Coupon, DeliveryFeeRule, LoyaltyProgram, PizzaOption, Product, ProductOption, ProductOptionItem, ProductVariant, Restaurant } from "@/lib/types";

type SelectedOption = { name: string; price: number };

type CartLine = {
  id: string;
  name: string;
  price: number;
  quantity: number;
  variantId: string | null;
  variantName: string | null;
  dough: SelectedOption | null;
  crust: SelectedOption | null;
  additions: SelectedOption[];
  flavorCount: number;
  flavors: string[];
  notes: string;
};
function optionKind(groupName: string) {
  if (groupName === "Tipos de Massas") return "massa";
  if (groupName === "Bordas") return "borda";
  return "adicional";
}

function groupOptions(options: ProductOption[], productId: string, groupName: string, pizzaOptions: PizzaOption[]) {
  if (groupName === "Bordas") {
    return pizzaOptions
      .filter((option) => option.active && option.kind === "borda")
      .map((option) => ({
        id: option.id,
        restaurant_id: option.restaurant_id,
        option_id: option.id,
        name: option.name,
        additional_price: option.price,
        active: option.active,
        created_at: option.created_at,
      })) as ProductOptionItem[];
  }

  const group = options.find((option) => option.product_id === productId && option.name === groupName);
  const activeOptions = new Map(pizzaOptions.filter((option) => option.active && option.kind === optionKind(groupName)).map((option) => [option.name, option]));
  return (group?.product_option_items ?? [])
    .filter((item) => item.active && activeOptions.has(item.name))
    .map((item) => ({
      ...item,
      additional_price: activeOptions.get(item.name)?.price ?? item.additional_price,
    })) as ProductOptionItem[];
}

function lineTotal(item: CartLine) {
  const extras = Number(item.dough?.price ?? 0) + Number(item.crust?.price ?? 0) + item.additions.reduce((sum, addition) => sum + Number(addition.price), 0);
  return (Number(item.price) + extras) * item.quantity;
}

function flavorChoices(product: Product, products: Product[]) {
  return products
    .filter((item) => item.category_id === product.category_id && item.active)
    .sort((a, b) => a.name.localeCompare(b.name));
}

function flavorPrice(flavorName: string, variantName: string | null | undefined, products: Product[], variants: ProductVariant[], fallback: number) {
  const flavorProduct = products.find((product) => product.name === flavorName);
  if (!flavorProduct) return fallback;
  const flavorVariants = variants.filter((variant) => variant.product_id === flavorProduct.id && variant.active);
  const sameSize = flavorVariants.find((variant) => variant.name === variantName);
  if (sameSize) return Number(sameSize.price);
  if (flavorVariants.length) return Math.min(...flavorVariants.map((variant) => Number(variant.price)));
  return Number(flavorProduct.price ?? fallback);
}

function highestFlavorPrice(flavors: string[] | undefined, variantName: string | null | undefined, products: Product[], variants: ProductVariant[], fallback: number) {
  const selected = flavors?.length ? flavors : [];
  if (!selected.length) return fallback;
  return Math.max(...selected.map((flavor) => flavorPrice(flavor, variantName, products, variants, fallback)));
}

function normalizeLabel(value: string | null | undefined) {
  return (value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

// "BROTO" → "Broto": os tamanhos costumam ser cadastrados em caixa alta.
function sizeLabel(value: string) {
  return value === value.toUpperCase() ? value.toLowerCase().replace(/(^|\s)\S/g, (letter) => letter.toUpperCase()) : value;
}

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
  const [draft, setDraft] = useState<CartLine | null>(null);
  const [search, setSearch] = useState("");
  const [cartOpen, setCartOpen] = useState(false);
  const [couponsOpen, setCouponsOpen] = useState(false);
  // Busca de sabor: mesma facilidade do PDV interno. Com dezenas de sabores,
  // rolar a lista inteira no celular é o que mais trava o pedido.
  const [flavorSearch, setFlavorSearch] = useState("");
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
  const closeDraftRef = useRef<HTMLButtonElement>(null);

  const subtotal = useMemo(() => cart.reduce((sum, item) => sum + lineTotal(item), 0), [cart]);
  const itemCount = useMemo(() => cart.reduce((sum, item) => sum + item.quantity, 0), [cart]);
  const draftProduct = draft ? products.find((product) => product.id === draft.id) : null;
  const categoryById = useMemo(() => new Map(categories.map((category) => [category.id, category])), [categories]);

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
    const isPizza = (product: Product) => Boolean(product.category_id && normalizeLabel(categoryById.get(product.category_id)?.name ?? "").includes("pizza"));
    const info = new Map(products.map((product) => {
      const productVariants = variantsByProduct.get(product.id) ?? [];
      const pizza = isPizza(product);
      const hasOptions = Boolean(
        productVariants.length
        || (pizza && (groupOptions(options, product.id, "Bordas", pizzaOptions).length || groupOptions(options, product.id, "Tipos de Massas", pizzaOptions).length))
        || groupOptions(options, product.id, "Adicionais", pizzaOptions).length,
      );
      const basePrice = productVariants.length ? Math.min(...productVariants.map((variant) => Number(variant.price))) : Number(product.price);
      const priceBySize = new Map(productVariants.map((variant) => [variant.name, Number(variant.price)]));
      return [product.id, { hasVariants: productVariants.length > 0, hasOptions, basePrice, priceBySize, searchText: normalizeLabel(`${product.name} ${product.description ?? ""}`) }];
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
  }, [categories, categoryById, options, pizzaOptions, products, variants]);

  const deferredSearch = useDeferredValue(search);
  const searchTerm = normalizeLabel(deferredSearch.trim());

  // Modal de produto: Esc fecha, a página por trás não rola e o foco vai para o modal.
  useEffect(() => {
    if (!draft) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") setDraft(null); };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeDraftRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [draft?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    try {
      const saved = window.sessionStorage.getItem(sizeKey);
      if (saved && catalog.sizes.includes(saved)) Promise.resolve().then(() => setSizeState(saved));
    } catch {}
  }, [sizeKey, catalog.sizes]);

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

  function isPizzaProduct(product: Product | undefined | null) {
    if (!product?.category_id) return false;
    return normalizeLabel(categoryById.get(product.category_id)?.name ?? "").includes("pizza");
  }

  function openProduct(product: Product) {
    if (!restaurant.is_open) return;
    setFlavorSearch("");
    const isPizza = isPizzaProduct(product);
    const productVariants = variants.filter((item) => item.product_id === product.id && item.active);
    // Já abre no tamanho escolhido no topo. Sem tamanho escolhido, nada vem
    // marcado: o cliente vê os preços de cada tamanho e escolhe no modal.
    // Produto sem tamanhos (bebida, por exemplo) não tem variante.
    const selectedVariant = productVariants.find((variant) => variant.name === size);
    const dough = isPizza ? groupOptions(options, product.id, "Tipos de Massas", pizzaOptions) : [];
    setDraft({
      id: product.id,
      variantId: selectedVariant?.id ?? null,
      variantName: selectedVariant?.name ?? null,
      name: product.name,
      price: isPizza && selectedVariant ? highestFlavorPrice([product.name], selectedVariant.name, products, variants, Number(selectedVariant.price)) : Number(selectedVariant?.price ?? product.price),
      quantity: 1,
      dough: dough.length === 1 ? { name: dough[0].name, price: Number(dough[0].additional_price) } : null,
      crust: null,
      additions: [],
      flavorCount: isPizza ? 1 : 0,
      flavors: isPizza ? [product.name] : [],
      notes: "",
    });
  }

  function confirmDraft() {
    if (!draft) return;
    setCart((current) => [...current, draft]);
    setDraft(null);
    notifyAdded(draft.name);
  }

  // Produto sem nada para escolher (bebida, sobremesa) vai direto para o
  // carrinho: abrir um modal só com "quantidade" é atrito à toa.
  function addSimpleToCart(product: Product) {
    if (!restaurant.is_open) return;
    setCart((current) => [
      ...current,
      {
        id: product.id,
        variantId: null,
        variantName: null,
        name: product.name,
        price: Number(product.price),
        quantity: 1,
        dough: null,
        crust: null,
        additions: [],
        flavorCount: 0,
        flavors: [],
        notes: "",
      },
    ]);
    notifyAdded(product.name);
  }

  // Confirmação discreta ao adicionar (antes o carrinho abria por cima a cada item).
  const [addedName, setAddedName] = useState<string | null>(null);
  const justAdded = Boolean(addedName);
  const addedTimer = useRef<number | null>(null);
  function notifyAdded(name: string) {
    setAddedName(name);
    if (addedTimer.current) window.clearTimeout(addedTimer.current);
    addedTimer.current = window.setTimeout(() => setAddedName(null), 1800);
  }

  function goToCheckout() {
    if (!cart.length || !restaurant.is_open) return;
    window.sessionStorage.setItem(`gastroflow_cart_${restaurant.slug}`, JSON.stringify(cart));
    router.push(`/cardapio/${restaurant.slug}/checkout`);
  }

  function updateCart(index: number, patch: Partial<CartLine>) {
    setCart((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item).filter((item) => item.quantity > 0));
  }

  const cartLines: CartView[] = cart.map((item, index) => ({
    key: `${item.id}-${index}`,
    title: `${item.name}${item.variantName ? ` · ${item.variantName}` : ""}`,
    details: [
      item.flavors && item.flavors.length > 1 ? `Sabores: ${item.flavors.join(" / ")}` : "",
      item.dough?.name ? `Massa: ${item.dough.name}` : "",
      item.crust?.name ? `Borda: ${item.crust.name}` : "",
      item.additions.length ? `Adicionais: ${item.additions.map((a) => a.name).join(", ")}` : "",
      item.notes ? `Obs.: ${item.notes}` : "",
    ].filter(Boolean),
    quantity: item.quantity,
    total: lineTotal(item),
  }));
  const featured = products.filter((product) => product.featured);
  const selectProduct = (product: Product) => (catalog.info.get(product.id)?.hasOptions ? openProduct(product) : addSimpleToCart(product));
  const anyResult = !searchTerm || [...catalog.byCategory.values()].some((list) => list.some((product) => catalog.info.get(product.id)?.searchText.includes(searchTerm)));
  const cartPanel = (onClose?: () => void) => (
    <CartPanel
      lines={cartLines}
      subtotal={subtotal}
      open={restaurant.is_open}
      minimum={Number(restaurant.minimum_order ?? 0)}
      onQuantity={(index, quantity) => updateCart(index, { quantity })}
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
      {itemCount > 0 && !draft && !cartOpen && (
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
        <p role="status" className="fixed bottom-24 left-1/2 z-50 -translate-x-1/2 whitespace-nowrap rounded-full bg-ink lg:bottom-auto lg:top-4 px-4 py-2 text-sm font-semibold text-white shadow-xl">✓ {addedName} adicionado</p>
      )}

      {draft && draftProduct && (
        <div className="fixed inset-0 z-50 flex items-stretch justify-center bg-black/65 md:items-center md:px-4 md:py-8" onClick={(event) => { if (event.target === event.currentTarget) setDraft(null); }}>
          {/* Celular: tela cheia com rodapé fixo (antes o botão "Adicionar" ficava
              cortado abaixo da foto e não dava para pôr o item no carrinho). */}
          <div role="dialog" aria-modal="true" aria-labelledby="produto-titulo" className="relative flex h-[100dvh] w-full max-w-5xl flex-col overflow-hidden bg-white shadow-2xl md:h-auto md:max-h-[88vh] md:rounded-lg">
            <button ref={closeDraftRef} type="button" onClick={() => setDraft(null)} aria-label="Fechar" className="absolute right-3 top-3 z-10 grid h-11 w-11 place-items-center rounded-full bg-white/90 text-slate-700 shadow md:bg-slate-100">
              <X className="h-6 w-6" />
            </button>
            {/* Corpo rola inteiro no celular; no desktop cada coluna rola sozinha. */}
            <div className="min-h-0 flex-1 overflow-y-auto md:flex md:overflow-hidden">
            <div className="space-y-4 p-4 md:w-[310px] md:shrink-0 md:space-y-5 md:overflow-y-auto md:p-5">
              <div className="aspect-video overflow-hidden rounded-lg bg-slate-100 md:aspect-square">
                {draftProduct.image_url ? <img src={draftProduct.image_url} alt="" decoding="async" onError={(event) => { event.currentTarget.style.display = "none"; }} className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center font-bold text-slate-400">Sem foto</div>}
              </div>
              <div>
                <h2 id="produto-titulo" className="pr-12 text-2xl font-black text-brand md:pr-0 md:text-3xl">{draftProduct.name}</h2>
                <p className="mt-3 text-sm leading-5 text-slate-600">{draftProduct.description || "Produto disponível para pedido."}</p>
              </div>
            </div>

              <div className="md:min-h-0 md:flex-1 md:overflow-y-auto md:border-l md:border-slate-100">
                {(() => {
                  const isPizza = isPizzaProduct(draftProduct);
                  const productVariants = variants.filter((variant) => variant.product_id === draft.id && variant.active);
                  const dough = isPizza ? groupOptions(options, draft.id, "Tipos de Massas", pizzaOptions) : [];
                  const crusts = isPizza ? groupOptions(options, draft.id, "Bordas", pizzaOptions) : [];
                  const additions = groupOptions(options, draft.id, "Adicionais", pizzaOptions);
                  const maxFlavors = isPizza ? Math.min(4, Math.max(1, Number(restaurant.max_pizza_flavors ?? 1))) : 1;
                  const flavors = isPizza ? flavorChoices(draftProduct, products) : [];
                  return (
                    <>
                      {!!productVariants.length && (
                        <section className="border-b border-slate-100 p-5">
                          <h3 className="font-black">Tamanho</h3>
                          <p className="text-sm text-slate-500">{draft.variantId ? "Escolha uma opção." : "Obrigatório: escolha o tamanho."}</p>
                          <div className="mt-4 divide-y divide-slate-100">
                            {productVariants.map((variant) => (
                              <label key={variant.id} className="flex cursor-pointer items-center justify-between gap-4 py-4">
                                <span>
                                  <strong>{sizeLabel(variant.name)}</strong>
                                  <span className="block text-sm text-slate-500">{money(variant.price)}</span>
                                </span>
                                <input
                                  type="radio"
                                  checked={draft.variantId === variant.id}
                                  onChange={() => {
                                    setDraft({
                                      ...draft,
                                      variantId: variant.id,
                                      variantName: variant.name,
                                      price: isPizza ? highestFlavorPrice(draft.flavors, variant.name, products, variants, Number(variant.price)) : Number(variant.price),
                                    });
                                    if (!size && catalog.sizes.includes(variant.name)) setSize(variant.name);
                                  }}
                                />
                              </label>
                            ))}
                          </div>
                        </section>
                      )}

                      {isPizza && maxFlavors > 1 && (() => {
                        const limit = Number(draft.flavorCount ?? 1);
                        const term = flavorSearch.trim().toLowerCase();
                        const filteredFlavors = term ? flavors.filter((flavor) => flavor.name.toLowerCase().includes(term)) : flavors;
                        return (
                          <section className="border-b border-slate-100 p-5">
                            <div className="flex items-center justify-between gap-3">
                              <h3 className="font-black">Sabores</h3>
                              <span className="text-sm font-bold text-slate-500">
                                {draft.flavors.length}/{limit} escolhido{limit > 1 ? "s" : ""}
                              </span>
                            </div>
                            <p className="text-sm text-slate-500">Até {maxFlavors} sabores. O valor da pizza é o do sabor mais caro.</p>

                            <div className="mt-4 inline-flex rounded-full border border-slate-200 bg-slate-50 p-1">
                              {Array.from({ length: maxFlavors }, (_, index) => index + 1).map((count) => (
                                <button
                                  key={count}
                                  type="button"
                                  onClick={() => {
                                    const nextFlavors = [draftProduct.name];
                                    setDraft({
                                      ...draft,
                                      flavorCount: count,
                                      flavors: nextFlavors,
                                      price: highestFlavorPrice(nextFlavors, draft.variantName, products, variants, draft.price),
                                    });
                                  }}
                                  className={Number(draft.flavorCount ?? 1) === count ? "rounded-full bg-brand px-4 py-2 text-sm font-black text-white" : "rounded-full px-4 py-2 text-sm font-bold text-slate-500 transition hover:text-slate-800"}
                                >
                                  {count} sabor{count > 1 ? "es" : ""}
                                </button>
                              ))}
                            </div>

                            <div className="relative mt-4">
                              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                              <input
                                type="search"
                                aria-label="Buscar sabor"
                                value={flavorSearch}
                                onChange={(event) => setFlavorSearch(event.target.value)}
                                placeholder="Buscar sabor…"
                                className="h-11 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-3 text-sm outline-none transition focus:border-brand"
                              />
                            </div>

                            <div className="mt-3 max-h-72 overflow-y-auto rounded-lg border border-slate-200">
                              {filteredFlavors.map((flavor) => {
                                const selected = draft.flavors.includes(flavor.name) ?? false;
                                const atLimit = !selected && draft.flavors.length >= limit;
                                return (
                                  <label
                                    key={flavor.id}
                                    className={`flex cursor-pointer items-center gap-3 border-b border-slate-100 px-4 py-3 text-sm transition last:border-0 hover:bg-slate-50 ${atLimit ? "opacity-40" : ""}`}
                                  >
                                    <input
                                      type="checkbox"
                                      className="h-5 w-5 shrink-0 accent-brand"
                                      checked={selected}
                                      onChange={(event) => {
                                        const current = (draft.flavors ?? []).filter((name) => name !== flavor.name);
                                        const next = event.target.checked ? [...current, flavor.name].slice(0, limit) : current;
                                        const pricedFlavors = next.length ? next : [draftProduct.name];
                                        setDraft({
                                          ...draft,
                                          flavors: pricedFlavors,
                                          price: highestFlavorPrice(pricedFlavors, draft.variantName, products, variants, draft.price),
                                        });
                                      }}
                                      disabled={atLimit}
                                    />
                                    <span className="flex-1 font-medium">{flavor.name}</span>
                                    {draft.variantName && <span className="shrink-0 text-xs font-semibold text-slate-500">{money(flavorPrice(flavor.name, draft.variantName, products, variants, draft.price))}</span>}
                                  </label>
                                );
                              })}
                              {!filteredFlavors.length && <p className="px-4 py-6 text-center text-sm text-slate-500">Nenhum sabor encontrado.</p>}
                            </div>

                            {draft.flavors.length > 0 && (
                              <p className="mt-3 text-sm text-slate-500">
                                Selecionados: <span className="font-bold text-slate-700">{draft.flavors.join(" / ")}</span>
                              </p>
                            )}
                          </section>
                        );
                      })()}

                      {!!dough.length && (
                        <section className="border-b border-slate-100 p-5">
                          <h3 className="font-black">Massas</h3>
                          <p className="text-sm text-slate-500">Escolha uma opção.</p>
                          <div className="mt-4 divide-y divide-slate-100">
                            {dough.map((option) => (
                              <label key={option.id} className="flex cursor-pointer items-center justify-between gap-4 py-4">
                                <span>
                                  {option.name}
                                  {Number(option.additional_price) ? <strong className="block">+ {money(option.additional_price)}</strong> : null}
                                </span>
                                <input type="radio" checked={draft.dough?.name === option.name} onChange={() => setDraft({ ...draft, dough: { name: option.name, price: Number(option.additional_price) } })} />
                              </label>
                            ))}
                          </div>
                        </section>
                      )}

                      {!!crusts.length && (
                        <section className="border-b border-slate-100 p-5">
                          <h3 className="font-black">Bordas</h3>
                          <p className="text-sm text-slate-500">Escolha uma opção, se desejar.</p>
                          <div className="mt-4 divide-y divide-slate-100">
                            <label className="flex cursor-pointer items-center justify-between gap-4 py-4">
                              <span>Sem borda</span>
                              <input type="radio" checked={!draft.crust?.name} onChange={() => setDraft({ ...draft, crust: null })} />
                            </label>
                            {crusts.map((option) => (
                              <label key={option.id} className="flex cursor-pointer items-center justify-between gap-4 py-4">
                                <span>
                                  {option.name}
                                  {Number(option.additional_price) ? <strong className="block">+ {money(option.additional_price)}</strong> : null}
                                </span>
                                <input type="radio" checked={draft.crust?.name === option.name} onChange={() => setDraft({ ...draft, crust: { name: option.name, price: Number(option.additional_price) } })} />
                              </label>
                            ))}
                          </div>
                        </section>
                      )}

                      {!!additions.length && (
                        <section className="border-b border-slate-100 p-5">
                          <h3 className="font-black">Adicionais</h3>
                          <p className="text-sm text-slate-500">Selecione quantos quiser.</p>
                          <div className="mt-4 divide-y divide-slate-100">
                            {additions.map((addition) => (
                              <label key={addition.id} className="flex cursor-pointer items-center justify-between gap-4 py-4">
                                <span>
                                  {addition.name}
                                  {Number(addition.additional_price) ? <strong className="block">+ {money(addition.additional_price)}</strong> : null}
                                </span>
                                <input type="checkbox" checked={draft.additions.some((selected) => selected.name === addition.name)} onChange={(event) => {
                                  const current = draft.additions.filter((selected) => selected.name !== addition.name);
                                  setDraft({ ...draft, additions: event.target.checked ? [...current, { name: addition.name, price: Number(addition.additional_price) }] : current });
                                }} />
                              </label>
                            ))}
                          </div>
                        </section>
                      )}
                    </>
                  );
                })()}

                <section className="p-5">
                  <label htmlFor="observacoes-item" className="block text-sm font-black uppercase tracking-wide text-slate-500">Observações do item</label>
                  <textarea
                    id="observacoes-item"
                    className="mt-2 min-h-20 w-full resize-none border-b border-slate-200 bg-white py-2 outline-none focus:border-brand"
                    maxLength={250}
                    value={draft.notes ?? ""}
                    onChange={(event) => setDraft({ ...draft, notes: event.target.value })}
                    placeholder="Ex.: sem cebola, caprichar no molho..."
                  />
                  <p className="text-right text-xs text-slate-400">{draft.notes.length ?? 0}/250</p>
                </section>
              </div>
            </div>

              <div className="flex shrink-0 items-center gap-3 border-t border-slate-100 bg-white p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:gap-4 sm:p-4">
                <button type="button" onClick={() => setDraft({ ...draft, quantity: Math.max(1, draft.quantity - 1) })} aria-label="Diminuir quantidade" className="grid h-11 w-11 place-items-center rounded-full bg-slate-100 text-slate-600">
                  <Minus className="h-4 w-4" />
                </button>
                <strong className="min-w-6 text-center text-lg" aria-live="polite">{draft.quantity}</strong>
                <button type="button" onClick={() => setDraft({ ...draft, quantity: draft.quantity + 1 })} aria-label="Aumentar quantidade" className="grid h-11 w-11 place-items-center rounded-full bg-brand text-white">
                  <Plus className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={confirmDraft}
                  disabled={(catalog.info.get(draft.id)?.hasVariants && !draft.variantId) || (isPizzaProduct(draftProduct) && Number(draft.flavorCount ?? 1) > 1 && (draft.flavors.length ?? 0) !== Number(draft.flavorCount ?? 1))}
                  className="ml-auto h-12 flex-1 rounded-lg bg-brand px-5 text-sm font-black uppercase text-white hover:bg-brand-strong disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  {catalog.info.get(draft.id)?.hasVariants && !draft.variantId ? "Escolha o tamanho" : `Adicionar - ${money(lineTotal(draft))}`}
                </button>
              </div>
          </div>
        </div>
      )}
    </>
  );
}
