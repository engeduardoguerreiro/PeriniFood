import { requireRestaurant } from "@/lib/auth";
import type { Table } from "@/lib/types";

export default async function TablesPage() {
  const { supabase, restaurant } = await requireRestaurant();
  const { data } = await supabase.from("tables").select("*").eq("restaurant_id", restaurant.id).order("number");
  const tables = (data ?? []) as Table[];
  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm">
      <h2 className="text-xl font-black">Mesas e comandas</h2>
      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {tables.map((table) => (
          <div key={table.id} className="rounded-2xl border border-[#efece6] p-5">
            <p className="text-3xl font-black">Mesa {table.number}</p>
            <p className="mt-1 text-[#9c988f]">{table.name}</p>
            <span className="mt-4 inline-flex rounded-full bg-[#f1efea] px-3 py-1 text-sm font-bold">{table.status}</span>
            <button className="btn-primary mt-5 w-full">Abrir comanda</button>
          </div>
        ))}
        {!tables.length && <p className="text-[#9c988f]">Crie mesas no SQL inicial ou evolua este módulo para cadastro direto.</p>}
      </div>
    </section>
  );
}
