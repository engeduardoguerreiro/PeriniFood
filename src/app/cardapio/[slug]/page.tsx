/* eslint-disable @next/next/no-img-element */
import { Bike, MapPin } from "lucide-react";
import { PublicMenuOrder } from "@/components/public-menu-order";
import { deliveryRulesFromRestaurant } from "@/lib/delivery-fee-rules";
import { currentOpeningLabel, isRestaurantOpen } from "@/lib/opening-hours";
import { createClient } from "@/lib/supabase/server";
import { money } from "@/lib/utils";
import type { Category, Coupon, DeliveryFeeRule, LoyaltyProgram, PizzaOption, Product, ProductOption, ProductVariant, Restaurant } from "@/lib/types";

function productDisplayPrice(product: Product, variants: ProductVariant[]) {
  const productVariants = variants.filter((variant) => variant.product_id === product.id && variant.active);
  if (productVariants.length) return Math.min(...productVariants.map((variant) => Number(variant.price)));
  return Number(product.price);
}

function sortProductsByCategoryPrice(products: Product[], variants: ProductVariant[]) {
  return [...products].sort((a, b) => {
    const categoryDiff = String(a.category_id ?? "").localeCompare(String(b.category_id ?? ""));
    if (categoryDiff !== 0) return categoryDiff;
    const priceDiff = productDisplayPrice(a, variants) - productDisplayPrice(b, variants);
    if (priceDiff !== 0) return priceDiff;
    return a.name.localeCompare(b.name, "pt-BR");
  });
}

export default async function PublicMenuPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ success?: string }> }) {
  const { slug } = await params;
  const sp = await searchParams;
  const supabase = await createClient();
  const { data: restaurant } = await supabase.from("restaurants").select("*").eq("slug", slug).maybeSingle();
  const current = restaurant as Restaurant | null;

  if (!current) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#f1f1f1] px-5 text-[#243640]">
        <div className="rounded-lg bg-white p-8 shadow-sm">Restaurante não encontrado.</div>
      </main>
    );
  }

  const [{ data: categories }, { data: products }, { data: variants }, { data: options }, { data: deliveryRules }, { data: pizzaOptions }, { data: coupons }, { data: loyalty }] = await Promise.all([
    supabase.from("categories").select("*").eq("restaurant_id", current.id).eq("active", true).order("display_order"),
    supabase.from("products").select("*").eq("restaurant_id", current.id).eq("active", true).order("price", { ascending: true }).order("name", { ascending: true }),
    supabase.from("product_variants").select("*").eq("active", true),
    supabase.from("product_options").select("*, product_option_items(*)").eq("restaurant_id", current.id),
    supabase.from("delivery_fee_rules").select("*").eq("restaurant_id", current.id).eq("active", true).order("min_km"),
    supabase.from("pizza_options").select("*").eq("restaurant_id", current.id).eq("active", true),
    supabase.from("coupons").select("*").eq("restaurant_id", current.id).eq("active", true).order("created_at", { ascending: false }),
    supabase.from("loyalty_programs").select("*").eq("restaurant_id", current.id).eq("enabled", true).maybeSingle(),
  ]);

  const cover = current.site_cover_url ?? current.banner_url ?? current.cover_url;
  const storeOpen = isRestaurantOpen(current);
  const openingLabel = currentOpeningLabel(current);
  const publicRestaurant = { ...current, is_open: storeOpen };
  const publicAddress = [
    current.address,
    current.address_number ? `n ${current.address_number}` : null,
    current.neighborhood,
    current.city,
    current.state,
    current.zip_code ? `CEP ${current.zip_code}` : null,
  ].filter(Boolean).join(" - ");

  return (
    <main className="min-h-screen bg-[#f1f1f1] text-[#243640]">
      <section className="relative min-h-[246px] overflow-hidden bg-[#3b1114] text-white">
        <div
          className="absolute inset-0 scale-105 bg-cover bg-center blur-[1px]"
          style={{ backgroundImage: cover ? `url(${cover})` : "linear-gradient(135deg,#6b1116,#1f2933)" }}
        />
        <div className="absolute inset-0 bg-black/55" />
        <div className="relative mx-auto flex min-h-[246px] max-w-[1320px] items-end gap-6 px-4 pb-8">
          <div className="flex min-w-0 items-center gap-4">
            <div className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-lg bg-white text-2xl font-black text-red-600 shadow-lg">
              {current.logo_url ? <img src={current.logo_url} alt="" className="h-full w-full object-cover" /> : current.name.slice(0, 2)}
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-2xl font-black md:text-3xl">{current.name}</h1>
              <p className="mt-1 flex max-w-3xl items-center gap-2 text-sm text-white/90">
                <MapPin className="h-4 w-4 shrink-0" />
                <span className="truncate">{publicAddress || "Endereço não informado"}</span>
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-3 text-sm font-bold">
                <span className="flex items-center gap-2">
                  <span className={storeOpen ? "h-2.5 w-2.5 animate-pulse rounded-full bg-emerald-500" : "h-2.5 w-2.5 animate-pulse rounded-full bg-red-500"} />
                  {storeOpen ? `Aberto - entrega em ${current.estimated_delivery_time ?? "50 min"}` : "Fechado"}
                </span>
                <span>Pedido mínimo {money(current.minimum_order ?? 0)}</span>
                {openingLabel && <span>{openingLabel}</span>}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto grid max-w-[1320px] gap-0 md:grid-cols-[280px_1fr]">
          <div className="flex items-center justify-center gap-3 border-r border-slate-100 px-5 py-4 font-black uppercase">
            <Bike className="h-6 w-6" />
            Entrega
          </div>
          <div className="px-5 py-4 text-sm text-slate-600">
            <p>Entrega em até {current.estimated_delivery_time ?? "50 min"} • A partir de {money(current.delivery_fee ?? 0)}</p>
            <p className="font-bold text-red-600">Selecionar endereço</p>
          </div>
        </div>
      </section>

      {sp.success && <div className="mx-auto mt-5 max-w-[1320px] rounded-lg border border-emerald-200 bg-emerald-50 p-4 font-bold text-emerald-700">Pedido enviado com sucesso.</div>}
      {!storeOpen && <div className="mx-auto mt-5 max-w-[1320px] rounded-lg border border-red-200 bg-red-50 p-4 font-bold text-red-700">A loja está fechada no momento. Você pode consultar o cardápio, mas novos pedidos estão bloqueados.</div>}
      <PublicMenuOrder
        restaurant={publicRestaurant}
        categories={(categories ?? []) as Category[]}
        products={sortProductsByCategoryPrice((products ?? []) as Product[], (variants ?? []) as ProductVariant[])}
        variants={(variants ?? []) as ProductVariant[]}
        options={(options ?? []) as ProductOption[]}
        deliveryRules={(((deliveryRules ?? []).length ? deliveryRules : deliveryRulesFromRestaurant(current)) ?? []) as DeliveryFeeRule[]}
        pizzaOptions={(pizzaOptions ?? []) as PizzaOption[]}
        coupons={(coupons ?? []) as Coupon[]}
        loyalty={loyalty as LoyaltyProgram | null}
      />
      {current.menu_footer_message && <footer className="mx-auto max-w-[1320px] px-4 pb-8 text-center text-sm text-slate-500">{current.menu_footer_message}</footer>}
    </main>
  );
}
