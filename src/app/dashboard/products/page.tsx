import Link from "next/link";
import { deleteProduct, toggleProduct } from "@/app/actions";
import { requireRestaurant } from "@/lib/auth";
import { money } from "@/lib/utils";
import type { Product } from "@/lib/types";

export default async function ProductsPage() {
  const { supabase, restaurant } = await requireRestaurant();
  const { data } = await supabase.from("products").select("*, categories(name)").eq("restaurant_id", restaurant.id).order("created_at", { ascending: false });
  const products = (data ?? []) as Product[];
  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-black">Produtos</h2>
        <Link href="/dashboard/products/new" className="btn-primary">Novo produto</Link>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="text-slate-500"><tr><th className="p-3">Produto</th><th>Categoria</th><th>Preço</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {products.map((product) => (
              <tr key={product.id} className="border-t border-slate-100">
                <td className="p-3"><strong>{product.name}</strong><p className="text-slate-500">{product.description}</p></td>
                <td>{product.categories?.name ?? "Sem categoria"}</td>
                <td className="font-bold">{money(product.price)}</td>
                <td><span className={product.active ? "text-emerald-600" : "text-red-600"}>{product.active ? "Ativo" : "Inativo"}</span></td>
                <td className="flex gap-2 py-3">
                  <Link className="btn-muted text-sm" href={`/dashboard/products/${product.id}/edit`}>Editar</Link>
                  <form action={toggleProduct}>
                    <input type="hidden" name="id" value={product.id} />
                    <input type="hidden" name="active" value={String(!product.active)} />
                    <button className="btn-muted text-sm">{product.active ? "Desativar" : "Ativar"}</button>
                  </form>
                  <form action={deleteProduct}>
                    <input type="hidden" name="id" value={product.id} />
                    <button className="rounded-xl border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50">
                      Excluir
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
