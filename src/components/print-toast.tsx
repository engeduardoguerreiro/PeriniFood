"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, AlertTriangle, X } from "lucide-react";

// Aviso mostrado ao voltar do fluxo de impressão direta do PDV.
export function PrintToast() {
  const router = useRouter();
  const params = useSearchParams();
  const status = params.get("status");
  const ok = status === "printed";
  const failed = status === "print_offline";

  useEffect(() => {
    if (!ok && !failed) return;
    const timer = setTimeout(() => router.replace("/pedidos"), 6000);
    return () => clearTimeout(timer);
  }, [ok, failed, router]);

  if (!ok && !failed) return null;

  return (
    <div
      className={
        ok
          ? "mb-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800"
          : "mb-4 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800"
      }
    >
      {ok ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertTriangle className="h-4 w-4 shrink-0" />}
      <span>
        {ok
          ? "Comanda impressa e pedido lançado."
          : "Pedido lançado. Não foi possível imprimir agora — reimprima o pedido pela lista."}
      </span>
      <button type="button" onClick={() => router.replace("/pedidos")} className="ml-auto opacity-70 transition hover:opacity-100" aria-label="Fechar aviso">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
