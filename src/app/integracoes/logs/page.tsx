import { ActionFeedback } from "@/components/action-feedback";
import { requireRestaurant } from "@/lib/auth";
import { integrationProviders, providerInfo } from "@/lib/integrations/catalog";
import { isAdminRole } from "@/lib/integrations/security";

function safeJson(value: unknown) {
  if (!value) return "";
  return JSON.stringify(value, null, 2);
}

export default async function IntegrationLogsPage({ searchParams }: { searchParams: Promise<{ provider: string; status: string; error: string }> }) {
  const sp = await searchParams;
  const { supabase, restaurant, role } = await requireRestaurant();
  const canSeeLogs = isAdminRole(role);
  const query = supabase
    .from("integration_logs")
    .select("*")
    .eq("restaurant_id", restaurant.id)
    .order("created_at", { ascending: false })
    .limit(100);
  const { data, error } = sp.provider ? await query.eq("provider", sp.provider) : await query;
  const logs = error ? [] : data ?? [];

  if (!canSeeLogs) {
    return (
      <section className="rounded-2xl bg-white p-6 shadow-sm">
        <h1 className="text-3xl font-black">Logs de integração</h1>
        <p className="mt-2 text-[#9c988f]">Seu perfil pode visualizar status das integrações, mas não tem acesso aos logs técnicos.</p>
      </section>
    );
  }

  return (
    <div className="space-y-6">
      <ActionFeedback status={sp.status} error={sp.error ?? error?.message} />
      <header className="rounded-2xl bg-white p-6 shadow-sm">
        <p className="text-xs font-bold uppercase text-[#9c988f]">Auditoria</p>
        <h1 className="text-3xl font-black">Logs de integração</h1>
        <p className="mt-2 text-[#9c988f]">Eventos inbound, outbound, testes mockados e erros controlados.</p>
      </header>

      <form className="rounded-2xl bg-white p-4 shadow-sm">
        <select name="provider" defaultValue={sp.provider ?? ""} className="field-light max-w-xs">
          <option value="">Todos os provedores</option>
          {integrationProviders.map((provider) => <option key={provider.provider} value={provider.provider}>{provider.name}</option>)}
        </select>
        <button className="btn-muted ml-2">Filtrar</button>
      </form>

      <section className="overflow-hidden rounded-2xl bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="bg-[#faf9f6] text-xs uppercase text-[#9c988f]">
              <tr>
                <th className="p-3">Data/hora</th>
                <th>Provider</th>
                <th>Evento</th>
                <th>Direo</th>
                <th>Status</th>
                <th>External ID</th>
                <th>Erro</th>
                <th>Detalhes</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="border-t border-[#efece6] align-top">
                  <td className="p-3">{new Date(log.created_at).toLocaleString("pt-BR")}</td>
                  <td>{providerInfo(log.provider).name}</td>
                  <td>{log.event_type}</td>
                  <td>{log.direction ?? log.payload.direction ?? "-"}</td>
                  <td><span className="rounded-full bg-[#f1efea] px-2 py-1 text-xs font-black">{log.status}</span></td>
                  <td>{log.external_id ?? log.payload.externalId ?? "-"}</td>
                  <td className="max-w-[220px] text-[#c5362e]">{log.error_message ?? log.message ?? "-"}</td>
                  <td>
                    <details>
                      <summary className="cursor-pointer font-bold text-[#c5362e]">Abrir</summary>
                      <pre className="mt-2 max-h-80 overflow-auto rounded-xl bg-slate-950 p-3 text-xs text-slate-100">{safeJson(log.request_payload ?? log.payload)}</pre>
                    </details>
                  </td>
                </tr>
              ))}
              {!logs.length && <tr><td colSpan={8} className="p-6 text-center text-[#9c988f]">Nenhum log encontrado.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
