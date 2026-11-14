import { Suspense } from "react";
import { PedidosView } from "@/components/gestor/gestor-pedidos";

export default function GestorPage() {
  return <Suspense fallback={null}><PedidosView /></Suspense>;
}
