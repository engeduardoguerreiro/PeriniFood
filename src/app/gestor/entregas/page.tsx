import { Suspense } from "react";
import { EntregasView } from "@/components/gestor/gestor-entregas";

export default function GestorEntregasPage() {
  return <Suspense fallback={null}><EntregasView /></Suspense>;
}
