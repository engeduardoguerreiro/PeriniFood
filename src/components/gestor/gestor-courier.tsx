"use client";

import { useState } from "react";
import { Bike, Check, Copy, MessageCircle, RefreshCw, Send } from "lucide-react";
import { LiveMap } from "@/components/tracking/live-map";
import { customerTrackingMessage, useGestor } from "./gestor-shell";
import { courierStateInfo, isClosed, isIFood, waLink, waNumber, type Detail, type ListOrder } from "./gestor-shared";

// Cartão "Motoboy" do gestor: situação, mapa ao vivo e envio dos links por
// WhatsApp. Gerar/trocar o motoboy abre o diálogo de despacho da casca.
export function CourierCard({ order, detail, mapClassName = "h-56" }: { order: ListOrder; detail: Detail | undefined; mapClassName?: string }) {
  const { openDispatch } = useGestor();
  const [copied, setCopied] = useState(false);
  if (order.type !== "delivery") return null;
  const courier = detail?.courier ?? null;
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  const link = courier ? `${origin}/entrega/${courier.token}` : "";
  const trackingUrl = detail?.trackingCode && !isIFood(order) ? `${origin}/pedido/${detail.trackingCode}` : "";
  const closed = isClosed(order);

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-zinc-500"><Bike className="h-4 w-4" /> Motoboy</h2>
        {courier && <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${courierStateInfo[courier.state].className}`}>{courierStateInfo[courier.state].label}</span>}
      </div>

      {!detail ? (
        <p className="mt-2 text-sm text-zinc-500">Carregando…</p>
      ) : courier ? (
        <div className="mt-3 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <span>Entregador: <strong>{courier.name || "sem nome"}</strong></span>
            {courier.deliveryCode && <span className="rounded-lg bg-zinc-900 px-2.5 py-1 text-white">Código do cliente: <strong className="tracking-[0.2em]">{courier.deliveryCode}</strong></span>}
          </div>
          <LiveMap endpoint={`/api/pedidos/${order.id}/rastreio`} className={mapClassName} />
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => { void navigator.clipboard?.writeText(link); setCopied(true); window.setTimeout(() => setCopied(false), 1500); }} className="flex h-9 items-center gap-1.5 rounded-lg border border-zinc-200 px-3 text-xs font-bold text-zinc-700 hover:bg-zinc-50">
              {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />} Copiar link
            </button>
            <a href={`https://wa.me/?text=${encodeURIComponent(`Entrega PeriniFood — abra o link, toque em "Iniciar entrega" e mantenha a página aberta:\n${link}`)}`} target="_blank" rel="noreferrer" className="flex h-9 items-center gap-1.5 rounded-lg border border-zinc-200 px-3 text-xs font-bold text-zinc-700 hover:bg-zinc-50">
              <Send className="h-4 w-4" /> Link ao motoboy
            </a>
            {trackingUrl && waNumber(detail.phoneDigits) && (
              <a href={waLink(detail.phoneDigits, customerTrackingMessage(order.customer, trackingUrl, courier.deliveryCode))} target="_blank" rel="noreferrer" className="flex h-9 items-center gap-1.5 rounded-lg border border-zinc-200 px-3 text-xs font-bold text-emerald-700 hover:bg-emerald-50">
                <MessageCircle className="h-4 w-4" /> Acompanhamento ao cliente
              </a>
            )}
            {!closed && (
              <button type="button" onClick={() => openDispatch(order)} className="flex h-9 items-center gap-1.5 rounded-lg border border-zinc-200 px-3 text-xs font-bold text-zinc-700 hover:bg-zinc-50">
                <RefreshCw className="h-4 w-4" /> Trocar motoboy
              </button>
            )}
          </div>
        </div>
      ) : closed ? (
        <p className="mt-2 text-sm text-zinc-500">Pedido encerrado sem link de motoboy.</p>
      ) : (
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <p className="max-w-sm text-sm text-zinc-600">Nenhum motoboy ainda. O link abre no celular dele, sem app, e a loja e o cliente acompanham no mapa.</p>
          <button type="button" onClick={() => openDispatch(order)} className="flex h-9 items-center gap-1.5 rounded-lg bg-zinc-900 px-3 text-xs font-bold text-white hover:bg-zinc-800">
            <Bike className="h-4 w-4" /> {order.status === "ready" ? "Despachar" : "Chamar motoboy"}
          </button>
        </div>
      )}
    </section>
  );
}
