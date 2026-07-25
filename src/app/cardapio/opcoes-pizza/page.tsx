import { deletePizzaOption, savePizzaOption, togglePizzaOption } from "@/app/actions";
import { ActionFeedback } from "@/components/action-feedback";
import { AppShell } from "@/components/app-shell";
import { requireRestaurant } from "@/lib/auth";
import type { PizzaOption, PizzaOptionKind } from "@/lib/types";

const groups: Array<{ kind: PizzaOptionKind; title: string; helper: string; pricePlaceholder: string }> = [
  { kind: "tamanho", title: "Tamanhos", helper: "Ex.: Broto, Grande, Família. Cadastre o nome e a quantidade de fatias; o preço  definido dentro de cada pizza.", pricePlaceholder: "Quantidade de fatias" },
  { kind: "massa", title: "Tipos de massas", helper: "Massas disponíveis para pizzas.", pricePlaceholder: "Preço extra, normalmente 0" },
  { kind: "borda", title: "Bordas", helper: "Bordas com cobrança adicional.", pricePlaceholder: "Preço adicional" },
  { kind: "adicional", title: "Adicionais", helper: "Ingredientes extras por produto.", pricePlaceholder: "Preço adicional" },
];

function PizzaOptionGroup({ group, rows, hasError }: { group: (typeof groups)[number]; rows: PizzaOption[]; hasError: boolean }) {
  const valueLabel = group.kind === "tamanho" ? "Fatias" : "Preço";

  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-black">{group.title}</h2>
          <p className="text-sm text-slate-500">{group.helper}</p>
        </div>
        <details className="group relative">
          <summary className="btn-primary h-10 cursor-pointer list-none rounded-lg px-4 py-2 text-sm marker:hidden">
            Adicionar
          </summary>
          <form action={savePizzaOption} className="absolute right-0 z-20 mt-3 w-[min(92vw,460px)] rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
            <input type="hidden" name="return_to" value="/cardapio/opcoes-pizza" />
            <h3 className="text-lg font-black">Nova opção</h3>
            <input type="hidden" name="kind" value={group.kind} />
            <div className="mt-4 grid gap-3">
              <input className="field-light" name="name" placeholder="Nome" required />
              <input className="field-light" name="price" type="number" min="0" step={group.kind === "tamanho" ? "1" : "0.01"} placeholder={group.pricePlaceholder} defaultValue={0} />
              <label className="flex items-center gap-2 text-sm font-bold">
                <input name="active" type="checkbox" defaultChecked /> Ativo
              </label>
              <button className="btn-primary w-full">Cadastrar</button>
            </div>
          </form>
        </details>
      </div>

      <div className="mt-5 overflow-hidden rounded-xl border border-slate-200">
        <div className="grid grid-cols-[minmax(160px,1fr)_82px_76px_92px_92px_104px_76px] gap-3 border-b border-slate-200 bg-slate-50/80 px-4 py-2 text-[11px] font-black uppercase text-slate-500 max-lg:hidden">
          <span>Nome</span>
          <span>{valueLabel}</span>
          <span>Status</span>
          <span>Situação</span>
          <span className="col-span-3 text-right">Ações</span>
        </div>

        <div className="divide-y divide-slate-200">
          {rows.map((option) => (
            <div key={option.id} className="grid gap-3 px-4 py-2 transition hover:bg-slate-50/70 lg:grid-cols-[minmax(160px,1fr)_82px_76px_92px_92px_104px_76px] lg:items-center">
              <form action={savePizzaOption} className="contents">
                <input type="hidden" name="return_to" value="/cardapio/opcoes-pizza" />
                <input type="hidden" name="id" value={option.id} />
                <input type="hidden" name="kind" value={option.kind} />
                <label className="space-y-1 lg:space-y-0">
                  <span className="text-xs font-black uppercase text-slate-500 lg:hidden">Nome</span>
                  <input className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold outline-none focus:border-red-300" name="name" defaultValue={option.name} />
                </label>
                <label className="space-y-1 lg:space-y-0">
                  <span className="text-xs font-black uppercase text-slate-500 lg:hidden">{valueLabel}</span>
                  <input className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-red-300" name="price" type="number" min="0" step={group.kind === "tamanho" ? "1" : "0.01"} defaultValue={option.price} />
                </label>
                <label className="flex items-center gap-2 text-xs font-black">
                  <input name="active" type="checkbox" defaultChecked={option.active} /> Ativo
                </label>
                <span className={option.active ? "rounded-full bg-emerald-50 px-3 py-1.5 text-center text-[11px] font-black text-emerald-700" : "rounded-full bg-slate-100 px-3 py-1.5 text-center text-[11px] font-black text-slate-500"}>
                  {option.active ? "Ativo" : "Inativo"}
                </span>
                <div className="flex justify-end">
                  <button className="h-8 w-full rounded-lg border border-red-200 bg-white px-1.5 text-[10px] font-black text-slate-800 transition hover:border-red-300 hover:bg-red-50">Salvar</button>
                </div>
              </form>

              <div className="flex flex-wrap justify-end gap-2 lg:col-span-2 lg:col-start-6 lg:flex-nowrap">
                <form action={togglePizzaOption} className="w-full">
                  <input type="hidden" name="return_to" value="/cardapio/opcoes-pizza" />
                  <input type="hidden" name="id" value={option.id} />
                  <input type="hidden" name="active" value={String(!option.active)} />
                  <button className="h-8 w-full rounded-lg border border-slate-200 bg-white px-1.5 text-[10px] font-black text-slate-700 transition hover:border-red-300 hover:bg-red-50">{option.active ? "Desativar" : "Ativar"}</button>
                </form>
                <form action={deletePizzaOption} className="w-full">
                  <input type="hidden" name="return_to" value="/cardapio/opcoes-pizza" />
                  <input type="hidden" name="id" value={option.id} />
                  <button className="h-8 w-full rounded-lg border border-red-200 bg-white px-1.5 text-[10px] font-black text-red-600 transition hover:bg-red-50">Excluir</button>
                </form>
              </div>
            </div>
          ))}
          {!rows.length && !hasError && <p className="p-5 text-sm text-slate-500">Nenhuma opção cadastrada.</p>}
        </div>
      </div>
    </section>
  );
}

async function PizzaOptionsPage({ searchParams }: { searchParams: Promise<{ status: string; error: string }> }) {
  const { supabase, restaurant } = await requireRestaurant();
  const sp = await searchParams;
  const { data, error } = await supabase.from("pizza_options").select("*").eq("restaurant_id", restaurant.id).order("kind").order("name");
  const options = (data ?? []) as PizzaOption[];

  return (
    <div className="space-y-5">
      <ActionFeedback status={sp.status} error={sp.error} />
      {error && (
        <div className="rounded-2xl bg-amber-50 p-4 text-sm font-semibold text-amber-800">
          A tabela pizza_options ainda não existe. Aplique supabase/migrations/20260521000300_pizza_options.sql no Supabase.
        </div>
      )}
      {groups.map((group) => (
        <PizzaOptionGroup
          key={group.kind}
          group={group}
          rows={options.filter((option) => option.kind === group.kind)}
          hasError={Boolean(error)}
        />
      ))}
    </div>
  );
}

export default function Page({ searchParams }: { searchParams: Promise<{ status: string; error: string }> }) {
  return <AppShell><PizzaOptionsPage searchParams={searchParams} /></AppShell>;
}
