"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Mantém o painel de pedidos "ao vivo": recarrega os dados do servidor
// (router.refresh) em intervalo, e também quando a aba volta ao foco.
// Não recarrega a página inteira — só re-busca os pedidos.
export function OrdersAutoRefresh({ intervalMs = 15000 }: { intervalMs?: number }) {
  const router = useRouter();

  useEffect(() => {
    const tick = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    const timer = window.setInterval(tick, intervalMs);
    // Só visibilitychange: com "focus" junto, voltar para a aba disparava dois refreshes.
    document.addEventListener("visibilitychange", tick);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [router, intervalMs]);

  return null;
}
