import { deleteCategory, saveCategory, toggleCategory } from "@/app/actions";
import { ActionFeedback } from "@/components/action-feedback";
import { requireRestaurant } from "@/lib/auth";
import type { Category } from "@/lib/types";

export default async function CategoriesPage({ searchParams, returnTo = "/dashboard/categories" }: { searchParams: Promise<{ status: string; error: string }>; returnTo: string }) {
  const { supabase, restaurant } = await requireRestaurant();
  const sp = await searchParams;
  const { data } = await supabase.from("categories").select("*").eq("restaurant_id", restaurant.id).order("display_order");
  const categories = (data ?? []) as Category[];

  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm">
      <ActionFeedback status={sp.status} error={sp.error} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-black">Categorias</h2>
          <p className="text-sm text-slate-500">Organize o cardápio por grupos e ordem de exibição.</p>
        </div>
        <details className="group relative">
          <summary className="btn-primary h-10 cursor-pointer list-none rounded-lg px-4 py-2 text-sm marker:hidden">
            Adicionar
          </summary>
          <form action={saveCategory} className="absolute right-0 z-20 mt-3 w-[min(92vw,520px)] rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
            <input type="hidden" name="return_to" value={returnTo} />
            <h3 className="text-lg font-black">Nova categoria</h3>
            <div className="mt-4 grid gap-3">
              <input className="field-light" name="name" placeholder="Nome" required />
              <textarea className="field-light" name="description" placeholder="Descrição" />
              <input className="field-light" name="display_order" type="number" placeholder="Ordem" defaultValue={categories.length + 1} />
              <label className="flex items-center gap-2 text-sm font-bold">
                <input name="active" type="checkbox" defaultChecked /> Ativa
              </label>
              <button className="btn-primary w-full">Salvar categoria</button>
            </div>
          </form>
        </details>
      </div>

      <div className="mt-5 overflow-hidden rounded-xl border border-slate-200">
        <div className="grid grid-cols-[64px_200px_minmax(200px,1fr)_82px_96px_92px_104px_76px] gap-3 border-b border-slate-200 bg-slate-50/80 px-4 py-2 text-[11px] font-black uppercase text-slate-500 max-lg:hidden">
          <span>Ordem</span>
          <span>Nome</span>
          <span>Descrição</span>
          <span>Status</span>
          <span>Situação</span>
          <span className="col-span-3 text-right">Ações</span>
        </div>

        <div className="divide-y divide-slate-200">
          {categories.map((category) => (
            <div key={category.id} className="grid gap-3 px-4 py-2 transition hover:bg-slate-50/70 lg:grid-cols-[64px_200px_minmax(200px,1fr)_82px_96px_92px_104px_76px] lg:items-center">
              <form action={saveCategory} className="contents">
                <input type="hidden" name="return_to" value={returnTo} />
                <input type="hidden" name="id" value={category.id} />
                <label className="space-y-1 lg:space-y-0">
                  <span className="text-xs font-black uppercase text-slate-500 lg:hidden">Ordem</span>
                  <input className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold outline-none focus:border-red-300" name="display_order" type="number" defaultValue={category.display_order} />
                </label>
                <label className="space-y-1 lg:space-y-0">
                  <span className="text-xs font-black uppercase text-slate-500 lg:hidden">Nome</span>
                  <input className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold outline-none focus:border-red-300" name="name" defaultValue={category.name} />
                </label>
                <label className="space-y-1 lg:space-y-0">
                  <span className="text-xs font-black uppercase text-slate-500 lg:hidden">Descrição</span>
                  <input className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-red-300" name="description" defaultValue={category.description ?? ""} />
                </label>
                <label className="flex items-center gap-2 text-xs font-black">
                  <input name="active" type="checkbox" defaultChecked={category.active} /> Ativa
                </label>
                <span className={category.active ? "rounded-full bg-emerald-50 px-3 py-1.5 text-center text-[11px] font-black text-emerald-700" : "rounded-full bg-slate-100 px-3 py-1.5 text-center text-[11px] font-black text-slate-500"}>
                  {category.active ? "Ativa" : "Inativa"}
                </span>
                <div className="flex justify-end">
                  <button className="h-8 w-full rounded-lg border border-red-200 bg-white px-1.5 text-[10px] font-black text-slate-800 transition hover:border-red-300 hover:bg-red-50">Atualizar</button>
                </div>
              </form>

              <div className="flex flex-wrap justify-end gap-2 lg:col-span-2 lg:col-start-7 lg:flex-nowrap">
                <form action={toggleCategory} className="w-full">
                  <input type="hidden" name="return_to" value={returnTo} />
                  <input type="hidden" name="id" value={category.id} />
                  <input type="hidden" name="active" value={String(!category.active)} />
                  <button className="h-8 w-full rounded-lg border border-slate-200 bg-white px-1.5 text-[10px] font-black text-slate-700 transition hover:border-red-300 hover:bg-red-50">{category.active ? "Desativar" : "Ativar"}</button>
                </form>
                <form action={deleteCategory} className="w-full">
                  <input type="hidden" name="return_to" value={returnTo} />
                  <input type="hidden" name="id" value={category.id} />
                  <button className="h-8 w-full rounded-lg border border-red-200 bg-white px-1.5 text-[10px] font-black text-red-600 transition hover:bg-red-50">Excluir</button>
                </form>
              </div>
            </div>
          ))}
          {!categories.length && <p className="p-5 text-sm text-slate-500">Nenhuma categoria cadastrada.</p>}
        </div>
      </div>
    </section>
  );
}
