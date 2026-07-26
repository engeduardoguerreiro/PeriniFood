import { Power, Trash2 } from "lucide-react";
import { deleteProductType, saveProductType, toggleProductType } from "@/app/actions";
import { ActionFeedback } from "@/components/action-feedback";
import { AppShell } from "@/components/app-shell";
import { requireRestaurant } from "@/lib/auth";
import type { ProductType } from "@/lib/types";

const rowInput = "h-9 rounded-lg border border-[#e7e4dd] bg-white px-3 text-sm text-[#1b1a17] outline-none transition focus:border-[#c5362e] focus:ring-2 focus:ring-[#c5362e]/12";
const saveBtn = "h-9 shrink-0 rounded-lg bg-[#211d19] px-4 text-xs font-medium text-white transition hover:bg-[#37312a]";
const iconBtn = "grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-[#e7e4dd] bg-white text-[#6d6a63] transition hover:border-[#c5362e] hover:text-[#c5362e]";
const checkLabel = "flex items-center gap-1.5 text-xs font-medium text-[#6d6a63]";
const returnTo = "/cardapio/tipos";

async function TypesPage({ searchParams }: { searchParams: Promise<{ status: string; error: string }> }) {
  const { supabase, restaurant } = await requireRestaurant();
  const sp = await searchParams;
  const { data, error } = await supabase.from("product_types").select("*").eq("restaurant_id", restaurant.id).order("name");
  const types = (data ?? []) as ProductType[];

  return (
    <div className="space-y-6">
      <ActionFeedback status={sp.status} error={sp.error} />

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[#1b1a17]">Tipos</h1>
          <p className="text-sm text-[#9c988f]">Classifique produtos como pizza, esfiha, bebida, combo e sobremesa.</p>
        </div>
        <details className="group relative">
          <summary className="inline-flex h-10 cursor-pointer list-none items-center rounded-xl bg-[#211d19] px-4 text-sm font-medium text-white transition marker:hidden hover:bg-[#37312a]">
            Adicionar
          </summary>
          <form action={saveProductType} className="absolute right-0 z-20 mt-2 w-[min(92vw,420px)] rounded-2xl border border-[#e7e4dd] bg-white p-5 shadow-2xl">
            <input type="hidden" name="return_to" value={returnTo} />
            <h3 className="text-[0.95rem] font-semibold text-[#1b1a17]">Novo tipo</h3>
            <p className="mt-0.5 text-xs text-[#9c988f]">Cadastre o tipo de comida que será usado no produto.</p>
            <div className="mt-4 grid gap-2.5">
              <input className={rowInput} name="name" placeholder="Nome do tipo" required />
              <input className={rowInput} name="description" placeholder="Descrição" />
              <label className={checkLabel}><input name="active" type="checkbox" defaultChecked className="accent-[#c5362e]" /> Ativo</label>
              <button className={`${saveBtn} mt-1 w-full`}>Salvar tipo</button>
            </div>
          </form>
        </details>
      </div>

      {error && (
        <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-800">
          A tabela product_types ainda não existe. Aplique a migration supabase/migrations/20260521000200_product_types.sql no Supabase.
        </p>
      )}

      <section className="overflow-hidden rounded-2xl border border-[#e7e4dd] bg-white shadow-[0_1px_2px_rgba(27,26,23,0.04)]">
        {types.map((type) => (
          <div key={type.id} className="flex flex-wrap items-center gap-2 border-t border-[#efece6] px-3 py-2.5 first:border-t-0">
            <form action={saveProductType} className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
              <input type="hidden" name="return_to" value={returnTo} />
              <input type="hidden" name="id" value={type.id} />
              <input className={`${rowInput} min-w-[130px] flex-1`} name="name" defaultValue={type.name} aria-label="Nome" />
              <input className={`${rowInput} min-w-[150px] flex-[2]`} name="description" defaultValue={type.description ?? ""} placeholder="Descrição" aria-label="Descrição" />
              <label className={checkLabel}><input name="active" type="checkbox" defaultChecked={type.active} className="accent-[#c5362e]" /> Ativo</label>
              <button className={saveBtn}>Salvar</button>
            </form>
            <div className="flex items-center gap-1.5">
              <form action={toggleProductType}>
                <input type="hidden" name="return_to" value={returnTo} />
                <input type="hidden" name="id" value={type.id} />
                <input type="hidden" name="active" value={String(!type.active)} />
                <button className={iconBtn} title={type.active ? "Desativar" : "Ativar"} aria-label={type.active ? "Desativar" : "Ativar"}><Power size={15} /></button>
              </form>
              <form action={deleteProductType}>
                <input type="hidden" name="return_to" value={returnTo} />
                <input type="hidden" name="id" value={type.id} />
                <button className={iconBtn} title="Excluir" aria-label="Excluir"><Trash2 size={15} /></button>
              </form>
            </div>
          </div>
        ))}
        {!types.length && !error && <p className="px-4 py-10 text-center text-sm text-[#9c988f]">Nenhum tipo cadastrado.</p>}
      </section>
    </div>
  );
}

export default function Page({ searchParams }: { searchParams: Promise<{ status: string; error: string }> }) {
  return <AppShell><TypesPage searchParams={searchParams} /></AppShell>;
}
