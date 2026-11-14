import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionContext, requireRestaurant } from "@/lib/auth";
import { GestorShell } from "@/components/gestor/gestor-shell";

export const metadata: Metadata = { title: "Gestor de Pedidos · PeriniFood" };

// Gestor de Pedidos em tela cheia (estilo gestor do iFood), fora do layout do
// painel: a operação da loja (pedidos, novo pedido, entregas). É o que o app
// desktop (gestor-desktop/) abre. A casca fica montada entre as telas, então o
// alerta de pedido novo continua tocando enquanto se lança um pedido.
export default async function GestorLayout({ children }: { children: React.ReactNode }) {
  const { user } = await getSessionContext();
  if (!user) redirect("/login?next=/gestor");
  const { restaurant, role } = await requireRestaurant();
  return <GestorShell storeName={restaurant.name} canManageStore={role !== "kitchen"}>{children}</GestorShell>;
}
