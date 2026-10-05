import { PublicCustomerAccount } from "@/components/public-customer-account";
import { createServiceClient } from "@/lib/supabase/service";
import { publicRestaurant } from "@/lib/public-data";
import type { Restaurant } from "@/lib/types";
import { getAccessState } from "@/lib/platform-billing";

export default async function PublicCustomerAccountPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = createServiceClient();
  const { data: restaurant } = await supabase.from("restaurants").select("*").eq("slug", slug).maybeSingle();
  // Loja ainda não ativada não tem área do cliente no ar (igual ao cardápio).
  const pending = restaurant ? (await getAccessState(restaurant.id as string)).status === "pending" : false;

  if (!restaurant || pending) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#f6f5f2] px-5 text-ink">
        <div className="rounded-lg bg-white p-8 shadow-sm">Restaurante não encontrado.</div>
      </main>
    );
  }

  return <PublicCustomerAccount restaurant={publicRestaurant(restaurant as Restaurant)} />;
}
