"use client";

import Link from "next/link";
import { ChevronRight, Clock3 } from "lucide-react";
import { useEffect, useState } from "react";
import { forgetOrder, recentOrders, type RecentOrder } from "@/lib/recent-orders";
import type { OrderStatus } from "@/lib/types";

const labels: Partial<Record<OrderStatus, string>> = {
  pending: "Aguardando a loja",
  accepted: "Aceito pela loja",
  preparing: "Em preparo",
  ready: "Pronto",
  out_for_delivery: "Saiu para entrega",
};

// Pedidos feitos neste aparelho que ainda estão em andamento, no topo do cardápio.
export function ActiveOrders({ slug }: { slug: string }) {
  const [active, setActive] = useState<Array<RecentOrder & { status: OrderStatus }>>([]);

  useEffect(() => {
    let stop = false;
    const load = async () => {
      const results = await Promise.all(recentOrders(slug).map(async (order) => {
        const response = await fetch(`/api/rastreio/${order.code}`, { cache: "no-store" }).catch(() => null);
        if (response?.status === 404) { forgetOrder(slug, order.code); return null; }
        const data = await response?.json().catch(() => null) as { status?: OrderStatus } | null;
        return data?.status ? { ...order, status: data.status } : null;
      }));
      if (!stop) setActive(results.filter((order): order is RecentOrder & { status: OrderStatus } => Boolean(order && labels[order.status])));
    };
    load();
    const timer = window.setInterval(load, 30000);
    return () => { stop = true; window.clearInterval(timer); };
  }, [slug]);

  if (!active.length) return null;
  return (
    <div className="space-y-2">
      {active.map((order) => (
        <Link key={order.code} href={`/pedido/${order.code}`} className="flex items-center gap-3 rounded-2xl bg-ink p-3 text-white shadow-[0_12px_28px_-14px_rgba(0,0,0,0.6)]">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/15"><Clock3 className="h-5 w-5" /></span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-bold">Pedido #{order.number} · {labels[order.status]}</span>
            <span className="block text-xs text-white/70">Toque para acompanhar</span>
          </span>
          <ChevronRight className="h-5 w-5 shrink-0" />
        </Link>
      ))}
    </div>
  );
}
