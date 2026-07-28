import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Cable, ChefHat, Receipt, TrendingUp, Users } from "lucide-react";
import { listUserEmails, requirePlatformAdmin } from "@/lib/platform-admin";
import { isRestaurantOpen } from "@/lib/opening-hours";
import { money, statusLabel } from "@/lib/utils";
import type { Order, Restaurant } from "@/lib/types";

const providerLabel: Record<string, string> = {
  ifood: "iFood",
  "99food": "99Food",
  keeta: "Keeta",
  whatsapp: "WhatsApp",
  own_menu: "Cardápio próprio",
  webhook: "Webhook / API",
  rappi: "Rappi",
};

const roleLabel: Record<string, string> = {
  owner: "Dono",
  admin: "Administrador",
  manager: "Gerente",
  cashier: "Caixa",
  kitchen: "Cozinha",
};

const integrationTone: Record<string, string> = {
  connected: "bg-emerald-50 text-emerald-700",
  active: "bg-emerald-50 text-emerald-700",
  pending: "bg-amber-50 text-amber-700",
  error: "bg-rose-50 text-rose-700",
};

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-[#9c988f]">{label}</p>
      <p className="mt-0.5 text-sm text-[#2b2925]">{value || "—"}</p>
    </div>
  );
}

function Card({ title, icon: Icon, children }: { title: string; icon: typeof Users; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-[#e7e4dd] bg-white p-5 shadow-[0_1px_2px_rgba(27,26,23,0.04)]">
      <div className="mb-4 flex items-center gap-2">
        <span className="grid h-6 w-6 place-items-center rounded-full bg-[#f6ece9] text-[#c5362e]"><Icon size={13} /></span>
        <h2 className="text-xs font-semibold uppercase tracking-wide text-[#6d6a63]">{title}</h2>
      </div>
      {children}
    </section>
  );
}

export default async function AdminClientPage({ params }: { params: Promise<{ id: string }> }) {
  const { service } = await requirePlatformAdmin();
  const { id } = await params;

  const { data: restaurant } = await service.from("restaurants").select("*").eq("id", id).maybeSingle();
  if (!restaurant) notFound();
  const r = restaurant as Restaurant;

  const since30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const [{ data: members }, { count: productCount }, { count: categoryCount }, { count: orderCountTotal }, { data: orders30 }, { data: lastOrders }, { data: integrations }, emailById] =
    await Promise.all([
      service.from("restaurant_users").select("user_id, role, created_at").eq("restaurant_id", id).order("created_at", { ascending: true }),
      service.from("products").select("id", { count: "exact", head: true }).eq("restaurant_id", id).eq("active", true),
      service.from("categories").select("id", { count: "exact", head: true }).eq("restaurant_id", id),
      service.from("orders").select("id", { count: "exact", head: true }).eq("restaurant_id", id),
      service.from("orders").select("total, status").eq("restaurant_id", id).gte("created_at", since30),
      service.from("orders").select("*").eq("restaurant_id", id).order("created_at", { ascending: false }).limit(10),
      service.from("integrations").select("provider, status, external_store_name, last_sync_at, receive_orders, send_order_status, sync_menu").eq("restaurant_id", id),
      listUserEmails(service),
    ]);
  const revenue30 = (orders30 ?? []).filter((o) => o.status !== "canceled").reduce((s, o) => s + Number(o.total), 0);
  const open = isRestaurantOpen(r);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/admin" className="inline-flex items-center gap-1.5 text-xs font-medium text-[#9c988f] transition hover:text-[#c5362e]">
            <ArrowLeft size={13} /> Todos os clientes
          </Link>
          <div className="mt-1.5 flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">{r.name}</h1>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${open ? "bg-emerald-50 text-emerald-700" : "bg-[#f1efea] text-[#6d6a63]"}`}>
              {open ? "Aberta" : "Fechada"}
            </span>
          </div>
          <p className="text-sm text-[#9c988f]">
            Cliente desde {new Date(r.created_at).toLocaleDateString("pt-BR")} · /{r.slug}
          </p>
        </div>
        <a
          href={`/cardapio/${r.slug}`}
          target="_blank"
          className="rounded-xl border border-[#e7e4dd] bg-white px-4 py-2 text-sm font-medium text-[#2b2925] transition hover:border-[#c5362e] hover:text-[#c5362e]"
        >
          Ver cardápio público
        </a>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-[#e7e4dd] bg-white p-4"><p className="text-xs font-semibold uppercase tracking-wide text-[#6d6a63]">Produtos ativos</p><p className="mt-1 text-2xl font-semibold [font-variant-numeric:tabular-nums]">{productCount ?? 0}</p><p className="text-xs text-[#9c988f]">{categoryCount ?? 0} categorias</p></div>
        <div className="rounded-2xl border border-[#e7e4dd] bg-white p-4"><p className="text-xs font-semibold uppercase tracking-wide text-[#6d6a63]">Pedidos (total)</p><p className="mt-1 text-2xl font-semibold [font-variant-numeric:tabular-nums]">{orderCountTotal ?? 0}</p></div>
        <div className="rounded-2xl border border-[#e7e4dd] bg-white p-4"><p className="text-xs font-semibold uppercase tracking-wide text-[#6d6a63]">Pedidos (30d)</p><p className="mt-1 text-2xl font-semibold [font-variant-numeric:tabular-nums]">{(orders30 ?? []).length}</p></div>
        <div className="rounded-2xl border border-[#e7e4dd] bg-white p-4"><p className="text-xs font-semibold uppercase tracking-wide text-[#6d6a63]">Receita (30d)</p><p className="mt-1 text-2xl font-semibold [font-variant-numeric:tabular-nums]">{money(revenue30)}</p></div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Dados do cliente" icon={ChefHat}>
          <div className="grid grid-cols-2 gap-4">
            <Info label="Telefone" value={r.phone ?? ""} />
            <Info label="WhatsApp" value={r.whatsapp ?? ""} />
            <Info label="E-mail" value={r.email ?? ""} />
            <Info label="Cidade" value={[r.city, r.state].filter(Boolean).join(" / ")} />
            <Info label="Endereço" value={r.address ?? ""} />
            <Info label="Taxa de entrega" value={money(Number(r.delivery_fee ?? 0))} />
          </div>
          <div className="mt-4 flex flex-wrap gap-1.5 border-t border-[#efece6] pt-4">
            {r.delivery_enabled && <span className="rounded-full bg-[#f1efea] px-2 py-0.5 text-[0.65rem] font-medium text-[#6d6a63]">Entrega</span>}
            {r.pickup_enabled && <span className="rounded-full bg-[#f1efea] px-2 py-0.5 text-[0.65rem] font-medium text-[#6d6a63]">Retirada</span>}
            {r.table_service_enabled && <span className="rounded-full bg-[#f1efea] px-2 py-0.5 text-[0.65rem] font-medium text-[#6d6a63]">Mesa</span>}
          </div>
        </Card>

        <Card title="Integrações" icon={Cable}>
          {(integrations ?? []).length ? (
            <ul className="space-y-2.5">
              {(integrations ?? []).map((i) => (
                <li key={i.provider} className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-[#2b2925]">{providerLabel[i.provider] ?? i.provider}</p>
                    <p className="text-xs text-[#9c988f]">
                      {[i.external_store_name, i.receive_orders ? "recebe pedidos" : null, i.send_order_status ? "envia status" : null, i.sync_menu ? "sincroniza cardápio" : null]
                        .filter(Boolean)
                        .join(" · ") || "Sem detalhes"}
                    </p>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-[0.65rem] font-medium ${integrationTone[i.status] ?? "bg-[#f1efea] text-[#6d6a63]"}`}>{i.status}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-[#9c988f]">Nenhuma integração configurada.</p>
          )}
        </Card>

        <Card title="Usuários" icon={Users}>
          {(members ?? []).length ? (
            <ul className="space-y-2.5">
              {(members ?? []).map((m) => (
                <li key={m.user_id} className="flex items-center justify-between gap-3">
                  <p className="truncate text-sm text-[#2b2925]">{emailById.get(m.user_id) || m.user_id}</p>
                  <span className="rounded-full bg-[#f1efea] px-2 py-0.5 text-[0.65rem] font-medium text-[#6d6a63]">{roleLabel[m.role] ?? m.role}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-[#9c988f]">Nenhum usuário vinculado.</p>
          )}
        </Card>

        <Card title="Últimos pedidos" icon={Receipt}>
          {(lastOrders ?? []).length ? (
            <ul className="space-y-2.5">
              {((lastOrders ?? []) as Order[]).map((o) => (
                <li key={o.id} className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-[#2b2925]">#{o.code ?? o.order_number} · {new Date(o.created_at).toLocaleDateString("pt-BR")}</span>
                  <span className="flex items-center gap-2">
                    <span className="text-xs text-[#9c988f]">{statusLabel[o.status]}</span>
                    <strong className="[font-variant-numeric:tabular-nums]">{money(o.total)}</strong>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-[#9c988f]">Nenhum pedido registrado.</p>
          )}
        </Card>
      </div>
      <p className="flex items-center gap-1.5 text-xs text-[#b0aaa0]"><TrendingUp size={12} /> Dados em tempo real, somente leitura.</p>
    </div>
  );
}
