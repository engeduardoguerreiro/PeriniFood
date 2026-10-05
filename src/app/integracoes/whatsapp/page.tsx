import { redirect } from "next/navigation";
import { BellRing, MessageCircle } from "lucide-react";
import { ActionFeedback } from "@/components/action-feedback";
import { WhatsAppConnect } from "@/components/integrations/whatsapp-connect";
import { Icon3D } from "@/components/ui/icon-3d";
import { saveIntegration } from "@/app/actions";
import { requireRestaurant } from "@/lib/auth";
import { isAdminRole } from "@/lib/integrations/security";
import { DEFAULT_TEMPLATES, TEMPLATE_LABELS, type TemplateKey } from "@/lib/whatsapp/templates";

const variables = ["{nome}", "{pedido}", "{loja}", "{link}", "{codigo}", "{total}"];

export default async function WhatsAppIntegrationPage({ searchParams }: { searchParams: Promise<{ status: string; error: string }> }) {
  const sp = await searchParams;
  const { supabase, restaurant, role } = await requireRestaurant();
  if (role === "kitchen") redirect("/dashboard");
  const { data: integration } = await supabase.from("integrations").select("*").eq("restaurant_id", restaurant.id).eq("provider", "whatsapp").maybeSingle();
  // Loja sem integração salva ainda: antes a página quebrava lendo integration.settings.
  const settings = (integration?.settings ?? integration?.config ?? {}) as { whatsappMessages?: Partial<Record<TemplateKey, string>> };
  const messages = settings.whatsappMessages ?? {};
  const automatic = Boolean(integration?.is_enabled ?? integration?.enabled);
  const canEdit = isAdminRole(role);

  return (
    <div className="space-y-5">
      <ActionFeedback status={sp.status} error={sp.error} />
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-faint">Atendimento</p>
        <h1 className="mt-1 flex items-center gap-3 text-2xl font-semibold tracking-tight text-ink"><Icon3D icon={MessageCircle} tone="green" size="sm" /><span>WhatsApp da loja</span></h1>
        <p className="mt-1 text-sm text-ink-faint">Conecte o WhatsApp da loja por QR Code e envie os avisos de pedido automaticamente.</p>
      </header>

      <section className="rounded-2xl border border-line bg-white p-5">
        <WhatsAppConnect canEdit={canEdit} />
      </section>

      <form action={saveIntegration} className="rounded-2xl border border-line bg-white p-5">
        <input type="hidden" name="provider" value="whatsapp" />
        <input type="hidden" name="name" value="WhatsApp" />
        <input type="hidden" name="auth_type" value="manual" />
        <input type="hidden" name="return_to" value="/integracoes/whatsapp" />

        <div className="flex flex-wrap items-start justify-between gap-3">
          <h2 className="flex items-center gap-3 text-lg font-semibold text-ink"><Icon3D icon={BellRing} tone="orange" size="sm" /> Avisos automáticos de status</h2>
          <label className="flex items-center gap-2 rounded-xl border border-line px-3 py-2 text-sm font-semibold">
            <input name="enabled" type="checkbox" defaultChecked={automatic} disabled={!canEdit} className="h-4 w-4 accent-brand" />
            Enviar automaticamente
          </label>
        </div>
        <p className="mt-2 text-sm text-ink-soft">
          Cada mudança de status do pedido envia a mensagem abaixo para o cliente, pelo WhatsApp da loja. Pedidos do iFood não recebem (o iFood já avisa).
          Variáveis: {variables.map((v) => <code key={v} className="mx-0.5 rounded bg-line-soft px-1 text-xs">{v}</code>)}
        </p>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {(Object.keys(DEFAULT_TEMPLATES) as TemplateKey[]).map((key) => (
            <label key={key} className="block">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-faint">{TEMPLATE_LABELS[key]}</span>
              <textarea className="field-light min-h-28 text-sm" name={`message_${key}`} defaultValue={messages[key] || DEFAULT_TEMPLATES[key]} disabled={!canEdit} />
            </label>
          ))}
        </div>
        {canEdit && <div className="mt-5"><button className="btn-primary">Salvar avisos</button></div>}
      </form>
    </div>
  );
}
