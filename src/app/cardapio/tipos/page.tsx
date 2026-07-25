import { deleteProductType, saveProductType, toggleProductType } from "@/app/actions";
import { ActionFeedback } from "@/components/action-feedback";
import { AppShell } from "@/components/app-shell";
import { requireRestaurant } from "@/lib/auth";
import type { ProductType } from "@/lib/types";

async function TypesPage({ searchParams }: { searchParams: Promise<{ status: string; error: string }> }) {
  const { supabase, restaurant } = await requireRestaurant();
  const sp = await searchParams;
  const { data, error } = await supabase.from("product_types").select("*").eq("restaurant_id", restaurant.id).order("name");
  const types = (data ?? []) as ProductType[];

  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm">
      <ActionFeedback status={sp.status} error={sp.error} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-black">Tipos</h2>
          <p className="text-sm text-slate-500">Classifique produtos como pizza, esfiha, bebida, combo e sobremesa.</p>
        </div>
        <details className="group relative">
          <summary className="btn-primary h-10 cursor-pointer list-none rounded-lg px-4 py-2 text-sm marker:hidden">
            Adicionar
          </summary>
          <form action={saveProductType} className="absolute right-0 z-20 mt-3 w-[min(92vw,520px)] rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
            <input type="hidden" name="return_to" value="/cardapio/tipos" />
            <h3 className="text-lg font-black">Novo tipo</h3>
            <p className="mt-1 text-sm text-slate-500">Cadastre o tipo de comida que será usado no produto.</p>
            <div className="mt-4 grid gap-3">
              <input className="field-light" name="name" placeholder="Nome do tipo" required />
              <textarea className="field-light" name="description" placeholder="Descrição" />
              <label className="flex items-center gap-2 text-sm font-bold">
                <input name="active" type="checkbox" defaultChecked /> Ativo
              </label>
              <button className="btn-primary w-full">Salvar tipo</button>
            </div>
          </form>
        </details>
      </div>

      {error && (
        <p className="mt-5 rounded-xl bg-amber-50 p-4 text-sm text-amber-800">
          A tabela product_types ainda não existe. Aplique a migration supabase/migrations/20260521000200_product_types.sql no Supabase.
        </p>
      )}

      <div className="mt-5 overflow-hidden rounded-xl border border-slate-200">
        <div className="grid grid-cols-[220px_minmax(220px,1fr)_82px_96px_92px_104px_76px] gap-3 border-b border-slate-200 bg-slate-50/80 px-4 py-2 text-[11px] font-black uppercase text-slate-500 max-lg:hidden">
          <span>Nome</span>
          <span>Descrição</span>
          <span>Status</span>
          <span>Situação</span>
          <span className="col-span-3 text-right">Ações</span>
        </div>

        <div className="divide-y divide-slate-200">
          {types.map((type) => (
            <div key={type.id} className="grid gap-3 px-4 py-2 transition hover:bg-slate-50/70 lg:grid-cols-[220px_minmax(220px,1fr)_82px_96px_92px_104px_76px] lg:items-center">
              <form action={saveProductType} className="contents">
                <input type="hidden" name="return_to" value="/cardapio/tipos" />
                <input type="hidden" name="id" value={type.id} />
                <label className="space-y-1 lg:space-y-0">
                  <span className="text-xs font-black uppercase text-slate-500 lg:hidden">Nome</span>
                  <input className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold outline-none focus:border-red-300" name="name" defaultValue={type.name} />
                </label>
                <label className="space-y-1 lg:space-y-0">
                  <span className="text-xs font-black uppercase text-slate-500 lg:hidden">Descrição</span>
                  <input className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-red-300" name="description" defaultValue={type.description ?? ""} />
                </label>
                <label className="flex items-center gap-2 text-xs font-black">
                  <input name="active" type="checkbox" defaultChecked={type.active} /> Ativo
                </label>
                <span className={type.active ? "rounded-full bg-emerald-50 px-3 py-1.5 text-center text-[11px] font-black text-emerald-700" : "rounded-full bg-slate-100 px-3 py-1.5 text-center text-[11px] font-black text-slate-500"}>
                  {type.active ? "Ativo" : "Inativo"}
                </span>
                <div className="flex justify-end">
                  <button className="h-8 w-full rounded-lg border border-red-200 bg-white px-1.5 text-[10px] font-black text-slate-800 transition hover:border-red-300 hover:bg-red-50">Atualizar</button>
                </div>
              </form>

              <div className="flex flex-wrap justify-end gap-2 lg:col-span-2 lg:col-start-6 lg:flex-nowrap">
                <form action={toggleProductType} className="w-full">
                  <input type="hidden" name="return_to" value="/cardapio/tipos" />
                  <input type="hidden" name="id" value={type.id} />
                  <input type="hidden" name="active" value={String(!type.active)} />
                  <button className="h-8 w-full rounded-lg border border-slate-200 bg-white px-1.5 text-[10px] font-black text-slate-700 transition hover:border-red-300 hover:bg-red-50">{type.active ? "Desativar" : "Ativar"}</button>
                </form>
                <form action={deleteProductType} className="w-full">
                  <input type="hidden" name="return_to" value="/cardapio/tipos" />
                  <input type="hidden" name="id" value={type.id} />
                  <button className="h-8 w-full rounded-lg border border-red-200 bg-white px-1.5 text-[10px] font-black text-red-600 transition hover:bg-red-50">Excluir</button>
                </form>
              </div>
            </div>
          ))}
          {!types.length && !error && <p className="p-5 text-sm text-slate-500">Nenhum tipo cadastrado.</p>}
        </div>
      </div>
    </section>
  );
}

export default function Page({ searchParams }: { searchParams: Promise<{ status: string; error: string }> }) {
  return <AppShell><TypesPage searchParams={searchParams} /></AppShell>;
}
