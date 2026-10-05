import Link from "next/link";
import { requireRestaurant } from "@/lib/auth";
import { ProductList } from "@/components/product-list";
import { ActionFeedback } from "@/components/action-feedback";
import type { Product } from "@/lib/types";

export default async function ProductsPage({ status = "", error = "" }: { status?: string; error?: string } = {}) {
  const { supabase, restaurant } = await requireRestaurant();
  const { data } = await supabase
    .from("products")
    .select("*, categories(name)")
    .eq("restaurant_id", restaurant.id)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });
  const products = (data ?? []) as Product[];

  return (
    <div className="space-y-5">
      <ActionFeedback status={status} error={error} />

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">Produtos</h1>
          <p className="text-sm text-ink-faint">{products.length} {products.length === 1 ? "item cadastrado" : "itens cadastrados"} no cardápio.</p>
        </div>
        <Link href="/cardapio/produtos/novo" className="rounded-xl bg-btn px-4 py-2.5 text-sm font-medium text-white transition hover:bg-btn-hover">
          Novo produto
        </Link>
      </div>

      <ProductList products={products} />
    </div>
  );
}
