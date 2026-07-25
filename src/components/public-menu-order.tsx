"use client";

/* eslint-disable @next/next/no-img-element */
import { ChevronDown, Minus, Plus, Search, ShoppingCart, TicketPercent, Trash2, UserCircle2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
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

function productBasePrice(product: Product, variants: ProductVariant[]) {
  const productVariants = variants.filter((variant) => variant.product_id === product.id && variant.active);
  if (productVariants.length) return Math.min(...productVariants.map((variant) => Number(variant.price)));
  return Number(product.price);
}

function sortProductsByPrice(products: Product[], variants: ProductVariant[]) {
  return [...products].sort((a, b) => {
    const priceDiff = productBasePrice(a, variants) - productBasePrice(b, variants);
    if (priceDiff !== 0) return priceDiff;
    return a.name.localeCompare(b.name, "pt-BR");
  });
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

export function PublicMenuOrder({
  restaurant,
  categories,
  products,
  variants,
  options,
  deliveryRules,
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
  const [customerName, setCustomerName] = useState("");

  const subtotal = useMemo(() => cart.reduce((sum, item) => sum + lineTotal(item), 0), [cart]);
  const finalTotal = subtotal;
  const visibleProducts = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return products;
    return products.filter((product) => `${product.name} ${product.description ?? ""}`.toLowerCase().includes(term));
  }, [products, search]);
  const draftProduct = draft ? products.find((product) => product.id === draft.id) : null;
  const categoryById = useMemo(() => new Map(categories.map((category) => [category.id, category])), [categories]);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(`gastroflow_customer_${restaurant.slug}`);
      if (saved) setCustomerName(JSON.parse(saved).name ?? "");
    } catch {
      setCustomerName("");
    }
  }, [restaurant.slug]);

  function isPizzaProduct(product: Product | undefined | null) {
    if (!product?.category_id) return false;
    return normalizeLabel(categoryById.get(product.category_id)?.name ?? "").includes("pizza");
  }

  function openProduct(product: Product) {
    if (!restaurant.is_open) return;
    const isPizza = isPizzaProduct(product);
    const productVariants = variants.filter((item) => item.product_id === product.id && item.active);
    const selectedVariant = productVariants[0];
    const dough = isPizza ? groupOptions(options, product.id, "Tipos de Massas", pizzaOptions) : [];
    setDraft({
      id: product.id,
      variantId: selectedVariant.id ?? null,
      variantName: selectedVariant.name ?? null,
      name: product.name,
      price: Number(selectedVariant.price ?? product.price),
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
    setCartOpen(true);
  }

  function goToCheckout() {
    if (!cart.length || !restaurant.is_open) return;
    window.sessionStorage.setItem(`gastroflow_cart_${restaurant.slug}`, JSON.stringify(cart));
    window.location.href = `/cardapio/${restaurant.slug}/checkout`;
  }

  function updateCart(index: number, patch: Partial<CartLine>) {
    setCart((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item).filter((item) => item.quantity > 0));
  }

  return (
    <>
      <nav className="sticky top-0 z-20 border-b border-slate-200 bg-white shadow-sm">
        <div className="mx-auto grid max-w-[1320px] items-center gap-4 px-4 py-3 md:grid-cols-[150px_1fr_auto]">
          <a href="#categorias" className="flex items-center gap-3 font-black uppercase">
            Categorias <ChevronDown className="h-4 w-4 text-red-600" />
          </a>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              className="h-12 w-full rounded-lg border border-slate-200 bg-white pl-12 pr-4 text-sm outline-none focus:border-red-500"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Busque por um item na loja"
            />
          </div>
          <div className="relative flex justify-end gap-2">
            <a
              href={`/cardapio/${restaurant.slug}/conta`}
              className="hidden h-12 items-center gap-2 rounded-lg bg-slate-50 px-3 text-sm font-bold text-slate-700 transition hover:bg-red-50 hover:text-red-600 sm:flex"
              title={customerName ? `Conta de ${customerName}` : "Entrar ou cadastrar-se"}
            >
              <UserCircle2 className="h-5 w-5" />
              <span className="max-w-28 truncate">{customerName ? `Olá, ${customerName}` : "Conta"}</span>
            </a>
            <button
              type="button"
              onClick={() => setCouponsOpen((current) => !current)}
              className="relative grid h-12 w-12 place-items-center rounded-lg bg-slate-50 text-red-600 transition hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500"
              aria-label="Ver cupons"
              title="Cupons de desconto"
            >
              <TicketPercent className="h-5 w-5" />
              {coupons.length > 0 && <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-red-600 px-1 text-[10px] font-black text-white">{coupons.length}</span>}
            </button>
            <button
              type="button"
              onClick={() => setCartOpen((current) => !current)}
              className="relative grid h-12 w-12 place-items-center rounded-lg bg-slate-50 text-red-600 transition hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500"
              aria-label="Abrir carrinho"
            >
              <ShoppingCart className="h-5 w-5 text-red-600" />
              {cart.length > 0 && (
                <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-red-600 px-1 text-[10px] font-black text-white">
                  {cart.length}
                </span>
              )}
            </button>
          </div>
          {couponsOpen && (
            <div className="absolute right-20 top-[68px] z-30 w-[min(360px,calc(100vw-32px))] rounded-lg bg-white text-[#243640] shadow-2xl ring-1 ring-black/5">
              <span className="absolute -top-3 right-5 h-6 w-6 rotate-45 bg-white" />
              <div className="relative p-5">
                <div className="flex items-center gap-2 text-lg font-black">
                  <TicketPercent className="h-5 w-5 text-red-600" />
                  Cupons e vantagens
                </div>
                <div className="mt-4 space-y-3">
                  {coupons.map((coupon) => (
                    <div key={coupon.id} className="rounded-lg border border-red-100 bg-red-50 p-3">
                      <p className="font-black text-red-700">{coupon.code}</p>
                      <p className="text-sm text-slate-600">{coupon.description || "Cupom disponível para esta loja."}</p>
                      <p className="mt-1 text-xs font-bold text-slate-500">Pedido mínimo: {money(coupon.minimum_order ?? 0)}</p>
                    </div>
                  ))}
                  {loyalty && (
                    <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-3">
                      <p className="font-black text-emerald-700">Programa de fidelidade</p>
                      <p className="text-sm text-slate-600">{loyalty.description || "Compre e acumule benefícios."}</p>
                    </div>
                  )}
                  {!coupons.length && !loyalty && <p className="rounded bg-slate-50 p-3 text-sm text-slate-500">Nenhum cupom ativo no momento.</p>}
                </div>
              </div>
            </div>
          )}
          {cartOpen && (
            <div className="absolute right-4 top-[68px] z-30 w-[min(360px,calc(100vw-32px))] rounded-lg bg-white text-[#243640] shadow-2xl ring-1 ring-black/5">
              <span className="absolute -top-3 right-5 h-6 w-6 rotate-45 bg-white" />
              <div className="relative p-5">
                <div className="flex items-center gap-2 text-lg">
                  <ShoppingCart className="h-5 w-5 text-red-600" />
                  <span>Meu carrinho</span>
                </div>
                <div className="mt-4 max-h-[220px] space-y-3 overflow-y-auto border-y border-slate-200 py-3 pr-2">
                  {cart.map((item, index) => (
                    <div key={`${item.id}-${index}`} className="grid grid-cols-[1fr_auto] gap-3 text-sm">
                      <div className="min-w-0">
                        <div className="flex items-start gap-2">
                          <button type="button" onClick={() => updateCart(index, { quantity: 0 })} className="mt-0.5 text-red-600 hover:text-red-700" aria-label="Remover item">
                            <Trash2 className="h-4 w-4" />
                          </button>
                          <div>
                            <p className="font-semibold">{item.quantity}x - {item.name}{item.variantName ? ` - ${item.variantName}` : ""}</p>
                            {item.dough?.name && <p className="text-slate-500">Massa: {item.dough.name}</p>}
                            {item.crust?.name && <p className="text-slate-500">Borda: {item.crust.name}</p>}
                            {item.additions.map((addition) => <p key={addition.name} className="text-slate-500">{addition.name}</p>)}
                            {item.flavors && item.flavors.length > 1 && <p className="text-slate-500">Sabores: {item.flavors.join(" / ")}</p>}
                          </div>
                        </div>
                      </div>
                      <strong className="whitespace-nowrap text-right">{money(lineTotal(item))}</strong>
                    </div>
                  ))}
                  {!cart.length && <p className="rounded bg-slate-50 p-3 text-sm text-slate-500">Seu carrinho está vazio.</p>}
                </div>
                <div className="space-y-2 border-b border-slate-200 py-4 text-sm">
                  <div className="flex justify-between"><span>Subtotal</span><strong>{money(subtotal)}</strong></div>
                  <div className="flex justify-between"><span>Taxa de entrega</span><strong>Calculada no checkout</strong></div>
                  <div className="flex justify-between text-xl font-black"><span>Total</span><strong>{money(finalTotal)}</strong></div>
                </div>
                <button
                  type="button"
                  onClick={goToCheckout}
                  disabled={!cart.length || !restaurant.is_open}
                  className="mt-4 w-full rounded-lg bg-red-600 px-4 py-4 font-black uppercase text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  {restaurant.is_open ? "Fechar pedido" : "Loja fechada"}
                </button>
              </div>
            </div>
          )}
        </div>
      </nav>

      <div className="mx-auto max-w-[1320px] px-4 py-8">
        <div className="min-w-0">
          <section id="categorias" className="mb-8">
            <div className="mb-5 flex items-center justify-between border-b border-slate-200 pb-4">
              <h2 className="text-lg font-black uppercase">Categorias <ChevronDown className="inline h-4 w-4 text-red-600" /></h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <a key={category.id} href={`#${category.id}`} className="rounded-full bg-white px-4 py-2 text-sm font-bold shadow-sm hover:text-red-600">
                  {category.name}
                </a>
              ))}
            </div>
          </section>

          <div className="space-y-14">
            {categories.map((category) => {
              const categoryProducts = sortProductsByPrice(visibleProducts.filter((product) => product.category_id === category.id), variants);
              if (!categoryProducts.length) return null;
              return (
                <section key={category.id} id={category.id} className="scroll-mt-24">
                  <h2 className="mb-6 text-xl font-black uppercase text-[#243640]">{category.name}</h2>
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {categoryProducts.map((product) => {
                      const productVariants = variants.filter((variant) => variant.product_id === product.id && variant.active);
                      const isPizza = isPizzaProduct(product);
                      const hasOptions = Boolean((isPizza && groupOptions(options, product.id, "Bordas", pizzaOptions).length) || (isPizza && groupOptions(options, product.id, "Tipos de Massas", pizzaOptions).length) || groupOptions(options, product.id, "Adicionais", pizzaOptions).length || productVariants.length);
                      return (
                        <button
                          key={product.id}
                          type="button"
                          onClick={() => openProduct(product)}
                          disabled={!restaurant.is_open}
                          className="group relative grid min-h-[142px] grid-cols-[1fr_116px] gap-4 overflow-hidden rounded-lg bg-white p-4 text-left shadow-sm ring-1 ring-transparent transition duration-200 hover:-translate-y-1 hover:shadow-xl hover:ring-red-200 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:cursor-not-allowed disabled:opacity-75 disabled:hover:translate-y-0 disabled:hover:shadow-sm"
                          aria-label={`Adicionar ${product.name}`}
                        >
                          <span className="pointer-events-none absolute inset-0 bg-gradient-to-r from-red-50/0 via-red-50/0 to-red-50/70 opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
                          <div className="relative min-w-0">
                            <h3 className="line-clamp-2 text-base font-black text-red-600">{product.name}</h3>
                            <p className="mt-2 line-clamp-3 text-sm leading-5 text-slate-600">{product.description || "Produto disponível para pedido."}</p>
                            <p className="mt-6 text-sm text-slate-700">{productVariants.length ? "A partir de " : ""}<strong>{money(productBasePrice(product, variants))}</strong></p>
                          </div>
                          <div className="relative">
                            <div className="h-28 w-28 overflow-hidden rounded-lg bg-slate-100">
                              {product.image_url ? <img src={product.image_url} alt="" className="h-full w-full object-cover transition duration-300 group-hover:scale-110" /> : <div className="grid h-full place-items-center text-xs font-bold text-slate-400 transition group-hover:text-red-500">Sem foto</div>}
                            </div>
                            {!restaurant.is_open && <span className="absolute bottom-1 right-1 rounded-full bg-slate-500 px-3 py-1 text-[10px] font-black uppercase text-white">Indisponível</span>}
                          </div>
                          {hasOptions && <span className="absolute bottom-2 right-3 rounded-full bg-red-50 px-2 py-1 text-[10px] font-bold text-red-600 transition group-hover:bg-red-600 group-hover:text-white">Personalizar</span>}
                        </button>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
        </div>
      </div>


      {draft && draftProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 px-4 py-8">
          <button type="button" onClick={() => setDraft(null)} className="absolute right-6 top-4 text-white">
            <X className="h-10 w-10" />
          </button>
          <div className="grid max-h-[88vh] w-full max-w-5xl overflow-hidden rounded-lg bg-white shadow-2xl md:grid-cols-[310px_1fr]">
            <div className="space-y-5 p-5">
              <div className="aspect-square overflow-hidden rounded-lg bg-slate-100">
                {draftProduct.image_url ? <img src={draftProduct.image_url} alt="" className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center font-bold text-slate-400">Sem foto</div>}
              </div>
              <div>
                <h2 className="text-3xl font-black text-red-600">{draftProduct.name}</h2>
                <p className="mt-3 text-sm leading-5 text-slate-600">{draftProduct.description || "Produto disponível para pedido."}</p>
              </div>
            </div>

            <div className="flex max-h-[88vh] flex-col border-l border-slate-100">
              <div className="flex-1 overflow-y-auto">
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
                      {isPizza && maxFlavors > 1 && (
                        <section className="border-b border-slate-100 p-5">
                          <h3 className="font-black">Sabores</h3>
                          <p className="text-sm text-slate-500">Escolha se esta pizza terá 1, 2, 3 ou {maxFlavors} sabores.</p>
                          <div className="mt-4 flex flex-wrap gap-2">
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
                                className={Number(draft.flavorCount ?? 1) === count ? "rounded-full bg-red-600 px-4 py-2 text-sm font-black text-white" : "rounded-full border border-slate-200 px-4 py-2 text-sm font-bold"}
                              >
                                {count} sabor{count > 1 ? "es" : ""}
                              </button>
                            ))}
                          </div>
                          <div className="mt-4 divide-y divide-slate-100">
                            {flavors.map((flavor) => {
                              const selected = draft.flavors.includes(flavor.name) ?? false;
                              const limit = Number(draft.flavorCount ?? 1);
                              return (
                                <label key={flavor.id} className="flex cursor-pointer items-center justify-between gap-4 py-3">
                                  <span>{flavor.name}</span>
                                  <input
                                    type="checkbox"
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
                                    disabled={!selected && (draft.flavors.length ?? 0) >= limit}
                                  />
                                </label>
                              );
                            })}
                          </div>
                          <p className="mt-3 rounded bg-slate-50 p-3 text-xs font-semibold text-slate-500">
                            Selecionados: {(draft.flavors ?? []).join(" / ")}
                          </p>
                        </section>
                      )}

                      {!!productVariants.length && (
                        <section className="border-b border-slate-100 p-5">
                          <h3 className="font-black">Tamanho</h3>
                          <p className="text-sm text-slate-500">Escolha uma opção.</p>
                          <div className="mt-4 divide-y divide-slate-100">
                            {productVariants.map((variant) => (
                              <label key={variant.id} className="flex cursor-pointer items-center justify-between gap-4 py-4">
                                <span>
                                  <strong>{variant.name}</strong>
                                  <span className="block text-sm text-slate-500">{money(variant.price)}</span>
                                </span>
                                <input
                                  type="radio"
                                  checked={draft.variantId === variant.id}
                                  onChange={() => setDraft({
                                    ...draft,
                                    variantId: variant.id,
                                    variantName: variant.name,
                                    price: isPizza ? highestFlavorPrice(draft.flavors, variant.name, products, variants, Number(variant.price)) : Number(variant.price),
                                  })}
                                />
                              </label>
                            ))}
                          </div>
                        </section>
                      )}

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
                  <label className="block text-sm font-black uppercase tracking-wide text-slate-500">Observações do item</label>
                  <textarea
                    className="mt-2 min-h-20 w-full resize-none border-b border-slate-200 bg-white py-2 outline-none focus:border-red-500"
                    maxLength={250}
                    value={draft.notes ?? ""}
                    onChange={(event) => setDraft({ ...draft, notes: event.target.value })}
                    placeholder="Ex.: sem cebola, caprichar no molho..."
                  />
                  <p className="text-right text-xs text-slate-400">{draft.notes.length ?? 0}/250</p>
                </section>
              </div>

              <div className="flex items-center gap-4 border-t border-slate-100 bg-white p-4">
                <button type="button" onClick={() => setDraft({ ...draft, quantity: Math.max(1, draft.quantity - 1) })} className="grid h-10 w-10 place-items-center rounded-full bg-slate-100 text-slate-500">
                  <Minus className="h-4 w-4" />
                </button>
                <strong className="text-lg">{draft.quantity}</strong>
                <button type="button" onClick={() => setDraft({ ...draft, quantity: draft.quantity + 1 })} className="grid h-10 w-10 place-items-center rounded-full bg-red-600 text-white">
                  <Plus className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={confirmDraft}
                  disabled={isPizzaProduct(draftProduct) && Number(draft.flavorCount ?? 1) > 1 && (draft.flavors.length ?? 0) !== Number(draft.flavorCount ?? 1)}
                  className="ml-auto h-12 flex-1 rounded-lg bg-red-600 px-5 text-sm font-black uppercase text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  Adicionar - {money(lineTotal(draft))}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
