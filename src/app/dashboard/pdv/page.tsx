import { createPdvOrder } from "@/app/actions";
import { PdvOrderForm } from "@/components/pdv-order-form";

export default function PdvPage() {
  return <PdvOrderForm action={createPdvOrder} />;
}
