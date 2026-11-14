import { updatePdvOrder } from "@/app/actions";
import { PdvOrderForm } from "@/components/pdv-order-form";

export default async function EditOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PdvOrderForm action={updatePdvOrder} orderId={id} />;
}
