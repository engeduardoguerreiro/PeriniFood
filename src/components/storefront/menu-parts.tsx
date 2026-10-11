"use client";

/* eslint-disable @next/next/no-img-element */
import { ImageOff, Minus, Plus, ShoppingCart, Trash2, X } from "lucide-react";
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

export type CartView = { key: string; title: string; details: string[]; quantity: number; total: number };

export function CartPanel({ lines, subtotal, open, minimum, onQuantity, onCheckout, onClose }: {
  lines: CartView[]; subtotal: number; open: boolean; minimum: number;
  onQuantity: (index: number, quantity: number) => void; onCheckout: () => void; onClose?: () => void;
}) {
  const missing = Math.max(0, minimum - subtotal);
  return (
    <div className="flex max-h-full flex-col">
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <h2 className="flex items-center gap-2 text-base font-semibold text-ink"><ShoppingCart className="h-5 w-5 text-brand" /> Seu pedido</h2>
        {onClose && <button type="button" onClick={onClose} aria-label="Fechar carrinho" className="grid h-10 w-10 place-items-center rounded-full text-slate-500 hover:bg-slate-100"><X className="h-5 w-5" /></button>}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-4">
        {lines.length ? (
          <ul className="divide-y divide-slate-100">
            {lines.map((line, index) => (
              <li key={line.key} className="flex gap-3 py-3 text-sm">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-ink">{line.title}</p>
                  {line.details.map((detail) => <p key={detail} className="text-xs text-slate-500">{detail}</p>)}
                  <p className="mt-1 font-semibold text-ink">{money(line.total)}</p>
                </div>
                <div className="flex h-9 shrink-0 items-center gap-1 self-center rounded-full border border-slate-200 px-1">
                  <button type="button" onClick={() => onQuantity(index, line.quantity - 1)} aria-label={line.quantity === 1 ? `Remover ${line.title}` : `Diminuir ${line.title}`} className="grid h-7 w-7 place-items-center rounded-full text-brand hover:bg-brand-soft">
                    {line.quantity === 1 ? <Trash2 className="h-4 w-4" /> : <Minus className="h-4 w-4" />}
                  </button>
                  <span className="min-w-5 text-center font-semibold [font-variant-numeric:tabular-nums]" aria-live="polite">{line.quantity}</span>
                  <button type="button" onClick={() => onQuantity(index, line.quantity + 1)} aria-label={`Aumentar ${line.title}`} className="grid h-7 w-7 place-items-center rounded-full text-brand hover:bg-brand-soft"><Plus className="h-4 w-4" /></button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="py-10 text-center text-sm text-slate-500">
            <ShoppingCart className="mx-auto mb-2 h-8 w-8 text-slate-300" />
            Seu carrinho está vazio.<br />Escolha um item do cardápio.
          </div>
        )}
      </div>
      <div className="space-y-2 border-t border-slate-100 px-4 py-3 text-sm">
        <div className="flex justify-between"><span className="text-slate-600">Subtotal</span><strong className="text-ink">{money(subtotal)}</strong></div>
        <p className="text-xs text-slate-500">Taxa de entrega calculada pelo seu endereço no próximo passo.</p>
        {lines.length > 0 && missing > 0 && <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">Faltam {money(missing)} para o pedido mínimo.</p>}
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
