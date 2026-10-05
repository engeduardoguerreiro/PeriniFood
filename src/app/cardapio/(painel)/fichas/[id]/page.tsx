import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Printer } from "lucide-react";
import { requireRestaurant } from "@/lib/auth";
import { ActionFeedback } from "@/components/action-feedback";
import { SubmitButton } from "@/components/submit-button";
import { saveRecipe } from "@/app/actions";
import { isMissingRecipesTable, listToLines, parseRecipe } from "@/lib/recipes";
import type { Product } from "@/lib/types";

const field = "mt-1 w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink-body outline-none transition focus:border-brand";
const label = "text-[0.65rem] font-semibold uppercase tracking-wide text-ink-faint";

export default async function RecipeEditPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ status?: string; error?: string }>;
}) {
  const { supabase, restaurant } = await requireRestaurant();
  const { id } = await params;
  const sp = await searchParams;

  const { data: product } = await supabase
    .from("products")
    .select("id, name, image_url")
    .eq("restaurant_id", restaurant.id)
    .eq("id", id)
    .maybeSingle();
  if (!product) notFound();
  const item = product as Product;

  const recipeResult = await supabase.from("product_recipes").select("*").eq("product_id", id).maybeSingle();
  const recipe = parseRecipe(recipeResult.data as Record<string, unknown> | null);
  const tableMissing = isMissingRecipesTable(recipeResult.error);

  return (
    <div className="space-y-5">
      <ActionFeedback status={sp.status ?? ""} error={sp.error ?? ""} />

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/cardapio/fichas" className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-faint transition hover:text-brand">
            <ArrowLeft size={13} /> Todas as fichas
          </Link>
          <h1 className="mt-1.5 text-2xl font-semibold tracking-tight text-ink">{item.name}</h1>
          <p className="text-sm text-ink-faint">Ficha técnica de produção — usada pela cozinha, não aparece no cardápio.</p>
        </div>
        <a
          href={`/ficha/${item.id}/print`}
          target="_blank"
          className="inline-flex items-center gap-2 rounded-xl border border-line bg-white px-4 py-2.5 text-sm font-medium text-ink-body transition hover:border-brand hover:text-brand"
        >
          <Printer size={15} /> Imprimir
        </a>
      </div>

      {tableMissing && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Aplique a migration <code className="rounded bg-amber-100 px-1 py-0.5 text-xs">20260827000100_product_recipes.sql</code> para conseguir salvar.
        </div>
      )}

      <form action={saveRecipe} className="space-y-5">
        <input type="hidden" name="product_id" value={item.id} />

        <section className="rounded-2xl border border-line bg-white p-5 shadow-[0_1px_2px_rgba(27,26,23,0.04)]">
          <div>
            <label className={label}>Rendimento / tamanho</label>
            <input name="yield_label" defaultValue={recipe?.yield_label ?? ""} placeholder="Ex.: Pizza grande 35 cm — 8 fatias" className={field} />
          </div>
        </section>

        <div className="grid gap-5 lg:grid-cols-2">
          <section className="rounded-2xl border border-line bg-white p-5 shadow-[0_1px_2px_rgba(27,26,23,0.04)]">
            <label className={label}>Ingredientes</label>
            <p className="mt-1 text-xs text-ink-faint">Um por linha, com a quantidade. Ex.: 250 g de mussarela</p>
            <textarea
              name="ingredients"
              rows={10}
              defaultValue={listToLines(recipe?.ingredients ?? [])}
              placeholder={"250 g de mussarela\n80 g de provolone ralado\nCatupiry para finalização\n4 azeitonas\nOrégano"}
              className={`${field} font-mono text-[13px] leading-6`}
            />
          </section>

          <section className="rounded-2xl border border-line bg-white p-5 shadow-[0_1px_2px_rgba(27,26,23,0.04)]">
            <label className={label}>Montagem</label>
            <p className="mt-1 text-xs text-ink-faint">Um passo por linha, na ordem. A numeração sai automática na impressão.</p>
            <textarea
              name="steps"
              rows={10}
              defaultValue={listToLines(recipe?.steps ?? [])}
              placeholder={"Distribuir a mussarela uniformemente sobre a pizza.\nAcrescentar o provolone ralado por cima.\nAplicar o Catupiry formando um quadriculado.\nFinalizar com orégano."}
              className={`${field} font-mono text-[13px] leading-6`}
            />
          </section>
        </div>

        <section className="rounded-2xl border border-line bg-white p-5 shadow-[0_1px_2px_rgba(27,26,23,0.04)]">
          <label className={label}>Padrão visual</label>
          <p className="mt-1 text-xs text-ink-faint">Como o produto tem que sair para o cliente.</p>
          <textarea
            name="visual_standard"
            rows={3}
            defaultValue={recipe?.visual_standard ?? ""}
            placeholder="Cobertura uniforme de queijos, Catupiry em linhas formando quadriculado, 4 azeitonas visíveis e finalização com orégano."
            className={field}
          />

          <div className="mt-4">
            <label className={label}>Observações internas (não sai na impressão)</label>
            <textarea name="notes" rows={2} defaultValue={recipe?.notes ?? ""} className={field} />
          </div>
        </section>

        <SubmitButton>Salvar ficha</SubmitButton>
      </form>
    </div>
  );
}
