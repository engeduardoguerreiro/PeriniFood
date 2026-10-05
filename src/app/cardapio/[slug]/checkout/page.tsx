import { PublicCheckout } from "@/components/public-checkout";
import { deliveryRulesFromRestaurant } from "@/lib/delivery-fee-rules";
import { isRestaurantOpen } from "@/lib/opening-hours";
import { createServiceClient } from "@/lib/supabase/service";
import { publicRestaurant } from "@/lib/public-data";
import type { DeliveryFeeRule, Restaurant } from "@/lib/types";
import { getAccessState } from "@/lib/platform-billing";

export default async function CheckoutPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ error?: string }> }) {
  const { slug } = await params;
  const supabase = createServiceClient();
  const { data: restaurant } = await supabase.from("restaurants").select("*").eq("slug", slug).maybeSingle();
  const pending = restaurant ? (await getAccessState(restaurant.id as string)).status === "pending" : false;

  if (!restaurant || pending) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#f1f1f1] px-5 text-[#243640]">
        <div className="rounded-lg bg-white p-8 shadow-sm">Restaurante não encontrado.</div>
      </main>
    );
  }

  const { data: deliveryRules } = await supabase
    .from("delivery_fee_rules")
    .select("*")
    .eq("restaurant_id", restaurant.id)
    .eq("active", true)
    .order("min_km");

  const current = publicRestaurant(restaurant as Restaurant);
  const rules = ((deliveryRules ?? []).length ? deliveryRules : deliveryRulesFromRestaurant(current)) as DeliveryFeeRule[];

  const { error: checkoutError } = await searchParams;
  return <PublicCheckout checkoutError={checkoutError} restaurant={{ ...current, is_open: isRestaurantOpen(current) }} deliveryRules={rules} />;
}
