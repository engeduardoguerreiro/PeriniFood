import Link from "next/link";
import { requireRestaurant } from "@/lib/auth";
import { ProductList } from "@/components/product-list";
import type { Product } from "@/lib/types";

export default async function ProductsPage() {
  const { supabase, restaurant } = await requireRestaurant();
  const { data } = await supabase
    .from("products")
    .select("*, categories(name)")
    .eq("restaurant_id", restaurant.id)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });
  const products = (data ?? []) as Product[];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[#1b1a17]">Produtos</h1>
          <p className="text-sm text-[#9c988f]">{products.length} {products.length === 1 ? "item cadastrado" : "itens cadastrados"} no cardápio.</p>
        </div>
        <Link href="/dashboard/products/new" className="rounded-xl bg-[#211d19] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#37312a]">
          Novo produto
        </Link>
      </div>

      <ProductList products={products} />
    </div>
  );
}
