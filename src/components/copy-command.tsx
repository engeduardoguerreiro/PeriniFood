"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

// Comando de terminal com botão "Copiar" (instruções de instalação).
export function CopyCommand({ command, label }: { command: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {}
  }
  return (
    <div className="space-y-1">
      {label && <p className="text-xs font-semibold text-ink-soft">{label}</p>}
      <div className="flex items-stretch overflow-hidden rounded-xl border border-[#2b2925] bg-[#1b1a17]">
        <code className="min-w-0 flex-1 select-all whitespace-pre-wrap break-all px-3 py-2.5 font-mono text-xs leading-relaxed text-[#f4f1ea]">{command}</code>
        <button type="button" onClick={() => void copy()} className="flex shrink-0 items-center gap-1.5 border-l border-[#2b2925] bg-[#2b2925] px-3 text-xs font-semibold text-white transition hover:bg-brand">
          {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? "Copiado" : "Copiar"}
        </button>
      </div>
    </div>
  );
}
