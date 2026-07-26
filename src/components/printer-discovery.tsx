"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, RefreshCw, Download } from "lucide-react";

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
            <p className={online ? "text-xs font-semibold text-emerald-800" : "text-xs font-semibold text-amber-800"}>
              {online ? "Agente local conectado" : "Agente local offline"}
            </p>
            <p className="mt-1 text-xs text-[#6d6a63]">{message}</p>
            {diagnostics?.config?.logPath && <p className="mt-1 text-[11px] text-[#9c988f]">Logs: {diagnostics.config.logPath}</p>}
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        <select
          className="h-9 flex-1 rounded-lg border border-[#e7e4dd] bg-white px-3 text-sm text-[#1b1a17] outline-none transition focus:border-[#c5362e] focus:ring-2 focus:ring-[#c5362e]/12"
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
          className="h-9 rounded-lg border border-[#e7e4dd] bg-white px-4 text-sm font-medium text-[#403d38] transition hover:border-[#c5362e] hover:text-[#c5362e] disabled:opacity-60"
        >
          {loading ? "Buscando" : "Reconectar"}
        </button>
      </div>

      <input
        className="h-9 w-full rounded-lg border border-[#e7e4dd] bg-white px-3 text-sm text-[#1b1a17] outline-none transition focus:border-[#c5362e] focus:ring-2 focus:ring-[#c5362e]/12"
        value={selected}
        onChange={(event) => setSelected(event.target.value)}
        placeholder="Ou digite o nome exato da impressora"
      />

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void saveAgentPrinter()}
          disabled={!selected}
          className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#e7e4dd] bg-white px-3 text-xs font-medium text-[#403d38] transition hover:border-[#c5362e] hover:text-[#c5362e] disabled:opacity-50"
        >
          <CheckCircle2 className="h-4 w-4" />
          Salvar no agente
        </button>
        <button
          type="button"
          onClick={() => void loadPrinters()}
          className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#e7e4dd] bg-white px-3 text-xs font-medium text-[#403d38] transition hover:border-[#c5362e] hover:text-[#c5362e]"
        >
          <RefreshCw className="h-4 w-4" />
          Tentar reconectar
        </button>
        <a
          href="/downloads/PeriniFood-PrintAgent-Setup.exe"
          download
          className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#211d19] px-3 text-xs font-medium text-white transition hover:bg-[#37312a]"
        >
          <Download className="h-4 w-4" />
          Baixar instalador
        </a>
      </div>
      <p className="text-xs text-[#9c988f]">Sem impressão? Baixe o instalador, execute o arquivo e pronto — o agente liga sozinho junto com o Windows.</p>
    </div>
  );
}
