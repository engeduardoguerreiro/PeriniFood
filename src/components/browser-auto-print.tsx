"use client";

import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";

// Impressão automática pelo navegador. Com o Chrome aberto em modo
// --kiosk-printing, window.print() sai direto no papel, sem diálogo.
// Em um navegador comum, aparece o diálogo do sistema (fallback).
export function BrowserAutoPrint() {
  const [status, setStatus] = useState("Imprimindo comanda…");

  useEffect(() => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      window.location.href = "/pedidos?status=printed";
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
  }, []);

  return (
    <div className="print-hide flex flex-col items-center gap-2 py-6 text-center">
      <RefreshCw className="h-5 w-5 animate-spin text-[#c5362e]" />
      <p className="text-sm font-semibold text-[#1b1a17]">{status}</p>
      <p className="text-xs text-[#9c988f]">Pedido lançado. Voltando para os pedidos…</p>
    </div>
  );
}
