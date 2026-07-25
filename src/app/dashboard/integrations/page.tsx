import { saveIntegration } from "@/app/actions";
import { requireRestaurant } from "@/lib/auth";

const providers = ["ifood", "99food", "keeta", "rappi", "whatsapp", "webhook"];

export default async function IntegrationsPage() {
  const { supabase, restaurant } = await requireRestaurant();
  const { data } = await supabase.from("integrations").select("*").eq("restaurant_id", restaurant.id);
  const integrations = data ?? [];
  return (
    <div className="grid gap-5 xl:grid-cols-2">
      {providers.map((provider) => {
        const saved = integrations.find((item) => item.provider === provider);
        return (
          <form key={provider} action={saveIntegration} className="rounded-2xl bg-white p-5 shadow-sm">
            <input type="hidden" name="provider" value={provider} />
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black">{provider.toUpperCase()}</h2>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold">{saved.status ?? "disconnected"}</span>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <input className="field-light" name="client_id" placeholder="Client ID" defaultValue={saved.credentials.clientId ?? ""} />
              <input className="field-light" name="client_secret" placeholder="Client Secret" defaultValue={saved.credentials.clientSecret ?? ""} />
              <input className="field-light" name="token" placeholder="Token" defaultValue={saved.credentials.token ?? ""} />
              <input className="field-light" name="merchant_id" placeholder="Merchant ID" defaultValue={saved.credentials.merchantId ?? ""} />
              <input className="field-light" name="webhook_url" placeholder="Webhook URL" defaultValue={saved.settings.webhookUrl ?? ""} />
              <select className="field-light" name="environment" defaultValue={saved.settings.environment ?? "sandbox"}><option value="sandbox">Sandbox</option><option value="production">Produção</option></select>
            </div>
            <label className="mt-4 flex items-center gap-2 font-bold"><input name="enabled" type="checkbox" defaultChecked={saved.enabled ?? false} /> Habilitar</label>
            <div className="mt-4 flex flex-wrap gap-2">
              <button className="btn-primary">Salvar</button>
              <button type="button" className="btn-muted">Testar conexão</button>
              <button type="button" className="btn-muted">Sincronizar pedidos</button>
            </div>
          </form>
        );
      })}
    </div>
  );
}
