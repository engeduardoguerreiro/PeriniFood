"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, RefreshCw, Wrench } from "lucide-react";

type DetectedPrinter = {
  name: string;
  driver: string;
  port: string;
  isDefault: boolean;
  isOffline: boolean;
};

type PrinterResponse = {
  ok: boolean;
  printers: DetectedPrinter[];
  error?: string;
};

type StatusResponse = {
  ok: boolean;
  app: string;
  version: string;
  defaultPrinter: string | null;
  printerConnected: boolean;
  printerMissing: boolean;
  printers: DetectedPrinter[];
  config: {
    dataDir: string;
    logPath: string;
  };
  error?: string;
};

const bridgeUrl = "http://127.0.0.1:4127";

export function PrinterDiscovery({ initialName }: { initialName: string | null }) {
  const [selected, setSelected] = useState(initialName ?? "");
  const [printers, setPrinters] = useState<DetectedPrinter[]>([]);
  const [loading, setLoading] = useState(false);
  const [online, setOnline] = useState(false);
  const [diagnostics, setDiagnostics] = useState<StatusResponse | null>(null);
  const [message, setMessage] = useState("Verificando agente local de impressão...");

  async function loadStatus() {
    const response = await fetch(`${bridgeUrl}/status`, { cache: "no-store" });
    const data = await response.json() as StatusResponse;
    if (!response.ok || !data.ok) throw new Error(data.error || "Agente de impressão offline.");
    setDiagnostics(data);
    setOnline(true);
    setPrinters(data.printers ?? []);
    if (!selected && data.defaultPrinter) setSelected(data.defaultPrinter);
    if (data.printerConnected) {
      setMessage(`Agente conectado. Impressora padrão: ${data.defaultPrinter}.`);
    } else if (data.printerMissing) {
      setMessage("Agente conectado, mas a impressora salva não foi encontrada neste Windows.");
    } else if ((data.printers ?? []).length) {
      setMessage("Agente conectado. Selecione a impressora da loja.");
    } else {
      setMessage("Agente conectado, mas nenhuma impressora instalada foi encontrada.");
    }
  }

  async function loadPrinters() {
    setLoading(true);
    setMessage("Buscando impressoras instaladas no Windows...");
    try {
      await loadStatus();
      const response = await fetch(`${bridgeUrl}/printers`, { cache: "no-store" });
      const data = await response.json() as PrinterResponse;
      if (!response.ok || !data.ok) throw new Error(data.error || "Não foi possível listar impressoras.");

      const nextPrinters = data.printers ?? [];
      setPrinters(nextPrinters);
      const defaultPrinter = nextPrinters.find((printer) => printer.isDefault);
      if (!selected && defaultPrinter) setSelected(defaultPrinter.name);
      setMessage(nextPrinters.length ? `${nextPrinters.length} impressora(s) encontrada(s).` : "Nenhuma impressora instalada foi encontrada.");
    } catch (error) {
      setOnline(false);
      setPrinters([]);
      setMessage(error instanceof Error ? error.message : "Agente local offline. Instale ou reinicie o agente de impressão no computador da loja.");
    } finally {
      setLoading(false);
    }
  }

  async function saveAgentPrinter(nextPrinter = selected) {
    if (!nextPrinter) return;
    try {
      const response = await fetch(`${bridgeUrl}/config`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ defaultPrinter: nextPrinter }),
      });
      const data = await response.json() as { ok: boolean; error?: string };
      if (!response.ok || !data.ok) throw new Error(data.error || "Não foi possível salvar a impressora no agente.");
      setMessage(`Impressora "${nextPrinter}" salva no agente local.`);
      void loadStatus();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível salvar a impressora no agente local.");
    }
  }

  useEffect(() => {
    void loadPrinters();
    const interval = window.setInterval(() => {
      void loadStatus().catch(() => setOnline(false));
    }, 30000);
    return () => window.clearInterval(interval);
  }, []);

  return (
    <div className="space-y-2">
      <input type="hidden" name="printer_name" value={selected} />
      <div className={online ? "rounded-xl border border-emerald-200 bg-emerald-50 p-3" : "rounded-xl border border-amber-200 bg-amber-50 p-3"}>
        <div className="flex items-start gap-2">
          {online ? <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-600" /> : <AlertTriangle className="mt-0.5 h-4 w-4 text-amber-600" />}
          <div>
            <p className={online ? "text-xs font-black text-emerald-800" : "text-xs font-black text-amber-800"}>
              {online ? "Agente local conectado" : "Agente local offline"}
            </p>
            <p className="mt-1 text-xs font-semibold text-slate-600">{message}</p>
            {diagnostics?.config?.logPath && <p className="mt-1 text-[11px] font-semibold text-slate-500">Logs: {diagnostics.config.logPath}</p>}
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        <select
          className="field-light h-11 flex-1 rounded-xl py-2 text-sm"
          value={selected}
          onChange={(event) => {
            setSelected(event.target.value);
            void saveAgentPrinter(event.target.value);
          }}
        >
          <option value="">{printers.length ? "Selecione uma impressora" : "Nenhuma impressora selecionada"}</option>
          {printers.map((printer) => (
            <option key={`${printer.name}-${printer.port ?? ""}`} value={printer.name}>
              {printer.name}{printer.isDefault ? " - padrão" : ""}{printer.isOffline ? " - offline" : ""}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={loadPrinters}
          disabled={loading}
          className="h-11 rounded-xl border border-red-200 bg-white px-4 text-sm font-black text-slate-800 transition hover:border-red-300 hover:bg-red-50 disabled:opacity-60"
        >
          {loading ? "Buscando" : "Reconectar"}
        </button>
      </div>

      <input
        className="field-light h-10 rounded-xl py-2 text-sm"
        value={selected}
        onChange={(event) => setSelected(event.target.value)}
        placeholder="Ou digite o nome exato da impressora"
      />

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void saveAgentPrinter()}
          disabled={!selected}
          className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-black text-slate-700 transition hover:border-red-300 hover:bg-red-50 disabled:opacity-50"
        >
          <CheckCircle2 className="h-4 w-4" />
          Salvar no agente
        </button>
        <button
          type="button"
          onClick={() => void loadPrinters()}
          className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-black text-slate-700 transition hover:border-red-300 hover:bg-red-50"
        >
          <RefreshCw className="h-4 w-4" />
          Tentar reconectar
        </button>
        <a
          href="/docs/PRINT_AGENT.md"
          target="_blank"
          className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-black text-slate-700 transition hover:border-red-300 hover:bg-red-50"
        >
          <Wrench className="h-4 w-4" />
          Instalar agente
        </a>
      </div>
    </div>
  );
}
