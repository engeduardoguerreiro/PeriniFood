"use client";

/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { CheckCircle2, Eye, ImagePlus, Pizza, Save, Settings2, ShoppingBag, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { saveProduct } from "@/app/actions";
import { money } from "@/lib/utils";
import type { Category, PizzaOption, Product, ProductOption, ProductType, ProductVariant } from "@/lib/types";

const preparationOptions = [20, 30, 40, 50, 60, 70, 80];

function kindFromType(type: ProductType | null | undefined) {
  const name = type?.name?.toLowerCase() ?? "";
  if (name.includes("pizza")) return "pizza";
  if (name.includes("bebida") || name.includes("refrigerante") || name.includes("suco")) return "drink";
  if (name.includes("sobremesa") || name.includes("doce")) return "dessert";
  if (name.includes("combo")) return "combo";
  return "other";
}

function categoryIsPizza(category: Category | null | undefined) {
  const name = category?.name?.toLowerCase() ?? "";
  return name.includes("pizza") || name.includes("pizzas") || name.includes("pizzaria");
}

function optionNames(options: ProductOption[] | undefined, groupName: string) {
  const option = options?.find((item) => item.name === groupName);
  return new Set((option?.product_option_items ?? []).map((item) => item.name));
}

function Card({ title, subtitle, icon: Icon, children }: { title: string; subtitle: string; icon: typeof Settings2; children: React.ReactNode }) {
  return (
    <section className="rounded border border-slate-200 bg-white shadow-sm">
      <div className="flex items-start gap-3 border-b border-slate-100 px-5 py-4">
        <span className="grid h-10 w-10 place-items-center rounded bg-slate-100 text-slate-700">
          <Icon className="h-5 w-5" />
        </span>
        <div>
          <h2 className="text-base font-black text-slate-900">{title}</h2>
          {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
        </div>
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="space-y-1">
      <span className="text-xs font-bold uppercase text-slate-500">{label}</span>
      {children}
    </label>
  );
}

function OptionSelector({
  title,
  name,
  options,
  selected,
  empty,
}: {
  title: string;
  name: string;
  options: PizzaOption[];
  selected: Set<string>;
  empty: string;
}) {
  return (
    <div className="rounded border border-slate-200 bg-slate-50 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="font-black text-slate-800">{title}</h3>
        <Link href="/cardapio/opcoes-pizza" className="text-xs font-bold text-blue-600">Cadastrar</Link>
      </div>
      <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
        {options.map((option) => (
          <label key={option.id} className="flex items-center justify-between gap-3 rounded border border-slate-200 bg-white px-3 py-2 text-sm">
            <span className="flex items-center gap-2">
              <input name={name} type="checkbox" value={option.id} defaultChecked={selected.has(option.name)} />
              {option.name}
            </span>
            <strong>{money(option.price)}</strong>
          </label>
        ))}
      </div>
      {!options.length && <p className="rounded bg-white p-3 text-sm text-slate-500">{empty}</p>}
    </div>
  );
}

type SizeRow = {
  key: string;
  name: string;
  active: boolean;
  price: number;
  slices: number | null;
  sort_order: number;
};

export function ProductForm({
  categories,
  types,
  pizzaOptions,
  product = {} as Product,
  options = [],
  variants = [],
  restaurantSlug,
}: {
  categories: Category[];
  types: ProductType[];
  pizzaOptions: PizzaOption[];
  product?: Product;
  options?: ProductOption[];
  variants?: ProductVariant[];
  restaurantSlug: string;
}) {
  const initialTypeId = product.product_type_id ?? "";
  const initialCategoryId = product.category_id ?? "";
  const [selectedTypeId, setSelectedTypeId] = useState(initialTypeId);
  const [selectedCategoryId, setSelectedCategoryId] = useState(initialCategoryId);
  const selectedType = useMemo(() => (types ?? []).find((type) => type.id === selectedTypeId), [selectedTypeId, types]);
  const selectedCategory = useMemo(() => categories.find((category) => category.id === selectedCategoryId), [categories, selectedCategoryId]);
  const productKind = kindFromType(selectedType);
  const isPizza = productKind === "pizza" || categoryIsPizza(selectedCategory);
  const showAdditions = !["drink", "dessert"].includes(productKind) || isPizza;
  const existingDough = optionNames(options, "Tipos de Massas");
  const existingCrusts = optionNames(options, "Bordas");
  const existingAdditions = optionNames(options, "Adicionais");
  const doughOptions = (pizzaOptions ?? []).filter((option) => option.kind === "massa");
  const crustOptions = (pizzaOptions ?? []).filter((option) => option.kind === "borda");
  const additionOptions = (pizzaOptions ?? []).filter((option) => option.kind === "adicional");
  const sizeOptions = (pizzaOptions ?? []).filter((option) => option.kind === "tamanho" && option.active);
  const buildSizeRows = () => sizeOptions.map((option, index) => {
    const saved = variants.find((variant) => variant.name.toLowerCase() === option.name.toLowerCase());
    return {
      key: option.id,
      name: option.name,
      active: saved?.active ?? true,
      price: Number(saved?.price ?? 0),
      slices: Number(option.price ?? saved?.slices ?? 0) || null,
      sort_order: saved?.sort_order ?? index,
    };
  });
  const [sizeRows, setSizeRows] = useState<SizeRow[]>(() => isPizza ? buildSizeRows() : []);

  useEffect(() => {
    if (isPizza) setSizeRows(buildSizeRows());
    else setSizeRows([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPizza, pizzaOptions, variants]);

  function updateSizeRow(index: number, patch: Partial<SizeRow>) {
    setSizeRows((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, ...patch } : row));
  }

  return (
    <form action={saveProduct} className="space-y-6">
      <input type="hidden" name="id" value={product.id ?? ""} />
      <input type="hidden" name="product_type_kind" value={isPizza ? "pizza" : productKind} />

      <header className="flex flex-wrap items-center justify-between gap-4 rounded border border-slate-200 bg-white p-5 shadow-sm">
        <div>
          <p className="text-xs font-bold uppercase text-slate-500">Cadastro de produto</p>
          <h1 className="text-2xl font-black text-slate-900">{product ? "Editar Produto" : "Novo Produto"}</h1>
          <p className="mt-1 text-sm text-slate-500">Configure preço, tamanhos, massas, bordas, adicionais e canais de venda.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {restaurantSlug && <Link href={`/cardapio/${restaurantSlug}`} className="btn-muted text-sm"><Eye className="h-4 w-4" /> Visualizar no cardápio</Link>}
          <Link href="/cardapio/produtos" className="btn-muted text-sm"><X className="h-4 w-4" /> Cancelar</Link>
          <button className="btn-primary text-sm"><Save className="h-4 w-4" /> Salvar</button>
        </div>
      </header>

      <div className="grid gap-6 xl:grid-cols-[1.45fr_0.9fr]">
        <div className="space-y-6">
          <Card title="Informações principais" subtitle="Dados que aparecem no cardápio digital." icon={ShoppingBag}>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Nome do produto">
                <input className="field-light" name="name" placeholder="Ex.: Pizza Calabresa" defaultValue={product.name ?? ""} required />
              </Field>
              <Field label="Categoria do cardápio">
                <select className="field-light" name="category_id" value={selectedCategoryId} onChange={(event) => setSelectedCategoryId(event.target.value)} required>
                  <option value="">Selecione a categoria</option>
                  {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
                </select>
              </Field>
              <Field label="Tipo de produto">
                <select className="field-light" name="product_type_id" value={selectedTypeId} onChange={(event) => setSelectedTypeId(event.target.value)} required>
                  <option value="">Selecione o tipo</option>
                  {(types ?? []).map((type) => <option key={type.id} value={type.id}>{type.name}</option>)}
                </select>
              </Field>
              {!isPizza && (
                <Field label="Preço único">
                  <input className="field-light" name="price" type="number" min="0" step="0.01" placeholder="0,00" defaultValue={product.price ?? ""} required />
                </Field>
              )}
              {isPizza && <input type="hidden" name="price" value={sizeRows.find((size) => size.active)?.price ?? 0} />}
              <Field label="Tempo médio de preparo">
                <select className="field-light" name="preparation_time" defaultValue={product.preparation_time ?? 40}>
                  {preparationOptions.map((minutes) => <option key={minutes} value={minutes}>{minutes} minutos</option>)}
                </select>
              </Field>
              <Field label="Ordem no cardápio">
                <input type="hidden" name="sort_order" value={product.sort_order ?? 0} />
                <select className="field-light" name="menu_sort_mode" defaultValue="name">
                  <option value="name">Ordem alfabtica</option>
                  <option value="price">Preço</option>
                </select>
              </Field>
              <Field label="Descrição">
                <textarea className="field-light min-h-28 md:col-span-2" name="description" placeholder="Ingredientes, preparo e detalhes comerciais." defaultValue={product.description ?? ""} />
              </Field>
              <Field label="Observações internas">
                <textarea className="field-light min-h-24 md:col-span-2" name="internal_notes" placeholder="Informação visível apenas para a equipe." defaultValue={product.internal_notes ?? ""} />
              </Field>
            </div>
          </Card>

          {isPizza && (
            <Card title="Preços e tamanhos" subtitle="Pizza trabalha com tamanho e preço individual." icon={Pizza}>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded bg-red-50 p-3 text-sm font-semibold text-red-800">
                <span>Os nomes dos tamanhos vêm de Cardápio &gt; Opções pizza &gt; Tamanhos. Neste produto, selecione os tamanhos vendidos e informe o preço.</span>
                <Link href="/cardapio/opcoes-pizza" className="rounded bg-white px-3 py-2 text-xs font-black text-red-700 shadow-sm ring-1 ring-red-200 hover:bg-red-100">
                  Cadastrar tamanhos
                </Link>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-left text-sm">
                  <thead className="text-xs uppercase text-slate-500">
                    <tr><th className="p-3">Ativo</th><th>Tamanho</th><th>Preço</th><th>Fatias</th></tr>
                  </thead>
                  <tbody>
                    {sizeRows.map((size, index) => (
                      <tr key={size.key} className="border-t border-slate-100">
                        <td className="p-3"><input name="size_active" type="checkbox" value={size.name} checked={size.active} onChange={(event) => updateSizeRow(index, { active: event.target.checked })} /></td>
                        <td>
                          <input type="hidden" name="size_name" value={size.name} />
                          <strong>{size.name}</strong>
                        </td>
                        <td><input className="field-light h-10" name="size_price" type="number" min="0" step="0.01" value={size.price} onChange={(event) => updateSizeRow(index, { price: Number(event.target.value || 0) })} /></td>
                        <td>
                          <input type="hidden" name="size_slices" value={size.slices ?? ""} />
                          <input type="hidden" name="size_notes" value="" />
                          <span className="inline-flex h-10 min-w-20 items-center rounded-lg bg-slate-50 px-3 text-sm font-bold text-slate-700">{size.slices ? `${size.slices} fatias` : "-"}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {!sizeRows.length && <p className="mt-3 rounded bg-slate-50 p-3 text-sm font-semibold text-slate-600">Nenhum tamanho cadastrado. Cadastre Broto, Grande, Família ou outros em Cardápio &gt; Opções pizza &gt; Tamanhos.</p>}
              <p className="mt-3 rounded bg-amber-50 p-3 text-sm font-semibold text-amber-800">Para salvar pizza, mantenha pelo menos um tamanho ativo com preço maior que zero.</p>
            </Card>
          )}

          {isPizza && (
            <Card title="Sabores da pizza" subtitle="Ative se esta pizza pode ser vendida com 2, 3 ou 4 sabores." icon={Pizza}>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Quantidade mxima de sabores">
                  <select className="field-light" name="legacy_max_flavors" defaultValue={product.max_flavors ?? 1} disabled>
                    <option value={1}>1 sabor</option>
                    <option value={2}>Até 2 sabores</option>
                    <option value={3}>Até 3 sabores</option>
                    <option value={4}>Até 4 sabores</option>
                  </select>
                </Field>
                <p className="rounded bg-slate-50 p-3 text-sm font-semibold text-slate-600">
                  No cardápio online e no pedido manual, será possível escolher sabores da mesma categoria deste produto.
                </p>
              </div>
            </Card>
          )}

          {isPizza && (
            <Card title="Massa e preparo" subtitle="Escolha quais massas aparecem para esta pizza." icon={Settings2}>
              <OptionSelector title="Tipos de massa" name="dough_option" options={doughOptions} selected={existingDough} empty="Cadastre massas em Cardápio > Opções pizza." />
            </Card>
          )}

          {showAdditions && (
            <Card title="Adicionais disponíveis" subtitle="Somente os adicionais selecionados aparecem neste produto." icon={CheckCircle2}>
              <OptionSelector title="Adicionais para este produto" name="addition_option" options={additionOptions} selected={existingAdditions} empty="Cadastre adicionais em Cardápio > Opções pizza." />
            </Card>
          )}

          {isPizza && (
            <Card title="Bordas disponíveis" subtitle="Borda é cobrada separadamente e aparece em etapa própria no cardápio." icon={Pizza}>
              <OptionSelector title="Bordas para esta pizza" name="crust_option" options={crustOptions} selected={existingCrusts} empty="Cadastre bordas em Cardápio > Opções pizza." />
            </Card>
          )}
        </div>

        <aside className="space-y-6">
          <Card title="Foto do produto" subtitle="Imagem usada no cardápio online." icon={ImagePlus}>
            <div className="space-y-4">
              <div className="grid aspect-[4/3] place-items-center overflow-hidden rounded border border-slate-200 bg-slate-50 text-sm font-bold text-slate-400">
                {product.image_url ? <img src={product.image_url} alt="Imagem atual" className="h-full w-full object-cover" /> : "Sem imagem"}
              </div>
              <input className="field-light" name="image_file" type="file" accept="image/png,image/jpeg,image/webp" />
              <input className="field-light" name="image_url" placeholder="Ou cole uma URL de imagem" defaultValue={product.image_url ?? ""} />
              <p className="text-xs text-slate-500">Use PNG, JPG ou WEBP. A imagem enviada fica em `public/uploads/products`.</p>
            </div>
          </Card>

          <Card title="Configurações de venda" subtitle="Disponibilidade e canais." icon={Settings2}>
            <div className="space-y-3">
              <label className="flex items-center justify-between rounded border border-slate-200 p-3 text-sm font-bold">
                Produto ativo <input name="active" type="checkbox" defaultChecked={product.active ?? true} />
              </label>
              <label className="flex items-center justify-between rounded border border-slate-200 p-3 text-sm font-bold">
                Produto em destaque <input name="featured" type="checkbox" defaultChecked={product.featured ?? false} />
              </label>
              <label className="flex items-center justify-between rounded border border-slate-200 p-3 text-sm font-bold">
                Delivery <input name="delivery_available" type="checkbox" defaultChecked={product.delivery_available ?? true} />
              </label>
              <label className="flex items-center justify-between rounded border border-slate-200 p-3 text-sm font-bold">
                Retirada <input name="pickup_available" type="checkbox" defaultChecked={product.pickup_available ?? true} />
              </label>
              <label className="flex items-center justify-between rounded border border-slate-200 p-3 text-sm font-bold">
                Consumo no local <input name="dine_in_available" type="checkbox" defaultChecked={product.dine_in_available ?? true} />
              </label>
              <label className="flex items-center justify-between rounded border border-slate-200 p-3 text-sm font-bold">
                Controlar estoque <input name="stock_control_enabled" type="checkbox" defaultChecked={product.stock_control_enabled ?? false} />
              </label>
              <Field label="Quantidade em estoque">
                <input className="field-light" name="stock_quantity" type="number" min="0" defaultValue={product.stock_quantity ?? 0} />
              </Field>
            </div>
          </Card>
        </aside>
      </div>
    </form>
  );
}
