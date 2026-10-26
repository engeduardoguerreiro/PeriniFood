import { Power, Trash2, Pizza } from "lucide-react";
import { deletePizzaOption, savePizzaChoiceRules, savePizzaOption, togglePizzaOption } from "@/app/actions";
import { ActionFeedback } from "@/components/action-feedback";
import { requireRestaurant } from "@/lib/auth";
import type { ChoiceRule, PizzaOption, PizzaOptionKind } from "@/lib/types";
import { Icon3D } from "@/components/ui/icon-3d";
import { OptionPhotoInput } from "@/components/option-photo-input";
import { choiceRule } from "@/lib/pizza-builder";

const rowInput = "h-9 rounded-lg border border-line bg-white px-3 text-sm text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/12";
const saveBtn = "h-9 shrink-0 rounded-lg bg-btn px-4 text-xs font-medium text-white transition hover:bg-btn-hover";
const iconBtn = "grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-line bg-white text-ink-soft transition hover:border-brand hover:text-brand";
const checkLabel = "flex items-center gap-1.5 text-xs font-medium text-ink-soft";
const returnTo = "/cardapio/opcoes-pizza";

const groups: Array<{ kind: PizzaOptionKind; title: string; helper: string; pricePlaceholder: string }> = [
  { kind: "tamanho", title: "Tamanhos", helper: "Ex.: Broto, Grande, Família. Cadastre o nome e a quantidade de fatias; o preço é definido dentro de cada pizza.", pricePlaceholder: "Quantidade de fatias" },
  { kind: "massa", title: "Tipos de massas", helper: "Massas disponíveis para pizzas.", pricePlaceholder: "Preço extra, normalmente 0" },
  { kind: "borda", title: "Bordas", helper: "Bordas com cobrança adicional. A foto aparece no cardápio na hora de escolher a borda.", pricePlaceholder: "Preço adicional" },
  { kind: "adicional", title: "Adicionais", helper: "Ingredientes extras por produto. A foto aparece no cardápio na hora de escolher os extras.", pricePlaceholder: "Preço adicional" },
];

function PizzaOptionGroup({ group, rows, hasError }: { group: (typeof groups)[number]; rows: PizzaOption[]; hasError: boolean }) {
  const valueLabel = group.kind === "tamanho" ? "Fatias" : "Preço";
  const step = group.kind === "tamanho" ? "1" : "0.01";
  // Borda e adicional aparecem em cartões com foto no cardápio público.
  const withPhoto = group.kind === "borda" || group.kind === "adicional";

  return (
    <section>
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-[1.05rem] font-semibold text-ink">{group.title}</h2>
          <p className="text-xs text-ink-faint">{group.helper}</p>
        </div>
        <details className="group relative">
          <summary className="inline-flex h-9 cursor-pointer list-none items-center rounded-lg border border-line bg-white px-3.5 text-xs font-medium text-ink-body transition marker:hidden hover:border-brand hover:text-brand">
            Adicionar
          </summary>
          <form action={savePizzaOption} className="absolute right-0 z-20 mt-2 w-[min(92vw,380px)] rounded-2xl border border-line bg-white p-5 shadow-2xl">
            <input type="hidden" name="return_to" value={returnTo} />
            <input type="hidden" name="kind" value={group.kind} />
            <h3 className="text-[0.95rem] font-semibold text-ink">Nova opção</h3>
            <div className="mt-4 grid gap-2.5">
              <input className={rowInput} name="name" placeholder="Nome" required />
              <input className={rowInput} name="price" type="number" min="0" step={step} placeholder={group.pricePlaceholder} defaultValue={0} />
              {withPhoto && <span className="flex items-center gap-2 text-xs text-ink-faint"><OptionPhotoInput label="nova opção" /> Foto (opcional)</span>}
              <label className={checkLabel}><input name="active" type="checkbox" defaultChecked className="accent-brand" /> Ativo</label>
              <button className={`${saveBtn} mt-1 w-full`}>Cadastrar</button>
            </div>
          </form>
        </details>
      </div>

      <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-[0_1px_2px_rgba(27,26,23,0.04)]">
        {rows.map((option) => (
          <div key={option.id} className="flex flex-wrap items-center gap-2 border-t border-line-soft px-3 py-2.5 first:border-t-0">
            <form action={savePizzaOption} className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
              <input type="hidden" name="return_to" value={returnTo} />
              <input type="hidden" name="id" value={option.id} />
              <input type="hidden" name="kind" value={option.kind} />
              {withPhoto && <OptionPhotoInput currentUrl={option.image_url} label={option.name} />}
              <input className={`${rowInput} min-w-[140px] flex-1`} name="name" defaultValue={option.name} aria-label="Nome" />
              <input className={`${rowInput} w-24`} name="price" type="number" min="0" step={step} defaultValue={option.price} aria-label={valueLabel} title={valueLabel} />
              <label className={checkLabel}><input name="active" type="checkbox" defaultChecked={option.active} className="accent-brand" /> Ativo</label>
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
        {!rows.length && !hasError && <p className="px-4 py-8 text-center text-sm text-ink-faint">Nenhuma opção cadastrada.</p>}
      </div>
    </section>
  );
}

const ruleChoices: Record<"crust" | "addon", Array<{ value: ChoiceRule; title: string; detail: string }>> = {
  crust: [
    { value: "optional", title: "Opcional", detail: "O cliente pode seguir sem responder; a pizza sai sem borda recheada." },
    { value: "ask", title: "Escolha obrigatória", detail: "O cliente precisa escolher uma borda ou “Sem borda recheada”." },
    { value: "required", title: "Borda recheada obrigatória", detail: "Toda pizza precisa de uma borda recheada." },
  ],
  addon: [
    { value: "optional", title: "Opcional", detail: "O cliente pode seguir sem responder." },
    { value: "ask", title: "Resposta obrigatória", detail: "O cliente precisa responder se quer ou não adicionais." },
    { value: "required", title: "Adicional obrigatório", detail: "O cliente precisa escolher ao menos um adicional." },
  ],
};

// Vale para os pedidos do site: o configurador do cardápio segue a regra e o
// servidor recusa o pedido que chegar sem a resposta exigida.
function ChoiceRulesForm({ crust, addon }: { crust: ChoiceRule; addon: ChoiceRule }) {
  const group = (name: string, title: string, current: ChoiceRule, choices: (typeof ruleChoices)["crust"]) => (
    <fieldset>
      <legend className="text-sm font-semibold text-ink">{title}</legend>
      <div className="mt-2 grid gap-2 sm:grid-cols-3">
        {choices.map((choice) => (
          <label key={choice.value} className="flex cursor-pointer gap-2.5 rounded-xl border border-line bg-white p-3 transition hover:border-brand has-[:checked]:border-brand has-[:checked]:bg-brand-soft">
            <input type="radio" name={name} value={choice.value} defaultChecked={current === choice.value} className="mt-0.5 accent-brand" />
            <span>
              <span className="block text-sm font-semibold text-ink">{choice.title}</span>
              <span className="block text-xs text-ink-faint">{choice.detail}</span>
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
  return (
    <form action={savePizzaChoiceRules} className="space-y-4 rounded-2xl border border-line bg-white p-4 shadow-[0_1px_2px_rgba(27,26,23,0.04)]">
      <input type="hidden" name="return_to" value={returnTo} />
      <div>
        <h2 className="text-[1.05rem] font-semibold text-ink">Regras do pedido</h2>
        <p className="text-xs text-ink-faint">O que o cliente precisa escolher ao montar a pizza no cardápio online. Pedido do site sem a resposta exigida é recusado.</p>
      </div>
      {group("crust_choice_rule", "Borda", crust, ruleChoices.crust)}
      {group("addon_choice_rule", "Adicionais", addon, ruleChoices.addon)}
      <button className={saveBtn}>Salvar regras</button>
    </form>
  );
}

async function PizzaOptionsPage({ searchParams }: { searchParams: Promise<{ status: string; error: string }> }) {
  const { supabase, restaurant } = await requireRestaurant();
  const sp = await searchParams;
  const { data, error } = await supabase.from("pizza_options").select("*").eq("restaurant_id", restaurant.id).order("kind").order("name");
  const options = (data ?? []) as PizzaOption[];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink flex items-center gap-3"><Icon3D icon={Pizza} tone="red" size="sm" /><span className="min-w-0">Opções de pizza</span></h1>
        <p className="text-sm text-ink-faint">Tamanhos, massas, bordas e adicionais usados nas pizzas.</p>
      </div>
      <ActionFeedback status={sp.status} error={sp.error} />
      <ChoiceRulesForm crust={choiceRule(restaurant.crust_choice_rule)} addon={choiceRule(restaurant.addon_choice_rule)} />
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
  return <><PizzaOptionsPage searchParams={searchParams} /></>;
}
