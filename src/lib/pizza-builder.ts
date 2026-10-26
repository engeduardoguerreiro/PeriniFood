// Regras do configurador do cardápio público (montagem em etapas), sem React e
// sem dependências: roda no navegador e nos testes (scripts/test-pizza-builder.mjs).
// O preço aqui é só a prévia; o servidor reprecifica tudo em order-pricing.ts,
// e as regras abaixo espelham as de lá (sabor mais caro no tamanho escolhido,
// mesmo tamanho para todos os sabores, opções do produto do 1º sabor).
import type { ChoiceRule, PizzaOption, Product, ProductOption, ProductOptionItem, ProductVariant } from "./types";

export type SelectedOption = { name: string; price: number };

// Formato do item no carrinho (sessionStorage) e no campo "cart" do checkout.
export type CartLine = {
  id: string;
  name: string;
  price: number;
  quantity: number;
  variantId: string | null;
  variantName: string | null;
  dough: SelectedOption | null;
  crust: SelectedOption | null;
  additions: SelectedOption[];
  flavorCount: number;
  flavors: string[];
  notes: string;
  // Respostas explícitas "sem borda recheada" e "não quero adicionais": o servidor
  // as exige quando a loja pede resposta (regra "ask") e as leva para a comanda.
  noCrust?: boolean;
  noAdditions?: boolean;
};

export type ChoiceRules = { crust: ChoiceRule; addons: ChoiceRule };
export const defaultChoiceRules: ChoiceRules = { crust: "ask", addons: "ask" };

export function choiceRule(value: unknown): ChoiceRule {
  return value === "optional" || value === "required" ? value : "ask";
}

export const cartStorageKey = (slug: string) => `gastroflow_cart_${slug}`;
// Marcado no envio do checkout; a página do pedido limpa o carrinho ao ver a marca.
// Se o envio falhar, o cliente volta ao checkout com o carrinho intacto.
export const cartSubmittedKey = (slug: string) => `perinifood_cart_enviado_${slug}`;

export function lineUnitPrice(item: Pick<CartLine, "price" | "dough" | "crust" | "additions">) {
  return Number(item.price) + Number(item.dough?.price ?? 0) + Number(item.crust?.price ?? 0) + item.additions.reduce((sum, addition) => sum + Number(addition.price), 0);
}

export function lineTotal(item: CartLine) {
  return lineUnitPrice(item) * item.quantity;
}

export function normalizeLabel(value: string | null | undefined) {
  return (value ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

// "BROTO" → "Broto": os tamanhos costumam ser cadastrados em caixa alta.
export function sizeLabel(value: string) {
  return value === value.toUpperCase() ? value.toLowerCase().replace(/(^|\s)\S/g, (letter) => letter.toUpperCase()) : value;
}

type GroupName = "Tipos de Massas" | "Bordas" | "Adicionais";

function optionKind(groupName: GroupName) {
  if (groupName === "Tipos de Massas") return "massa";
  if (groupName === "Bordas") return "borda";
  return "adicional";
}

// Opções que o cadastro do produto permite (massas, bordas e adicionais marcados
// na pizza), com o preço vigente em Opções pizza. Antes as bordas vinham todas do
// cadastro global e a pizza doce oferecia borda salgada.
export type OptionItem = ProductOptionItem & { image_url: string | null };

export function groupOptions(options: ProductOption[], productId: string, groupName: GroupName, pizzaOptions: PizzaOption[]): OptionItem[] {
  const group = options.find((option) => option.product_id === productId && option.name === groupName);
  const activeOptions = new Map(pizzaOptions.filter((option) => option.active && option.kind === optionKind(groupName)).map((option) => [option.name, option]));
  return (group?.product_option_items ?? [])
    .filter((item) => item.active && activeOptions.has(item.name))
    .map((item) => ({ ...item, additional_price: activeOptions.get(item.name)?.price ?? item.additional_price, image_url: activeOptions.get(item.name)?.image_url ?? null }));
}

// Regras do grupo no produto (obrigatório, mínimo, máximo), as mesmas que o servidor confere.
export function groupRule(options: ProductOption[], productId: string, groupName: GroupName) {
  const group = options.find((option) => option.product_id === productId && option.name === groupName);
  const min = group ? (group.required ? Math.max(1, group.min_choices) : group.min_choices) : 0;
  return { min, max: group?.max_choices ?? null };
}

export type BuilderCatalog = {
  products: Product[];
  variants: ProductVariant[];
  options: ProductOption[];
  pizzaOptions: PizzaOption[];
  // Teto da loja (restaurants.max_pizza_flavors), limitado a 4 como no PDV.
  maxFlavors: number;
  // Regras da loja para borda e adicionais (padrão: precisa responder).
  rules?: ChoiceRules;
};

export type BuilderContext = {
  catalog: BuilderCatalog;
  pizza: boolean;
  categoryId: string | null;
  // Produto sem sabores (bebida com tamanho, por exemplo): fixo.
  productId: string | null;
  flavors: Product[];
  variantsByProduct: Map<string, ProductVariant[]>;
};

export function createBuilderContext(catalog: BuilderCatalog, product: Product, pizza: boolean): BuilderContext {
  const variantsByProduct = new Map<string, ProductVariant[]>();
  for (const variant of catalog.variants) {
    if (!variant.active) continue;
    const list = variantsByProduct.get(variant.product_id) ?? [];
    list.push(variant);
    variantsByProduct.set(variant.product_id, list);
  }
  // Sabores = pizzas ativas da mesma categoria (o servidor recusa sabor de outra categoria).
  const flavors = pizza
    ? catalog.products.filter((item) => item.active && item.category_id === product.category_id).sort((a, b) => a.name.localeCompare(b.name, "pt-BR"))
    : [];
  return { catalog, pizza, categoryId: product.category_id, productId: pizza ? null : product.id, flavors, variantsByProduct };
}

export function flavorProduct(ctx: BuilderContext, name: string) {
  return ctx.flavors.find((product) => product.name === name) ?? null;
}

// Preço de um sabor num tamanho; null = o sabor não existe nesse tamanho.
export function flavorPrice(ctx: BuilderContext, name: string, sizeName: string | null) {
  const product = flavorProduct(ctx, name);
  if (!product) return null;
  const sizes = ctx.variantsByProduct.get(product.id) ?? [];
  if (!sizes.length) return Number(product.price);
  if (!sizeName) return null;
  const variant = sizes.find((item) => item.name === sizeName);
  return variant ? Number(variant.price) : null;
}

// Pizza com vários sabores custa o do sabor mais caro (mesma regra do servidor).
export function pizzaBasePrice(ctx: BuilderContext, flavors: string[], sizeName: string | null) {
  if (!flavors.length) return null;
  let highest = 0;
  for (const name of flavors) {
    const price = flavorPrice(ctx, name, sizeName);
    if (price == null) return null;
    highest = Math.max(highest, price);
  }
  return highest;
}

// Tamanhos disponíveis, do mais barato ao mais caro (Broto, Média, Grande…).
export function builderSizes(ctx: BuilderContext) {
  const products = ctx.pizza ? ctx.flavors : ctx.catalog.products.filter((product) => product.id === ctx.productId);
  const floor = new Map<string, number>();
  for (const product of products) {
    for (const variant of ctx.variantsByProduct.get(product.id) ?? []) {
      floor.set(variant.name, Math.min(floor.get(variant.name) ?? Infinity, Number(variant.price)));
    }
  }
  return [...floor.entries()].sort((a, b) => a[1] - b[1]).map(([name, from]) => ({ name, from }));
}

export type CrustChoice = "none" | "chosen" | null;
export type ExtrasChoice = "no" | "yes" | null;

export type BuilderDraft = {
  sizeName: string | null;
  flavorCount: number;
  flavors: string[];
  dough: SelectedOption | null;
  crust: SelectedOption | null;
  // Decisão explícita da borda: "none" = sem borda recheada, null = ainda não respondeu.
  crustChoice: CrustChoice;
  extras: ExtrasChoice;
  additions: SelectedOption[];
  quantity: number;
  notes: string;
};

// O item do pedido é o produto do 1º sabor, no tamanho escolhido. Antes o item ficava
// preso à pizza clicada: trocando os sabores, a comanda e o preço ainda a usavam.
export function primaryProduct(ctx: BuilderContext, draft: Pick<BuilderDraft, "flavors">) {
  if (!ctx.pizza) return ctx.catalog.products.find((product) => product.id === ctx.productId) ?? null;
  return draft.flavors[0] ? flavorProduct(ctx, draft.flavors[0]) : null;
}

export function primaryVariant(ctx: BuilderContext, draft: Pick<BuilderDraft, "flavors" | "sizeName">) {
  const product = primaryProduct(ctx, draft);
  if (!product || !draft.sizeName) return null;
  return (ctx.variantsByProduct.get(product.id) ?? []).find((variant) => variant.name === draft.sizeName) ?? null;
}

export function doughOptions(ctx: BuilderContext, draft: Pick<BuilderDraft, "flavors">) {
  const product = primaryProduct(ctx, draft);
  return ctx.pizza && product ? groupOptions(ctx.catalog.options, product.id, "Tipos de Massas", ctx.catalog.pizzaOptions) : [];
}

export function crustOptions(ctx: BuilderContext, draft: Pick<BuilderDraft, "flavors">) {
  const product = primaryProduct(ctx, draft);
  return ctx.pizza && product ? groupOptions(ctx.catalog.options, product.id, "Bordas", ctx.catalog.pizzaOptions) : [];
}

export function additionOptions(ctx: BuilderContext, draft: Pick<BuilderDraft, "flavors">) {
  const product = primaryProduct(ctx, draft);
  return product ? groupOptions(ctx.catalog.options, product.id, "Adicionais", ctx.catalog.pizzaOptions) : [];
}

export function rulesOf(ctx: BuilderContext): ChoiceRules {
  return ctx.catalog.rules ?? defaultChoiceRules;
}

// Borda recheada obrigatória: pela regra da loja ou pelo cadastro do produto.
export function crustRequired(ctx: BuilderContext, draft: Pick<BuilderDraft, "flavors">) {
  const product = primaryProduct(ctx, draft);
  if (!product) return false;
  return rulesOf(ctx).crust === "required" || groupRule(ctx.catalog.options, product.id, "Bordas").min > 0;
}

export function additionsRule(ctx: BuilderContext, draft: Pick<BuilderDraft, "flavors">) {
  const product = primaryProduct(ctx, draft);
  const rule = product ? groupRule(ctx.catalog.options, product.id, "Adicionais") : { min: 0, max: null };
  return rulesOf(ctx).addons === "required" ? { ...rule, min: Math.max(1, rule.min) } : rule;
}

export type StepId = "tamanho" | "sabores" | "massa" | "borda" | "adicionais" | "revisao";

// Etapas que este produto tem. Massa com uma única opção já vem marcada e não vira
// tela; borda e adicionais só aparecem se a loja os cadastrou para o produto.
export function builderSteps(ctx: BuilderContext, draft: BuilderDraft): StepId[] {
  const steps: StepId[] = [];
  if (builderSizes(ctx).length) steps.push("tamanho");
  if (ctx.pizza) steps.push("sabores");
  if (doughOptions(ctx, draft).length > 1) steps.push("massa");
  if (crustOptions(ctx, draft).length) steps.push("borda");
  if (additionOptions(ctx, draft).length) steps.push("adicionais");
  steps.push("revisao");
  return steps;
}

export function basePrice(ctx: BuilderContext, draft: BuilderDraft) {
  if (ctx.pizza) return pizzaBasePrice(ctx, draft.flavors, draft.sizeName);
  const product = primaryProduct(ctx, draft);
  if (!product) return null;
  const sizes = ctx.variantsByProduct.get(product.id) ?? [];
  if (!sizes.length) return Number(product.price);
  const variant = sizes.find((item) => item.name === draft.sizeName);
  return variant ? Number(variant.price) : null;
}

// Mensagem do que falta na etapa; null = pode continuar.
export function stepProblem(ctx: BuilderContext, draft: BuilderDraft, step: StepId): string | null {
  switch (step) {
    case "tamanho":
      return draft.sizeName ? null : "Escolha o tamanho.";
    case "sabores": {
      if (!draft.flavors.length) return "Escolha o sabor.";
      if (draft.flavors.length < draft.flavorCount) {
        const missing = draft.flavorCount - draft.flavors.length;
        return `Escolha mais ${missing} sabor${missing > 1 ? "es" : ""}.`;
      }
      if (basePrice(ctx, draft) == null) return "Algum sabor não está disponível neste tamanho.";
      return null;
    }
    case "massa":
      return draft.dough ? null : "Escolha o tipo de massa.";
    case "borda":
      if (draft.crustChoice === "chosen" && draft.crust) return null;
      if (crustRequired(ctx, draft)) return "Escolha a borda.";
      // Regra "optional": seguir sem responder vale "sem borda".
      if (draft.crustChoice === "none" || rulesOf(ctx).crust === "optional") return null;
      return "Escolha a borda.";
    case "adicionais": {
      const rule = additionsRule(ctx, draft);
      if (rule.max != null && draft.additions.length > rule.max) return `Escolha no máximo ${rule.max}.`;
      if (rule.min > 0) return draft.extras !== "no" && draft.additions.length >= rule.min ? null : rule.min > 1 ? `Escolha ao menos ${rule.min} adicionais.` : "Escolha ao menos um adicional.";
      if (draft.extras === "no") return null;
      if (draft.extras === "yes") return draft.additions.length ? null : "Marque ao menos um adicional ou escolha “Não quero adicionais”.";
      return rulesOf(ctx).addons === "optional" ? null : "Responda se deseja adicionais.";
    }
    case "revisao":
      return draft.quantity >= 1 ? null : "Quantidade inválida.";
  }
}

export function firstIncompleteStep(ctx: BuilderContext, draft: BuilderDraft) {
  return builderSteps(ctx, draft).find((step) => stepProblem(ctx, draft, step) != null) ?? "revisao";
}

// Troca de tamanho: sabores que não existem no novo tamanho saem (e o cliente é
// avisado); massa, borda e adicionais continuam como estavam.
export function changeSize(ctx: BuilderContext, draft: BuilderDraft, sizeName: string) {
  const removed = draft.flavors.filter((name) => flavorPrice(ctx, name, sizeName) == null);
  const next = { ...draft, sizeName, flavors: draft.flavors.filter((name) => !removed.includes(name)) };
  return { draft: reconcileOptions(ctx, next), removed };
}

// O 1º sabor define o produto e, com ele, as massas, bordas e adicionais permitidos: o que
// deixou de valer é retirado em vez de ser recusado só no envio do pedido.
export function reconcileOptions(ctx: BuilderContext, draft: BuilderDraft): BuilderDraft {
  const doughs = doughOptions(ctx, draft);
  const additions = additionOptions(ctx, draft);
  const price = (list: ProductOptionItem[], name: string) => list.find((item) => item.name === name);
  let dough = draft.dough && price(doughs, draft.dough.name) ? { name: draft.dough.name, price: Number(price(doughs, draft.dough.name)!.additional_price) } : null;
  if (!dough && doughs.length === 1) dough = { name: doughs[0].name, price: Number(doughs[0].additional_price) };
  const kept = draft.additions.filter((item) => price(additions, item.name)).map((item) => ({ name: item.name, price: Number(price(additions, item.name)!.additional_price) }));
  const crusts = crustOptions(ctx, draft);
  const crust = draft.crust && price(crusts, draft.crust.name) ? { name: draft.crust.name, price: Number(price(crusts, draft.crust.name)!.additional_price) } : null;
  return {
    ...draft,
    dough,
    crust,
    crustChoice: draft.crustChoice === "chosen" && !crust ? null : draft.crustChoice,
    additions: kept,
    extras: draft.extras === "yes" && !kept.length && !additions.length ? null : draft.extras,
  };
}

// Toque num cartão de sabor. Com um sabor só, o toque troca o sabor; com vários,
// marca até o limite e desmarca se já estava marcado.
export function toggleFlavor(ctx: BuilderContext, draft: BuilderDraft, name: string): { draft: BuilderDraft; full: boolean } {
  if (draft.flavors.includes(name)) return { draft: reconcileOptions(ctx, { ...draft, flavors: draft.flavors.filter((item) => item !== name) }), full: false };
  if (draft.flavorCount === 1) return { draft: reconcileOptions(ctx, { ...draft, flavors: [name] }), full: false };
  if (draft.flavors.length >= draft.flavorCount) return { draft, full: true };
  return { draft: reconcileOptions(ctx, { ...draft, flavors: [...draft.flavors, name] }), full: false };
}

export function setFlavorCount(ctx: BuilderContext, draft: BuilderDraft, count: number): BuilderDraft {
  const limit = Math.min(Math.max(1, count), maxFlavorsFor(ctx));
  return reconcileOptions(ctx, { ...draft, flavorCount: limit, flavors: draft.flavors.slice(0, limit) });
}

export function maxFlavorsFor(ctx: BuilderContext) {
  if (!ctx.pizza) return 1;
  return Math.min(4, Math.max(1, Math.floor(Number(ctx.catalog.maxFlavors) || 1)));
}

export function newDraft(ctx: BuilderContext, options: { firstFlavor?: string | null; sizeName?: string | null }): BuilderDraft {
  const sizes = builderSizes(ctx).map((size) => size.name);
  const sizeName = options.sizeName && sizes.includes(options.sizeName) ? options.sizeName : sizes.length === 1 ? sizes[0] : null;
  const flavors = options.firstFlavor && flavorProduct(ctx, options.firstFlavor) && (!sizeName || flavorPrice(ctx, options.firstFlavor, sizeName) != null) ? [options.firstFlavor] : [];
  return reconcileOptions(ctx, { sizeName, flavorCount: 1, flavors, dough: null, crust: null, crustChoice: null, extras: null, additions: [], quantity: 1, notes: "" });
}

// Edição de um item do carrinho: recupera todas as escolhas, inclusive as respostas
// "sem borda"/"sem adicionais". Item antigo sem essas respostas volta como pendente.
export function draftFromLine(ctx: BuilderContext, line: CartLine): BuilderDraft {
  const flavors = ctx.pizza ? (line.flavors.length ? line.flavors : [line.name]) : [];
  return reconcileOptions(ctx, {
    sizeName: line.variantName,
    flavorCount: Math.min(maxFlavorsFor(ctx), Math.max(1, flavors.length)),
    flavors,
    dough: line.dough,
    crust: line.crust,
    crustChoice: line.crust ? "chosen" : line.noCrust ? "none" : null,
    extras: line.additions.length ? "yes" : line.noAdditions ? "no" : null,
    additions: line.additions,
    quantity: Math.max(1, Number(line.quantity) || 1),
    notes: line.notes ?? "",
  });
}

export function draftToLine(ctx: BuilderContext, draft: BuilderDraft): CartLine | null {
  const steps = builderSteps(ctx, draft);
  if (steps.some((step) => stepProblem(ctx, draft, step))) return null;
  const product = primaryProduct(ctx, draft);
  const price = basePrice(ctx, draft);
  if (!product || price == null) return null;
  const variant = primaryVariant(ctx, draft);
  if ((ctx.variantsByProduct.get(product.id) ?? []).length && !variant) return null;
  const crust = draft.crustChoice === "chosen" ? draft.crust : null;
  // Adicional obrigatório dispensa a pergunta sim/não: vale o que foi marcado.
  const additions = draft.extras === "yes" || (additionsRule(ctx, draft).min > 0 && draft.extras !== "no") ? draft.additions : [];
  return {
    id: product.id,
    name: product.name,
    price,
    quantity: draft.quantity,
    variantId: variant?.id ?? null,
    variantName: variant?.name ?? null,
    dough: draft.dough,
    crust,
    additions,
    flavorCount: ctx.pizza ? draft.flavors.length : 0,
    flavors: ctx.pizza ? draft.flavors : [],
    notes: draft.notes.trim(),
    // Sem borda/sem adicionais só quando a etapa existia (o cliente passou por ela).
    noCrust: !crust && crustOptions(ctx, draft).length > 0,
    noAdditions: !additions.length && additionOptions(ctx, draft).length > 0,
  };
}

// Carrinho salvo no aparelho: só aceita o formato esperado (dados de sessionStorage
// podem estar corrompidos ou ser de uma versão antiga).
export function parseStoredCart(raw: string | null): CartLine[] {
  if (!raw) return [];
  try {
    const list = JSON.parse(raw) as unknown;
    if (!Array.isArray(list)) return [];
    return list.filter((item): item is CartLine => Boolean(item) && typeof item === "object"
      && typeof (item as CartLine).id === "string" && typeof (item as CartLine).name === "string"
      && Number.isFinite(Number((item as CartLine).price)) && Number.isInteger(Number((item as CartLine).quantity)) && Number((item as CartLine).quantity) > 0
      && Array.isArray((item as CartLine).additions) && Array.isArray((item as CartLine).flavors));
  } catch {
    return [];
  }
}

// Linhas de detalhe para carrinho, checkout e revisão.
export function lineDetails(item: CartLine) {
  return [
    item.flavors.length > 1 ? `${item.flavors.length} sabores: ${item.flavors.join(" / ")}` : "",
    item.dough?.name ? `Massa: ${item.dough.name}` : "",
    item.crust?.name ? `Borda: ${item.crust.name}` : item.noCrust ? "Sem borda recheada" : "",
    item.noAdditions && item.flavors.length ? "Sem adicionais" : "",
    item.additions.length ? `Adicionais: ${item.additions.map((a) => a.name).join(", ")}` : "",
    item.notes ? `Obs.: ${item.notes}` : "",
  ].filter(Boolean);
}
