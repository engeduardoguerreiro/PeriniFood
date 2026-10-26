"use client";

/* eslint-disable @next/next/no-img-element */
import { ChevronRight, ImageOff, Minus, Pencil, Pizza, Plus, ShoppingCart, Trash2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { money } from "@/lib/utils";
import type { Category, Product } from "@/lib/types";

// Peças do cardápio público, pensadas primeiro para o celular.

// Abas de categoria fixas no topo: acompanham a rolagem (marcam a categoria
// visível) e rolam sozinhas para a aba ativa ficar à vista.
export function CategoryTabs({ categories }: { categories: Category[] }) {
  const [active, setActive] = useState(categories[0]?.id ?? "");
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sections = categories.map((c) => document.getElementById(`cat-${c.id}`)).filter((el): el is HTMLElement => Boolean(el));
    if (!sections.length) return;
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
      if (visible) setActive(visible.target.id.replace("cat-", ""));
    }, { rootMargin: "-120px 0px -65% 0px" });
    sections.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, [categories]);

  useEffect(() => {
    const tab = barRef.current?.querySelector<HTMLElement>(`[data-cat="${active}"]`);
    tab?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [active]);

  if (!categories.length) return null;
  return (
    <nav ref={barRef} aria-label="Categorias" className="no-scrollbar flex gap-1 overflow-x-auto px-4 pb-2 pt-1">
      {categories.map((category) => (
        <a
          key={category.id}
          data-cat={category.id}
          href={`#cat-${category.id}`}
          aria-current={active === category.id ? "true" : undefined}
          className={`shrink-0 rounded-full px-3.5 py-2 text-sm font-semibold transition ${active === category.id ? "bg-ink text-white shadow-[0_6px_14px_-6px_rgba(0,0,0,0.5)]" : "text-slate-600 hover:bg-slate-100"}`}
        >
          {category.name}
        </a>
      ))}
    </nav>
  );
}

function ProductImage({ src, className }: { src: string | null; className: string }) {
  const [broken, setBroken] = useState(false);
  if (!src || broken) return <span className={`grid place-items-center bg-slate-100 text-slate-300 ${className}`}><ImageOff className="h-6 w-6" /></span>;
  return <img src={src} alt="" loading="lazy" decoding="async" onError={() => setBroken(true)} className={`bg-white object-contain ${className}`} />;
}

// price null = produto com tamanhos e nenhum tamanho escolhido (ou indisponível nele):
// mostramos o motivo em vez de um "a partir de" que o cliente lia como preço final.
type PriceProps = { price: number | null; priceNote?: string };

export function ProductRow({ product, price, priceNote, open, onSelect }: { product: Product; open: boolean; onSelect: () => void } & PriceProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={!open}
      aria-label={`${product.name}, ${price != null ? money(price) : priceNote ?? ""}`}
      className="group flex w-full gap-3 rounded-2xl bg-white p-3 text-left shadow-[0_1px_2px_rgba(0,0,0,0.04),0_6px_18px_-12px_rgba(0,0,0,0.25)] ring-1 ring-black/[0.04] transition hover:-translate-y-0.5 hover:shadow-[0_12px_28px_-14px_rgba(0,0,0,0.35)] disabled:cursor-default disabled:hover:translate-y-0"
    >
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="line-clamp-2 text-[0.95rem] font-semibold leading-snug text-ink">{product.name}</span>
        <span className="mt-1 line-clamp-2 text-[0.82rem] leading-snug text-slate-500">{product.description || " "}</span>
        {price != null
          ? <span className="mt-auto pt-2 text-[0.95rem] font-semibold text-ink">{money(price)}</span>
          : <span className="mt-auto pt-2 text-xs font-semibold text-slate-500">{priceNote}</span>}
      </span>
      <span className="relative shrink-0">
        <ProductImage src={product.image_url} className="h-24 w-24 rounded-xl" />
        {open && (
          <span className="absolute -bottom-1.5 -right-1.5 grid h-9 w-9 place-items-center rounded-full bg-gradient-to-b from-brand-bright to-brand text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_6px_14px_-4px_rgba(207,74,10,0.7)] transition group-hover:scale-105">
            <Plus className="h-5 w-5" />
          </span>
        )}
      </span>
    </button>
  );
}

export function FeaturedCard({ product, price, priceNote, open, onSelect }: { product: Product; open: boolean; onSelect: () => void } & PriceProps) {
  return (
    <button type="button" onClick={onSelect} disabled={!open} className="group w-40 shrink-0 snap-start overflow-hidden rounded-2xl bg-white text-left shadow-[0_8px_24px_-14px_rgba(0,0,0,0.35)] ring-1 ring-black/[0.04] transition hover:-translate-y-0.5 disabled:cursor-default sm:w-48">
      <ProductImage src={product.image_url} className="aspect-square w-full" />
      <span className="block p-2.5">
        <span className="line-clamp-1 text-sm font-semibold text-ink">{product.name}</span>
        {price != null
          ? <span className="mt-0.5 block text-sm font-semibold text-brand">{money(price)}</span>
          : <span className="mt-0.5 block text-xs font-semibold text-slate-500">{priceNote}</span>}
      </span>
    </button>
  );
}

// Atalho para quem quer montar do zero (meia a meia) sem procurar a pizza certa primeiro.
export function BuildPizzaBanner({ maxFlavors, onStart }: { maxFlavors: number; onStart: () => void }) {
  return (
    <button
      type="button"
      onClick={onStart}
      className="group mb-3 flex w-full items-center gap-3 rounded-2xl bg-gradient-to-r from-brand-soft to-white p-3.5 text-left ring-1 ring-brand-line transition hover:ring-brand focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/30"
    >
      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-brand text-white shadow-[0_8px_18px_-8px_rgba(207,74,10,0.9)]"><Pizza className="h-6 w-6" /></span>
      <span className="min-w-0 flex-1">
        <span className="block font-black text-ink">Monte sua pizza</span>
        <span className="block text-sm text-slate-600">Escolha tamanho, até {maxFlavors} sabores e borda, passo a passo.</span>
      </span>
      <ChevronRight className="h-5 w-5 shrink-0 text-brand transition group-hover:translate-x-0.5" />
    </button>
  );
}

export type CartView = { key: string; title: string; details: string[]; quantity: number; total: number; image: string | null; editable: boolean };
export type CartSuggestion = { id: string; name: string; price: number; image: string | null };

export function CartPanel({ lines, subtotal, open, minimum, notice, suggestions, onAddSuggestion, onQuantity, onEdit, onCheckout, onClose }: {
  lines: CartView[]; subtotal: number; open: boolean; minimum: number; notice?: string | null;
  suggestions: CartSuggestion[]; onAddSuggestion: (id: string) => void;
  onQuantity: (index: number, quantity: number) => void; onEdit?: (index: number) => void; onCheckout: () => void; onClose?: () => void;
}) {
  const missing = Math.max(0, minimum - subtotal);
  // Remover pede confirmação na própria linha (sem janela por cima).
  const [confirming, setConfirming] = useState<string | null>(null);
  return (
    <div className="flex max-h-full flex-col">
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <h2 className="flex items-center gap-2 text-base font-semibold text-ink"><ShoppingCart className="h-5 w-5 text-brand" /> Seu pedido</h2>
        {onClose && <button type="button" onClick={onClose} aria-label="Fechar carrinho" className="grid h-10 w-10 place-items-center rounded-full text-slate-500 hover:bg-slate-100"><X className="h-5 w-5" /></button>}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-4">
        {notice && <p role="status" className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900">{notice}</p>}
        {lines.length ? (
          <ul className="divide-y divide-slate-100">
            {lines.map((line, index) => (
              <li key={line.key} className="py-3 text-sm">
                <div className="flex gap-3">
                  <ProductImage src={line.image} className="h-14 w-14 shrink-0 rounded-xl" />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-ink">{line.title}</p>
                    {line.details.map((detail) => <p key={detail} className="text-xs text-slate-500">{detail}</p>)}
                    <div className="mt-1 flex items-center gap-3">
                      <p className="font-semibold text-ink [font-variant-numeric:tabular-nums]">{money(line.total)}</p>
                      {line.editable && onEdit && (
                        <button type="button" onClick={() => onEdit(index)} aria-label={`Editar ${line.title}`} className="flex h-8 items-center gap-1 rounded-lg px-1.5 text-xs font-bold text-brand hover:bg-brand-soft"><Pencil className="h-3.5 w-3.5" /> Editar</button>
                      )}
                    </div>
                  </div>
                  <div className="flex h-9 shrink-0 items-center gap-1 self-center rounded-full border border-slate-200 px-1">
                    <button type="button" onClick={() => (line.quantity === 1 ? setConfirming(line.key) : onQuantity(index, line.quantity - 1))} aria-label={line.quantity === 1 ? `Remover ${line.title}` : `Diminuir ${line.title}`} className="grid h-7 w-7 place-items-center rounded-full text-brand hover:bg-brand-soft">
                      {line.quantity === 1 ? <Trash2 className="h-4 w-4" /> : <Minus className="h-4 w-4" />}
                    </button>
                    <span className="min-w-5 text-center font-semibold [font-variant-numeric:tabular-nums]" aria-live="polite">{line.quantity}</span>
                    <button type="button" onClick={() => onQuantity(index, line.quantity + 1)} aria-label={`Aumentar ${line.title}`} className="grid h-7 w-7 place-items-center rounded-full text-brand hover:bg-brand-soft"><Plus className="h-4 w-4" /></button>
                  </div>
                </div>
                {confirming === line.key && (
                  <div role="alert" className="mt-2 flex items-center justify-between gap-2 rounded-xl bg-red-50 px-3 py-2">
                    <span className="text-xs font-semibold text-red-800">Remover este item do pedido?</span>
                    <span className="flex gap-1.5">
                      <button type="button" onClick={() => setConfirming(null)} className="h-8 rounded-lg px-2.5 text-xs font-bold text-slate-700 hover:bg-white">Manter</button>
                      <button type="button" onClick={() => { setConfirming(null); onQuantity(index, 0); }} className="h-8 rounded-lg bg-red-600 px-2.5 text-xs font-bold text-white hover:bg-red-700">Remover</button>
                    </span>
                  </div>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <div className="py-10 text-center text-sm text-slate-500">
            <ShoppingCart className="mx-auto mb-2 h-8 w-8 text-slate-300" />
            Seu carrinho está vazio.<br />Escolha um item do cardápio.
          </div>
        )}
        {lines.length > 0 && suggestions.length > 0 && (
          <section aria-label="Bebidas para acompanhar" className="border-t border-slate-100 py-3">
            <p className="text-xs font-semibold text-slate-500">Para acompanhar</p>
            <ul className="no-scrollbar -mx-4 mt-2 flex gap-2 overflow-x-auto px-4">
              {suggestions.map((item) => (
                <li key={item.id} className="shrink-0">
                  <button type="button" onClick={() => onAddSuggestion(item.id)} aria-label={`Adicionar ${item.name}, ${money(item.price)}`} className="flex w-44 items-center gap-2 rounded-xl p-1.5 pr-2 text-left ring-1 ring-slate-200 transition hover:ring-brand">
                    <ProductImage src={item.image} className="h-10 w-10 shrink-0 rounded-lg" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-semibold text-ink">{item.name}</span>
                      <span className="block text-xs text-slate-500">{money(item.price)}</span>
                    </span>
                    <Plus className="h-4 w-4 shrink-0 text-brand" />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
      <div className="space-y-2 border-t border-slate-100 px-4 py-3 text-sm">
        <div className="flex justify-between"><span className="text-slate-600">Subtotal</span><strong className="text-ink">{money(subtotal)}</strong></div>
        <p className="text-xs text-slate-500">Taxa de entrega calculada pelo seu endereço no próximo passo.</p>
        {lines.length > 0 && missing > 0 && <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">Faltam {money(missing)} para o pedido mínimo de {money(minimum)}.</p>}
        <button
          type="button"
          onClick={onCheckout}
          disabled={!lines.length || !open || missing > 0}
          className="h-12 w-full rounded-xl bg-gradient-to-b from-brand-bright to-brand font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.3),0_10px_22px_-10px_rgba(207,74,10,0.8)] transition hover:to-brand-strong disabled:from-slate-300 disabled:to-slate-300 disabled:shadow-none"
        >
          {open ? "Continuar para o pagamento" : "Loja fechada no momento"}
        </button>
      </div>
    </div>
  );
}
