"use client";

/* eslint-disable @next/next/no-img-element */
import { CheckCircle2, Loader2, LogOut, QrCode, RefreshCw, Smartphone } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

type State = "open" | "connecting" | "close" | "missing" | "disabled";

// Conexão do WhatsApp da própria loja: mostra o QR Code (como no WhatsApp Web)
// e acompanha o status até conectar.
export function WhatsAppConnect({ canEdit }: { canEdit: boolean }) {
  const [state, setState] = useState<State | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const response = await fetch("/api/whatsapp/session", { cache: "no-store" }).catch(() => null);
    const json = await response?.json().catch(() => null);
    if (json?.state) {
      setState(json.state);
      if (json.state === "open") setQr(null);
    }
  }, []);

  useEffect(() => {
    const first = window.setTimeout(refresh, 0);
    // Enquanto o QR está na tela, confere a cada 3 s se o celular já leu.
    const timer = window.setInterval(() => { if (qr) refresh(); }, 3000);
    return () => { window.clearTimeout(first); window.clearInterval(timer); };
  }, [qr, refresh]);

  async function connect() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/whatsapp/session", { method: "POST" });
      const json = await response.json();
      if (!response.ok || !json.ok) throw new Error(json.message || "Não foi possível gerar o QR Code.");
      setState(json.state);
      setQr(json.qr ?? null);
      if (json.state !== "open" && !json.qr) setError("O QR Code ainda não ficou pronto. Toque em “Gerar novo QR Code”.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function disconnectNow() {
    if (!window.confirm("Desconectar o WhatsApp da loja? As mensagens automáticas param até conectar de novo.")) return;
    setBusy(true);
    await fetch("/api/whatsapp/session", { method: "DELETE" }).catch(() => null);
    setQr(null);
    setState("missing");
    setBusy(false);
  }

  if (state === "disabled") {
    return <p className="rounded-xl bg-amber-50 p-4 text-sm font-semibold text-amber-900">O servidor de WhatsApp ainda não foi configurado pela equipe PeriniFood.</p>;
  }

  return (
    <div className="grid gap-5 md:grid-cols-[1fr_260px] md:items-center">
      <div>
        {state === "open" ? (
          <p className="flex items-center gap-2 text-lg font-black text-emerald-700"><CheckCircle2 className="h-6 w-6" /> WhatsApp conectado</p>
        ) : (
          <p className="flex items-center gap-2 text-lg font-black text-ink"><Smartphone className="h-6 w-6 text-ink-soft" /> {state === null ? "Verificando conexão…" : "WhatsApp desconectado"}</p>
        )}
        <p className="mt-1 text-sm text-ink-soft">
          {state === "open"
            ? "As mensagens automáticas de status saem pelo número da loja."
            : "Conecte o WhatsApp da loja para enviar os avisos de pedido automaticamente."}
        </p>
        {state !== "open" && (
          <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-ink-soft">
            <li>Toque em <strong>Gerar QR Code</strong>.</li>
            <li>No celular da loja, abra o WhatsApp → <strong>Dispositivos conectados</strong> → <strong>Conectar dispositivo</strong>.</li>
            <li>Aponte a câmera para o QR Code ao lado.</li>
          </ol>
        )}
        {error && <p role="alert" className="mt-3 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}
        {canEdit && (
          <div className="mt-4 flex flex-wrap gap-2">
            {state !== "open" && (
              <button type="button" onClick={connect} disabled={busy} className="btn-primary text-sm">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : qr ? <RefreshCw className="h-4 w-4" /> : <QrCode className="h-4 w-4" />}
                {qr ? "Gerar novo QR Code" : "Gerar QR Code"}
              </button>
            )}
            {(state === "open" || state === "connecting") && (
              <button type="button" onClick={disconnectNow} disabled={busy} className="btn-muted text-sm"><LogOut className="h-4 w-4" /> Desconectar</button>
            )}
          </div>
        )}
      </div>
      <div className="grid aspect-square w-full max-w-[260px] place-items-center justify-self-center rounded-2xl border border-line bg-white p-3">
        {qr ? (
          <img src={qr.startsWith("data:") ? qr : `data:image/png;base64,${qr}`} alt="QR Code para conectar o WhatsApp" className="h-full w-full object-contain" />
        ) : state === "open" ? (
          <CheckCircle2 className="h-20 w-20 text-emerald-500" />
        ) : (
          <QrCode className="h-20 w-20 text-line" />
        )}
      </div>
    </div>
  );
}
