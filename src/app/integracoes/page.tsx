import { IntegrationOverview } from "@/components/integrations/integration-ui";
import { requireRestaurant } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function IntegrationsPage() {
  const { supabase, restaurant, role } = await requireRestaurant();
  if (role === "kitchen") redirect("/dashboard");
  const { data } = await supabase.from("integrations").select("*").eq("restaurant_id", restaurant.id);
  return <IntegrationOverview integrations={data ?? []} />;
}
