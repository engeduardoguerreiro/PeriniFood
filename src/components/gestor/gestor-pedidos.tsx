"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle, Bike, CalendarClock, Check, CheckCircle2, ChefHat, Clock3, MapPin, MessageCircle, Package, Pencil, Phone,
  Plus, Printer, Receipt, Search, Store, X, XCircle,
} from "lucide-react";
import { money } from "@/lib/utils";
import { useGestor } from "./gestor-shell";
import { CourierCard } from "./gestor-courier";
import {
  SourceBadge, dateTimeFormat, elapsedClass, elapsedLabel, isClosed, isIFood, minutesSince, nextStep, paymentLabel, scheduled,
  statusInfo, timeFormat, typeInfo, useOrderDetail, waLink, waNumber, type Detail, type ListOrder,
} from "./gestor-shared";

// Tela "Pedidos" do gestor: lista agrupada por etapa à esquerda e detalhe do
// pedido à direita, com a próxima ação em destaque. O pedido aberto fica na URL
// (?pedido=), e ?imprimir=1 imprime logo depois de lançar um pedido.

type Tab = "andamento" | "agendados" | "concluidos";
type TypeFilter = "todos" | "delivery" | "pickup" | "dine_in";

const groups: Array<{ key: string; title: string; statuses: ListOrder["status"][]; dot: string }> = [
  { key: "novos", title: "Novos", statuses: ["pending"], dot: "bg-red-600" },
  { key: "preparo", title: "Em preparo", statuses: ["accepted", "preparing"], dot: "bg-amber-500" },
  { key: "prontos", title: "Prontos", statuses: ["ready"], dot: "bg-emerald-500" },
  { key: "entrega", title: "Em entrega", statuses: ["out_for_delivery"], dot: "bg-indigo-500" },
];

// Pedidos de canal externo (iFood etc.) não são editados pela loja.
const EXTERNAL = new Set(["ifood", "99food", "keeta", "rappi"]);

function OrderCard({ order, now, active, onSelect }: { order: ListOrder; now: number; active: boolean; onSelect: (id: string) => void }) {
  const minutes = minutesSince(order.createdAt, now);
  const TypeIcon = typeInfo[order.type]?.icon ?? Package;
  const closed = isClosed(order);
  return (
    <button
      type="button"
      onClick={() => onSelect(order.id)}
      className={`w-full rounded-xl border bg-white p-3 text-left transition ${active ? "border-red-600 ring-2 ring-red-600/15" : "border-zinc-200 hover:border-zinc-300"} ${order.status === "pending" ? "border-l-4 border-l-red-600" : ""}`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <SourceBadge source={order.source} />
          <span className="truncate font-bold text-zinc-900">{order.label}</span>
        </div>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[0.7rem] font-bold [font-variant-numeric:tabular-nums] ${closed ? statusInfo[order.status].className : elapsedClass(order, minutes)}`}>
          {closed ? statusInfo[order.status].label : elapsedLabel(minutes)}
        </span>
      </div>
      <p className="mt-1.5 truncate text-sm font-medium text-zinc-700">{order.customer || "Cliente balcão"}</p>
      <div className="mt-1 flex items-center justify-between gap-2 text-xs text-zinc-500">
        <span className="flex items-center gap-1"><TypeIcon className="h-3.5 w-3.5" /> {typeInfo[order.type]?.label ?? order.type} · {timeFormat.format(new Date(order.createdAt))}</span>
        <strong className="text-zinc-900 [font-variant-numeric:tabular-nums]">{money(order.total)}</strong>
      </div>
      {order.courier && !closed && (
        <p className="mt-2 flex items-center gap-1 rounded-md bg-sky-50 px-2 py-1 text-[0.7rem] font-semibold text-sky-800">
          <Bike className="h-3.5 w-3.5" /> {order.courier.name || "Motoboy"} · {order.courier.state === "on_route" ? "em rota" : order.courier.state === "delivered" ? "entregou" : "aguardando sair"}
        </p>
      )}
      {order.schedule && (
        <p className="mt-2 flex items-center gap-1 rounded-md bg-amber-50 px-2 py-1 text-[0.7rem] font-semibold text-amber-800">
          <CalendarClock className="h-3.5 w-3.5" /> Agendado {dateTimeFormat.format(new Date(order.schedule.start))}
        </p>
      )}
    </button>
  );
}

// Mensagem de confirmação para o cliente que pediu pelo WhatsApp/telefone.
function confirmationMessage(order: ListOrder, detail: Detail, origin: string) {
  const first = order.customer?.split(" ")[0];
  const items = detail.items.map((item) => `• ${item.quantity}x ${item.name}${item.lines.length ? ` (${item.lines.join("; ")})` : ""}`).join("\n");
  const where = order.type === "delivery" ? `Entrega: ${detail.address ?? order.address ?? ""}` : order.type === "pickup" ? "Retirada no balcão" : "Consumo no local";
  const payment = `${paymentLabel[detail.paymentMethod] ?? detail.paymentMethod}${detail.changeFor ? ` (troco para ${money(detail.changeFor)})` : ""}`;
  const follow = detail.trackingCode ? `\n\nAcompanhe seu pedido: ${origin}/pedido/${detail.trackingCode}` : "";
  return `Olá${first ? ` ${first}` : ""}! Seu pedido ${order.label} foi confirmado ✅\n\n${items}\n\nTotal: ${money(detail.total)} · ${payment}\n${where}${follow}`;
}

export function PedidosView() {
  const { orders, loaded, now, busy, printing, detailVersion, changeStatus, print, refresh, requestCancel, openDispatch, selectOrder } = useGestor();
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedId = searchParams.get("pedido");
  const printParam = searchParams.get("imprimir") === "1";
  const [tab, setTab] = useState<Tab>("andamento");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("todos");
  const [search, setSearch] = useState("");
  const printedRef = useRef<string | null>(null);

  const selected = orders.find((order) => order.id === selectedId) ?? null;
  const { detail, error: detailError } = useOrderDetail(selected?.id ?? null, selected?.updatedAt, detailVersion);

  // Pedido recém-lançado ainda fora da lista: busca de novo.
  useEffect(() => {
    if (selectedId && loaded && !selected) refresh();
  }, [selectedId, loaded, selected, refresh]);

  // ?imprimir=1 (botão "Finalizar e imprimir" do novo pedido): imprime uma vez.
  useEffect(() => {
    if (!printParam || !selectedId || printedRef.current === selectedId) return;
    printedRef.current = selectedId;
    print(selectedId);
    router.replace(`/gestor?pedido=${selectedId}`, { scroll: false });
  }, [printParam, selectedId, print, router]);

  const term = search.trim().toLowerCase();
  const matches = (order: ListOrder) => {
    if (typeFilter !== "todos" && order.type !== typeFilter) return false;
    if (!term) return true;
    return order.label.toLowerCase().includes(term) || (order.customer ?? "").toLowerCase().includes(term);
  };
  const activeOrders = orders.filter((order) => !isClosed(order));
  const scheduledOrders = activeOrders.filter((order) => scheduled(order, now) && order.status !== "pending");
  const runningOrders = activeOrders.filter((order) => !scheduledOrders.includes(order));
  const closedOrders = orders.filter(isClosed);
  const tabOrders = (tab === "andamento" ? runningOrders : tab === "agendados" ? scheduledOrders : closedOrders).filter(matches);

  const step = selected ? nextStep(selected, now) : null;
  const selectedClosed = selected ? isClosed(selected) : true;
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  const editable = selected && !EXTERNAL.has(selected.source) && !selectedClosed;

  function runStep(order: ListOrder, status: ListOrder["status"]) {
    // Despachar entrega passa pelo diálogo do motoboy.
    if (status === "out_for_delivery") openDispatch(order);
    else void changeStatus(order, status);
  }

  return (
    <div className="flex h-full min-h-0">
      {/* Lista */}
      <aside className="flex w-[370px] shrink-0 flex-col border-r border-zinc-200 bg-zinc-50">
        <div className="grid grid-cols-3 border-b border-zinc-200 bg-white text-sm font-semibold">
          {([
            ["andamento", "Em andamento", runningOrders.length],
            ["agendados", "Agendados", scheduledOrders.length],
            ["concluidos", "Encerrados", closedOrders.length],
          ] as Array<[Tab, string, number]>).map(([key, label, count]) => (
            <button key={key} type="button" onClick={() => setTab(key)} className={`flex items-center justify-center gap-1.5 border-b-2 px-2 py-3 ${tab === key ? "border-red-600 text-red-600" : "border-transparent text-zinc-500 hover:text-zinc-800"}`}>
              {label}
              <span className={`rounded-full px-1.5 text-[0.7rem] [font-variant-numeric:tabular-nums] ${tab === key ? "bg-red-600 text-white" : "bg-zinc-200 text-zinc-600"}`}>{count}</span>
            </button>
          ))}
        </div>
        <div className="space-y-2 border-b border-zinc-200 p-3">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por número ou cliente" className="h-9 w-full rounded-lg border border-zinc-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-red-600" />
          </label>
          <div className="flex gap-1.5">
            {([["todos", "Todos"], ["delivery", "Entrega"], ["pickup", "Retirada"], ["dine_in", "Mesa"]] as Array<[TypeFilter, string]>).map(([key, label]) => (
              <button key={key} type="button" onClick={() => setTypeFilter(key)} className={`h-7 rounded-full px-3 text-xs font-semibold ${typeFilter === key ? "bg-zinc-900 text-white" : "bg-white text-zinc-600 ring-1 ring-zinc-200 hover:ring-zinc-300"}`}>
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-3">
          {!loaded && <p className="p-6 text-center text-sm text-zinc-500">Carregando pedidos…</p>}
          {loaded && tab === "andamento" && groups.map((group) => {
            const rows = tabOrders.filter((order) => group.statuses.includes(order.status));
            if (!rows.length) return null;
            return (
              <section key={group.key}>
                <h3 className="mb-2 flex items-center gap-2 px-1 text-xs font-bold uppercase tracking-wide text-zinc-500">
                  <span className={`h-2 w-2 rounded-full ${group.dot}`} /> {group.title} <span className="text-zinc-400">{rows.length}</span>
                </h3>
                <div className="space-y-2">{rows.map((order) => <OrderCard key={order.id} order={order} now={now} active={order.id === selectedId} onSelect={selectOrder} />)}</div>
              </section>
            );
          })}
          {loaded && tab !== "andamento" && <div className="space-y-2">{tabOrders.map((order) => <OrderCard key={order.id} order={order} now={now} active={order.id === selectedId} onSelect={selectOrder} />)}</div>}
          {loaded && !tabOrders.length && (
            <div className="flex flex-col items-center gap-2 p-10 text-center text-sm text-zinc-500">
              <Package className="h-8 w-8 text-zinc-300" />
              {tab === "andamento" ? "Nenhum pedido em andamento." : tab === "agendados" ? "Nenhum pedido agendado." : "Nenhum pedido encerrado hoje."}
            </div>
          )}
        </div>
        <Link href="/gestor/novo" className="m-3 flex h-11 items-center justify-center gap-2 rounded-xl bg-red-600 text-sm font-bold text-white shadow-sm hover:bg-red-700">
          <Plus className="h-4 w-4" /> Novo pedido (WhatsApp, telefone, balcão)
        </Link>
      </aside>

      {/* Detalhe */}
      <main className="flex min-w-0 flex-1 flex-col">
        {!selected ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center text-zinc-500">
            <span className="grid h-20 w-20 place-items-center rounded-full bg-white shadow-sm"><Receipt className="h-9 w-9 text-zinc-300" /></span>
            <p className="text-lg font-semibold text-zinc-700">{selectedId && loaded ? "Abrindo pedido…" : "Selecione um pedido"}</p>
            <p className="max-w-sm text-sm">Os pedidos do cardápio e do iFood chegam aqui com alerta sonoro. Pedido pelo WhatsApp ou telefone: <Link href="/gestor/novo" className="font-semibold text-red-600 hover:underline">lance em Novo pedido (F2)</Link>.</p>
          </div>
        ) : (
          <>
            <div className="min-h-0 flex-1 overflow-y-auto p-6">
              <div className="mx-auto max-w-3xl space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <SourceBadge source={selected.source} />
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${statusInfo[selected.status].className}`}>{statusInfo[selected.status].label}</span>
                    </div>
                    <h1 className="mt-2 text-3xl font-black tracking-tight">Pedido {selected.label}</h1>
                    <p className="mt-1 flex items-center gap-1.5 text-sm text-zinc-500">
                      <Clock3 className="h-4 w-4" /> Feito às {timeFormat.format(new Date(selected.createdAt))} · há {elapsedLabel(minutesSince(selected.createdAt, now))}
                      {detail?.externalId && <span className="ml-2">· ID externo {detail.externalId.slice(0, 8)}</span>}
                    </p>
                  </div>
                  <button type="button" onClick={() => selectOrder(null)} className="grid h-9 w-9 place-items-center rounded-lg text-zinc-400 hover:bg-white hover:text-zinc-700" aria-label="Fechar pedido"><X className="h-5 w-5" /></button>
                </div>

                {selected.schedule && (
                  <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-900">
                    <CalendarClock className="h-5 w-5 shrink-0" />
                    Agendado: entregar entre {dateTimeFormat.format(new Date(selected.schedule.start))} e {timeFormat.format(new Date(selected.schedule.end))}
                  </div>
                )}

                {detailError && !detail && <p className="rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">{detailError}</p>}

                <div className="grid gap-3 md:grid-cols-2">
                  <section className="rounded-xl border border-zinc-200 bg-white p-4">
                    <h2 className="text-xs font-bold uppercase tracking-wide text-zinc-500">Cliente</h2>
                    <p className="mt-1.5 text-lg font-bold">{selected.customer || "Cliente balcão"}</p>
                    {detail?.phone && <p className="mt-1 flex items-center gap-1.5 text-sm text-zinc-700"><Phone className="h-4 w-4" /> {detail.phone}</p>}
                    {detail && waNumber(detail.phoneDigits) && !isIFood(selected) && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        <a href={waLink(detail.phoneDigits, confirmationMessage(selected, detail, origin))} target="_blank" rel="noreferrer" className="flex h-8 items-center gap-1.5 rounded-lg bg-emerald-600 px-3 text-xs font-bold text-white hover:bg-emerald-700">
                          <MessageCircle className="h-4 w-4" /> Confirmar no WhatsApp
                        </a>
                        <a href={waLink(detail.phoneDigits, "")} target="_blank" rel="noreferrer" className="flex h-8 items-center gap-1.5 rounded-lg border border-zinc-200 px-3 text-xs font-bold text-zinc-700 hover:bg-zinc-50">
                          Abrir conversa
                        </a>
                      </div>
                    )}
                  </section>
                  <section className="rounded-xl border border-zinc-200 bg-white p-4">
                    <h2 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-zinc-500">
                      {(() => { const Icon = typeInfo[selected.type]?.icon ?? Store; return <Icon className="h-4 w-4" />; })()}
                      {typeInfo[selected.type]?.label ?? selected.type}
                    </h2>
                    {selected.type === "delivery" ? (
                      <>
                        <p className="mt-1.5 flex items-start gap-1.5 text-sm font-medium text-zinc-800"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-red-600" /> {detail?.address ?? selected.address ?? "Endereço não informado"}</p>
                        {(detail?.address ?? selected.address) && (
                          <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(detail?.address ?? selected.address ?? "")}`} target="_blank" rel="noreferrer" className="mt-2 inline-block text-xs font-semibold text-red-600 hover:underline">Ver no mapa</a>
                        )}
                      </>
                    ) : (
                      <p className="mt-1.5 text-sm font-medium text-zinc-800">{selected.type === "pickup" ? "Cliente retira no balcão" : "Consumo no local"}</p>
                    )}
                  </section>
                </div>

                <section className="rounded-xl border border-zinc-200 bg-white">
                  <h2 className="border-b border-zinc-100 px-4 py-3 text-xs font-bold uppercase tracking-wide text-zinc-500">Itens do pedido</h2>
                  {!detail && !detailError && <p className="p-4 text-sm text-zinc-500">Carregando itens…</p>}
                  {detail?.items.map((item) => (
                    <div key={item.id} className="border-b border-zinc-100 px-4 py-3 last:border-b-0">
                      <div className="flex items-start justify-between gap-3">
                        <p className="font-semibold"><span className="mr-2 inline-grid h-6 min-w-6 place-items-center rounded bg-zinc-900 px-1 text-xs font-bold text-white">{item.quantity}x</span>{item.name}</p>
                        <strong className="shrink-0 [font-variant-numeric:tabular-nums]">{money(item.total)}</strong>
                      </div>
                      {item.lines.map((line) => <p key={line} className="ml-8 mt-0.5 text-sm text-zinc-600">• {line}</p>)}
                      {item.notes && <p className="ml-8 mt-1 rounded bg-amber-50 px-2 py-1 text-sm font-semibold text-amber-900">Obs.: {item.notes}</p>}
                    </div>
                  ))}
                  {detail && !detail.items.length && <p className="p-4 text-sm text-zinc-500">Pedido sem itens.</p>}
                </section>

                {detail?.notes && (
                  <section className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                    <h2 className="text-xs font-bold uppercase tracking-wide text-amber-800">Observações do pedido</h2>
                    <p className="mt-1 whitespace-pre-line font-semibold text-amber-950">{detail.notes}</p>
                  </section>
                )}

                {detail && (
                  <div className="grid gap-3 md:grid-cols-2">
                    <section className="rounded-xl border border-zinc-200 bg-white p-4">
                      <h2 className="text-xs font-bold uppercase tracking-wide text-zinc-500">Pagamento</h2>
                      <p className="mt-1.5 font-bold">{paymentLabel[detail.paymentMethod] ?? detail.paymentMethod}{detail.paymentStatus === "paid" && <span className="ml-2 rounded bg-emerald-100 px-1.5 py-0.5 text-xs text-emerald-700">Pago</span>}</p>
                      {detail.paymentNote && <p className="mt-1 text-sm font-semibold text-red-700">{detail.paymentNote}</p>}
                      {detail.changeFor != null && detail.changeFor > 0 && (
                        <p className="mt-1 text-sm text-zinc-700">Troco para {money(detail.changeFor)} · levar <strong>{money(Math.max(0, detail.changeFor - detail.total))}</strong></p>
                      )}
                    </section>
                    <section className="space-y-1 rounded-xl border border-zinc-200 bg-white p-4 text-sm [font-variant-numeric:tabular-nums]">
                      <p className="flex justify-between text-zinc-600"><span>Subtotal</span><span>{money(detail.subtotal)}</span></p>
                      <p className="flex justify-between text-zinc-600"><span>Taxa de entrega</span><span>{detail.deliveryFee > 0 ? money(detail.deliveryFee) : "Grátis"}</span></p>
                      {detail.discount > 0 && <p className="flex justify-between text-emerald-700"><span>Desconto</span><span>− {money(detail.discount)}</span></p>}
                      <p className="flex justify-between border-t border-zinc-100 pt-1.5 text-lg font-black text-zinc-900"><span>Total</span><span>{money(detail.total)}</span></p>
                    </section>
                  </div>
                )}

                <CourierCard order={selected} detail={detail} />
              </div>
            </div>

            {/* Barra de ações */}
            <footer className="shrink-0 border-t border-zinc-200 bg-white px-6 py-3">
              <div className="mx-auto flex max-w-3xl flex-wrap items-center gap-2">
                {!selectedClosed && (
                  <button type="button" onClick={() => requestCancel(selected)} disabled={busy[selected.id]} className="flex h-11 items-center gap-2 rounded-xl border border-red-200 px-4 text-sm font-bold text-red-600 hover:bg-red-50 disabled:opacity-50">
                    <XCircle className="h-4 w-4" /> {selected.status === "pending" ? "Recusar" : "Cancelar"}
                  </button>
                )}
                <button type="button" onClick={() => print(selected.id)} className="flex h-11 items-center gap-2 rounded-xl border border-zinc-200 px-4 text-sm font-bold text-zinc-700 hover:bg-zinc-50">
                  <Printer className="h-4 w-4" />
                  {printing[selected.id] === "fila" || printing[selected.id] === "imprimindo" ? "Imprimindo…" : printing[selected.id] === "falhou" ? "Tentar imprimir de novo" : "Imprimir"}
                </button>
                {editable && (
                  <Link href={`/gestor/pedido/${selected.id}/editar`} className="flex h-11 items-center gap-2 rounded-xl border border-zinc-200 px-4 text-sm font-bold text-zinc-700 hover:bg-zinc-50">
                    <Pencil className="h-4 w-4" /> Editar
                  </Link>
                )}
                <div className="ml-auto">
                  {step && "status" in step ? (
                    <button
                      type="button"
                      disabled={busy[selected.id]}
                      onClick={() => runStep(selected, step.status)}
                      className="flex h-11 min-w-[200px] items-center justify-center gap-2 rounded-xl bg-red-600 px-6 text-sm font-bold text-white shadow-sm hover:bg-red-700 disabled:opacity-60"
                    >
                      {selected.status === "pending" ? <CheckCircle2 className="h-5 w-5" /> : selected.status === "preparing" ? <ChefHat className="h-5 w-5" /> : step.status === "out_for_delivery" ? <Bike className="h-5 w-5" /> : <Check className="h-5 w-5" />}
                      {busy[selected.id] ? "Enviando…" : step.label}
                    </button>
                  ) : step && "blocked" in step ? (
                    <span className="flex h-11 items-center gap-2 rounded-xl bg-zinc-100 px-4 text-sm font-semibold text-zinc-500"><AlertTriangle className="h-4 w-4" /> {step.blocked}</span>
                  ) : null}
                </div>
              </div>
            </footer>
          </>
        )}
      </main>
    </div>
  );
}
