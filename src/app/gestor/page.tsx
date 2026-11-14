import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionContext, requireRestaurant } from "@/lib/auth";
import { GestorPedidos } from "@/components/gestor/gestor-pedidos";

export const metadata: Metadata = { title: "Gestor de Pedidos · PeriniFood" };

// Gestor de Pedidos em tela cheia (estilo gestor do iFood), fora do layout do
// painel. É a tela que o app desktop (gestor-desktop/) abre.
export default async function GestorPage() {
  const { user } = await getSessionContext();
  if (!user) redirect("/login?next=/gestor");
  const { restaurant, role } = await requireRestaurant();
  return <GestorPedidos storeName={restaurant.name} canManageStore={role !== "kitchen"} />;
}
