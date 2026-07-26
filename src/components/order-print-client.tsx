"use client";

import { useEffect, useRef, useState } from "react";
import { toPng } from "html-to-image";
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

// Converte a imagem para preto e branco puro (1-bit). Térmica imprime preto
// sólido bem escuro; tons de cinza saem fracos. O limiar joga tudo para preto ou branco.
async function toMonochromePng(dataUrl: string, threshold = 175): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(dataUrl);
        return;
      }
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const px = imageData.data;
      for (let i = 0; i < px.length; i += 4) {
        const lum = 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2];
        const value = lum < threshold ? 0 : 255;
        px[i] = value;
        px[i + 1] = value;
        px[i + 2] = value;
        px[i + 3] = 255;
      }
      ctx.putImageData(imageData, 0, 0);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => reject(new Error("Falha ao processar a imagem da comanda."));
    img.src = dataUrl;
  });
}

export function OrderPrintClient({ content, settings, auto = false, targetId = "pf-comanda" }: { content: string; settings: PrinterSettings; auto?: boolean; targetId?: string }) {
  const [status, setStatus] = useState("Preparando impressão...");
  const [agentOnline, setAgentOnline] = useState(false);
  const [printing, setPrinting] = useState(false);
  const printedRef = useRef(false);

  async function checkAgent() {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);
    let response: Response;
    try {
      response = await fetch(`${bridgeUrl}/status`, { cache: "no-store", signal: controller.signal });
    } finally {
      clearTimeout(timeout);
    }
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

  async function printDirect(): Promise<boolean> {
    if (!settings.enabled) {
      setStatus("Impressão local desativada nas configurações.");
      return false;
    }

    setPrinting(true);
    try {
      setStatus("Verificando agente local de impressão...");
      const printerName = await checkAgent();
      setStatus("Gerando comanda...");
      const node = document.getElementById(targetId);
      if (!node) throw new Error("Comanda não encontrada para impressão.");
      const rendered = await toPng(node, { pixelRatio: 3, backgroundColor: "#ffffff", cacheBust: true });
      const image = await toMonochromePng(rendered);
      setStatus(`Enviando para ${printerName}...`);
      const response = await fetch(`${bridgeUrl}/print`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          printerName,
          copies: settings.copies ?? 1,
          image,
          content,
        }),
      });
      const data = await response.json() as { ok: boolean; error?: string; mode?: string };
      if (!response.ok || !data.ok) throw new Error(data.error || "Falha ao imprimir.");
      setStatus(`Pedido enviado para ${printerName}${data.mode ? ` (${data.mode})` : ""}.`);
      return true;
    } catch (error) {
      setAgentOnline(false);
      setStatus(`Não foi possível imprimir direto: ${error instanceof Error ? error.message : "erro desconhecido"}.`);
      return false;
    } finally {
      setPrinting(false);
    }
  }

  useEffect(() => {
    if (printedRef.current) return;
    printedRef.current = true;
    if (auto) {
      let done = false;
      const finish = (ok: boolean) => {
        if (done) return;
        done = true;
        window.location.href = `/pedidos?status=${ok ? "printed" : "print_offline"}`;
      };
      window.setTimeout(() => {
        void printDirect().then(finish).catch(() => finish(false));
      }, 0);
      window.setTimeout(() => finish(false), 9000);
      return;
    }
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

  if (auto) {
    return (
      <div className="flex flex-col items-center gap-3 py-12 text-center">
        <RefreshCw className="h-6 w-6 animate-spin text-[#c5362e]" />
        <p className="text-sm font-semibold text-[#1b1a17]">{status}</p>
        <p className="text-xs text-[#9c988f]">Pedido lançado. Voltando para os pedidos…</p>
      </div>
    );
  }

  return (
    <div className={agentOnline ? "mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm print:hidden" : "mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm print:hidden"}>
      <div className="flex items-start gap-2">
        {agentOnline ? <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-700" /> : <AlertTriangle className="mt-0.5 h-4 w-4 text-amber-700" />}
        <p className="font-bold text-[#2b2925]">{status}</p>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={printDirect}
          disabled={printing}
          className="inline-flex items-center gap-2 rounded-lg bg-[#211d19] px-3 py-2 text-xs font-black text-white disabled:opacity-60"
        >
          {printing ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />}
          Enviar para impressora
        </button>
        <button type="button" onClick={() => window.print()} className="rounded-lg border border-[#e7e4dd] bg-white px-3 py-2 text-xs font-black text-[#2b2925]">
          Imprimir pelo navegador
        </button>
        <a href="/docs/PRINT_AGENT.md" target="_blank" className="rounded-lg border border-[#e7e4dd] bg-white px-3 py-2 text-xs font-black text-[#2b2925]">
          Instalar agente
        </a>
      </div>
    </div>
  );
}
