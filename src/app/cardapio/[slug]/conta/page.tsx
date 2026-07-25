import { PublicCustomerAccount } from "@/components/public-customer-account";
import { createClient } from "@/lib/supabase/server";
import type { Restaurant } from "@/lib/types";

export default async function PublicCustomerAccountPage({ params }: { params: Promise<{ slug: string }> }) {
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

  return <PublicCustomerAccount restaurant={restaurant as Restaurant} />;
}
