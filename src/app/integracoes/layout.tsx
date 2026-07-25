import { AppFrame } from "@/components/app-frame";
import { requireRestaurant } from "@/lib/auth";

export default async function IntegrationsLayout({ children }: { children: React.ReactNode }) {
  const { restaurant } = await requireRestaurant();
  return <AppFrame restaurant={restaurant}>{children}</AppFrame>;
}
