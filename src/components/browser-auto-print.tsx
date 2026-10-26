"use client";

import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";

// Impressão automática pelo navegador. Com o Chrome aberto em modo
// --kiosk-printing, window.print() sai direto no papel, sem diálogo.
// Em um navegador comum, aparece o diálogo do sistema (fallback).
// embedded: aberta pelo alerta de pedido novo num quadro invisível do painel; ao
// terminar avisa o painel (postMessage) em vez de navegar para /pedidos.
export function BrowserAutoPrint({ embedded = false }: { embedded?: boolean }) {
  const [status, setStatus] = useState("Imprimindo comanda…");

  useEffect(() => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      if (embedded) window.parent.postMessage({ type: "perinifood-printed" }, window.location.origin);
      else window.location.href = "/pedidos?status=printed";
    };

    window.addEventListener("afterprint", finish);
    // Dá um instante para o layout/logo renderizarem antes de imprimir.
    const printTimer = window.setTimeout(() => {
      try {
        window.print();
      } catch {
        setStatus("Não foi possível abrir a impressão. Voltando…");
        finish();
      }
    }, 400);
    // Segurança: se afterprint não disparar, volta assim mesmo.
    const safety = window.setTimeout(finish, 20000);

    return () => {
      window.removeEventListener("afterprint", finish);
      window.clearTimeout(printTimer);
      window.clearTimeout(safety);
    };
  }, [embedded]);

  return (
    <div className="print-hide flex flex-col items-center gap-2 py-6 text-center">
      <RefreshCw className="h-5 w-5 animate-spin text-brand" />
      <p className="text-sm font-semibold text-ink">{status}</p>
      <p className="text-xs text-ink-faint">Pedido lançado. Voltando para os pedidos…</p>
    </div>
  );
}
