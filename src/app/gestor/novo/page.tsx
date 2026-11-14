import { PdvOrderForm } from "@/components/pdv-order-form";
import { gestorCreateOrder } from "@/app/gestor/actions";

// Pedido tirado pela loja: WhatsApp, telefone ou balcão. Busca o cliente pelo
// telefone, calcula a taxa de entrega e, ao finalizar, volta ao gestor com o
// pedido aberto (e impresso, no botão "Finalizar e imprimir").
export default function GestorNovoPedidoPage() {
  return (
    <div className="h-full overflow-y-auto p-5">
      <PdvOrderForm action={gestorCreateOrder} />
    </div>
  );
}
