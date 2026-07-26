import { Power, Trash2 } from "lucide-react";
import { deletePizzaOption, savePizzaOption, togglePizzaOption } from "@/app/actions";
import { ActionFeedback } from "@/components/action-feedback";
import { AppShell } from "@/components/app-shell";
import { requireRestaurant } from "@/lib/auth";
import type { PizzaOption, PizzaOptionKind } from "@/lib/types";

const rowInput = "h-9 rounded-lg border border-[#e7e4dd] bg-white px-3 text-sm text-[#1b1a17] outline-none transition focus:border-[#c5362e] focus:ring-2 focus:ring-[#c5362e]/12";
const saveBtn = "h-9 shrink-0 rounded-lg bg-[#211d19] px-4 text-xs font-medium text-white transition hover:bg-[#37312a]";
const iconBtn = "grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-[#e7e4dd] bg-white text-[#6d6a63] transition hover:border-[#c5362e] hover:text-[#c5362e]";
const checkLabel = "flex items-center gap-1.5 text-xs font-medium text-[#6d6a63]";
const returnTo = "/cardapio/opcoes-pizza";

const groups: Array<{ kind: PizzaOptionKind; title: string; helper: string; pricePlaceholder: string }> = [
  { kind: "tamanho", title: "Tamanhos", helper: "Ex.: Broto, Grande, Família. Cadastre o nome e a quantidade de fatias; o preço é definido dentro de cada pizza.", pricePlaceholder: "Quantidade de fatias" },
  { kind: "massa", title: "Tipos de massas", helper: "Massas disponíveis para pizzas.", pricePlaceholder: "Preço extra, normalmente 0" },
  { kind: "borda", title: "Bordas", helper: "Bordas com cobrança adicional.", pricePlaceholder: "Preço adicional" },
  { kind: "adicional", title: "Adicionais", helper: "Ingredientes extras por produto.", pricePlaceholder: "Preço adicional" },
];

function PizzaOptionGroup({ group, rows, hasError }: { group: (typeof groups)[number]; rows: PizzaOption[]; hasError: boolean }) {
  const valueLabel = group.kind === "tamanho" ? "Fatias" : "Preço";
  const step = group.kind === "tamanho" ? "1" : "0.01";

  return (
    <section>
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-[1.05rem] font-semibold text-[#1b1a17]">{group.title}</h2>
          <p className="text-xs text-[#9c988f]">{group.helper}</p>
        </div>
        <details className="group relative">
          <summary className="inline-flex h-9 cursor-pointer list-none items-center rounded-lg border border-[#e7e4dd] bg-white px-3.5 text-xs font-medium text-[#2b2925] transition marker:hidden hover:border-[#c5362e] hover:text-[#c5362e]">
            Adicionar
          </summary>
          <form action={savePizzaOption} className="absolute right-0 z-20 mt-2 w-[min(92vw,380px)] rounded-2xl border border-[#e7e4dd] bg-white p-5 shadow-2xl">
            <input type="hidden" name="return_to" value={returnTo} />
            <input type="hidden" name="kind" value={group.kind} />
            <h3 className="text-[0.95rem] font-semibold text-[#1b1a17]">Nova opção</h3>
            <div className="mt-4 grid gap-2.5">
              <input className={rowInput} name="name" placeholder="Nome" required />
              <input className={rowInput} name="price" type="number" min="0" step={step} placeholder={group.pricePlaceholder} defaultValue={0} />
              <label className={checkLabel}><input name="active" type="checkbox" defaultChecked className="accent-[#c5362e]" /> Ativo</label>
              <button className={`${saveBtn} mt-1 w-full`}>Cadastrar</button>
            </div>
          </form>
        </details>
      </div>

      <div className="overflow-hidden rounded-2xl border border-[#e7e4dd] bg-white shadow-[0_1px_2px_rgba(27,26,23,0.04)]">
        {rows.map((option) => (
          <div key={option.id} className="flex flex-wrap items-center gap-2 border-t border-[#efece6] px-3 py-2.5 first:border-t-0">
            <form action={savePizzaOption} className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
              <input type="hidden" name="return_to" value={returnTo} />
              <input type="hidden" name="id" value={option.id} />
              <input type="hidden" name="kind" value={option.kind} />
              <input className={`${rowInput} min-w-[140px] flex-1`} name="name" defaultValue={option.name} aria-label="Nome" />
              <input className={`${rowInput} w-24`} name="price" type="number" min="0" step={step} defaultValue={option.price} aria-label={valueLabel} title={valueLabel} />
              <label className={checkLabel}><input name="active" type="checkbox" defaultChecked={option.active} className="accent-[#c5362e]" /> Ativo</label>
              <button className={saveBtn}>Salvar</button>
            </form>
            <div className="flex items-center gap-1.5">
              <form action={togglePizzaOption}>
                <input type="hidden" name="return_to" value={returnTo} />
                <input type="hidden" name="id" value={option.id} />
                <input type="hidden" name="active" value={String(!option.active)} />
                <button className={iconBtn} title={option.active ? "Desativar" : "Ativar"} aria-label={option.active ? "Desativar" : "Ativar"}><Power size={15} /></button>
              </form>
              <form action={deletePizzaOption}>
                <input type="hidden" name="return_to" value={returnTo} />
                <input type="hidden" name="id" value={option.id} />
                <button className={iconBtn} title="Excluir" aria-label="Excluir"><Trash2 size={15} /></button>
              </form>
            </div>
          </div>
        ))}
        {!rows.length && !hasError && <p className="px-4 py-8 text-center text-sm text-[#9c988f]">Nenhuma opção cadastrada.</p>}
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
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[#1b1a17]">Opções de pizza</h1>
        <p className="text-sm text-[#9c988f]">Tamanhos, massas, bordas e adicionais usados nas pizzas.</p>
      </div>
      <ActionFeedback status={sp.status} error={sp.error} />
      {error && (
        <div className="rounded-2xl bg-amber-50 p-4 text-sm font-medium text-amber-800">
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
