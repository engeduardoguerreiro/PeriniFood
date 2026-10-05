import { redirect } from "next/navigation";
import { requireRestaurant } from "@/lib/auth";
import { AppFrame } from "./app-frame";

export async function AppShell({ children }: { children: React.ReactNode }) {
  const { restaurant } = await requireRestaurant();
  if (!restaurant) redirect("/register");

  // Só os campos que o cabeçalho usa: a linha inteira de restaurants ia serializada
  // para o cliente a cada navegação (e a cada atualização automática de pedidos).
  const frameRestaurant = {
    name: restaurant.name,
    logo_url: restaurant.logo_url,
    is_open: restaurant.is_open,
    manual_open_status: restaurant.manual_open_status,
    opening_hours: restaurant.opening_hours,
  };
  return <AppFrame restaurant={frameRestaurant}>{children}</AppFrame>;
}
