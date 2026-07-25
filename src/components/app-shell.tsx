import { redirect } from "next/navigation";
import { requireRestaurant } from "@/lib/auth";
import { AppFrame } from "./app-frame";

export async function AppShell({ children }: { children: React.ReactNode }) {
  const { restaurant } = await requireRestaurant();
  if (!restaurant) redirect("/register");

  return <AppFrame restaurant={restaurant}>{children}</AppFrame>;
}
