import { redirect } from "next/navigation";
import { ActionFeedback } from "@/components/action-feedback";
import { saveIntegration, testIntegration } from "@/app/actions";
import { requireRestaurant } from "@/lib/auth";
import { generateWhatsAppLink, isAdminRole } from "@/lib/integrations/security";

export default async function WhatsAppIntegrationPage({ searchParams }: { searchParams: Promise<{ status: string; error: string }> }) {
  const sp = await searchParams;
  const { supabase, restaurant, role } = await requireRestaurant();
  if (role === "kitchen") redirect("/dashboard");
  const { data: integration } = await supabase.from("integrations").select("*").eq("restaurant_id", restaurant.id).eq("provider", "whatsapp").maybeSingle();
  const settings = integration.settings ?? integration.config ?? {};
  const messages = settings.whatsappMessages ?? {};
  const canEdit = isAdminRole(role);
  const phone = integration.external_store_id ?? integration.credentials.externalStoreId ?? restaurant.whatsapp ?? "";
  return (
    <div className="space-y-6">
      <ActionFeedback status={sp.status} error={sp.error} />
      <header className="rounded-2xl bg-white p-6 shadow-sm">
        <p className="text-xs font-bold uppercase text-[#9c988f]">Atendimento</p>
        <h1 className="text-3xl font-black">WhatsApp</h1>
        <p className="mt-2 text-[#9c988f]">Configure mensagens manuais. A integração oficial WhatsApp Business API fica para etapa futura.</p>
      </header>
      <form action={saveIntegration} className="rounded-2xl bg-white p-5 shadow-sm">
        <input type="hidden" name="provider" value="whatsapp" />
        <input type="hidden" name="name" value="WhatsApp" />
        <input type="hidden" name="auth_type" value="manual" />
        <input type="hidden" name="return_to" value="/integracoes/whatsapp" />
        <div className="grid gap-4 md:grid-cols-2">
          <input className="field-light" name="external_store_id" placeholder="Número do WhatsApp do restaurante" defaultValue={phone} disabled={!canEdit} />
          <label className="flex items-center gap-2 rounded-xl border border-[#e7e4dd] p-3 font-bold"><input name="enabled" type="checkbox" defaultChecked={Boolean(integration.is_enabled ?? integration.enabled)} disabled={!canEdit} /> Habilitar botão WhatsApp nos pedidos</label>
          <textarea className="field-light" name="message_confirmed" placeholder="Mensagem padrão de pedido confirmado" defaultValue={messages.confirmed ?? "Olá! Seu pedido foi confirmado."} disabled={!canEdit} />
          <textarea className="field-light" name="message_preparing" placeholder="Mensagem padrão de pedido em preparo" defaultValue={messages.preparing ?? "Seu pedido está em preparo."} disabled={!canEdit} />
          <textarea className="field-light" name="message_dispatched" placeholder="Mensagem padrão de saiu para entrega" defaultValue={messages.dispatched ?? "Seu pedido saiu para entrega."} disabled={!canEdit} />
          <textarea className="field-light" name="message_ready" placeholder="Mensagem padrão de pedido pronto para retirada" defaultValue={messages.ready ?? "Seu pedido está pronto para retirada."} disabled={!canEdit} />
          <textarea className="field-light" name="message_completed" placeholder="Mensagem padrão de pedido finalizado" defaultValue={messages.completed ?? "Pedido finalizado. Obrigado pela preferência!"} disabled={!canEdit} />
        </div>
        <div className="mt-5 rounded-xl bg-[#faf9f6] p-4">
          <p className="text-sm font-bold text-[#9c988f]">Exemplo de link</p>
          <code className="mt-2 block overflow-x-auto rounded-lg bg-white p-3 text-sm">{generateWhatsAppLink(phone || "11999999999", messages.confirmed ?? "Pedido confirmado")}</code>
        </div>
        {canEdit && <div className="mt-5 flex gap-2"><button className="btn-primary">Salvar configuração</button><button formAction={testIntegration} className="btn-muted">Testar configuração</button></div>}
      </form>
    </div>
  );
}
