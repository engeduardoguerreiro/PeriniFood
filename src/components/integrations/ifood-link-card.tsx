import { ExternalLink, Link2, Unlink } from "lucide-react";
import { ifoodFinishLink, ifoodStartLink, ifoodUnlink } from "@/app/integracoes/ifood-actions";
import type { IntegrationRecord } from "./integration-ui";

type PendingLink = { userCode?: string; url?: string; expiresAt?: string };

// Server component renderiza uma vez por requisição: comparar com o relógio aqui é seguro.
const notExpired = (iso: string) => Date.parse(iso) > Date.now();

// Cartão de vínculo da loja com o iFood (modelo distribuído). Server component:
// tokens e verifier nunca vão para o navegador.
export function IFoodLinkCard({ integration, canEdit }: { integration: IntegrationRecord | null; canEdit: boolean }) {
  const credentials = (integration?.credentials ?? {}) as { pendingLink?: PendingLink };
  const linked = Boolean(integration?.refresh_token && integration?.external_store_id);
  const pending = credentials.pendingLink;
  const pendingValid = pending?.userCode && pending.expiresAt && notExpired(pending.expiresAt);

  return (
    <section className="rounded-2xl border border-line bg-white p-5 shadow-sm">
      <h2 className="flex items-center gap-2 text-xl font-black text-ink"><Link2 className="h-5 w-5 text-brand" /> Conexão com o iFood</h2>

      {linked ? (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-bold text-emerald-700">Loja vinculada</p>
            <p className="text-sm text-ink-soft">{String(integration?.external_store_name ?? "Loja iFood")} · <code className="text-xs">{String(integration?.external_store_id)}</code></p>
            <p className="mt-1 text-xs text-ink-faint">Os pedidos chegam automaticamente e a loja fica aberta no iFood enquanto o PeriniFood estiver conectado.</p>
          </div>
          {canEdit && (
            <form action={ifoodUnlink}>
              <button className="btn-muted inline-flex items-center gap-2 text-sm"><Unlink className="h-4 w-4" /> Desvincular</button>
            </form>
          )}
        </div>
      ) : pendingValid ? (
        <div className="mt-3 space-y-4">
          <ol className="list-decimal space-y-1 pl-5 text-sm text-ink-soft">
            <li>Abra o Portal do Parceiro do iFood pelo botão abaixo (entre com a conta da loja).</li>
            <li>Confirme o código <strong className="font-mono text-ink">{pending.userCode}</strong> e autorize o PeriniFood.</li>
            <li>O iFood mostra um <strong>código de autorização</strong>: copie e cole aqui.</li>
          </ol>
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-xl bg-ink px-4 py-2 font-mono text-2xl font-black tracking-widest text-white">{pending.userCode}</span>
            {pending.url && (
              <a href={pending.url} target="_blank" rel="noreferrer" className="btn-primary inline-flex items-center gap-2 text-sm"><ExternalLink className="h-4 w-4" /> Abrir Portal do Parceiro</a>
            )}
          </div>
          {canEdit && (
            <form action={ifoodFinishLink} className="flex flex-wrap gap-2">
              <input name="authorization_code" required autoComplete="off" placeholder="Código de autorização" aria-label="Código de autorização do iFood" className="field-light min-w-0 flex-1 font-mono" />
              <button className="btn-primary">Concluir vínculo</button>
            </form>
          )}
          <p className="text-xs text-ink-faint">O código vale até {new Date(pending.expiresAt!).toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" })}. Expirou? Gere outro.</p>
          {canEdit && <form action={ifoodStartLink}><button className="text-sm font-semibold text-brand underline">Gerar novo código</button></form>}
        </div>
      ) : (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <p className="max-w-xl text-sm text-ink-soft">Vincule a sua loja do iFood para receber os pedidos aqui e atualizar o status direto pelo PeriniFood.</p>
          {canEdit && (
            <form action={ifoodStartLink}>
              <button className="btn-primary inline-flex items-center gap-2"><Link2 className="h-4 w-4" /> Vincular minha loja do iFood</button>
            </form>
          )}
        </div>
      )}
    </section>
  );
}
