"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

// Botão "copiar" do Pix copia e cola (e da chave) no acompanhamento do pedido.
export function PixCopy({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      // Navegador sem permissão de área de transferência: seleciona o texto para copiar à mão.
      const field = document.createElement("textarea");
      field.value = value;
      document.body.appendChild(field);
      field.select();
      document.execCommand("copy");
      field.remove();
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2500);
  }
  return (
    <button type="button" onClick={copy} className={`flex h-12 w-full items-center justify-center gap-2 rounded-2xl font-bold transition ${copied ? "bg-emerald-600 text-white" : "bg-ink text-white hover:bg-black"}`}>
      {copied ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
      <span aria-live="polite">{copied ? "Copiado!" : label}</span>
    </button>
  );
}
