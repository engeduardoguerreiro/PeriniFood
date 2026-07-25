"use client";

import { useEffect, useState } from "react";
import { Printer, RefreshCw } from "lucide-react";

type AgentState = "checking" | "connected" | "offline" | "printer_missing" | "printer_offline";

type StatusResponse = {
  ok: boolean;
  defaultPrinter: string | null;
  printerConnected: boolean;
  printerMissing: boolean;
  error?: string;
};

const bridgeUrl = "http://127.0.0.1:4127";

function labelForState(state: AgentState) {
  const labels = {
    checking: "Verificando impressão",
    connected: "Impressora conectada",
    offline: "Agente offline",
    printer_missing: "Impressora não encontrada",
    printer_offline: "Impressora indisponível",
  };
  return labels[state];
}

export function PrinterAgentIndicator() {
  const [state, setState] = useState<AgentState>("checking");
  const [detail, setDetail] = useState("Verificando serviço local.");

  async function check() {
    setState((current) => current === "connected" ? current : "checking");
    try {
      const response = await fetch(`${bridgeUrl}/status`, { cache: "no-store" });
      const data = await response.json() as StatusResponse;
      if (!response.ok || !data.ok) throw new Error(data.error || "Agente offline.");

      if (data.printerMissing) {
        setState("printer_missing");
        setDetail("A impressora salva não existe neste Windows.");
      } else if (!data.printerConnected) {
        setState("printer_offline");
        setDetail("Selecione uma impressora ou verifique se ela está ligada.");
      } else {
        setState("connected");
        setDetail(data.defaultPrinter ? `Pronta: ${data.defaultPrinter}` : "Agente conectado.");
      }
    } catch {
      setState("offline");
      setDetail("Instale ou reinicie o agente local.");
    }
  }

  useEffect(() => {
    void check();
    const interval = window.setInterval(() => void check(), 30000);
    return () => window.clearInterval(interval);
  }, []);

  const connected = state === "connected";

  return (
    <a
      href="/configuracoes#impressao"
      title={detail}
      className={connected
        ? "hidden h-12 items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-3 text-xs font-black text-emerald-700 shadow-sm transition hover:-translate-y-0.5 lg:flex"
        : "hidden h-12 items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-3 text-xs font-black text-amber-700 shadow-sm transition hover:-translate-y-0.5 lg:flex"}
    >
      {state === "checking" ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />}
      <span className="max-w-[150px] truncate">{labelForState(state)}</span>
    </a>
  );
}
