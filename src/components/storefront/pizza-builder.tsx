"use client";

/* eslint-disable @next/next/no-img-element */
import { ArrowLeft, Ban, Check, ImageOff, Minus, Plus, Search, X } from "lucide-react";
import { useDeferredValue, useEffect, useId, useMemo, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from "react";
import { money } from "@/lib/utils";
import {
  additionOptions, additionsRule, basePrice, rulesOf, builderSizes, builderSteps, changeSize, crustOptions, crustRequired, doughOptions,
  draftToLine, flavorPrice, flavorProduct, lineUnitPrice, maxFlavorsFor, normalizeLabel, primaryProduct,
  setFlavorCount, sizeLabel, stepProblem, toggleFlavor,
  type BuilderContext, type BuilderDraft, type CartLine, type StepId,
} from "@/lib/pizza-builder";
import type { Product } from "@/lib/types";

// Montagem do item em etapas (tamanho → sabores → massa → borda → adicionais →
// revisão). Tudo acontece no próprio modal, sem recarregar a página; o preço é a
// prévia de pizza-builder.ts e o servidor reprecifica no envio do pedido.

const stepOrder: StepId[] = ["tamanho", "sabores", "massa", "borda", "adicionais", "revisao"];

const stepLabels: Record<StepId, string> = {
  tamanho: "Tamanho",
  sabores: "Sabores",
  massa: "Massa",
  borda: "Borda",
  adicionais: "Adicionais",
  revisao: "Revisão",
};

export function PizzaBuilder({ ctx, product, initial, startStep, editing, onClose, onConfirm }: {
  ctx: BuilderContext;
  // Produto clicado (foto e nome quando não é pizza).
  product: Product;
  initial: BuilderDraft;
  startStep: StepId;
  editing: boolean;
  onClose: () => void;
  onConfirm: (line: CartLine) => void;
}) {
  const [draft, setDraft] = useState(initial);
  const [requested, setStep] = useState<StepId>(startStep);
  const [direction, setDirection] = useState(1);
  // Veio da revisão por "Alterar": o Continuar volta direto para a revisão.
  const [returnToReview, setReturnToReview] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  const steps = builderSteps(ctx, draft);
  // Uma etapa pode deixar de existir (ex.: o novo 1º sabor não tem adicionais): vale a seguinte.
  const step = steps.includes(requested) ? requested : steps.find((item) => stepOrder.indexOf(item) > stepOrder.indexOf(requested)) ?? "revisao";
  const index = steps.indexOf(step);
  const problem = stepProblem(ctx, draft, step);
  const base = basePrice(ctx, draft);
  const unit = base == null ? null : lineUnitPrice({ price: base, dough: draft.dough, crust: draft.crustChoice === "chosen" ? draft.crust : null, additions: draft.extras !== "no" ? draft.additions : [] });
  const primary = primaryProduct(ctx, draft);
  const title = ctx.pizza ? (editing ? "Editar pizza" : "Monte sua pizza") : product.name;

  // Esc fecha, a página por trás não rola.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [onClose]);

  // A cada etapa: topo do conteúdo e foco no título (leitor de tela anuncia a etapa).
  useEffect(() => {
    bodyRef.current?.scrollTo({ top: 0 });
    headingRef.current?.focus({ preventScroll: true });
  }, [step]);

  function go(next: StepId) {
    setDirection(steps.indexOf(next) >= index ? 1 : -1);
    setNotice(null);
    setStep(next);
  }

  function back() {
    if (index === 0) onClose();
    else go(steps[index - 1]);
  }

  function next() {
    if (problem) return;
    if (returnToReview && step !== "revisao") {
      // Só volta à revisão se o resto continua válido (ex.: troca de tamanho tirou um sabor).
      const pending = steps.find((item) => item !== "revisao" && stepProblem(ctx, draft, item));
      setReturnToReview(Boolean(pending));
      go(pending ?? "revisao");
      return;
    }
    go(steps[Math.min(index + 1, steps.length - 1)]);
  }

  function confirm() {
    const line = draftToLine(ctx, draft);
    if (!line) {
      const pending = steps.find((item) => stepProblem(ctx, draft, item));
      if (pending) go(pending);
      return;
    }
    onConfirm(line);
  }

  function edit(target: StepId) {
    setReturnToReview(true);
    go(target);
  }

  const summary = [
    draft.sizeName ? sizeLabel(draft.sizeName) : "",
    draft.flavors.join(" / "),
    draft.crustChoice === "chosen" && draft.crust ? draft.crust.name : draft.crustChoice === "none" ? "Sem borda" : "",
    draft.extras !== "no" && draft.additions.length ? `+${draft.additions.length} adicional${draft.additions.length > 1 ? "is" : ""}` : "",
  ].filter(Boolean).join(" · ");

  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-center bg-black/65 md:items-center md:px-4 md:py-6" onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div role="dialog" aria-modal="true" aria-labelledby={titleId} className="relative flex h-[100dvh] w-full max-w-3xl flex-col overflow-hidden bg-[#f6f5f2] shadow-2xl md:h-[min(860px,92vh)] md:rounded-3xl">
        <header className="shrink-0 border-b border-slate-200/80 bg-white px-2 pb-3 pt-[max(0.5rem,env(safe-area-inset-top))] sm:px-4">
          <div className="flex items-center gap-1">
            <button type="button" onClick={back} aria-label={index === 0 ? "Fechar" : `Voltar para ${stepLabels[steps[index - 1]]}`} className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-slate-700 transition hover:bg-slate-100">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="min-w-0 flex-1 text-center">
              <p id={titleId} className="truncate text-base font-black text-ink">{title}</p>
              <p className="text-xs font-semibold text-slate-500">Etapa {index + 1} de {steps.length} · {stepLabels[step]}</p>
            </div>
            <button type="button" onClick={onClose} aria-label="Fechar" className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-slate-700 transition hover:bg-slate-100">
              <X className="h-5 w-5" />
            </button>
          </div>
          <ol className="mt-2 flex gap-1 px-2" aria-label="Progresso">
            {steps.map((item, position) => (
              <li key={item} className="flex-1" aria-current={item === step ? "step" : undefined}>
                <span className={`block h-1.5 rounded-full transition-colors duration-300 ${position < index ? "bg-brand" : position === index ? "bg-brand-bright" : "bg-slate-200"}`} />
                <span className="sr-only">{stepLabels[item]}{position < index ? " (concluída)" : ""}</span>
              </li>
            ))}
          </ol>
        </header>

        <div ref={bodyRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <div
            key={step}
            style={{ "--step-from": `${direction * 18}px` } as CSSProperties}
            className="mx-auto max-w-2xl px-4 pb-6 pt-5 motion-safe:animate-[step-in_220ms_ease-out]"
          >
            {step === "tamanho" && (
              <SizeStep ctx={ctx} draft={draft} headingRef={headingRef} onPick={(sizeName) => {
                const result = changeSize(ctx, draft, sizeName);
                setDraft(result.draft);
                setNotice(result.removed.length ? `${result.removed.join(", ")} não ${result.removed.length > 1 ? "estão disponíveis" : "está disponível"} em ${sizeLabel(sizeName)}. Escolha outro sabor na próxima etapa.` : null);
              }} />
            )}
            {step === "sabores" && <FlavorStep ctx={ctx} draft={draft} setDraft={setDraft} headingRef={headingRef} />}
            {step === "massa" && (
              <StepHeading headingRef={headingRef} title="Escolha a massa" hint="Selecione uma opção.">
                <ChoiceList name="massa" value={draft.dough?.name ?? null} options={doughOptions(ctx, draft).map((item) => ({ value: item.name, label: item.name, price: Number(item.additional_price) }))}
                  onPick={(name) => { const item = doughOptions(ctx, draft).find((option) => option.name === name)!; setDraft({ ...draft, dough: { name: item.name, price: Number(item.additional_price) } }); }} />
              </StepHeading>
            )}
            {step === "borda" && <CrustStep ctx={ctx} draft={draft} setDraft={setDraft} headingRef={headingRef} />}
            {step === "adicionais" && <ExtrasStep ctx={ctx} draft={draft} setDraft={setDraft} headingRef={headingRef} />}
            {step === "revisao" && <ReviewStep ctx={ctx} draft={draft} setDraft={setDraft} product={product} steps={steps} headingRef={headingRef} onEdit={edit} />}
            {notice && <p role="status" className="mt-4 rounded-xl bg-amber-50 px-3 py-2.5 text-sm font-semibold text-amber-900 ring-1 ring-amber-200">{notice}</p>}
          </div>
        </div>

        <footer className="shrink-0 border-t border-slate-200/80 bg-white px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3">
          <div className="mx-auto max-w-2xl">
            {step !== "revisao" && (
              <div className="mb-2.5 flex items-center justify-between gap-3 text-sm">
                <span className="min-w-0 truncate text-slate-600">{summary || (primary?.name ?? "Faça suas escolhas")}</span>
                <strong className="shrink-0 text-ink [font-variant-numeric:tabular-nums]">{unit != null ? money(unit) : "—"}</strong>
              </div>
            )}
            {step === "revisao" ? (
              <div className="flex items-center gap-3">
                <div className="flex h-12 shrink-0 items-center gap-1 rounded-xl border border-slate-200 px-1">
                  <button type="button" onClick={() => setDraft({ ...draft, quantity: Math.max(1, draft.quantity - 1) })} disabled={draft.quantity <= 1} aria-label="Diminuir quantidade" className="grid h-10 w-10 place-items-center rounded-lg text-brand transition hover:bg-brand-soft disabled:text-slate-300">
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="min-w-6 text-center text-base font-black [font-variant-numeric:tabular-nums]" aria-live="polite" aria-label={`Quantidade: ${draft.quantity}`}>{draft.quantity}</span>
                  <button type="button" onClick={() => setDraft({ ...draft, quantity: Math.min(100, draft.quantity + 1) })} aria-label="Aumentar quantidade" className="grid h-10 w-10 place-items-center rounded-lg text-brand transition hover:bg-brand-soft">
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
                <PrimaryButton onClick={confirm} disabled={unit == null}>
                  {editing ? "Salvar" : "Adicionar"} · {unit != null ? money(unit * draft.quantity) : "—"}
                </PrimaryButton>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                {index > 0 && (
                  <button type="button" onClick={back} className="h-12 shrink-0 rounded-xl px-4 text-sm font-bold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-50">Voltar</button>
                )}
                <PrimaryButton onClick={next} disabled={Boolean(problem)} describedBy={problem ? "etapa-pendente" : undefined}>
                  {problem ?? (returnToReview ? "Salvar e revisar" : "Continuar")}
                </PrimaryButton>
                {problem && <span id="etapa-pendente" className="sr-only">{problem}</span>}
              </div>
            )}
          </div>
        </footer>
      </div>
    </div>
  );
}

function PrimaryButton({ children, onClick, disabled, describedBy }: { children: ReactNode; onClick: () => void; disabled?: boolean; describedBy?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-describedby={describedBy}
      className="h-12 min-w-0 flex-1 truncate rounded-xl bg-gradient-to-b from-brand-bright to-brand px-4 text-[0.95rem] font-black text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.3),0_10px_22px_-10px_rgba(207,74,10,0.8)] transition hover:to-brand-strong focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/30 disabled:from-slate-200 disabled:to-slate-200 disabled:text-slate-500 disabled:shadow-none"
    >
      {children}
    </button>
  );
}

function StepHeading({ title, hint, headingRef, children }: { title: string; hint: string; headingRef: RefObject<HTMLHeadingElement | null>; children: ReactNode }) {
  return (
    <section>
      <h2 ref={headingRef} tabIndex={-1} className="text-xl font-black text-ink outline-none">{title}</h2>
      <p className="mt-1 text-sm text-slate-500">{hint}</p>
      <div className="mt-4">{children}</div>
    </section>
  );
}

type Choice = { value: string; label: string; price?: number; detail?: string; disabled?: boolean; priceText?: string };

// Lista de opção única com rádio nativo (teclado: setas; leitor de tela: grupo de rádio).
function ChoiceList({ name, value, options, onPick }: { name: string; value: string | null; options: Choice[]; onPick: (value: string) => void }) {
  return (
    <div role="radiogroup" className="space-y-2.5">
      {options.map((option) => {
        const checked = value === option.value;
        return (
          <label
            key={option.value}
            className={`flex min-h-16 cursor-pointer items-center gap-3 rounded-2xl bg-white px-4 py-3 ring-1 transition has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-brand/30 ${checked ? "ring-2 ring-brand shadow-[0_10px_24px_-16px_rgba(207,74,10,0.8)]" : "ring-slate-200 hover:ring-slate-300"} ${option.disabled ? "cursor-not-allowed opacity-50" : ""}`}
          >
            <input type="radio" name={name} className="sr-only" checked={checked} disabled={option.disabled} onChange={() => onPick(option.value)} />
            <RadioDot checked={checked} />
            <span className="min-w-0 flex-1">
              <span className="block font-bold text-ink">{option.label}</span>
              {option.detail && <span className="block text-sm text-slate-500">{option.detail}</span>}
            </span>
            <span className={`shrink-0 text-sm font-bold [font-variant-numeric:tabular-nums] ${checked ? "text-brand" : "text-slate-600"}`}>
              {option.priceText ?? (option.price ? `+ ${money(option.price)}` : option.price === 0 ? money(0) : "")}
            </span>
          </label>
        );
      })}
    </div>
  );
}

function RadioDot({ checked }: { checked: boolean }) {
  return (
    <span aria-hidden="true" className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 transition ${checked ? "border-brand bg-brand" : "border-slate-300 bg-white"}`}>
      {checked && <span className="h-2.5 w-2.5 rounded-full bg-white" />}
    </span>
  );
}

type StepProps = { ctx: BuilderContext; draft: BuilderDraft; setDraft: (draft: BuilderDraft) => void; headingRef: RefObject<HTMLHeadingElement | null> };

function SizeStep({ ctx, draft, headingRef, onPick }: Omit<StepProps, "setDraft"> & { onPick: (sizeName: string) => void }) {
  const primary = primaryProduct(ctx, draft) ?? ctx.flavors[0] ?? null;
  const options = builderSizes(ctx).map(({ name, from }) => {
    const price = ctx.pizza && draft.flavors.length ? basePrice(ctx, { ...draft, sizeName: name, flavors: draft.flavors.filter((flavor) => flavorPrice(ctx, flavor, name) != null) }) : null;
    const variant = primary ? ctx.variantsByProduct.get(primary.id)?.find((item) => item.name === name) : null;
    const detail = [variant?.slices ? `${variant.slices} fatias` : "", variant?.notes ?? ""].filter(Boolean).join(" · ");
    return { value: name, label: sizeLabel(name), detail: detail || undefined, priceText: price != null ? money(price) : ctx.pizza ? `a partir de ${money(from)}` : money(from) };
  });
  return (
    <StepHeading headingRef={headingRef} title="Qual o tamanho?" hint={ctx.pizza ? "O preço de cada sabor muda conforme o tamanho." : "Escolha uma opção."}>
      <ChoiceList name="tamanho" value={draft.sizeName} options={options} onPick={onPick} />
    </StepHeading>
  );
}

function FlavorStep({ ctx, draft, setDraft, headingRef }: StepProps) {
  const [search, setSearch] = useState("");
  const [full, setFull] = useState(false);
  const deferred = useDeferredValue(search);
  const max = maxFlavorsFor(ctx);
  const term = normalizeLabel(deferred.trim());
  const searchable = useMemo(() => new Map(ctx.flavors.map((flavor) => [flavor.id, normalizeLabel(`${flavor.name} ${flavor.description ?? ""}`)])), [ctx.flavors]);
  // Disponíveis no tamanho primeiro; dentro disso, do mais barato ao mais caro.
  const list = useMemo(() => ctx.flavors
    .map((flavor) => ({ flavor, price: flavorPrice(ctx, flavor.name, draft.sizeName) }))
    .filter(({ flavor }) => !term || searchable.get(flavor.id)?.includes(term))
    .sort((a, b) => Number(a.price == null) - Number(b.price == null) || (a.price ?? 0) - (b.price ?? 0) || a.flavor.name.localeCompare(b.flavor.name, "pt-BR")),
  [ctx, draft.sizeName, term, searchable]);

  function pick(name: string) {
    const result = toggleFlavor(ctx, draft, name);
    setFull(result.full);
    if (!result.full) setDraft(result.draft);
  }

  return (
    <section>
      <h2 ref={headingRef} tabIndex={-1} className="text-xl font-black text-ink outline-none">{max > 1 ? "Escolha os sabores" : "Escolha o sabor"}</h2>
      <p className="mt-1 text-sm text-slate-500">
        {max > 1 ? `Até ${max} sabores na mesma pizza. Com mais de um, vale o preço do sabor mais caro.` : "Toque no sabor da sua pizza."}
      </p>

      {max > 1 && (
        <div role="radiogroup" aria-label="Quantidade de sabores" className="mt-4 grid gap-2" style={{ gridTemplateColumns: `repeat(${max}, minmax(0, 1fr))` }}>
          {Array.from({ length: max }, (_, position) => position + 1).map((count) => {
            const checked = draft.flavorCount === count;
            return (
              <label key={count} className={`flex cursor-pointer flex-col items-center gap-1 rounded-2xl bg-white px-2 py-2.5 text-center ring-1 transition has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-brand/30 ${checked ? "ring-2 ring-brand" : "ring-slate-200 hover:ring-slate-300"}`}>
                <input type="radio" name="quantidade-sabores" className="sr-only" checked={checked} onChange={() => { setFull(false); setDraft(setFlavorCount(ctx, draft, count)); }} />
                <PizzaSlices count={count} images={[]} size={34} muted={!checked} />
                <span className={`text-xs font-bold leading-tight ${checked ? "text-brand" : "text-slate-600"}`}>
                  {count === 1 ? "1 sabor" : count === 2 ? "Meia a meia" : `${count} sabores`}
                </span>
              </label>
            );
          })}
        </div>
      )}

      <div className="mt-4 flex items-center gap-4 rounded-2xl bg-white p-3 ring-1 ring-slate-200">
        <PizzaSlices count={draft.flavorCount} images={draft.flavors.map((name) => flavorProduct(ctx, name)?.image_url ?? null)} size={84} />
        <ol className="min-w-0 flex-1 space-y-1.5" aria-label="Sabores escolhidos">
          {Array.from({ length: draft.flavorCount }, (_, position) => {
            const name = draft.flavors[position];
            return (
              <li key={position} className="flex min-h-9 items-center gap-2 text-sm">
                <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-black ${name ? "bg-brand text-white" : "bg-slate-100 text-slate-400"}`}>{position + 1}</span>
                {name ? (
                  <>
                    <span className="min-w-0 flex-1 truncate font-semibold text-ink">{name}</span>
                    <button type="button" onClick={() => { setFull(false); setDraft(toggleFlavor(ctx, draft, name).draft); }} aria-label={`Tirar ${name}`} className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-ink">
                      <X className="h-4 w-4" />
                    </button>
                  </>
                ) : (
                  <span className="text-slate-400">{draft.flavorCount === 1 ? "Toque em um sabor" : `Escolha o ${position + 1}º sabor`}</span>
                )}
              </li>
            );
          })}
        </ol>
      </div>
      {full && <p role="status" className="mt-2 rounded-xl bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-900">Você já escolheu {draft.flavorCount} sabores. Tire um deles (×) para trocar.</p>}

      <div className="relative mt-4">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
        <input
          type="search"
          aria-label="Buscar sabor ou ingrediente"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar sabor ou ingrediente"
          className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm outline-none transition focus:border-brand focus:ring-4 focus:ring-brand/10"
        />
      </div>

      <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3" aria-label="Sabores">
        {list.map(({ flavor, price }) => {
          const position = draft.flavors.indexOf(flavor.name);
          return (
            <li key={flavor.id}>
              <FlavorCard flavor={flavor} price={price} sizeName={draft.sizeName} selected={position >= 0} order={draft.flavorCount > 1 && position >= 0 ? position + 1 : null} onToggle={() => pick(flavor.name)} />
            </li>
          );
        })}
      </ul>
      {!list.length && <p className="mt-3 rounded-2xl bg-white p-6 text-center text-sm text-slate-500">Nenhum sabor encontrado para “{deferred.trim()}”.</p>}
    </section>
  );
}

function FlavorCard({ flavor, price, sizeName, selected, order, onToggle }: { flavor: Product; price: number | null; sizeName: string | null; selected: boolean; order: number | null; onToggle: () => void }) {
  const unavailable = price == null && Boolean(sizeName);
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={unavailable && !selected}
      aria-pressed={selected}
      aria-label={`${flavor.name}${price != null ? `, ${money(price)}` : unavailable ? `, indisponível em ${sizeLabel(sizeName!)}` : ""}`}
      className={`group flex h-full w-full flex-col overflow-hidden rounded-2xl bg-white text-left ring-1 transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/30 ${selected ? "ring-2 ring-brand shadow-[0_12px_26px_-16px_rgba(207,74,10,0.9)]" : "ring-slate-200 hover:ring-slate-300"} disabled:cursor-not-allowed disabled:opacity-50`}
    >
      <span className="relative block aspect-[4/3] w-full overflow-hidden bg-slate-100">
        <FlavorImage src={flavor.image_url} />
        {selected && <span className="absolute inset-0 bg-brand/15" aria-hidden="true" />}
        <span aria-hidden="true" className={`absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full text-sm font-black shadow-md transition ${selected ? "bg-brand text-white" : "bg-white/90 text-slate-400"}`}>
          {selected ? (order ?? <Check className="h-4 w-4" strokeWidth={3} />) : <Plus className="h-4 w-4" />}
        </span>
      </span>
      <span className="flex flex-1 flex-col p-2.5">
        <span className="line-clamp-2 text-sm font-bold leading-snug text-ink">{flavor.name}</span>
        {flavor.description && <span className="mt-0.5 line-clamp-2 text-xs leading-snug text-slate-500">{flavor.description}</span>}
        <span className={`mt-auto pt-1.5 text-sm font-black [font-variant-numeric:tabular-nums] ${selected ? "text-brand" : "text-ink"}`}>
          {price != null ? money(price) : unavailable ? <span className="text-xs font-semibold text-slate-500">Indisponível em {sizeLabel(sizeName!)}</span> : null}
        </span>
      </span>
    </button>
  );
}

// Foto ausente ou quebrada vira um quadro neutro: nunca uma foto inventada.
function FlavorImage({ src }: { src: string | null }) {
  const [broken, setBroken] = useState(false);
  if (!src || broken) return <span className="grid h-full w-full place-items-center text-slate-300"><ImageOff className="h-7 w-7" /></span>;
  return <img src={src} alt="" loading="lazy" decoding="async" onError={() => setBroken(true)} className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]" />;
}

// Pizza desenhada em fatias (1, meia a meia, 3, 4 sabores) com a foto de cada sabor.
function PizzaSlices({ count, images, size, muted }: { count: number; images: (string | null)[]; size: number; muted?: boolean }) {
  const id = useId().replace(/:/g, "");
  const slices = Array.from({ length: count }, (_, position) => {
    if (count === 1) return null;
    const start = -Math.PI / 2 + (position * 2 * Math.PI) / count;
    const end = start + (2 * Math.PI) / count;
    const point = (angle: number) => `${50 + 47 * Math.cos(angle)},${50 + 47 * Math.sin(angle)}`;
    return `M50,50 L${point(start)} A47,47 0 0,1 ${point(end)} Z`;
  });
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden="true" className="shrink-0">
      <circle cx="50" cy="50" r="49" fill={muted ? "#e2e8f0" : "#f3c68b"} />
      {slices.map((path, position) => {
        const image = images[position];
        const clip = `${id}-fatia-${position}`;
        return (
          <g key={position}>
            <clipPath id={clip}>{path ? <path d={path} /> : <circle cx="50" cy="50" r="47" />}</clipPath>
            {image
              ? <image href={image} x="0" y="0" width="100" height="100" preserveAspectRatio="xMidYMid slice" clipPath={`url(#${clip})`} />
              : <rect x="0" y="0" width="100" height="100" fill={muted ? "#f1f5f9" : "#fff7ed"} clipPath={`url(#${clip})`} />}
          </g>
        );
      })}
      {slices.map((path, position) => path && <path key={position} d={path} fill="none" stroke="#fff" strokeWidth={count > 1 ? 2.5 : 0} />)}
      <circle cx="50" cy="50" r="47" fill="none" stroke={muted ? "#cbd5e1" : "#d9a060"} strokeWidth="2.5" />
    </svg>
  );
}

// Cartão com foto para borda e adicional: rádio (borda) ou caixa (adicional) nativos
// escondidos, então setas/espaço e leitor de tela funcionam como numa lista comum.
// Sem nenhuma foto cadastrada na etapa (photos=false), vira linha compacta: uma
// grade de quadros vazios fica pior do que a lista.
function OptionCard({ type, name, label, detail, price, image, placeholder, checked, disabled, photos, onChange }: {
  type: "radio" | "checkbox"; name: string; label: string; detail?: string; price: number; image: string | null;
  placeholder?: ReactNode; checked: boolean; disabled?: boolean; photos: boolean; onChange: () => void;
}) {
  if (!photos) {
    return (
      <label className={`flex min-h-16 cursor-pointer items-center gap-3 rounded-2xl bg-white px-4 py-3 ring-1 transition has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-brand/30 ${checked ? "ring-2 ring-brand shadow-[0_10px_24px_-16px_rgba(207,74,10,0.8)]" : "ring-slate-200 hover:ring-slate-300"} ${disabled ? "cursor-not-allowed opacity-50" : ""}`}>
        <input type={type} name={name} className="sr-only" checked={checked} disabled={disabled} onChange={onChange} />
        <span aria-hidden="true" className={`grid h-6 w-6 shrink-0 place-items-center border-2 transition ${type === "radio" ? "rounded-full" : "rounded-md"} ${checked ? "border-brand bg-brand text-white" : "border-slate-300 bg-white"}`}>
          {checked && (type === "radio" ? <span className="h-2.5 w-2.5 rounded-full bg-white" /> : <Check className="h-4 w-4" strokeWidth={3} />)}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-bold text-ink">{label}</span>
          {detail && <span className="block text-sm text-slate-500">{detail}</span>}
        </span>
        <span className={`shrink-0 text-sm font-bold [font-variant-numeric:tabular-nums] ${checked ? "text-brand" : "text-slate-600"}`}>{price ? `+ ${money(price)}` : money(0)}</span>
      </label>
    );
  }
  return (
    <label className={`group flex h-full cursor-pointer flex-col overflow-hidden rounded-2xl bg-white ring-1 transition has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-brand/30 ${checked ? "ring-2 ring-brand shadow-[0_12px_26px_-16px_rgba(207,74,10,0.9)]" : "ring-slate-200 hover:ring-slate-300"} ${disabled ? "cursor-not-allowed opacity-50" : ""}`}>
      <input type={type} name={name} className="sr-only" checked={checked} disabled={disabled} onChange={onChange} />
      <span className="relative block aspect-[4/3] w-full overflow-hidden bg-slate-100">
        {placeholder ?? <FlavorImage src={image} />}
        {checked && <span className="absolute inset-0 bg-brand/15" aria-hidden="true" />}
        <span aria-hidden="true" className={`absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full shadow-md transition ${checked ? "bg-brand text-white" : "bg-white/90 text-slate-400"}`}>
          {checked ? <Check className="h-4 w-4" strokeWidth={3} /> : type === "checkbox" ? <Plus className="h-4 w-4" /> : <span className="h-3.5 w-3.5 rounded-full border-2 border-slate-300" />}
        </span>
      </span>
      <span className="flex flex-1 flex-col p-2.5">
        <span className="line-clamp-2 text-sm font-bold leading-snug text-ink">{label}</span>
        {detail && <span className="mt-0.5 text-xs leading-snug text-slate-500">{detail}</span>}
        <span className={`mt-auto pt-1.5 text-sm font-black [font-variant-numeric:tabular-nums] ${checked ? "text-brand" : "text-ink"}`}>{price ? `+ ${money(price)}` : money(0)}</span>
      </span>
    </label>
  );
}

function CrustStep({ ctx, draft, setDraft, headingRef }: StepProps) {
  const required = crustRequired(ctx, draft);
  const crusts = crustOptions(ctx, draft);
  const photos = crusts.some((item) => item.image_url);
  return (
    <StepHeading headingRef={headingRef} title="Escolha a borda" hint={required ? "Obrigatório: escolha uma borda." : rulesOf(ctx).crust === "optional" ? "Opcional: escolha uma borda recheada, se quiser." : "Obrigatório escolher uma opção, mesmo que seja sem borda recheada."}>
      <div role="radiogroup" aria-label="Borda" className={photos ? "grid grid-cols-2 gap-3 sm:grid-cols-3" : "space-y-2.5"}>
        {!required && (
          <OptionCard
            type="radio" name="borda" label="Sem borda recheada" detail="Borda tradicional da massa" price={0} image={null} photos={photos}
            // Sem borda não tem foto: um ícone deixa claro que é "nenhuma", sem imagem inventada.
            placeholder={<span className="grid h-full w-full place-items-center bg-slate-50 text-slate-400"><Ban className="h-9 w-9" strokeWidth={1.5} /></span>}
            checked={draft.crustChoice === "none"}
            onChange={() => setDraft({ ...draft, crustChoice: "none", crust: null })}
          />
        )}
        {crusts.map((item) => (
          <OptionCard
            key={item.id} type="radio" name="borda" label={item.name} price={Number(item.additional_price)} image={item.image_url} photos={photos}
            checked={draft.crustChoice === "chosen" && draft.crust?.name === item.name}
            onChange={() => setDraft({ ...draft, crustChoice: "chosen", crust: { name: item.name, price: Number(item.additional_price) } })}
          />
        ))}
      </div>
    </StepHeading>
  );
}

function ExtrasStep({ ctx, draft, setDraft, headingRef }: StepProps) {
  const additions = additionOptions(ctx, draft);
  const rule = additionsRule(ctx, draft);
  const atMax = rule.max != null && draft.additions.length >= rule.max;
  const photos = additions.some((item) => item.image_url);
  // Adicional obrigatório: não há o que perguntar, a lista já aparece.
  const mustPick = rule.min > 0;
  const showList = mustPick || draft.extras === "yes";
  return (
    <section>
      <h2 ref={headingRef} tabIndex={-1} className="text-xl font-black text-ink outline-none">{mustPick ? "Escolha os adicionais" : ctx.pizza ? "Deseja ingredientes extras na sua pizza?" : "Deseja adicionais?"}</h2>
      <p className="mt-1 text-sm text-slate-500">
        {mustPick ? `Obrigatório: escolha ao menos ${rule.min}.` : rulesOf(ctx).addons === "optional" ? "Opcional." : "Responda para continuar. Extras são opcionais."}
      </p>
      {!mustPick && <div role="radiogroup" aria-label="Adicionais" className="mt-4 grid grid-cols-2 gap-3">
        {([["no", "Não quero adicionais"], ["yes", "Quero adicionar extras"]] as const).map(([value, label]) => {
          const checked = draft.extras === value;
          return (
            <label key={value} className={`flex min-h-16 cursor-pointer items-center gap-3 rounded-2xl bg-white px-3.5 py-3 ring-1 transition has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-brand/30 ${checked ? "ring-2 ring-brand" : "ring-slate-200 hover:ring-slate-300"}`}>
              <input type="radio" name="quer-adicionais" className="sr-only" checked={checked} onChange={() => setDraft({ ...draft, extras: value })} />
              <RadioDot checked={checked} />
              <span className="text-sm font-bold leading-tight text-ink">{label}</span>
            </label>
          );
        })}
      </div>}

      {showList && (
        <fieldset className="mt-5 motion-safe:animate-[step-in_200ms_ease-out]" style={{ "--step-from": "0px" } as CSSProperties}>
          <legend className="text-sm font-black uppercase tracking-wide text-slate-500">
            Escolha os extras{rule.max != null ? ` (até ${rule.max})` : ""}
          </legend>
          <div className={photos ? "mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3" : "mt-3 space-y-2.5"}>
            {additions.map((item) => {
              const checked = draft.additions.some((selected) => selected.name === item.name);
              return (
                <OptionCard
                  key={item.id} type="checkbox" name="adicional" label={item.name} price={Number(item.additional_price)} image={item.image_url} photos={photos}
                  checked={checked} disabled={!checked && atMax}
                  onChange={() => {
                    const others = draft.additions.filter((selected) => selected.name !== item.name);
                    setDraft({ ...draft, additions: checked ? others : [...others, { name: item.name, price: Number(item.additional_price) }] });
                  }}
                />
              );
            })}
          </div>
        </fieldset>
      )}
    </section>
  );
}

function ReviewStep({ ctx, draft, setDraft, product, steps, headingRef, onEdit }: StepProps & { product: Product; steps: StepId[]; onEdit: (step: StepId) => void }) {
  const base = basePrice(ctx, draft);
  const primary = primaryProduct(ctx, draft) ?? product;
  const crust = draft.crustChoice === "chosen" ? draft.crust : null;
  const additions = draft.extras !== "no" ? draft.additions : [];
  const doughs = doughOptions(ctx, draft);
  const rows: { step: StepId; label: string; value: string; price?: number | null }[] = [
    ...(steps.includes("tamanho") ? [{ step: "tamanho" as const, label: "Tamanho", value: draft.sizeName ? sizeLabel(draft.sizeName) : "—" }] : []),
    ...(ctx.pizza ? [{ step: "sabores" as const, label: draft.flavors.length > 1 ? `${draft.flavors.length} sabores` : "Sabor", value: draft.flavors.join(" / "), price: base }] : []),
    ...(draft.dough && doughs.length ? [{ step: "massa" as const, label: "Massa", value: draft.dough.name, price: draft.dough.price || null }] : []),
    ...(steps.includes("borda") ? [{ step: "borda" as const, label: "Borda", value: crust ? crust.name : "Sem borda recheada", price: crust?.price || null }] : []),
    ...(steps.includes("adicionais") ? [{ step: "adicionais" as const, label: "Adicionais", value: additions.length ? additions.map((item) => item.name).join(", ") : "Nenhum", price: additions.reduce((sum, item) => sum + Number(item.price), 0) || null }] : []),
  ];
  const unit = base == null ? null : lineUnitPrice({ price: base, dough: draft.dough, crust, additions });
  return (
    <section>
      <h2 ref={headingRef} tabIndex={-1} className="text-xl font-black text-ink outline-none">Confira {ctx.pizza ? "sua pizza" : "seu item"}</h2>
      <p className="mt-1 text-sm text-slate-500">Toque em “Alterar” para mudar qualquer escolha.</p>

      <div className="mt-4 overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200">
        <div className="flex items-center gap-4 border-b border-slate-100 p-4">
          {ctx.pizza
            ? <PizzaSlices count={Math.max(1, draft.flavors.length)} images={draft.flavors.map((name) => flavorProduct(ctx, name)?.image_url ?? null)} size={72} />
            : <span className="relative block h-[72px] w-[72px] shrink-0 overflow-hidden rounded-xl bg-slate-100"><FlavorImage src={primary.image_url} /></span>}
          <div className="min-w-0">
            <p className="font-black text-ink">{ctx.pizza ? `Pizza ${draft.sizeName ? sizeLabel(draft.sizeName) : ""}`.trim() : primary.name}</p>
            <p className="text-sm text-slate-500">{ctx.pizza ? draft.flavors.join(" / ") : primary.description}</p>
          </div>
        </div>
        <dl className="divide-y divide-slate-100">
          {rows.map((row) => (
            <div key={row.step} className="flex items-center gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{row.label}</dt>
                <dd className="text-sm font-semibold text-ink">{row.value}</dd>
              </div>
              {row.price ? <span className="shrink-0 text-sm font-semibold text-slate-600 [font-variant-numeric:tabular-nums]">{row.step === "sabores" ? money(row.price) : `+ ${money(row.price)}`}</span> : null}
              {steps.includes(row.step) && (
                <button type="button" onClick={() => onEdit(row.step)} className="h-9 shrink-0 rounded-lg px-2.5 text-sm font-bold text-brand transition hover:bg-brand-soft">Alterar</button>
              )}
            </div>
          ))}
        </dl>
        <div className="space-y-1 border-t border-slate-100 bg-slate-50/70 px-4 py-3 text-sm">
          <p className="flex justify-between font-semibold text-slate-600"><span>Valor de cada</span><span className="[font-variant-numeric:tabular-nums]">{unit != null ? money(unit) : "—"}</span></p>
          {draft.quantity > 1 && <p className="flex justify-between text-slate-500"><span>Quantidade</span><span>{draft.quantity}×</span></p>}
          <p className="flex justify-between pt-1 text-base font-black text-ink"><span>Total do item</span><span className="[font-variant-numeric:tabular-nums]">{unit != null ? money(unit * draft.quantity) : "—"}</span></p>
        </div>
      </div>

      <label htmlFor="observacoes-item" className="mt-5 block text-sm font-black uppercase tracking-wide text-slate-500">Observações (opcional)</label>
      <textarea
        id="observacoes-item"
        className="mt-2 min-h-20 w-full resize-none rounded-xl border border-slate-200 bg-white p-3 text-sm outline-none transition focus:border-brand focus:ring-4 focus:ring-brand/10"
        maxLength={250}
        value={draft.notes}
        onChange={(event) => setDraft({ ...draft, notes: event.target.value })}
        placeholder="Ex.: sem cebola, bem assada…"
      />
      <p className="text-right text-xs text-slate-400">{draft.notes.length}/250</p>
    </section>
  );
}
