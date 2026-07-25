"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Printer, RefreshCw } from "lucide-react";

type PrinterSettings = {
  enabled: boolean;
  method: string;
  printer_name: string | null;
  copies: number;
  auto_print: boolean;
  cut_paper?: boolean;
};

type AgentPrinter = {
  name: string;
  isDefault?: boolean;
  isOffline?: boolean;
};

type AgentStatus = {
  ok: boolean;
  defaultPrinter: string | null;
  printerConnected: boolean;
  printerMissing: boolean;
  printers?: AgentPrinter[];
  error?: string;
};

const bridgeUrl = "http://127.0.0.1:4127";

function resolvePrinter(data: AgentStatus, configuredPrinter: string | null) {
  const printers = data.printers ?? [];
  const configuredName = configuredPrinter?.trim();
  const configuredMatch = configuredName
    ? printers.find((printer) => printer.name.toLowerCase() === configuredName.toLowerCase())
    : null;
  const agentDefaultMatch = data.defaultPrinter
    ? printers.find((printer) => printer.name.toLowerCase() === data.defaultPrinter?.toLowerCase())
    : null;
  const windowsDefaultMatch = printers.find((printer) => printer.isDefault);
  const firstOnlinePrinter = printers.find((printer) => !printer.isOffline);
  const selected = configuredMatch ?? agentDefaultMatch ?? windowsDefaultMatch ?? firstOnlinePrinter ?? null;

  return {
    configuredName,
    selected,
    usedFallback: Boolean(configuredName && !configuredMatch && selected),
  };
}

export function OrderPrintClient({ content, settings }: { content: string; settings: PrinterSettings }) {
  const [status, setStatus] = useState("Preparando impressão...");
  const [agentOnline, setAgentOnline] = useState(false);
  const [printing, setPrinting] = useState(false);
  const printedRef = useRef(false);

  async function checkAgent() {
    const response = await fetch(`${bridgeUrl}/status`, { cache: "no-store" });
    const data = await response.json() as AgentStatus;
    if (!response.ok || !data.ok) throw new Error(data.error || "Agente local offline.");
    setAgentOnline(true);

    const { configuredName, selected, usedFallback } = resolvePrinter(data, settings.printer_name);
    const selectedPrinter = selected?.name;
    if (!selectedPrinter) throw new Error("Nenhuma impressora instalada foi encontrada neste Windows.");
    if (selected?.isOffline) throw new Error(`A impressora "${selectedPrinter}" está offline ou indisponível.`);
    if (usedFallback) {
      setStatus(`A impressora salva "${configuredName}" não existe neste Windows. Usando "${selectedPrinter}".`);
    }

    return selectedPrinter;
  }

  async function printDirect() {
    if (!settings.enabled) {
      setStatus("Impressão local desativada. Use a impressão pelo navegador.");
      return;
    }

    setPrinting(true);
    try {
      setStatus("Verificando agente local de impressão...");
      const printerName = await checkAgent();
      setStatus(`Enviando para ${printerName}...`);
      const response = await fetch(`${bridgeUrl}/print`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          printerName,
          copies: settings.copies ?? 1,
          cutPaper: settings.cut_paper ?? true,
          content,
        }),
      });
      const data = await response.json() as { ok: boolean; error?: string; mode?: string };
      if (!response.ok || !data.ok) throw new Error(data.error || "Falha ao imprimir.");
      setStatus(`Pedido enviado para ${printerName}${data.mode ? ` (${data.mode})` : ""}.`);
    } catch (error) {
      setAgentOnline(false);
      setStatus(`Não foi possível imprimir direto: ${error instanceof Error ? error.message : "erro desconhecido"}.`);
    } finally {
      setPrinting(false);
    }
  }

  useEffect(() => {
    if (printedRef.current) return;
    printedRef.current = true;
    void checkAgent()
      .then((printerName) => {
        setStatus(`Agente conectado. Impressora pronta: ${printerName}.`);
        if (settings.auto_print) void printDirect();
      })
      .catch((error) => {
        setAgentOnline(false);
        setStatus(error instanceof Error ? error.message : "Agente local de impressão offline.");
      });
  }, []);

  return (
    <div className={agentOnline ? "mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm print:hidden" : "mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm print:hidden"}>
      <div className="flex items-start gap-2">
        {agentOnline ? <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-700" /> : <AlertTriangle className="mt-0.5 h-4 w-4 text-amber-700" />}
        <p className="font-bold text-slate-800">{status}</p>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={printDirect}
          disabled={printing}
          className="inline-flex items-center gap-2 rounded-lg bg-[#232A31] px-3 py-2 text-xs font-black text-white disabled:opacity-60"
        >
          {printing ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />}
          Enviar para impressora
        </button>
        <button type="button" onClick={() => window.print()} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-800">
          Imprimir pelo navegador
        </button>
        <a href="/docs/PRINT_AGENT.md" target="_blank" className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-800">
          Instalar agente
        </a>
      </div>
    </div>
  );
}
