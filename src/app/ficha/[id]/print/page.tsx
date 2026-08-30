/* eslint-disable @next/next/no-img-element */
import { notFound } from "next/navigation";
import { ChefHat, ClipboardList, Eye } from "lucide-react";
import { requireRestaurant } from "@/lib/auth";
import { BrowserAutoPrint } from "@/components/browser-auto-print";
import { parseRecipe } from "@/lib/recipes";
import type { Product } from "@/lib/types";

// Ficha técnica em A4 para a cozinha. Mora FORA do grupo (painel) de propósito:
// assim a folha não herda o menu lateral do sistema.
export default async function RecipePrintPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ auto?: string }>;
}) {
  const { supabase, restaurant } = await requireRestaurant();
  const { id } = await params;
  const auto = (await searchParams)?.auto === "1";

  const [{ data: product }, recipeResult] = await Promise.all([
    supabase.from("products").select("id, name, image_url, description").eq("restaurant_id", restaurant.id).eq("id", id).maybeSingle(),
    supabase.from("product_recipes").select("*").eq("product_id", id).maybeSingle(),
  ]);
  if (!product) notFound();
  const item = product as Product;
  const recipe = parseRecipe(recipeResult.data as Record<string, unknown> | null);

  const printStyles = `
    @page { size: A4; margin: 10mm; }
    @media print {
      html, body { background: #fff !important; }
      .print-hide { display: none !important; }
      .sheet { border-color: #c9b899 !important; box-shadow: none !important; }
      .sheet * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  `;

  return (
    <main className="min-h-screen bg-[#efe9df] py-6 print:bg-white print:py-0">
      <style>{printStyles}</style>
      {auto && <BrowserAutoPrint />}

      <div className="print-hide mx-auto mb-4 flex w-[210mm] max-w-full justify-between gap-2 px-4">
        <a href={`/cardapio/fichas/${item.id}`} className="rounded-lg border border-[#d9c9ae] bg-white px-3 py-2 text-xs font-bold text-[#3b2a1a]">
          Voltar à ficha
        </a>
        <a href={`/ficha/${item.id}/print?auto=1`} className="rounded-lg bg-[#3b2a1a] px-3 py-2 text-xs font-bold text-white">
          Imprimir
        </a>
      </div>

      <div className="sheet mx-auto w-[210mm] max-w-full rounded-[14px] border-[3px] border-[#d9c9ae] bg-white p-7 text-[#3b2a1a] shadow-xl print:rounded-none print:shadow-none">
        <header className="text-center">
          <h1 className="text-[42px] font-black uppercase leading-none tracking-tight">Ficha Técnica</h1>
          <div className="mt-3 flex items-center justify-center gap-3">
            <span className="h-px w-16 bg-[#d9c9ae]" />
            <span className="text-[15px] font-bold uppercase tracking-[0.18em] text-[#8a6a45]">{item.name}</span>
            <span className="h-px w-16 bg-[#d9c9ae]" />
          </div>
        </header>

        {item.image_url && (
          <div className="mt-5 overflow-hidden rounded-lg border border-[#e6dcc9]">
            <img
              src={item.image_url}
              alt=""
              className="h-[92mm] w-full object-cover"
              style={{ display: "block" }}
            />
          </div>
        )}

        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <section>
            <div className="flex items-center gap-2.5 rounded-full bg-[#f6efe4] px-3 py-2">
              <span className="grid h-8 w-8 place-items-center rounded-full border-2 border-[#c9a97a] text-[#8a6a45]"><ChefHat size={16} /></span>
              <h2 className="text-[17px] font-bold">Ingredientes</h2>
            </div>
            <ul className="mt-3 space-y-2 pl-1">
              {recipe?.ingredients.map((ingrediente, index) => (
                <li key={index} className="flex gap-2.5 text-[13.5px] leading-6">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#3b2a1a]" />
                  <span>{ingrediente}</span>
                </li>
              ))}
              {!recipe?.ingredients.length && <li className="text-[13px] italic text-[#a08c6d]">Ingredientes não preenchidos.</li>}
            </ul>
          </section>

          <section className="md:border-l md:border-dashed md:border-[#e0d2b8] md:pl-6">
            <div className="flex items-center gap-2.5 rounded-full bg-[#f6efe4] px-3 py-2">
              <span className="grid h-8 w-8 place-items-center rounded-full border-2 border-[#c9a97a] text-[#8a6a45]"><ClipboardList size={16} /></span>
              <h2 className="text-[17px] font-bold">Montagem</h2>
            </div>
            <ol className="mt-3 space-y-2.5">
              {recipe?.steps.map((passo, index) => (
                <li key={index} className="flex gap-3 text-[13.5px] leading-6">
                  <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#e8d9bd] text-[11px] font-bold text-[#6b4f2e]">
                    {index + 1}.
                  </span>
                  <span>{passo}</span>
                </li>
              ))}
              {!recipe?.steps.length && <li className="text-[13px] italic text-[#a08c6d]">Modo de montagem não preenchido.</li>}
            </ol>
          </section>
        </div>

        {recipe?.visual_standard && (
          <section className="mt-6 flex items-stretch gap-4 rounded-xl border border-[#e6dcc9] bg-[#faf6ee] p-4">
            <div className="flex shrink-0 items-center gap-2.5 pr-4">
              <span className="grid h-9 w-9 place-items-center rounded-full border-2 border-[#c9a97a] text-[#8a6a45]"><Eye size={17} /></span>
              <h2 className="text-[16px] font-bold">Padrão Visual</h2>
            </div>
            <p className="border-l border-[#e0d2b8] pl-4 text-[13px] leading-6">{recipe.visual_standard}</p>
          </section>
        )}

        {recipe?.yield_label && (
          <p className="mt-4 text-center text-[12px] font-semibold uppercase tracking-wide text-[#8a6a45]">{recipe.yield_label}</p>
        )}

        <footer className="mt-5 border-t border-[#efe6d6] pt-3 text-center text-[10.5px] uppercase tracking-wide text-[#b3a184]">
          {restaurant.name}
        </footer>
      </div>
    </main>
  );
}
