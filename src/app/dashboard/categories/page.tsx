import { Power, Trash2 } from "lucide-react";
import { deleteCategory, saveCategory, toggleCategory } from "@/app/actions";
import { ActionFeedback } from "@/components/action-feedback";
import { requireRestaurant } from "@/lib/auth";
import type { Category } from "@/lib/types";

const rowInput = "h-9 rounded-lg border border-[#e7e4dd] bg-white px-3 text-sm text-[#1b1a17] outline-none transition focus:border-[#c5362e] focus:ring-2 focus:ring-[#c5362e]/12";
const saveBtn = "h-9 shrink-0 rounded-lg bg-[#211d19] px-4 text-xs font-medium text-white transition hover:bg-[#37312a]";
const iconBtn = "grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-[#e7e4dd] bg-white text-[#6d6a63] transition hover:border-[#c5362e] hover:text-[#c5362e]";
const checkLabel = "flex items-center gap-1.5 text-xs font-medium text-[#6d6a63]";

export default async function CategoriesPage({ searchParams, returnTo = "/dashboard/categories" }: { searchParams: Promise<{ status: string; error: string }>; returnTo: string }) {
  const { supabase, restaurant } = await requireRestaurant();
  const sp = await searchParams;
  const { data } = await supabase.from("categories").select("*").eq("restaurant_id", restaurant.id).order("display_order");
  const categories = (data ?? []) as Category[];

  return (
    <div className="space-y-6">
      <ActionFeedback status={sp.status} error={sp.error} />

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[#1b1a17]">Categorias</h1>
          <p className="text-sm text-[#9c988f]">Organize o cardápio por grupos e ordem de exibição.</p>
        </div>
        <details className="group relative">
          <summary className="inline-flex h-10 cursor-pointer list-none items-center rounded-xl bg-[#211d19] px-4 text-sm font-medium text-white transition marker:hidden hover:bg-[#37312a]">
            Adicionar
          </summary>
          <form action={saveCategory} className="absolute right-0 z-20 mt-2 w-[min(92vw,420px)] rounded-2xl border border-[#e7e4dd] bg-white p-5 shadow-2xl">
            <input type="hidden" name="return_to" value={returnTo} />
            <h3 className="text-[0.95rem] font-semibold text-[#1b1a17]">Nova categoria</h3>
            <div className="mt-4 grid gap-2.5">
              <input className={rowInput} name="name" placeholder="Nome" required />
              <input className={rowInput} name="description" placeholder="Descrição" />
              <input className={rowInput} name="display_order" type="number" placeholder="Ordem" defaultValue={categories.length + 1} />
              <label className={checkLabel}><input name="active" type="checkbox" defaultChecked className="accent-[#c5362e]" /> Ativa</label>
              <button className={`${saveBtn} mt-1 w-full`}>Salvar categoria</button>
            </div>
          </form>
        </details>
      </div>

      <section className="overflow-hidden rounded-2xl border border-[#e7e4dd] bg-white shadow-[0_1px_2px_rgba(27,26,23,0.04)]">
        {categories.map((category) => (
          <div key={category.id} className="flex flex-wrap items-center gap-2 border-t border-[#efece6] px-3 py-2.5 first:border-t-0">
            <form action={saveCategory} className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
              <input type="hidden" name="return_to" value={returnTo} />
              <input type="hidden" name="id" value={category.id} />
              <input className={`${rowInput} w-14 text-center`} name="display_order" type="number" defaultValue={category.display_order} aria-label="Ordem" />
              <input className={`${rowInput} min-w-[130px] flex-1`} name="name" defaultValue={category.name} aria-label="Nome" />
              <input className={`${rowInput} min-w-[150px] flex-[2]`} name="description" defaultValue={category.description ?? ""} placeholder="Descrição" aria-label="Descrição" />
              <label className={checkLabel}><input name="active" type="checkbox" defaultChecked={category.active} className="accent-[#c5362e]" /> Ativa</label>
              <button className={saveBtn}>Salvar</button>
            </form>
            <div className="flex items-center gap-1.5">
              <form action={toggleCategory}>
                <input type="hidden" name="return_to" value={returnTo} />
                <input type="hidden" name="id" value={category.id} />
                <input type="hidden" name="active" value={String(!category.active)} />
                <button className={iconBtn} title={category.active ? "Desativar" : "Ativar"} aria-label={category.active ? "Desativar" : "Ativar"}><Power size={15} /></button>
              </form>
              <form action={deleteCategory}>
                <input type="hidden" name="return_to" value={returnTo} />
                <input type="hidden" name="id" value={category.id} />
                <button className={iconBtn} title="Excluir" aria-label="Excluir"><Trash2 size={15} /></button>
              </form>
            </div>
          </div>
        ))}
        {!categories.length && <p className="px-4 py-10 text-center text-sm text-[#9c988f]">Nenhuma categoria cadastrada.</p>}
      </section>
    </div>
  );
}
