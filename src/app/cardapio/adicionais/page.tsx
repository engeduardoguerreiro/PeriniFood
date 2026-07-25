import { saveAddon, toggleAddon } from "@/app/actions";
import { AppShell } from "@/components/app-shell";
import { requireRestaurant } from "@/lib/auth";
import type { ProductAddon } from "@/lib/types";

async function AddonsPage() {
  const { supabase, restaurant } = await requireRestaurant();
  const { data } = await supabase.from("product_addons").select("*").eq("restaurant_id", restaurant.id).order("name");
  const addons = (data ?? []) as ProductAddon[];
  return (
    <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
      <form action={saveAddon} className="rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="text-xl font-black">Novo adicional</h2>
        <div className="mt-4 space-y-3">
          <input className="field-light" name="name" placeholder="Nome" required />
          <input className="field-light" name="price" type="number" step="0.01" placeholder="Preço" required />
          <label className="flex items-center gap-2 text-sm font-bold"><input name="active" type="checkbox" defaultChecked /> Ativo</label>
          <button className="btn-primary w-full">Salvar adicional</button>
        </div>
      </form>
      <section className="rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="text-xl font-black">Adicionais</h2>
        <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
          <div className="grid grid-cols-[minmax(160px,1fr)_92px_82px_92px_104px] gap-3 border-b border-slate-200 bg-slate-50/80 px-4 py-2 text-[11px] font-black uppercase text-slate-500 max-lg:hidden">
            <span>Nome</span>
            <span>Preço</span>
            <span>Status</span>
            <span>Salvar</span>
            <span className="text-right">Ação</span>
          </div>
          <div className="divide-y divide-slate-200">
          {addons.map((addon) => (
            <div key={addon.id} className="grid gap-3 px-4 py-2 transition hover:bg-slate-50/70 lg:grid-cols-[minmax(160px,1fr)_92px_82px_92px_104px] lg:items-center">
              <form action={saveAddon} className="contents">
                <input type="hidden" name="id" value={addon.id} />
                <label className="space-y-1 lg:space-y-0">
                  <span className="text-xs font-black uppercase text-slate-500 lg:hidden">Nome</span>
                  <input className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold outline-none focus:border-red-300" name="name" defaultValue={addon.name} />
                </label>
                <label className="space-y-1 lg:space-y-0">
                  <span className="text-xs font-black uppercase text-slate-500 lg:hidden">Preço</span>
                  <input className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-red-300" name="price" type="number" step="0.01" defaultValue={addon.price} />
                </label>
                <label className="flex items-center gap-2 text-xs font-black"><input name="active" type="checkbox" defaultChecked={addon.active} /> Ativo</label>
                <button className="h-8 w-full rounded-lg border border-red-200 bg-white px-1.5 text-[10px] font-black text-slate-800 transition hover:border-red-300 hover:bg-red-50">Salvar</button>
              </form>
              <form action={toggleAddon} className="w-full">
                <input type="hidden" name="id" value={addon.id} />
                <input type="hidden" name="active" value={String(!addon.active)} />
                <button className="h-8 w-full rounded-lg border border-slate-200 bg-white px-1.5 text-[10px] font-black text-slate-700 transition hover:border-red-300 hover:bg-red-50">{addon.active ? "Desativar" : "Ativar"}</button>
              </form>
            </div>
          ))}
          {!addons.length && <p className="p-5 text-sm text-slate-500">Cadastre adicionais globais como borda, queijo extra e molhos.</p>}
          </div>
        </div>
      </section>
    </div>
  );
}

export default function Page() {
  return <AppShell><AddonsPage /></AppShell>;
}
