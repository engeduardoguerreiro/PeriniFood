import { PublicCheckout } from "@/components/public-checkout";
import { deliveryRulesFromRestaurant } from "@/lib/delivery-fee-rules";
import { isRestaurantOpen } from "@/lib/opening-hours";
import { createClient } from "@/lib/supabase/server";
import type { DeliveryFeeRule, Restaurant } from "@/lib/types";

export default async function CheckoutPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: restaurant } = await supabase.from("restaurants").select("*").eq("slug", slug).maybeSingle();

  if (!restaurant) {
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

  const current = restaurant as Restaurant;
  const rules = ((deliveryRules ?? []).length ? deliveryRules : deliveryRulesFromRestaurant(current)) as DeliveryFeeRule[];

  return <PublicCheckout restaurant={{ ...current, is_open: isRestaurantOpen(current) }} deliveryRules={rules} />;
}
