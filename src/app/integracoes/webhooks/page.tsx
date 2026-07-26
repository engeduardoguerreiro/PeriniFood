import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { ActionFeedback } from "@/components/action-feedback";
import { saveIntegration, testIntegration } from "@/app/actions";
import { requireRestaurant } from "@/lib/auth";
import { isAdminRole, maskSecret } from "@/lib/integrations/security";

const samplePayload = `{
  "externalOrderId": "123456",
  "externalStoreId": "loja-forno-nordestino",
  "customer": {
    "name": "Cliente Teste",
    "phone": "11999999999"
  },
  "delivery": {
    "type": "DELIVERY",
    "address": {
      "street": "Rua Exemplo",
      "number": "100",
      "neighborhood": "Centro",
      "city": "Itapevi",
      "state": "SP"
    }
  },
  "items": [
    {
      "externalProductId": "pizza-calabresa",
      "name": "Pizza Calabresa",
      "quantity": 1,
      "unitPrice": 29.9,
      "notes": "Sem cebola",
      "addons": [{ "name": "Borda recheada", "price": 5, "quantity": 1 }]
    }
  ],
  "payment": { "method": "PIX", "status": "PENDING" },
  "totals": { "subtotal": 29.9, "deliveryFee": 5, "discount": 0, "total": 34.9 },
  "notes": "Entregar na portaria"
}`;

export default async function WebhooksPage({ searchParams }: { searchParams: Promise<{ status: string; error: string }> }) {
  const sp = await searchParams;
  const { supabase, restaurant, role } = await requireRestaurant();
  if (role === "kitchen") redirect("/dashboard");
  const requestHeaders = await headers();
  const origin = requestHeaders.get("x-forwarded-host") ?
     `${requestHeaders.get("x-forwarded-proto") ?? "https"}://${requestHeaders.get("x-forwarded-host")}`
    : "http://localhost:3000";
  const { data: integration } = await supabase.from("integrations").select("*").eq("restaurant_id", restaurant.id).eq("provider", "webhook").maybeSingle();
  const canEdit = isAdminRole(role);
  const settings = integration.settings ?? integration.config ?? {};
  const secret = integration.webhook_secret ?? integration.credentials.webhookSecret ?? "";
  const endpoint = `${origin}/api/integrations/custom-webhook/orders`;

  return (
    <div className="space-y-6">
      <ActionFeedback status={sp.status} error={sp.error} />
      <header className="rounded-2xl bg-white p-6 shadow-sm">
        <p className="text-xs font-bold uppercase text-[#9c988f]">API externa</p>
        <h1 className="text-3xl font-black">Webhooks / API</h1>
        <p className="mt-2 max-w-3xl text-[#9c988f]">Receba pedidos de sistemas externos por um webhook genérico. O token deve ser enviado no header Authorization: Bearer TOKEN ou x-webhook-secret.</p>
      </header>

      <form action={saveIntegration} className="rounded-2xl bg-white p-5 shadow-sm">
        <input type="hidden" name="provider" value="webhook" />
        <input type="hidden" name="return_to" value="/integracoes/webhooks" />
        <input type="hidden" name="auth_type" value="webhook_only" />
        <div className="grid gap-4 md:grid-cols-2">
          <input className="field-light" name="name" placeholder="Nome da integração" defaultValue={integration.name ?? settings.name ?? "Webhook externo"} disabled={!canEdit} />
          <input className="field-light" name="external_store_id" placeholder="ID externo da loja" defaultValue={integration.external_store_id ?? integration.credentials.externalStoreId ?? ""} disabled={!canEdit} />
          <input className="field-light" name="webhook_secret" placeholder={maskSecret(secret) || "Token secreto"} defaultValue="" disabled={!canEdit} />
          <label className="flex items-center gap-2 rounded-xl border border-[#e7e4dd] p-3 font-bold"><input name="enabled" type="checkbox" defaultChecked={Boolean(integration.is_enabled ?? integration.enabled)} disabled={!canEdit} /> Webhook ativo</label>
          <label className="flex items-center gap-2 rounded-xl border border-[#e7e4dd] p-3 font-bold"><input name="receive_orders" type="checkbox" defaultChecked={settings.receiveOrders ?? true} disabled={!canEdit} /> Permitir criação de pedidos</label>
          <label className="flex items-center gap-2 rounded-xl border border-[#e7e4dd] p-3 font-bold"><input name="send_order_status" type="checkbox" defaultChecked={settings.sendOrderStatus ?? false} disabled={!canEdit} /> Permitir atualização de status</label>
        </div>
        <div className="mt-5 rounded-xl bg-[#faf9f6] p-4">
          <p className="text-sm font-bold text-[#9c988f]">URL do webhook</p>
          <code className="mt-2 block overflow-x-auto rounded-lg bg-white p-3 text-sm">{endpoint}</code>
        </div>
        {canEdit && <div className="mt-5 flex flex-wrap gap-2"><button className="btn-primary">Salvar configuração</button><button formAction={testIntegration} className="btn-muted">Testar configuração</button></div>}
      </form>

      <section className="rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="text-xl font-black">Payload padrão</h2>
        <pre className="mt-4 max-h-[520px] overflow-auto rounded-xl bg-slate-950 p-4 text-xs text-slate-100">{samplePayload}</pre>
      </section>
    </div>
  );
}
