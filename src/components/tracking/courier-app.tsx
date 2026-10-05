"use client";

import { CheckCircle2, Loader2, LocateFixed, Navigation, TriangleAlert } from "lucide-react";
import { useEffect, useRef, useState } from "react";

// Lado do motoboy: envia a posição do GPS do celular enquanto a entrega está em
// andamento. Mantém a tela ligada (Wake Lock) porque o navegador para o GPS
// quando o celular bloqueia — limitação de página web, sem app instalado.

type Phase = "idle" | "starting" | "tracking" | "finishing" | "done";
const SEND_EVERY_MS = 8000;

async function post(token: string, body: Record<string, unknown>) {
  const response = await fetch(`/api/entrega/${token}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const json = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(json.message || "Falha na conexão.");
  return json;
}

export function CourierApp({ token, started, delivered }: { token: string; started: boolean; delivered: boolean }) {
  const [phase, setPhase] = useState<Phase>(delivered ? "done" : "idle");
  const [error, setError] = useState<string | null>(null);
  const [lastSent, setLastSent] = useState<string | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const watchId = useRef<number | null>(null);
  const lastSentAt = useRef(0);
  const wakeLock = useRef<{ release: () => Promise<void> } | null>(null);

  async function keepAwake() {
    try {
      const nav = navigator as Navigator & { wakeLock?: { request: (t: "screen") => Promise<{ release: () => Promise<void> }> } };
      wakeLock.current = (await nav.wakeLock?.request("screen")) ?? null;
    } catch { /* sem suporte: segue sem travar a tela */ }
  }

  function stopTracking() {
    if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current);
    watchId.current = null;
    wakeLock.current?.release().catch(() => {});
    wakeLock.current = null;
  }

  function startWatching() {
    if (!("geolocation" in navigator)) { setError("Este celular não permite localização pelo navegador."); return; }
    keepAwake();
    watchId.current = navigator.geolocation.watchPosition(
      (position) => {
        setAccuracy(Math.round(position.coords.accuracy));
        setError(null);
        const now = Date.now();
        if (now - lastSentAt.current < SEND_EVERY_MS) return;
        lastSentAt.current = now;
        post(token, {
          action: "location",
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
          heading: position.coords.heading,
          speed: position.coords.speed,
        }).then(() => setLastSent(new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })))
          .catch((e: Error) => setError(e.message));
      },
      (geoError) => {
        setError(geoError.code === geoError.PERMISSION_DENIED
          ? "Permita o acesso à localização para este site (ícone de cadeado na barra de endereço) e toque em “Retomar”."
          : "Sem sinal de GPS no momento. Tentando de novo…");
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 },
    );
  }

  async function start() {
    setPhase("starting");
    setError(null);
    try {
      await post(token, { action: "start" });
      startWatching();
      setPhase("tracking");
    } catch (e) {
      setError((e as Error).message);
      setPhase("idle");
    }
  }

  async function finish() {
    if (!window.confirm("Confirmar que o pedido foi entregue ao cliente?")) return;
    setPhase("finishing");
    try {
      await post(token, { action: "finish" });
      stopTracking();
      setPhase("done");
    } catch (e) {
      setError((e as Error).message);
      setPhase("tracking");
    }
  }

  // A trava de tela cai quando o motoboy troca de app; reativa ao voltar.
  useEffect(() => {
    const onVisible = () => { if (document.visibilityState === "visible" && watchId.current !== null) keepAwake(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => { document.removeEventListener("visibilitychange", onVisible); stopTracking(); };
  }, []);

  if (phase === "done") {
    return (
      <div className="rounded-2xl bg-emerald-50 p-5 text-center text-emerald-800">
        <CheckCircle2 className="mx-auto h-10 w-10" />
        <p className="mt-2 text-lg font-black">Entrega concluída!</p>
        <p className="text-sm">Obrigado. Você já pode fechar esta página.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {phase === "tracking" ? (
        <div className="rounded-2xl bg-ink p-4 text-white">
          <p className="flex items-center gap-2 font-bold"><span className="relative flex h-3 w-3"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" /><span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-400" /></span> Localização sendo enviada</p>
          <p className="mt-1 text-sm text-white/70">{lastSent ? `Última atualização às ${lastSent}` : "Obtendo sinal do GPS…"}{accuracy ? ` · precisão ~${accuracy} m` : ""}</p>
          <p className="mt-2 text-xs text-white/60">Mantenha esta página aberta e a tela ligada durante a entrega.</p>
        </div>
      ) : (
        <button type="button" onClick={start} disabled={phase === "starting"} className="flex h-16 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-b from-brand-bright to-brand text-lg font-black text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.3),0_14px_30px_-10px_rgba(207,74,10,0.85)] disabled:opacity-70">
          {phase === "starting" ? <Loader2 className="h-6 w-6 animate-spin" /> : <Navigation className="h-6 w-6" />}
          {started ? "Retomar envio da localização" : "Iniciar entrega"}
        </button>
      )}

      {error && <p role="alert" className="flex gap-2 rounded-xl bg-amber-50 p-3 text-sm font-semibold text-amber-900"><TriangleAlert className="h-5 w-5 shrink-0" /> {error}</p>}
      {error && phase === "tracking" && (
        <button type="button" onClick={() => { stopTracking(); startWatching(); }} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white font-bold text-ink">
          <LocateFixed className="h-5 w-5" /> Retomar
        </button>
      )}

      {(phase === "tracking" || phase === "finishing" || started) && (
        <button type="button" onClick={finish} disabled={phase === "finishing"} className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 text-base font-black text-white shadow-[0_12px_26px_-10px_rgba(5,150,105,0.8)] disabled:opacity-70">
          {phase === "finishing" ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle2 className="h-5 w-5" />} Pedido entregue
        </button>
      )}
    </div>
  );
}
