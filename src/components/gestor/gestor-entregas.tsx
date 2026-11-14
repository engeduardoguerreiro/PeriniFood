"use client";

import { useSearchParams } from "next/navigation";
import { Bike, Check, MapPin, PackageCheck, Truck } from "lucide-react";
import { money } from "@/lib/utils";
import { useGestor } from "./gestor-shell";
import { CourierCard } from "./gestor-courier";
import {
  SourceBadge, courierStateInfo, elapsedClass, elapsedLabel, isIFood, minutesSince, nextStep, timeFormat, useOrderDetail,
  type ListOrder,
} from "./gestor-shared";

// Tela "Entregas": pedidos de entrega prontos para sair e em rota, com o motoboy
// de cada um e o mapa ao vivo. Despachar abre o diálogo do motoboy da casca.

function DeliveryRow({ order, now, active, onSelect }: { order: ListOrder; now: number; active: boolean; onSelect: (id: string) => void }) {
  const minutes = minutesSince(order.createdAt, now);
  return (
    <button type="button" onClick={() => onSelect(order.id)} className={`w-full rounded-xl border bg-white p-3 text-left transition ${active ? "border-red-600 ring-2 ring-red-600/15" : "border-zinc-200 hover:border-zinc-300"}`}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2"><SourceBadge source={order.source} /><strong className="truncate">{order.label}</strong></div>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[0.7rem] font-bold ${elapsedClass(order, minutes)}`}>{elapsedLabel(minutes)}</span>
      </div>
      <p className="mt-1 truncate text-sm font-medium text-zinc-700">{order.customer || "Cliente"}</p>
      <p className="mt-0.5 flex items-start gap-1 text-xs text-zinc-500"><MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" /><span className="line-clamp-2">{order.address || "Endereço não informado"}</span></p>
      <div className="mt-2 flex items-center justify-between gap-2">
        {order.courier ? (
          <span className={`rounded-full px-2 py-0.5 text-[0.7rem] font-bold ${courierStateInfo[order.courier.state].className}`}>{order.courier.name || "Motoboy"} · {courierStateInfo[order.courier.state].label.toLowerCase()}</span>
        ) : (
          <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[0.7rem] font-bold text-zinc-500">{isIFood(order) ? "Entregador iFood/sem link" : "Sem motoboy"}</span>
        )}
        <strong className="text-sm [font-variant-numeric:tabular-nums]">{money(order.total)}</strong>
      </div>
    </button>
  );
}

export function EntregasView() {
  const { orders, loaded, now, busy, detailVersion, changeStatus, openDispatch, selectOrder } = useGestor();
  const searchParams = useSearchParams();
  const selectedId = searchParams.get("pedido");
  const deliveries = orders.filter((order) => order.type === "delivery");
  const ready = deliveries.filter((order) => order.status === "ready");
  const onRoute = deliveries.filter((order) => order.status === "out_for_delivery");
  const done = deliveries.filter((order) => order.status === "completed");
  const selected = deliveries.find((order) => order.id === selectedId) ?? null;
  const { detail } = useOrderDetail(selected?.id ?? null, selected?.updatedAt, detailVersion);
  const step = selected ? nextStep(selected, now) : null;
  const onSelect = (id: string) => selectOrder(id, "entregas");

  const sections: Array<{ title: string; icon: typeof Bike; rows: ListOrder[]; empty: string }> = [
    { title: "Prontos para sair", icon: PackageCheck, rows: ready, empty: "Nenhuma entrega pronta." },
    { title: "Em rota", icon: Truck, rows: onRoute, empty: "Nenhum motoboy na rua." },
  ];

  return (
    <div className="flex h-full min-h-0">
      <aside className="flex w-[370px] shrink-0 flex-col border-r border-zinc-200 bg-zinc-50">
        <div className="grid grid-cols-3 gap-2 border-b border-zinc-200 bg-white p-3 text-center">
          <div><strong className="block text-xl">{ready.length}</strong><span className="text-xs text-zinc-500">prontas</span></div>
          <div><strong className="block text-xl">{onRoute.length}</strong><span className="text-xs text-zinc-500">em rota</span></div>
          <div><strong className="block text-xl">{done.length}</strong><span className="text-xs text-zinc-500">entregues hoje</span></div>
        </div>
        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-3">
          {!loaded && <p className="p-6 text-center text-sm text-zinc-500">Carregando entregas…</p>}
          {loaded && sections.map((section) => (
            <section key={section.title}>
              <h3 className="mb-2 flex items-center gap-2 px-1 text-xs font-bold uppercase tracking-wide text-zinc-500"><section.icon className="h-4 w-4" /> {section.title} <span className="text-zinc-400">{section.rows.length}</span></h3>
              <div className="space-y-2">
                {section.rows.map((order) => <DeliveryRow key={order.id} order={order} now={now} active={order.id === selectedId} onSelect={onSelect} />)}
                {!section.rows.length && <p className="rounded-xl border border-dashed border-zinc-200 p-4 text-center text-xs text-zinc-400">{section.empty}</p>}
              </div>
            </section>
          ))}
        </div>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col">
        {!selected ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center text-zinc-500">
            <span className="grid h-20 w-20 place-items-center rounded-full bg-white shadow-sm"><Bike className="h-9 w-9 text-zinc-300" /></span>
            <p className="text-lg font-semibold text-zinc-700">Selecione uma entrega</p>
            <p className="max-w-sm text-sm">Escolha o motoboy, envie o link pelo WhatsApp e acompanhe a entrega no mapa.</p>
          </div>
        ) : (
          <>
            <div className="min-h-0 flex-1 overflow-y-auto p-6">
              <div className="mx-auto max-w-4xl space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2"><SourceBadge source={selected.source} /><span className="text-sm text-zinc-500">Feito às {timeFormat.format(new Date(selected.createdAt))}</span></div>
                    <h1 className="mt-1 text-2xl font-black">Entrega {selected.label} · {selected.customer || "Cliente"}</h1>
                    <p className="mt-1 flex items-start gap-1.5 text-sm text-zinc-700"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-red-600" /> {detail?.address ?? selected.address ?? "Endereço não informado"}</p>
                    {detail?.phone && <p className="mt-0.5 text-sm text-zinc-500">{detail.phone} · {money(selected.total)}{detail.paymentNote ? ` · ${detail.paymentNote}` : ""}</p>}
                  </div>
                  <button type="button" onClick={() => selectOrder(selected.id)} className="h-9 rounded-lg border border-zinc-200 bg-white px-3 text-xs font-bold text-zinc-700 hover:bg-zinc-50">Ver pedido completo</button>
                </div>
                <CourierCard order={selected} detail={detail} mapClassName="h-[420px]" />
              </div>
            </div>
            <footer className="shrink-0 border-t border-zinc-200 bg-white px-6 py-3">
              <div className="mx-auto flex max-w-4xl items-center justify-end gap-2">
                {step && "status" in step ? (
                  <button
                    type="button"
                    disabled={busy[selected.id]}
                    onClick={() => (step.status === "out_for_delivery" ? openDispatch(selected) : void changeStatus(selected, step.status))}
                    className="flex h-11 min-w-[200px] items-center justify-center gap-2 rounded-xl bg-red-600 px-6 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-60"
                  >
                    {step.status === "out_for_delivery" ? <Bike className="h-5 w-5" /> : <Check className="h-5 w-5" />} {busy[selected.id] ? "Enviando…" : step.label}
                  </button>
                ) : step && "blocked" in step ? (
                  <span className="rounded-xl bg-zinc-100 px-4 py-3 text-sm font-semibold text-zinc-500">{step.blocked}</span>
                ) : null}
              </div>
            </footer>
          </>
        )}
      </main>
    </div>
  );
}
