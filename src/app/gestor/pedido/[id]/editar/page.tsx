import { PdvOrderForm } from "@/components/pdv-order-form";
import { gestorUpdateOrder } from "@/app/gestor/actions";

export default async function GestorEditarPedidoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <div className="h-full overflow-y-auto p-5">
      <PdvOrderForm action={gestorUpdateOrder} orderId={id} externalRedirect={(orderId) => `/gestor?pedido=${orderId}`} />
    </div>
  );
}
