// Ficha técnica de produção (um documento por produto).
export type Recipe = {
  product_id: string;
  yield_label: string | null;
  ingredients: string[];
  steps: string[];
  visual_standard: string | null;
  notes: string | null;
};

// A migration 20260827000100_product_recipes.sql pode ainda não ter sido
// aplicada. Nesse caso a tela avisa em vez de quebrar.
export function isMissingRecipesTable(error: { code?: string; message?: string } | null) {
  if (!error) return false;
  return error.code === "42P01" || /does not exist|schema cache/i.test(error.message ?? "");
}

function asList(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String).filter((item) => item.trim().length > 0);
  if (typeof value === "string" && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.map(String) : [];
    } catch {
      return [];
    }
  }
  return [];
}

export function parseRecipe(row: Record<string, unknown> | null | undefined): Recipe | null {
  if (!row) return null;
  return {
    product_id: row.product_id as string,
    yield_label: (row.yield_label as string) ?? null,
    ingredients: asList(row.ingredients),
    steps: asList(row.steps),
    visual_standard: (row.visual_standard as string) ?? null,
    notes: (row.notes as string) ?? null,
  };
}

// O lojista digita um item por linha — bem mais prático do que campo a campo.
export function linesToList(value: string): string[] {
  return value
    .split("\n")
    // Remove só marcador de lista de verdade ("- ", "• ", "1. ", "2) ").
    // Número seguido de espaço é QUANTIDADE ("250 g de mussarela") e permanece.
    .map((line) => line.replace(/^\s*(?:[-–—•*]\s*|\d{1,3}[.)]\s+)/, "").trim())
    .filter(Boolean)
    .slice(0, 60);
}

export function listToLines(list: string[]) {
  return list.join("\n");
}

export function isRecipeFilled(recipe: Recipe | null) {
  return Boolean(recipe && (recipe.ingredients.length || recipe.steps.length || recipe.visual_standard));
}
