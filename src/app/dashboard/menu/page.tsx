import Link from "next/link";
import { requireRestaurant } from "@/lib/auth";
import { money } from "@/lib/utils";
import type { Category, Product } from "@/lib/types";

export default async function MenuPage() {
  const { supabase, restaurant } = await requireRestaurant();
  const [{ data: categories }, { data: products }] = await Promise.all([
    supabase.from("categories").select("*").eq("restaurant_id", restaurant.id).order("display_order"),
    supabase.from("products").select("*").eq("restaurant_id", restaurant.id).order("name"),
  ]);
  return (
    <div className="space-y-5">
      {((categories ?? []) as Category[]).map((category) => (
        <section key={category.id} className="rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="text-xl font-black">{category.name}</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {((products ?? []) as Product[]).filter((p) => p.category_id === category.id).map((product) => (
              <Link key={product.id} href={`/dashboard/products/${product.id}/edit`} className="rounded-xl border border-slate-100 p-4 hover:border-[#E50914]">
                <p className="font-black">{product.name}</p>
                <p className="mt-1 text-sm text-slate-500">{product.description}</p>
                <p className="mt-3 font-black text-[#E50914]">{money(product.price)}</p>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
