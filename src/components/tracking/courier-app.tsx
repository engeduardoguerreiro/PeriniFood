"use client";

import { CheckCircle2, CloudOff, Loader2, LocateFixed, Navigation, TriangleAlert } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

// Lado do motoboy: envia a posição do GPS do celular durante a entrega.
// Página web não recebe GPS com o celular bloqueado/em outro app, então aqui
// reduzimos as perdas: tela ligada (Wake Lock), fila offline com reenvio em
// lote, retomada automática ao voltar para a página, sinal de vida a cada 25 s
// e alarme (vibração + aviso) quando o GPS para de responder.

type Phase = "idle" | "starting" | "tracking" | "finishing" | "done";
type QueuedPoint = { lat: number; lng: number; accuracy: number | null; heading: number | null; speed: number | null; at: string };

const SEND_EVERY_MS = 8000;
const HEARTBEAT_MS = 25000;
const STALL_MS = 30000;
const QUEUE_LIMIT = 500;

const storage = {
  get<T>(key: string, fallback: T): T { try { const v = window.localStorage.getItem(key); return v ? (JSON.parse(v) as T) : fallback; } catch { return fallback; } },
  set(key: string, value: unknown) { try { window.localStorage.setItem(key, JSON.stringify(value)); } catch { /* armazenamento cheio/bloqueado */ } },
  remove(key: string) { try { window.localStorage.removeItem(key); } catch { /* idem */ } },
};

async function post(token: string, body: Record<string, unknown>) {
  const response = await fetch(`/api/entrega/${token}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(json.message || "Falha na conexão.") as Error & { fatal?: boolean };
    // 404/409/410: link trocado, entrega concluída ou expirada — não adianta reenviar.
    error.fatal = [404, 409, 410].includes(response.status);
    throw error;
  }
  return json;
}

const timeLabel = (iso: string) => new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

export function CourierApp({ token, started, delivered }: { token: string; started: boolean; delivered: boolean }) {
  const activeKey = `pf_courier_active_${token}`;
  const queueKey = `pf_courier_queue_${token}`;
  const [phase, setPhase] = useState<Phase>(delivered ? "done" : "idle");
  const [error, setError] = useState<string | null>(null);
  const [lastSent, setLastSent] = useState<string | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [pending, setPending] = useState(0);
  const [stalled, setStalled] = useState(false);
  const watchId = useRef<number | null>(null);
  const lastPoint = useRef<QueuedPoint | null>(null);
  const lastFixAt = useRef(0);
  const lastSentAt = useRef(0);
  const flushing = useRef(false);
  const wakeLock = useRef<{ release: () => Promise<void> } | null>(null);
  const fatal = useRef(false);

  const keepAwake = useCallback(async () => {
    try {
      const nav = navigator as Navigator & { wakeLock?: { request: (t: "screen") => Promise<{ release: () => Promise<void> }> } };
      wakeLock.current = (await nav.wakeLock?.request("screen")) ?? null;
    } catch { /* sem suporte */ }
  }, []);

  // Envia a fila (em lotes de até 60) — chamada a cada leitura, ao voltar a
  // internet e no sinal de vida.
  const flush = useCallback(async () => {
    if (flushing.current || fatal.current || !navigator.onLine) return;
    flushing.current = true;
    try {
      let queue = storage.get<QueuedPoint[]>(queueKey, []);
      while (queue.length) {
        const batch = queue.slice(0, 60);
        await post(token, { action: "batch", points: batch });
        queue = storage.get<QueuedPoint[]>(queueKey, []).slice(batch.length);
        storage.set(queueKey, queue);
        setPending(queue.length);
        setLastSent(timeLabel(batch[batch.length - 1].at));
        lastSentAt.current = Date.now();
      }
      setError(null);
    } catch (e) {
      const err = e as Error & { fatal?: boolean };
      if (err.fatal) { fatal.current = true; setError(err.message); }
      else setError("Sem internet: as posições ficam guardadas e serão enviadas quando a conexão voltar.");
    } finally {
      flushing.current = false;
    }
  }, [queueKey, token]);

  const enqueue = useCallback((point: QueuedPoint) => {
    const queue = [...storage.get<QueuedPoint[]>(queueKey, []), point].slice(-QUEUE_LIMIT);
    storage.set(queueKey, queue);
    setPending(queue.length);
    flush();
  }, [flush, queueKey]);

  const stopWatching = useCallback(() => {
    if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current);
    watchId.current = null;
  }, []);

  const startWatching = useCallback(() => {
    if (!("geolocation" in navigator)) { setError("Este celular não permite localização pelo navegador."); return; }
    stopWatching();
    keepAwake();
    lastFixAt.current = Date.now();
    watchId.current = navigator.geolocation.watchPosition(
      (position) => {
        lastFixAt.current = Date.now();
        setStalled(false);
        setAccuracy(Math.round(position.coords.accuracy));
        const point: QueuedPoint = {
          lat: position.coords.latitude, lng: position.coords.longitude, accuracy: position.coords.accuracy,
          heading: position.coords.heading, speed: position.coords.speed, at: new Date().toISOString(),
        };
        lastPoint.current = point;
        if (Date.now() - lastSentAt.current >= SEND_EVERY_MS) { lastSentAt.current = Date.now(); enqueue(point); }
      },
      (geoError) => {
        if (geoError.code === geoError.PERMISSION_DENIED) setError("Permita o acesso à localização para este site (cadeado na barra de endereço) e toque em “Retomar”.");
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 },
    );
  }, [enqueue, keepAwake, stopWatching]);

  async function start() {
    setPhase("starting");
    setError(null);
    try {
      await post(token, { action: "start" });
      storage.set(activeKey, true);
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
      await flush();
      await post(token, { action: "finish" });
      stopWatching();
      wakeLock.current?.release().catch(() => {});
      storage.remove(activeKey);
      storage.remove(queueKey);
      setPhase("done");
    } catch (e) {
      setError((e as Error).message);
      setPhase("tracking");
    }
  }

  // Retomada automática: se a entrega já tinha sido iniciada neste celular, volta
  // a enviar sozinha ao reabrir/recarregar a página (a permissão já foi dada).
  useEffect(() => {
    if (delivered || !started || !storage.get<boolean>(activeKey, false)) return;
    const resume = window.setTimeout(() => { setPhase("tracking"); setPending(storage.get<QueuedPoint[]>(queueKey, []).length); startWatching(); flush(); }, 0);
    return () => window.clearTimeout(resume);
  }, [activeKey, delivered, flush, queueKey, startWatching, started]);

  // Enquanto rastreia: sinal de vida, alarme de GPS parado, reenvio ao voltar a
  // internet e reativação da tela/GPS ao voltar para a página.
  useEffect(() => {
    if (phase !== "tracking") return;
    const tick = window.setInterval(() => {
      const now = Date.now();
      if (lastPoint.current && now - lastSentAt.current >= HEARTBEAT_MS) {
        lastSentAt.current = now;
        enqueue({ ...lastPoint.current, at: new Date().toISOString() });
      }
      if (now - lastFixAt.current > STALL_MS) {
        setStalled((was) => {
          if (!was) navigator.vibrate?.([400, 200, 400]);
          return true;
        });
      }
    }, 5000);
    const onOnline = () => flush();
    const onVisible = () => { if (document.visibilityState === "visible") { keepAwake(); startWatching(); flush(); } };
    window.addEventListener("online", onOnline);
    document.addEventListener("visibilitychange", onVisible);
    return () => { window.clearInterval(tick); window.removeEventListener("online", onOnline); document.removeEventListener("visibilitychange", onVisible); };
  }, [enqueue, flush, keepAwake, phase, startWatching]);

  useEffect(() => () => { stopWatching(); wakeLock.current?.release().catch(() => {}); }, [stopWatching]);

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
      {phase === "tracking" && stalled && (
        <div role="alert" className="rounded-2xl bg-red-600 p-4 text-white shadow-lg">
          <p className="flex items-center gap-2 font-black"><TriangleAlert className="h-5 w-5" /> GPS parado</p>
          <p className="mt-1 text-sm text-white/85">A loja e o cliente não estão vendo sua posição. Deixe esta página aberta na tela.</p>
          <button type="button" onClick={startWatching} className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-white font-bold text-red-700"><LocateFixed className="h-5 w-5" /> Retomar</button>
        </div>
      )}

      {phase === "tracking" ? (
        <div className="rounded-2xl bg-ink p-4 text-white">
          <p className="flex items-center gap-2 font-bold"><span className="relative flex h-3 w-3"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" /><span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-400" /></span> Localização sendo enviada</p>
          <p className="mt-1 text-sm text-white/70">{lastSent ? `Última atualização às ${lastSent}` : "Obtendo sinal do GPS…"}{accuracy ? ` · precisão ~${accuracy} m` : ""}</p>
          {pending > 1 && <p className="mt-1 flex items-center gap-1.5 text-sm text-amber-300"><CloudOff className="h-4 w-4" /> {pending} posições aguardando internet</p>}
          <p className="mt-2 text-xs text-white/60">Mantenha esta página aberta e a tela ligada durante a entrega.</p>
        </div>
      ) : (
        <button type="button" onClick={start} disabled={phase === "starting"} className="flex h-16 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-b from-brand-bright to-brand text-lg font-black text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.3),0_14px_30px_-10px_rgba(207,74,10,0.85)] disabled:opacity-70">
          {phase === "starting" ? <Loader2 className="h-6 w-6 animate-spin" /> : <Navigation className="h-6 w-6" />}
          {started ? "Retomar envio da localização" : "Iniciar entrega"}
        </button>
      )}

      {error && <p role="alert" className="flex gap-2 rounded-xl bg-amber-50 p-3 text-sm font-semibold text-amber-900"><TriangleAlert className="h-5 w-5 shrink-0" /> {error}</p>}

      {(phase === "tracking" || phase === "finishing" || started) && (
        <button type="button" onClick={finish} disabled={phase === "finishing"} className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 text-base font-black text-white shadow-[0_12px_26px_-10px_rgba(5,150,105,0.8)] disabled:opacity-70">
          {phase === "finishing" ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle2 className="h-5 w-5" />} Pedido entregue
        </button>
      )}
    </div>
  );
}
