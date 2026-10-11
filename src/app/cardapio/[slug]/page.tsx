import Link from "next/link";
import { PublicMenuOrder } from "@/components/public-menu-order";
import { StoreHeader } from "@/components/storefront/store-header";
import { AiChat } from "@/components/storefront/ai-chat";
import { aiModuleEnabled } from "@/lib/ai/attendant";
import { deliveryRulesFromRestaurant } from "@/lib/delivery-fee-rules";
import { isRestaurantOpen } from "@/lib/opening-hours";
import { createServiceClient } from "@/lib/supabase/service";
import { publicRestaurant, PUBLIC_PRODUCT_FIELDS } from "@/lib/public-data";
import type { Category, Coupon, DeliveryFeeRule, LoyaltyProgram, PizzaOption, Product, ProductOption, ProductVariant, Restaurant } from "@/lib/types";
import { storeDayKey } from "@/lib/timezone";
import { getAccessState } from "@/lib/platform-billing";

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
  const supabase = createServiceClient();
  const { data: restaurant } = await supabase.from("restaurants").select("*").eq("slug", slug).maybeSingle();
  // Loja ainda não ativada pela equipe não tem cardápio público no ar.
  const pending = restaurant ? (await getAccessState((restaurant as Restaurant).id)).status === "pending" : false;
  const current = restaurant && !pending ? publicRestaurant(restaurant as Restaurant) : null;

  if (!current) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#f1f1f1] px-5 text-ink">
        <div className="rounded-lg bg-white p-8 shadow-sm">Restaurante não encontrado.</div>
      </main>
    );
  }

  const [{ data: categories }, { data: products }, { data: variants }, { data: options }, { data: deliveryRules }, { data: pizzaOptions }, { data: coupons }, { data: loyalty }] = await Promise.all([
    supabase.from("categories").select("*").eq("restaurant_id", current.id).eq("active", true).order("display_order"),
    supabase.from("products").select(PUBLIC_PRODUCT_FIELDS).eq("restaurant_id", current.id).eq("active", true).order("price", { ascending: true }).order("name", { ascending: true }),
    supabase.from("product_variants").select("*, products!inner(restaurant_id)").eq("products.restaurant_id", current.id).eq("active", true),
    supabase.from("product_options").select("*, product_option_items(*)").eq("restaurant_id", current.id),
    supabase.from("delivery_fee_rules").select("*").eq("restaurant_id", current.id).eq("active", true).order("min_km"),
    supabase.from("pizza_options").select("*").eq("restaurant_id", current.id).eq("active", true),
    supabase.from("coupons").select("*").eq("restaurant_id", current.id).eq("active", true).order("created_at", { ascending: false }),
    supabase.from("loyalty_programs").select("*").eq("restaurant_id", current.id).eq("enabled", true).maybeSingle(),
  ]);

  const storefront = { ...current, is_open: isRestaurantOpen(current) };
  const aiChat = await aiModuleEnabled(current.id);

  // Só cupons dentro da validade: os vencidos apareciam na lista de vantagens.
  // Datas só com dia ("2026-10-05") valem o dia inteiro no fuso da loja.
  const nowIso = new Date().toISOString();
  const today = storeDayKey(new Date());
  const reached = (value: string) => (value.length === 10 ? value <= today : value <= nowIso);
  const notPassed = (value: string) => (value.length === 10 ? value >= today : value >= nowIso);
  const activeCoupons = ((coupons ?? []) as Coupon[]).filter((coupon) => (!coupon.starts_at || reached(coupon.starts_at)) && (!coupon.ends_at || notPassed(coupon.ends_at)));

  const rules = (((deliveryRules ?? []).length ? deliveryRules : deliveryRulesFromRestaurant(current)) ?? []) as DeliveryFeeRule[];
  const ruleFees = rules.filter((rule) => rule.active !== false).map((rule) => (rule.free_delivery ? 0 : Number(rule.fee ?? 0)));
  const deliveryFees = ruleFees.length ? { min: Math.min(...ruleFees), max: Math.max(...ruleFees) } : { min: Number(current.delivery_fee ?? 0), max: Number(current.delivery_fee ?? 0) };

  return (
    <main className="min-h-screen bg-[#f6f5f2] text-ink">
      <StoreHeader restaurant={current} deliveryFees={deliveryFees} />
      {sp.success && <div role="status" className="mx-4 mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm font-bold text-emerald-700 md:mx-auto md:max-w-6xl">Pedido enviado com sucesso.</div>}
      <PublicMenuOrder
        restaurant={storefront}
        categories={(categories ?? []) as Category[]}
        products={sortProductsByCategoryPrice((products ?? []) as Product[], (variants ?? []) as ProductVariant[])}
        variants={(variants ?? []) as ProductVariant[]}
        options={(options ?? []) as ProductOption[]}
        deliveryRules={rules}
        pizzaOptions={(pizzaOptions ?? []) as PizzaOption[]}
        coupons={activeCoupons}
        loyalty={loyalty as LoyaltyProgram | null}
      />
      {aiChat && <AiChat restaurantId={current.id} slug={current.slug} name={current.name} />}
      <footer className="mx-auto max-w-6xl px-4 pb-28 pt-6 text-center text-xs text-slate-500 md:pb-10">
        {current.menu_footer_message && <p className="mb-2 text-sm">{current.menu_footer_message}</p>}
        <p>Cardápio digital por <Link href="/" className="font-semibold text-brand">PeriniFood</Link></p>
      </footer>
    </main>
  );
}
