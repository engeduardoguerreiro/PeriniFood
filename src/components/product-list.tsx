/* eslint-disable @next/next/no-img-element */
"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ImageIcon, Pencil, Power, Search, Trash2 } from "lucide-react";
import { deleteProduct, toggleProduct } from "@/app/actions";
import { money } from "@/lib/utils";
import type { Product } from "@/lib/types";

type StatusFilter = "all" | "active" | "inactive";

const iconBtn =
  "grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-[#e7e4dd] bg-white text-[#6d6a63] transition hover:border-[#c5362e] hover:text-[#c5362e]";

export function ProductList({ products }: { products: Product[] }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return products.filter((product) => {
      if (status === "active" && !product.active) return false;
      if (status === "inactive" && product.active) return false;
      if (!term) return true;
      const haystack = `${product.name} ${product.description ?? ""} ${product.categories?.name ?? ""}`.toLowerCase();
      return haystack.includes(term);
    });
  }, [products, query, status]);

  const counts = useMemo(
    () => ({
      all: products.length,
      active: products.filter((p) => p.active).length,
      inactive: products.filter((p) => !p.active).length,
    }),
    [products],
  );

  const tabs: { key: StatusFilter; label: string }[] = [
    { key: "all", label: "Todos" },
    { key: "active", label: "Ativos" },
    { key: "inactive", label: "Inativos" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-lg border border-[#e7e4dd] bg-[#faf9f6] p-0.5">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setStatus(tab.key)}
              className={
                status === tab.key
                  ? "rounded-md bg-white px-3 py-1.5 text-xs font-medium text-[#1b1a17] shadow-[0_1px_2px_rgba(27,26,23,0.06)]"
                  : "rounded-md px-3 py-1.5 text-xs font-medium text-[#9c988f] transition hover:text-[#403d38]"
              }
            >
              {tab.label} <span className="text-[#b0aaa0]">{counts[tab.key]}</span>
            </button>
          ))}
        </div>
        <div className="relative min-w-[220px] flex-1 sm:max-w-xs">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#b0aaa0]" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar produto ou categoria"
            className="h-10 w-full rounded-lg border border-[#e7e4dd] bg-white pl-9 pr-3 text-sm text-[#1b1a17] outline-none transition focus:border-[#c5362e] focus:ring-2 focus:ring-[#c5362e]/12"
          />
        </div>
      </div>

      <div className="divide-y divide-[#efece6] overflow-hidden rounded-xl border border-[#e7e4dd]">
        {filtered.map((product) => (
          <div key={product.id} className="flex items-center gap-3 bg-white px-3 py-2.5 transition hover:bg-[#faf9f6]">
            <div className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-lg border border-[#efece6] bg-[#faf9f6] text-[#cfc9bd]">
              {product.image_url ? <img src={product.image_url} alt={product.name} className="h-full w-full object-cover" /> : <ImageIcon size={16} />}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="truncate text-sm font-medium text-[#1b1a17]">{product.name}</p>
                {product.featured && <span className="shrink-0 rounded-full bg-[#f6ece9] px-1.5 py-0.5 text-[0.62rem] font-semibold uppercase tracking-wide text-[#c5362e]">Destaque</span>}
              </div>
              <p className="truncate text-xs text-[#9c988f]">{product.categories?.name ?? "Sem categoria"}{product.description ? ` • ${product.description}` : ""}</p>
            </div>

            <span className="hidden w-24 shrink-0 text-right text-sm font-semibold text-[#1b1a17] [font-variant-numeric:tabular-nums] sm:block">{money(product.price)}</span>

            <span className={`hidden w-20 shrink-0 justify-center rounded-full px-2 py-0.5 text-center text-xs font-medium sm:inline-flex ${product.active ? "bg-emerald-50 text-emerald-700" : "bg-[#f4f1ec] text-[#9c988f]"}`}>
              {product.active ? "Ativo" : "Inativo"}
            </span>

            <div className="flex shrink-0 items-center gap-1.5">
              <Link href={`/dashboard/products/${product.id}/edit`} title="Editar" aria-label="Editar" className={iconBtn}>
                <Pencil size={15} />
              </Link>
              <form action={toggleProduct}>
                <input type="hidden" name="id" value={product.id} />
                <input type="hidden" name="active" value={String(!product.active)} />
                <button title={product.active ? "Desativar" : "Ativar"} aria-label={product.active ? "Desativar" : "Ativar"} className={product.active ? iconBtn : `${iconBtn} border-emerald-200 text-emerald-600 hover:border-emerald-400 hover:text-emerald-700`}>
                  <Power size={15} />
                </button>
              </form>
              <form action={deleteProduct}>
                <input type="hidden" name="id" value={product.id} />
                <button title="Excluir" aria-label="Excluir" className={iconBtn}>
                  <Trash2 size={15} />
                </button>
              </form>
            </div>
          </div>
        ))}

        {!filtered.length && (
          <p className="bg-white px-4 py-12 text-center text-sm text-[#9c988f]">
            {products.length ? "Nenhum produto encontrado para o filtro." : "Nenhum produto cadastrado ainda."}
          </p>
        )}
      </div>
    </div>
  );
}
