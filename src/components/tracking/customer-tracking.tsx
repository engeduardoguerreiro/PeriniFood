"use client";

import { Bike, Check, ChefHat, ClipboardCheck, Home } from "lucide-react";
import { useEffect, useState } from "react";
import { LiveMap } from "./live-map";
import type { OrderStatus } from "@/lib/types";

// Acompanhamento do cliente: etapas do pedido (atualizam sozinhas) e, quando o
// motoboy sai, o mapa com a posição dele em tempo real.
const deliverySteps: Array<{ label: string; Icon: typeof Check; statuses: OrderStatus[] }> = [
  { label: "Pedido recebido", Icon: ClipboardCheck, statuses: ["pending", "accepted", "preparing", "ready", "out_for_delivery", "completed"] },
  { label: "Em preparo", Icon: ChefHat, statuses: ["preparing", "ready", "out_for_delivery", "completed"] },
  { label: "Saiu para entrega", Icon: Bike, statuses: ["out_for_delivery", "completed"] },
  { label: "Entregue", Icon: Home, statuses: ["completed"] },
];
const pickupSteps = [
  deliverySteps[0],
  deliverySteps[1],
  { label: "Pronto para retirar", Icon: Check, statuses: ["ready", "out_for_delivery", "completed"] as OrderStatus[] },
  { label: "Retirado", Icon: Home, statuses: ["completed"] as OrderStatus[] },
];

type Poll = { status: OrderStatus; courierName: string | null; started: boolean; delivered: boolean };

export function CustomerTracking({ code, initialStatus, delivery }: { code: string; initialStatus: OrderStatus; delivery: boolean }) {
  const [poll, setPoll] = useState<Poll>({ status: initialStatus, courierName: null, started: false, delivered: false });

  // Status (e se o motoboy já saiu) a cada 10s; o mapa, quando aberto, busca a posição por conta própria.
  useEffect(() => {
    let stop = false;
    const load = () => fetch(`/api/rastreio/${code}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => {
        if (stop || !j.status) return;
        setPoll({ status: j.status, courierName: j.tracking?.courierName ?? null, started: Boolean(j.tracking?.last), delivered: j.tracking?.state === "delivered" });
      })
      .catch(() => {});
    load();
    const timer = window.setInterval(load, 10000);
    return () => { stop = true; window.clearInterval(timer); };
  }, [code]);

  const { status } = poll;
  const steps = delivery ? deliverySteps : pickupSteps;
  const showMap = delivery && status !== "canceled" && status !== "completed" && !poll.delivered && (status === "out_for_delivery" || poll.started);

  if (status === "canceled") return <p className="rounded-2xl bg-red-50 p-4 text-center font-bold text-red-700">Este pedido foi cancelado pela loja.</p>;

  return (
    <div className="space-y-4">
      <ol className="grid gap-2 sm:grid-cols-4">
        {steps.map(({ label, Icon, statuses }, index) => {
          const done = statuses.includes(status);
          const current = done && !steps[index + 1]?.statuses.includes(status);
          return (
            <li key={label} aria-current={current ? "step" : undefined} className={`flex items-center gap-3 rounded-2xl p-3 sm:flex-col sm:text-center ${current ? "bg-gradient-to-b from-brand-bright to-brand text-white shadow-[0_12px_26px_-12px_rgba(207,74,10,0.9)]" : done ? "bg-white text-ink shadow-sm" : "bg-white/60 text-slate-400"}`}>
              <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${current ? "bg-white/20" : done ? "bg-brand-soft text-brand" : "bg-slate-100"}`}>
                {done && !current ? <Check className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
              </span>
              <span className="text-sm font-bold">{label}</span>
            </li>
          );
        })}
      </ol>

      {showMap && (
        <section aria-label="Motoboy no mapa">
          <p className="mb-2 flex items-center gap-2 font-black text-ink"><Bike className="h-5 w-5 text-brand" /> {poll.courierName ? `${poll.courierName} está a caminho` : "Seu pedido está a caminho"}</p>
          <LiveMap endpoint={`/api/rastreio/${code}`} className="h-80" />
        </section>
      )}
    </div>
  );
}
