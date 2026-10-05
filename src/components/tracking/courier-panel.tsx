"use client";

import { Bike, Check, Copy, MessageCircle, RefreshCw, Send } from "lucide-react";
import { useState } from "react";
import { createCourierLink } from "@/app/actions";
import { LiveMap, type LiveTracking } from "./live-map";

// Cartão "Motoboy" no detalhe do pedido: gera o link da entrega (sem cadastro),
// compartilha por WhatsApp e mostra o motoboy no mapa ao vivo.
export function CourierPanel({ origin, orderId, token, courierName, customerPhone, trackingCode, closed }: {
  origin: string; orderId: string; token: string | null; courierName: string | null; customerPhone: string | null; trackingCode: string | null; closed: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const [state, setState] = useState<LiveTracking["state"] | null>(null);

  const link = token && origin ? `${origin}/entrega/${token}` : "";
  const customerLink = trackingCode && origin ? `${origin}/pedido/${trackingCode}` : "";
  const label = state === "on_route" ? "Em rota" : state === "delivered" ? "Entregue" : state === "expired" ? "Link expirado" : token ? "Aguardando o motoboy iniciar" : null;
  const customerDigits = (customerPhone ?? "").replace(/\D/g, "");
  const customerWa = customerDigits ? (customerDigits.startsWith("55") ? customerDigits : `55${customerDigits}`) : "";

  return (
    <section id="motoboy" className="scroll-mt-24 rounded-2xl bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 font-black"><Bike className="h-5 w-5 text-brand" /> Motoboy</h3>
        {label && <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${state === "on_route" ? "bg-sky-100 text-sky-800" : state === "delivered" ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-700"}`}>{label}</span>}
      </div>

      {token ? (
        <div className="mt-4 space-y-3">
          {courierName && <p className="text-sm text-ink-soft">Entregador: <strong className="text-ink">{courierName}</strong></p>}
          <LiveMap endpoint={`/api/pedidos/${orderId}/rastreio`} className="h-64" onData={(data) => setState(data?.state ?? null)} />
          <div className="flex gap-2">
            <input readOnly value={link} aria-label="Link do motoboy" className="field-light min-w-0 flex-1 text-xs" onFocus={(e) => e.currentTarget.select()} />
            <button type="button" onClick={() => { navigator.clipboard?.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 1500); }} className="btn-muted shrink-0 px-3 text-sm" aria-label="Copiar link do motoboy">
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </button>
          </div>
          <a href={`https://wa.me/?text=${encodeURIComponent(`Entrega PeriniFood — abra o link, toque em "Iniciar entrega" e mantenha a página aberta:\n${link}`)}`} target="_blank" rel="noreferrer" className="btn-primary w-full text-sm">
            <Send className="h-4 w-4" /> Enviar link ao motoboy (WhatsApp)
          </a>
          {customerLink && customerWa && (
            <a href={`https://wa.me/${customerWa}?text=${encodeURIComponent(`Seu pedido saiu para entrega! Acompanhe o motoboy no mapa:\n${customerLink}`)}`} target="_blank" rel="noreferrer" className="btn-muted w-full text-sm">
              <MessageCircle className="h-4 w-4" /> Enviar acompanhamento ao cliente
            </a>
          )}
          {!closed && (
            <form action={createCourierLink} onSubmit={(e) => { if (!window.confirm("Gerar um novo link? O link atual deixa de funcionar.")) e.preventDefault(); }} className="flex gap-2 border-t border-line-soft pt-3">
              <input type="hidden" name="id" value={orderId} />
              <input name="courier_name" placeholder="Outro motoboy (opcional)" aria-label="Nome do novo motoboy" className="field-light min-w-0 flex-1 text-sm" />
              <button className="btn-muted shrink-0 text-sm"><RefreshCw className="h-4 w-4" /> Novo link</button>
            </form>
          )}
        </div>
      ) : closed ? (
        <p className="mt-3 text-sm text-ink-soft">Pedido encerrado.</p>
      ) : (
        <form action={createCourierLink} className="mt-4 space-y-2">
          <input type="hidden" name="id" value={orderId} />
          <p className="text-sm text-ink-soft">Gere um link para o motoboy (funcionário ou terceiro). Ele abre no celular, sem cadastro nem app, e a loja e o cliente acompanham no mapa.</p>
          <input name="courier_name" placeholder="Nome do motoboy (opcional)" aria-label="Nome do motoboy" className="field-light text-sm" />
          <button className="btn-primary w-full text-sm"><Bike className="h-4 w-4" /> Gerar link do motoboy</button>
        </form>
      )}
    </section>
  );
}
