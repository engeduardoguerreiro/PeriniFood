import Link from "next/link";
import { ActionFeedback } from "@/components/action-feedback";
import { saveIntegration, savePaymentMap, saveProductMap, testIntegration } from "@/app/actions";
import { integrationProviders, providerInfo, statusClass, statusLabel } from "@/lib/integrations/catalog";
import { maskSecret } from "@/lib/integrations/security";
import { money } from "@/lib/utils";

type IntegrationRecord = Record<string, any>;

export function IntegrationOverview({ integrations }: { integrations: IntegrationRecord[] }) {
  return (
    <div className="space-y-6">
      <header className="rounded-2xl bg-white p-6 shadow-sm">
        <p className="text-xs font-bold uppercase text-slate-500">Canais externos</p>
        <h1 className="mt-1 text-3xl font-black text-slate-900">Integrações</h1>
        <p className="mt-2 max-w-3xl text-slate-500">Configure marketplaces, WhatsApp e webhooks por restaurante. As chamadas reais às APIs externas ficam preparadas para plugar depois.</p>
      </header>
      <div className="grid gap-4 xl:grid-cols-2">
        {integrationProviders.map((item) => {
          const saved = integrations.find((integration) => integration.provider === item.provider);
          const Icon = item.icon;
          return (
            <Link key={item.provider} href={item.provider === "webhook" ? "/integracoes/webhooks" : `/integracoes/${item.provider}`} className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-red-200 hover:shadow-md">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <span className="grid h-12 w-12 place-items-center rounded-xl bg-red-50 text-red-600"><Icon className="h-6 w-6" /></span>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-xl font-black">{item.name}</h2>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-black uppercase text-slate-500">{item.badge}</span>
                    </div>
                    <p className="mt-2 text-sm text-slate-500">{item.description}</p>
                  </div>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-black ${statusClass(saved?.status, saved?.is_enabled ?? saved?.enabled)}`}>
                  {statusLabel(saved?.status, saved?.is_enabled ?? saved?.enabled)}
                </span>
              </div>
              <span className="mt-5 inline-flex rounded-xl border border-red-200 px-4 py-2 text-sm font-black text-red-700 group-hover:bg-red-50">Configurar</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function valueFromIntegration<T = string>(integration: IntegrationRecord | null, key: string, fallback: T | string = "") {
  if (!integration) return fallback;
  const snake = key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
  return integration[snake] ?? integration[key] ?? integration.credentials?.[key] ?? integration.settings?.[key] ?? integration.config?.[key] ?? fallback;
}

export function MarketplaceIntegrationSettings({
  provider,
  integration,
  logs,
  products,
  variants,
  productMaps,
  paymentMaps,
  canEdit,
  origin,
  status,
  error,
}: {
  provider: "99food" | "ifood" | "keeta";
  integration: IntegrationRecord | null;
  logs: IntegrationRecord[];
  products: IntegrationRecord[];
  variants: IntegrationRecord[];
  productMaps: IntegrationRecord[];
  paymentMaps: IntegrationRecord[];
  canEdit: boolean;
  origin: string;
  status: string;
  error: string;
}) {
  const info = providerInfo(provider);
  const webhookUrl = `${origin}/api/integrations/${provider}/webhook`;
  const enabled = Boolean(integration?.is_enabled ?? integration?.enabled);
  const sensitive = ["clientSecret", "accessToken", "refreshToken", "apiKey", "webhookSecret"];
  return (
    <div className="space-y-6">
      <ActionFeedback status={status} error={error} />
      <header className="rounded-2xl bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase text-slate-500">Marketplace</p>
            <h1 className="text-3xl font-black">{info.name}</h1>
            <p className="mt-2 max-w-3xl text-slate-500">{info.description}</p>
          </div>
          <span className={`rounded-full px-4 py-2 text-sm font-black ${statusClass(integration?.status, enabled)}`}>
            {statusLabel(integration?.status, enabled)}
          </span>
        </div>
      </header>

      <form action={saveIntegration} className="grid gap-5 xl:grid-cols-2">
        <input type="hidden" name="provider" value={provider} />
        <input type="hidden" name="return_to" value={`/integracoes/${provider}`} />
        <section className="rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="text-xl font-black">Dados da loja</h2>
          <div className="mt-4 grid gap-3">
            <input className="field-light" name="name" placeholder="Nome da integração" defaultValue={valueFromIntegration(integration, "name", info.name)} disabled={!canEdit} />
            <input className="field-light" name="external_store_id" placeholder="ID da loja no marketplace" defaultValue={valueFromIntegration(integration, "externalStoreId")} disabled={!canEdit} />
            <input className="field-light" name="external_store_name" placeholder="Nome da loja no marketplace" defaultValue={valueFromIntegration(integration, "externalStoreName")} disabled={!canEdit} />
            <select className="field-light" name="environment" defaultValue={valueFromIntegration(integration, "environment", "production")} disabled={!canEdit}>
              <option value="sandbox">Sandbox</option>
              <option value="production">Produção</option>
            </select>
            <label className="flex items-center gap-2 font-bold"><input name="enabled" type="checkbox" defaultChecked={enabled} disabled={!canEdit} /> Integração ativa</label>
          </div>
        </section>

        <section className="rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="text-xl font-black">Autenticação</h2>
          <p className="mt-1 text-sm text-slate-500">Os segredos salvos aparecem mascarados. TODO: adicionar criptografia em repouso.</p>
          <div className="mt-4 grid gap-3">
            <select className="field-light" name="auth_type" defaultValue={valueFromIntegration(integration, "authType", "manual")} disabled={!canEdit}>
              <option value="manual">Manual</option>
              <option value="api_key">API Key</option>
              <option value="bearer_token">Bearer Token</option>
              <option value="basic_auth">Basic Auth</option>
              <option value="oauth2">OAuth2</option>
              <option value="webhook_only">Somente webhook</option>
            </select>
            <input className="field-light" name="api_base_url" placeholder="API Base URL" defaultValue={valueFromIntegration(integration, "apiBaseUrl")} disabled={!canEdit} />
            <input className="field-light" name="client_id" placeholder="Client ID" defaultValue={valueFromIntegration(integration, "clientId")} disabled={!canEdit} />
            {sensitive.map((field) => (
              <input key={field} className="field-light" name={field.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`)} placeholder={maskSecret(valueFromIntegration(integration, field)) || field} defaultValue="" disabled={!canEdit} />
            ))}
          </div>
        </section>

        <section className="rounded-2xl bg-white p-5 shadow-sm xl:col-span-2">
          <h2 className="text-xl font-black">Configurações operacionais</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {[
              ["receive_orders", "Receber pedidos"],
              ["send_order_status", "Enviar atualização de status"],
              ["sync_menu", "Sincronizar cardápio"],
              ["sync_products", "Sincronizar produtos"],
              ["sync_prices", "Sincronizar preços"],
              ["auto_accept_orders", "Aceitar pedidos automaticamente"],
            ].map(([name, label]) => (
              <label key={name} className="rounded-xl border border-slate-200 p-3 font-bold"><input className="mr-2" name={name} type="checkbox" defaultChecked={Boolean(valueFromIntegration(integration, name.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase()), name === "receive_orders"))} disabled={!canEdit} />{label}</label>
            ))}
          </div>
          <div className="mt-5 rounded-xl bg-slate-50 p-4">
            <p className="text-sm font-bold text-slate-500">Webhook gerado</p>
            <code className="mt-2 block overflow-x-auto rounded-lg bg-white p-3 text-sm">{webhookUrl}</code>
          </div>
          {canEdit && (
            <div className="mt-5 flex flex-wrap gap-2">
              <button className="btn-primary">Salvar configuração</button>
              <button formAction={testIntegration} className="btn-muted">Testar conexão</button>
              <Link href="/integracoes/logs" className="btn-muted">Ver logs</Link>
            </div>
          )}
        </section>
      </form>

      <MappingTables integration={integration} products={products} variants={variants} productMaps={productMaps} paymentMaps={paymentMaps} canEdit={canEdit} returnTo={`/integracoes/${provider}`} />
      <LogPreview logs={logs} />
    </div>
  );
}

export function MappingTables({ integration, products, variants, productMaps, paymentMaps, canEdit, returnTo }: { integration: IntegrationRecord | null; products: IntegrationRecord[]; variants: IntegrationRecord[]; productMaps: IntegrationRecord[]; paymentMaps: IntegrationRecord[]; canEdit: boolean; returnTo: string }) {
  if (!integration?.id) return null;
  return (
    <div className="grid gap-5 xl:grid-cols-2">
      <section className="rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="text-xl font-black">Produtos</h2>
        <div className="mt-4 space-y-3">
          {productMaps.map((map) => <div key={map.id} className="rounded-xl border border-slate-200 p-3 text-sm"><strong>{map.external_product_id}</strong><p>{map.external_product_name ?? "Produto externo"}</p></div>)}
          {canEdit && (
            <form action={saveProductMap} className="grid gap-2 border-t border-slate-100 pt-4">
              <input type="hidden" name="integration_id" value={integration.id} />
              <input type="hidden" name="return_to" value={returnTo} />
              <input className="field-light" name="external_product_id" placeholder="ID externo do produto" required />
              <input className="field-light" name="external_product_name" placeholder="Nome externo" />
              <select className="field-light" name="product_id"><option value="">Produto interno</option>{products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}</select>
              <select className="field-light" name="product_variant_id"><option value="">Variação interna</option>{variants.map((variant) => <option key={variant.id} value={variant.id}>{variant.name} - {money(variant.price)}</option>)}</select>
              <label className="font-bold"><input className="mr-2" name="is_active" type="checkbox" defaultChecked /> Ativo</label>
              <button className="btn-primary">Salvar mapeamento</button>
            </form>
          )}
        </div>
      </section>

      <section className="rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="text-xl font-black">Pagamentos</h2>
        <div className="mt-4 space-y-3">
          {paymentMaps.map((map) => <div key={map.id} className="rounded-xl border border-slate-200 p-3 text-sm"><strong>{map.external_payment_code}</strong><p>{map.external_payment_name ?? "Pagamento externo"} → {map.internal_payment_method}</p></div>)}
          {canEdit && (
            <form action={savePaymentMap} className="grid gap-2 border-t border-slate-100 pt-4">
              <input type="hidden" name="integration_id" value={integration.id} />
              <input type="hidden" name="return_to" value={returnTo} />
              <input className="field-light" name="external_payment_code" placeholder="Código externo" required />
              <input className="field-light" name="external_payment_name" placeholder="Nome externo" />
              <select className="field-light" name="internal_payment_method">
                <option value="cash">Dinheiro</option>
                <option value="pix">Pix</option>
                <option value="credit_card">Cartão de crédito</option>
                <option value="debit_card">Cartão de débito</option>
                <option value="online">Pago online</option>
                <option value="voucher">Voucher</option>
                <option value="other">Outro</option>
              </select>
              <label className="font-bold"><input className="mr-2" name="is_active" type="checkbox" defaultChecked /> Ativo</label>
              <button className="btn-primary">Salvar pagamento</button>
            </form>
          )}
        </div>
      </section>
    </div>
  );
}

export function LogPreview({ logs }: { logs: IntegrationRecord[] }) {
  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-black">Logs recentes</h2>
        <Link href="/integracoes/logs" className="text-sm font-black text-red-600">Ver todos</Link>
      </div>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-3">Data</th><th>Evento</th><th>Status</th><th>Erro</th></tr></thead>
          <tbody>{logs.map((log) => <tr key={log.id} className="border-t border-slate-100"><td className="p-3">{new Date(log.created_at).toLocaleString("pt-BR")}</td><td>{log.event_type}</td><td>{log.status}</td><td>{log.error_message ?? log.message ?? "-"}</td></tr>)}</tbody>
        </table>
      </div>
    </section>
  );
}
