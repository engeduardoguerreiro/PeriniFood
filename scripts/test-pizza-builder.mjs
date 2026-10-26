// Testes das regras do configurador do cardápio (src/lib/pizza-builder.ts).
// Uso: node --test scripts/test-pizza-builder.mjs   (Node 23.6+ remove os tipos do .ts sozinho)
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  builderSizes, builderSteps, crustOptions, changeSize, createBuilderContext, draftFromLine, draftToLine, firstIncompleteStep,
  lineDetails, lineTotal, newDraft, parseStoredCart, pizzaBasePrice, setFlavorCount, stepProblem, toggleFlavor,
} from "../src/lib/pizza-builder.ts";

const at = "2026-01-01T00:00:00Z";
const product = (id, name, category = "pizzas", price = 0) => ({ id, restaurant_id: "r", category_id: category, product_type_id: null, name, description: null, price, image_url: null, active: true, featured: false, max_flavors: null, preparation_time: null, internal_notes: null, delivery_available: null, pickup_available: null, dine_in_available: null, sort_order: 0, stock_control_enabled: false, stock_quantity: null, created_at: at, updated_at: at, categories: null });
const variant = (product_id, name, price) => ({ id: `${product_id}-${name}`, product_id, name, price, active: true, slices: null, notes: null, sort_order: null, created_at: at });
const option = (kind, name, price) => ({ id: `${kind}-${name}`, restaurant_id: "r", kind, name, price, active: true, created_at: at });
const group = (product_id, name, items, extra = {}) => ({ id: `${product_id}-${name}`, restaurant_id: "r", product_id, name, type: name === "Adicionais" ? "multiple" : "single", required: false, min_choices: 0, max_choices: name === "Adicionais" ? null : 1, created_at: at, product_option_items: items.map((n) => ({ id: `${product_id}-${n}`, restaurant_id: "r", option_id: "x", name: n, additional_price: 0, active: true, created_at: at })), ...extra });

const products = [product("cal", "Calabresa"), product("sete", "Sete Queijos"), product("fra", "Frango"), product("ban", "Banana", "doces"), product("coca", "Coca-Cola", "bebidas", 16)];
const variants = [
  variant("cal", "BROTO", 30), variant("cal", "GRANDE", 40),
  variant("sete", "BROTO", 45), variant("sete", "GRANDE", 62),
  variant("fra", "GRANDE", 42), // Frango só na grande
  variant("ban", "BROTO", 30), variant("ban", "GRANDE", 40),
];
const pizzaOptions = [option("massa", "Tradicional", 0), option("massa", "Fina", 3), option("borda", "Cheddar", 12), option("borda", "Catupiry", 14), option("borda", "Chocolate", 10), option("adicional", "Bacon extra", 5), option("adicional", "Queijo extra", 5)];
const options = [
  group("cal", "Tipos de Massas", ["Tradicional", "Fina"]), group("cal", "Adicionais", ["Bacon extra", "Queijo extra"]), group("cal", "Bordas", ["Cheddar", "Catupiry"]),
  group("sete", "Tipos de Massas", ["Tradicional"]), group("sete", "Adicionais", ["Queijo extra"]), group("sete", "Bordas", ["Cheddar", "Catupiry"]),
  group("fra", "Tipos de Massas", ["Tradicional"]), group("fra", "Bordas", ["Catupiry"]),
  group("ban", "Tipos de Massas", ["Tradicional"]), group("ban", "Bordas", ["Chocolate"]),
];
const catalog = { products, variants, options, pizzaOptions, maxFlavors: 3 };
const pizzas = () => createBuilderContext(catalog, products[0], true);

test("tamanhos em ordem de preço e etapas da pizza", () => {
  const ctx = pizzas();
  assert.deepEqual(builderSizes(ctx).map((s) => s.name), ["BROTO", "GRANDE"]);
  const draft = newDraft(ctx, { firstFlavor: "Calabresa", sizeName: "GRANDE" });
  // Calabresa tem duas massas → etapa de massa aparece.
  assert.deepEqual(builderSteps(ctx, draft), ["tamanho", "sabores", "massa", "borda", "adicionais", "revisao"]);
  assert.equal(firstIncompleteStep(ctx, draft), "massa");
});

test("massa única já vem marcada e não vira etapa", () => {
  const ctx = pizzas();
  const draft = newDraft(ctx, { firstFlavor: "Sete Queijos", sizeName: "GRANDE" });
  assert.deepEqual(draft.dough, { name: "Tradicional", price: 0 });
  assert.ok(!builderSteps(ctx, draft).includes("massa"));
});

test("pizza de um sabor: preço do tamanho", () => {
  const ctx = pizzas();
  assert.equal(pizzaBasePrice(ctx, ["Calabresa"], "BROTO"), 30);
  assert.equal(pizzaBasePrice(ctx, ["Calabresa"], "GRANDE"), 40);
});

test("meia a meia: vale o sabor mais caro (regra do servidor)", () => {
  const ctx = pizzas();
  assert.equal(pizzaBasePrice(ctx, ["Calabresa", "Sete Queijos"], "GRANDE"), 62);
  assert.equal(pizzaBasePrice(ctx, ["Calabresa", "Frango"], "BROTO"), null, "Frango não tem broto");
});

test("item segue o 1º sabor, não a pizza clicada", () => {
  const ctx = pizzas();
  let draft = newDraft(ctx, { firstFlavor: "Sete Queijos", sizeName: "GRANDE" });
  draft = toggleFlavor(ctx, draft, "Calabresa").draft; // um sabor: o toque troca
  assert.deepEqual(draft.flavors, ["Calabresa"]);
  draft = { ...draft, dough: { name: "Tradicional", price: 0 }, crustChoice: "none", extras: "no" };
  const line = draftToLine(ctx, draft);
  assert.equal(line.id, "cal");
  assert.equal(line.variantId, "cal-GRANDE");
  assert.equal(line.price, 40);
});

test("contador de sabores e limite", () => {
  const ctx = pizzas();
  let draft = setFlavorCount(ctx, newDraft(ctx, { firstFlavor: "Calabresa", sizeName: "GRANDE" }), 2);
  assert.equal(stepProblem(ctx, draft, "sabores"), "Escolha mais 1 sabor.");
  draft = toggleFlavor(ctx, draft, "Sete Queijos").draft;
  assert.equal(stepProblem(ctx, draft, "sabores"), null);
  const full = toggleFlavor(ctx, draft, "Frango");
  assert.equal(full.full, true);
  assert.deepEqual(full.draft.flavors, ["Calabresa", "Sete Queijos"]);
  // Remover uma metade e escolher outra = substituir.
  draft = toggleFlavor(ctx, draft, "Calabresa").draft;
  draft = toggleFlavor(ctx, draft, "Frango").draft;
  assert.deepEqual(draft.flavors, ["Sete Queijos", "Frango"]);
  assert.equal(setFlavorCount(ctx, draft, 9).flavorCount, 3, "teto da loja");
  assert.deepEqual(setFlavorCount(ctx, draft, 1).flavors, ["Sete Queijos"]);
});

test("borda: decisão obrigatória, sem borda grátis permitida", () => {
  const ctx = pizzas();
  const draft = newDraft(ctx, { firstFlavor: "Sete Queijos", sizeName: "GRANDE" });
  assert.equal(stepProblem(ctx, draft, "borda"), "Escolha a borda.");
  assert.equal(stepProblem(ctx, { ...draft, crustChoice: "none" }, "borda"), null);
  assert.equal(stepProblem(ctx, { ...draft, crustChoice: "chosen", crust: null }, "borda"), "Escolha a borda.");
  const withCrust = { ...draft, crustChoice: "chosen", crust: { name: "Cheddar", price: 12 }, extras: "no" };
  assert.equal(lineTotal(draftToLine(ctx, withCrust)), 74);
  const none = draftToLine(ctx, { ...draft, crustChoice: "none", extras: "no" });
  assert.equal(none.crust, null);
  assert.equal(none.noCrust, true);
  assert.ok(lineDetails(none).includes("Sem borda recheada"));
});

test("borda obrigatória no cadastro: sem borda não vale", () => {
  const strict = { ...catalog, options: [...options.filter((g) => g.product_id !== "sete"), group("sete", "Bordas", ["Cheddar"], { required: true, min_choices: 1 }), group("sete", "Tipos de Massas", ["Tradicional"])] };
  const ctx = createBuilderContext(strict, products[1], true);
  const draft = newDraft(ctx, { firstFlavor: "Sete Queijos", sizeName: "GRANDE" });
  assert.equal(stepProblem(ctx, { ...draft, crustChoice: "none" }, "borda"), "Escolha a borda.");
});

test("adicionais: resposta obrigatória, compra opcional", () => {
  const ctx = pizzas();
  const draft = { ...newDraft(ctx, { firstFlavor: "Sete Queijos", sizeName: "GRANDE" }), crustChoice: "none" };
  assert.equal(stepProblem(ctx, draft, "adicionais"), "Responda se deseja adicionais.");
  assert.equal(stepProblem(ctx, { ...draft, extras: "no" }, "adicionais"), null);
  assert.match(stepProblem(ctx, { ...draft, extras: "yes" }, "adicionais"), /ao menos um/);
  // Nada pago vem marcado: "não quero" zera os extras mesmo que tenham sido marcados antes.
  const changedMind = draftToLine(ctx, { ...draft, extras: "no", additions: [{ name: "Queijo extra", price: 5 }] });
  assert.deepEqual(changedMind.additions, []);
  const one = draftToLine(ctx, { ...draft, extras: "yes", additions: [{ name: "Queijo extra", price: 5 }] });
  assert.equal(lineTotal(one), 67);
  assert.equal(lineTotal({ ...one, quantity: 3 }), 201);
});

test("vários adicionais e soma com borda e massa", () => {
  const ctx = pizzas();
  const draft = { ...newDraft(ctx, { firstFlavor: "Calabresa", sizeName: "BROTO" }), dough: { name: "Fina", price: 3 }, crustChoice: "chosen", crust: { name: "Catupiry", price: 14 }, extras: "yes", additions: [{ name: "Bacon extra", price: 5 }, { name: "Queijo extra", price: 5 }] };
  assert.equal(lineTotal(draftToLine(ctx, draft)), 30 + 3 + 14 + 10);
});

test("trocar o 1º sabor tira massa/adicionais que o novo produto não tem", () => {
  const ctx = pizzas();
  let draft = { ...newDraft(ctx, { firstFlavor: "Calabresa", sizeName: "GRANDE" }), dough: { name: "Fina", price: 3 }, extras: "yes", additions: [{ name: "Bacon extra", price: 5 }, { name: "Queijo extra", price: 5 }] };
  draft = toggleFlavor(ctx, draft, "Sete Queijos").draft;
  assert.deepEqual(draft.dough, { name: "Tradicional", price: 0 });
  assert.deepEqual(draft.additions.map((a) => a.name), ["Queijo extra"]);
});

test("trocar tamanho avisa o sabor indisponível e mantém o resto", () => {
  const ctx = pizzas();
  let draft = setFlavorCount(ctx, newDraft(ctx, { firstFlavor: "Calabresa", sizeName: "GRANDE" }), 2);
  draft = { ...toggleFlavor(ctx, draft, "Frango").draft, crustChoice: "chosen", crust: { name: "Cheddar", price: 12 } };
  const { draft: next, removed } = changeSize(ctx, draft, "BROTO");
  assert.deepEqual(removed, ["Frango"]);
  assert.deepEqual(next.flavors, ["Calabresa"]);
  assert.equal(next.flavorCount, 2);
  assert.equal(next.crust?.name, "Cheddar");
  assert.equal(firstIncompleteStep(ctx, next), "sabores");
});

test("item incompleto não vira linha de carrinho", () => {
  const ctx = pizzas();
  assert.equal(draftToLine(ctx, newDraft(ctx, { firstFlavor: "Calabresa", sizeName: "GRANDE" })), null);
  assert.equal(draftToLine(ctx, newDraft(ctx, { firstFlavor: "Calabresa" })), null, "sem tamanho");
});

test("editar item do carrinho recupera as escolhas", () => {
  const ctx = pizzas();
  const draft = { ...setFlavorCount(ctx, newDraft(ctx, { firstFlavor: "Calabresa", sizeName: "GRANDE" }), 2), dough: { name: "Fina", price: 3 }, crustChoice: "none", extras: "yes", additions: [{ name: "Bacon extra", price: 5 }], notes: "sem cebola", quantity: 2 };
  const line = draftToLine(ctx, toggleFlavor(ctx, draft, "Sete Queijos").draft);
  const back = draftFromLine(ctx, line);
  assert.deepEqual(back.flavors, ["Calabresa", "Sete Queijos"]);
  assert.equal(back.flavorCount, 2);
  assert.equal(back.crustChoice, "none");
  assert.equal(back.extras, "yes");
  assert.equal(back.quantity, 2);
  assert.deepEqual(draftToLine(ctx, back), line);
});

test("pizza doce só combina com doces e só oferece as bordas dela", () => {
  const ctx = createBuilderContext(catalog, products[3], true);
  assert.deepEqual(ctx.flavors.map((p) => p.name), ["Banana"]);
  const draft = newDraft(ctx, { firstFlavor: "Banana", sizeName: "GRANDE" });
  assert.deepEqual(crustOptions(ctx, draft).map((c) => c.name), ["Chocolate"]);
});

test("bordas seguem o cadastro do 1º sabor; borda que deixou de valer sai", () => {
  const ctx = pizzas();
  let draft = { ...setFlavorCount(ctx, newDraft(ctx, { firstFlavor: "Calabresa", sizeName: "GRANDE" }), 2), crustChoice: "chosen", crust: { name: "Cheddar", price: 12 } };
  assert.deepEqual(crustOptions(ctx, draft).map((c) => c.name), ["Cheddar", "Catupiry"]);
  draft = toggleFlavor(ctx, draft, "Frango").draft;
  draft = toggleFlavor(ctx, draft, "Calabresa").draft; // Frango vira o 1º sabor: só Catupiry
  assert.deepEqual(crustOptions(ctx, draft).map((c) => c.name), ["Catupiry"]);
  assert.equal(draft.crust, null);
  assert.equal(stepProblem(ctx, draft, "borda"), "Escolha a borda.");
});

test("pizza sem bordas no cadastro pula a etapa de borda", () => {
  const ctx = createBuilderContext({ ...catalog, options: options.filter((g) => !(g.product_id === "sete" && g.name === "Bordas")) }, products[1], true);
  const draft = newDraft(ctx, { firstFlavor: "Sete Queijos", sizeName: "GRANDE" });
  assert.ok(!builderSteps(ctx, draft).includes("borda"));
});

test("produto sem sabores e sem tamanho: só revisão", () => {
  const ctx = createBuilderContext(catalog, products[4], false);
  const draft = newDraft(ctx, {});
  assert.deepEqual(builderSteps(ctx, draft), ["revisao"]);
  assert.equal(draftToLine(ctx, draft).price, 16);
});

test("carrinho salvo corrompido é descartado", () => {
  assert.deepEqual(parseStoredCart("{oops"), []);
  assert.deepEqual(parseStoredCart(JSON.stringify([{ id: 1 }])), []);
  const ok = { id: "cal", name: "Calabresa", price: 40, quantity: 1, variantId: null, variantName: null, dough: null, crust: null, additions: [], flavorCount: 1, flavors: ["Calabresa"], notes: "" };
  assert.equal(parseStoredCart(JSON.stringify([ok, { ...ok, quantity: 0 }])).length, 1);
});

test("regra da loja: borda opcional deixa seguir sem responder", () => {
  const ctx = createBuilderContext({ ...catalog, rules: { crust: "optional", addons: "optional" } }, products[1], true);
  const draft = newDraft(ctx, { firstFlavor: "Sete Queijos", sizeName: "GRANDE" });
  assert.equal(stepProblem(ctx, draft, "borda"), null);
  assert.equal(stepProblem(ctx, draft, "adicionais"), null);
  const line = draftToLine(ctx, draft);
  assert.equal(line.crust, null);
  assert.equal(line.noCrust, true);
  assert.equal(line.noAdditions, true);
});

test("regra da loja: borda recheada obrigatória tira o “sem borda”", () => {
  const ctx = createBuilderContext({ ...catalog, rules: { crust: "required", addons: "ask" } }, products[1], true);
  const draft = { ...newDraft(ctx, { firstFlavor: "Sete Queijos", sizeName: "GRANDE" }), extras: "no" };
  assert.equal(stepProblem(ctx, { ...draft, crustChoice: "none" }, "borda"), "Escolha a borda.");
  assert.equal(draftToLine(ctx, { ...draft, crustChoice: "none" }), null);
  assert.equal(stepProblem(ctx, { ...draft, crustChoice: "chosen", crust: { name: "Cheddar", price: 12 } }, "borda"), null);
});

test("regra da loja: adicional obrigatório dispensa o sim/não e exige um", () => {
  const ctx = createBuilderContext({ ...catalog, rules: { crust: "ask", addons: "required" } }, products[1], true);
  const draft = { ...newDraft(ctx, { firstFlavor: "Sete Queijos", sizeName: "GRANDE" }), crustChoice: "none" };
  assert.equal(stepProblem(ctx, draft, "adicionais"), "Escolha ao menos um adicional.");
  assert.equal(stepProblem(ctx, { ...draft, extras: "no" }, "adicionais"), "Escolha ao menos um adicional.");
  const picked = { ...draft, additions: [{ name: "Queijo extra", price: 5 }] };
  assert.equal(stepProblem(ctx, picked, "adicionais"), null);
  assert.deepEqual(draftToLine(ctx, picked).additions.map((a) => a.name), ["Queijo extra"]);
});

test("item antigo sem resposta de borda volta pendente (regra padrão)", () => {
  const ctx = pizzas();
  const old = { id: "sete", name: "Sete Queijos", price: 62, quantity: 1, variantId: "sete-GRANDE", variantName: "GRANDE", dough: { name: "Tradicional", price: 0 }, crust: null, additions: [], flavorCount: 1, flavors: ["Sete Queijos"], notes: "" };
  const draft = draftFromLine(ctx, old);
  assert.equal(draft.crustChoice, null);
  assert.equal(draftToLine(ctx, draft), null);
});
