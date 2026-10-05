import Link from "next/link";
import { AlertTriangle, ClipboardList, Pencil, Printer, ClipboardCheck } from "lucide-react";
import { requireRestaurant } from "@/lib/auth";
import { ActionFeedback } from "@/components/action-feedback";
import { isMissingRecipesTable, isRecipeFilled, parseRecipe } from "@/lib/recipes";
import type { Product } from "@/lib/types";
import { Icon3D } from "@/components/ui/icon-3d";

// Lista TODOS os produtos do cardápio automaticamente: a ficha não é um
// cadastro à parte, é um complemento do produto que já existe.
export default async function RecipesPage({ searchParams }: { searchParams: Promise<{ status?: string; error?: string }> }) {
  const { supabase, restaurant } = await requireRestaurant();
  const sp = await searchParams;

  const [{ data: productRows }, recipesResult] = await Promise.all([
    supabase
      .from("products")
      .select("id, name, image_url, active, categories(name)")
      .eq("restaurant_id", restaurant.id)
      .order("name"),
    supabase.from("product_recipes").select("*").eq("restaurant_id", restaurant.id),
  ]);

  const tableMissing = isMissingRecipesTable(recipesResult.error);
  const products = (productRows ?? []) as unknown as (Product & { categories: { name: string } | null })[];
  const recipeByProduct = new Map(
    (recipesResult.data ?? []).map((row) => [(row as Record<string, unknown>).product_id as string, parseRecipe(row as Record<string, unknown>)]),
  );

  const preenchidas = products.filter((p) => isRecipeFilled(recipeByProduct.get(p.id) ?? null)).length;

  return (
    <div className="space-y-5">
      <ActionFeedback status={sp.status ?? ""} error={sp.error ?? ""} />

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink flex items-center gap-3"><Icon3D icon={ClipboardCheck} tone="amber" size="sm" /><span className="min-w-0">Fichas técnicas</span></h1>
          <p className="text-sm text-ink-faint">
            {preenchidas} de {products.length} produtos com ficha preenchida. Todo produto do cardápio aparece aqui automaticamente.
          </p>
        </div>
      </div>

      {tableMissing && (
        <div className="flex items-start gap-2.5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          <p>
            Falta aplicar a migration{" "}
            <code className="rounded bg-amber-100 px-1 py-0.5 text-xs">supabase/migrations/20260827000100_product_recipes.sql</code> no banco para
            começar a salvar as fichas.
          </p>
        </div>
      )}

      <section className="overflow-hidden rounded-2xl border border-line bg-white shadow-[0_1px_2px_rgba(27,26,23,0.04)]">
        {products.map((product) => {
          const recipe = recipeByProduct.get(product.id) ?? null;
          const filled = isRecipeFilled(recipe);
          return (
            <div key={product.id} className="flex items-center gap-3 border-b border-line-soft px-4 py-3 last:border-0 hover:bg-[#faf9f6]">
              <div className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-lg border border-line bg-[#faf9f6] text-[#c4bdb0]">
                {product.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={product.image_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <ClipboardList size={16} />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-ink">{product.name}</p>
                <p className="truncate text-xs text-ink-faint">
                  {product.categories?.name ?? "Sem categoria"}
                  {!product.active && " · inativo"}
                  {filled ? ` · ${recipe?.ingredients.length ?? 0} ingredientes, ${recipe?.steps.length ?? 0} passos` : ""}
                </p>
              </div>

              <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[0.65rem] font-medium ${filled ? "bg-emerald-50 text-emerald-700" : "bg-[#f1efea] text-ink-faint"}`}>
                {filled ? "Preenchida" : "Em branco"}
              </span>

              <Link
                href={`/cardapio/fichas/${product.id}`}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-line bg-white text-ink-soft transition hover:border-brand hover:text-brand"
                aria-label={`Editar ficha de ${product.name}`}
              >
                <Pencil size={15} />
              </Link>

              {filled && (
                <a
                  href={`/ficha/${product.id}/print`}
                  target="_blank"
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-line bg-white text-ink-soft transition hover:border-brand hover:text-brand"
                  aria-label={`Imprimir ficha de ${product.name}`}
                >
                  <Printer size={15} />
                </a>
              )}
            </div>
          );
        })}

        {!products.length && <p className="p-10 text-center text-sm text-ink-faint">Cadastre produtos no cardápio para montar as fichas.</p>}
      </section>
    </div>
  );
}
