"use client";

import { Minus, Plus, ShoppingCart, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import type { Product } from "@/lib/types";
import { money } from "@/lib/utils";

type CartItem = { id: string; name: string; price: number; quantity: number; notes: string };

export function CartBuilder({
  products,
  submitLabel,
  compact = false,
}: {
  products: Product[];
  submitLabel: string;
  compact?: boolean;
}) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const total = useMemo(() => cart.reduce((sum, item) => sum + item.price * item.quantity, 0), [cart]);

  function add(product: Product) {
    setCart((current) => {
      const found = current.find((item) => item.id === product.id);
      if (found) return current.map((item) => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      return [...current, { id: product.id, name: product.name, price: Number(product.price), quantity: 1, notes: "" }];
    });
  }

  function change(id: string, quantity: number) {
    setCart((current) => current.map((item) => item.id === id ? { ...item, quantity } : item).filter((item) => item.quantity > 0));
  }

  return (
    <>
      <input type="hidden" name="cart" value={JSON.stringify(cart)} />
      <div className={compact ? "grid gap-3" : "grid gap-5 lg:grid-cols-[1fr_360px]"}>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {products.map((product) => (
            <button
              type="button"
              key={product.id}
              onClick={() => add(product)}
              className="rounded-2xl border border-[#0F1720]/10 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-[#E50914]"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-bold text-[#0F1720]">{product.name}</p>
                  <p className="mt-1 line-clamp-2 text-sm text-slate-500">{product.description || "Produto pronto para venda."}</p>
                </div>
                <Plus className="h-5 w-5 text-[#E50914]" />
              </div>
              <p className="mt-4 text-lg font-black text-[#E50914]">{money(product.price)}</p>
            </button>
          ))}
        </div>

        <aside className="rounded-2xl border border-[#0F1720]/10 bg-white p-4 text-[#0F1720] shadow-sm">
          <div className="mb-4 flex items-center gap-2 font-black">
            <ShoppingCart className="h-5 w-5 text-[#E50914]" />
            Carrinho
          </div>
          <div className="space-y-3">
            {cart.length === 0 && <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">Adicione produtos para finalizar.</p>}
            {cart.map((item) => (
              <div key={item.id} className="rounded-xl border border-slate-100 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-bold">{item.name}</p>
                    <p className="text-sm text-slate-500">{money(item.price * item.quantity)}</p>
                  </div>
                  <button type="button" onClick={() => change(item.id, 0)} className="text-slate-400 hover:text-red-600">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <button type="button" onClick={() => change(item.id, item.quantity - 1)} className="rounded-lg border p-2">
                    <Minus className="h-3 w-3" />
                  </button>
                  <span className="w-8 text-center font-bold">{item.quantity}</span>
                  <button type="button" onClick={() => change(item.id, item.quantity + 1)} className="rounded-lg border p-2">
                    <Plus className="h-3 w-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4 font-black">
            <span>Total</span>
            <span>{money(total)}</span>
          </div>
          <button className="btn-primary mt-4 w-full" disabled={!cart.length}>
            {submitLabel}
          </button>
        </aside>
      </div>
    </>
  );
}
