"use client";

import Link from "next/link";
import { Bell, BellOff, Printer, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { money } from "@/lib/utils";

// Alerta de pedido novo (site e iFood) em qualquer tela do painel: consulta a cada 10 s,
// toca um som insistente até alguém confirmar e, no computador marcado como
// estação de impressão, imprime a comanda sozinho (quadro invisível com
// /pedidos/[id]/print?auto=1&embed=1, o mesmo fluxo do agente/navegador da comanda).
// Vários computadores abertos: o servidor deixa só um reservar cada pedido.

type AlertOrder = { id: string; label: string; source: string; createdAt: string; customer: string | null; total: number; type: string; printed: boolean };
type PrintState = "fila" | "imprimindo" | "impresso" | "falhou";
type Toast = AlertOrder & { print?: PrintState };

const POLL_MS = 10_000;
const SEEN_KEY = "perinifood_alerta_vistos";
const SOUND_KEY = "perinifood_alerta_som";
// "1" estação de impressão, "0" não imprime; ausente = detecta pelo agente local.
const STATION_KEY = "perinifood_estacao_impressao";
const AGENT_URL = "http://127.0.0.1:4127";

function readSeen(): Record<string, number> {
  try {
    const seen = JSON.parse(window.localStorage.getItem(SEEN_KEY) ?? "{}") as Record<string, number>;
    const day = Date.now() - 24 * 60 * 60 * 1000;
    return Object.fromEntries(Object.entries(seen).filter(([, at]) => at > day));
  } catch {
    return {};
  }
}

function storage(key: string) {
  try { return window.localStorage.getItem(key); } catch { return null; }
}

function store(key: string, value: string) {
  try { window.localStorage.setItem(key, value); } catch {}
}

// Campainha em duas notas, sintetizada (sem arquivo de áudio para carregar).
function chime(context: AudioContext) {
  const start = context.currentTime + 0.02;
  [0, 0.55, 1.1].forEach((offset) => {
    [[880, 0], [1320, 0.18]].forEach(([frequency, delay]) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = "triangle";
      oscillator.frequency.value = frequency;
      const at = start + offset + delay;
      gain.gain.setValueAtTime(0.0001, at);
      gain.gain.exponentialRampToValueAtTime(0.5, at + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.32);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start(at);
      oscillator.stop(at + 0.35);
    });
  });
}

export function NewOrderAlerts() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [soundOn, setSoundOn] = useState(true);
  const [station, setStation] = useState<boolean | null>(null);
  const [stationAuto, setStationAuto] = useState(false);
  const [claimSupported, setClaimSupported] = useState(true);
  const [audioBlocked, setAudioBlocked] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const audioRef = useRef<AudioContext | null>(null);
  const queueRef = useRef<string[]>([]);
  const printingRef = useRef(false);
  // A fila chama a si mesma ao terminar cada comanda (via ref, sem autorreferência no hook).
  const runQueueRef = useRef<() => void>(() => {});
  const stationRef = useRef(false);
  const soundRef = useRef(true);
  const pendingRing = toasts.length > 0;

  // Preferências deste computador; sem escolha, é estação se o agente local responde.
  useEffect(() => {
    const sound = storage(SOUND_KEY) !== "0";
    const saved = storage(STATION_KEY);
    Promise.resolve().then(() => setSoundOn(sound));
    if (saved === "1" || saved === "0") {
      Promise.resolve().then(() => setStation(saved === "1"));
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 3000);
    fetch(`${AGENT_URL}/status`, { cache: "no-store", signal: controller.signal })
      .then((response) => response.json() as Promise<{ ok?: boolean }>)
      .then((data) => { setStation(Boolean(data.ok)); setStationAuto(Boolean(data.ok)); })
      .catch(() => setStation(false))
      .finally(() => window.clearTimeout(timer));
    return () => { controller.abort(); window.clearTimeout(timer); };
  }, []);

  useEffect(() => { stationRef.current = Boolean(station); }, [station]);
  useEffect(() => { soundRef.current = soundOn; }, [soundOn]);

  // Navegadores só liberam som depois de um clique/tecla na página.
  const unlockAudio = useCallback(() => {
    try {
      audioRef.current ??= new AudioContext();
      void audioRef.current.resume().then(() => setAudioBlocked(false)).catch(() => {});
    } catch {}
  }, []);

  useEffect(() => {
    window.addEventListener("pointerdown", unlockAudio);
    window.addEventListener("keydown", unlockAudio);
    return () => {
      window.removeEventListener("pointerdown", unlockAudio);
      window.removeEventListener("keydown", unlockAudio);
    };
  }, [unlockAudio]);

  const ring = useCallback(() => {
    if (!soundRef.current) return;
    try {
      audioRef.current ??= new AudioContext();
      const context = audioRef.current;
      if (context.state === "running") { setAudioBlocked(false); chime(context); return; }
      // Sem clique prévio o resume() fica pendente: avisa para clicar e toca assim que liberar.
      const blocked = window.setTimeout(() => setAudioBlocked(true), 600);
      void context.resume().then(() => { window.clearTimeout(blocked); setAudioBlocked(false); chime(context); }).catch(() => setAudioBlocked(true));
    } catch {
      setAudioBlocked(true);
    }
  }, []);

  // Toca de novo a cada 15 s enquanto houver pedido sem confirmação (até 2 min).
  useEffect(() => {
    if (!pendingRing) return;
    let count = 0;
    const timer = window.setInterval(() => {
      count += 1;
      if (count > 8) window.clearInterval(timer);
      else ring();
    }, 15_000);
    return () => window.clearInterval(timer);
  }, [pendingRing, ring]);

  // Título da aba pisca enquanto houver pedido novo (visível em outra aba/janela).
  useEffect(() => {
    if (!pendingRing) return;
    const original = document.title;
    let on = false;
    const timer = window.setInterval(() => {
      on = !on;
      document.title = on ? `🔔 ${toasts.length} pedido${toasts.length > 1 ? "s" : ""} novo${toasts.length > 1 ? "s" : ""}` : original;
    }, 1000);
    return () => { window.clearInterval(timer); document.title = original; };
  }, [pendingRing, toasts.length]);

  const setPrint = useCallback((id: string, print: PrintState) => {
    setToasts((current) => current.map((toast) => (toast.id === id ? { ...toast, print } : toast)));
  }, []);

  // Uma comanda por vez, num quadro invisível; o quadro avisa quando terminou.
  const runQueue = useCallback(() => {
    if (printingRef.current) return;
    const id = queueRef.current.shift();
    if (!id) return;
    printingRef.current = true;
    setPrint(id, "imprimindo");
    const frame = document.createElement("iframe");
    frame.title = "Impressão da comanda";
    frame.setAttribute("aria-hidden", "true");
    frame.style.cssText = "position:fixed;width:80mm;height:10px;left:-10000px;top:0;border:0;opacity:0;";
    let finished = false;
    const finish = (ok: boolean) => {
      if (finished) return;
      finished = true;
      window.removeEventListener("message", onMessage);
      window.clearTimeout(timeout);
      // Dá tempo para a janela de impressão do navegador terminar antes de remover.
      window.setTimeout(() => frame.remove(), 1000);
      setPrint(id, ok ? "impresso" : "falhou");
      printingRef.current = false;
      runQueueRef.current();
    };
    const onMessage = (event: MessageEvent) => {
      if (event.origin === window.location.origin && event.source === frame.contentWindow && (event.data as { type?: string })?.type === "perinifood-printed") finish(true);
    };
    const timeout = window.setTimeout(() => finish(false), 45_000);
    window.addEventListener("message", onMessage);
    frame.src = `/pedidos/${id}/print?auto=1&embed=1`;
    document.body.appendChild(frame);
  }, [setPrint]);
  useEffect(() => { runQueueRef.current = runQueue; }, [runQueue]);

  const claimAndPrint = useCallback(async (order: AlertOrder) => {
    try {
      const response = await fetch("/api/pedidos/alertas", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: order.id }) });
      const data = await response.json() as { ok?: boolean; claimed?: boolean };
      if (!response.ok || !data.claimed) return;
      queueRef.current.push(order.id);
      setToasts((current) => current.some((toast) => toast.id === order.id) ? current.map((toast) => toast.id === order.id ? { ...toast, print: "fila" } : toast) : current);
      runQueue();
    } catch {}
  }, [runQueue]);

  const poll = useCallback(async () => {
    try {
      const response = await fetch("/api/pedidos/alertas", { cache: "no-store" });
      if (!response.ok) return;
      const data = await response.json() as { ok: boolean; claimSupported: boolean; orders: AlertOrder[] };
      if (!data.ok) return;
      setClaimSupported(data.claimSupported);
      const seen = readSeen();
      const fresh = data.orders.filter((order) => !seen[order.id]);
      if (fresh.length) {
        for (const order of fresh) seen[order.id] = Date.now();
        store(SEEN_KEY, JSON.stringify(seen));
        setToasts((current) => [...current, ...fresh.filter((order) => !current.some((toast) => toast.id === order.id))]);
        ring();
      }
      if (stationRef.current && data.claimSupported) {
        for (const order of data.orders.filter((item) => !item.printed)) await claimAndPrint(order);
      }
    } catch {}
  }, [claimAndPrint, ring]);

  useEffect(() => {
    if (station === null) return; // espera saber se este computador imprime
    const first = window.setTimeout(() => void poll(), 0);
    const timer = window.setInterval(() => void poll(), POLL_MS);
    const onVisible = () => { if (document.visibilityState === "visible") void poll(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [poll, station]);

  function dismiss(id: string) {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }

  function toggleSound() {
    const next = !soundOn;
    setSoundOn(next);
    store(SOUND_KEY, next ? "1" : "0");
    if (next) { unlockAudio(); ring(); }
  }

  function toggleStation() {
    const next = !station;
    setStation(next);
    setStationAuto(false);
    store(STATION_KEY, next ? "1" : "0");
  }

  const printText: Record<PrintState, string> = {
    fila: "Comanda na fila de impressão…",
    imprimindo: "Imprimindo comanda…",
    impresso: "Comanda enviada para impressão.",
    falhou: "A comanda não saiu sozinha. Abra o pedido e imprima.",
  };

  return (
    <>
      <div className="relative">
        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          aria-expanded={menuOpen}
          aria-label="Alertas de pedido novo"
          title="Alertas de pedido novo"
          className={`relative grid h-12 w-12 place-items-center rounded-2xl border bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-brand hover:text-brand ${pendingRing ? "border-brand text-brand" : "border-line text-[#403d38]"}`}
        >
          {soundOn ? <Bell className={`h-5 w-5 ${pendingRing ? "motion-safe:animate-bounce" : ""}`} /> : <BellOff className="h-5 w-5" />}
          {pendingRing && <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-brand px-1 text-[11px] font-black text-white">{toasts.length}</span>}
        </button>
        {menuOpen && (
          <div className="absolute right-0 z-50 mt-2 w-[min(92vw,320px)] space-y-3 rounded-2xl border border-line bg-white p-4 text-sm shadow-2xl">
            <p className="font-semibold text-ink">Pedidos do site e do iFood</p>
            <label className="flex cursor-pointer items-start gap-2.5">
              <input type="checkbox" checked={soundOn} onChange={toggleSound} className="mt-0.5 accent-brand" />
              <span><span className="block font-medium text-ink">Som de alerta</span><span className="block text-xs text-ink-faint">Toca até alguém confirmar o pedido.</span></span>
            </label>
            <label className="flex cursor-pointer items-start gap-2.5">
              <input type="checkbox" checked={Boolean(station)} onChange={toggleStation} className="mt-0.5 accent-brand" />
              <span>
                <span className="block font-medium text-ink">Imprimir comanda neste computador</span>
                <span className="block text-xs text-ink-faint">
                  Marque só no computador ligado à impressora. {stationAuto ? "Ligado porque o agente de impressão foi encontrado aqui." : ""}
                </span>
              </span>
            </label>
            {!claimSupported && <p className="rounded-lg bg-amber-50 p-2 text-xs text-amber-900">Impressão automática indisponível: aplique a migration 20261026000300_order_auto_print.sql no Supabase.</p>}
            <button type="button" onClick={() => { unlockAudio(); ring(); }} className="h-9 w-full rounded-lg border border-line text-xs font-medium text-ink-body transition hover:border-brand hover:text-brand">Testar som</button>
          </div>
        )}
      </div>

      {toasts.length > 0 && (
        <div className="fixed bottom-4 right-4 z-[60] flex w-[min(92vw,360px)] flex-col gap-2" role="region" aria-label="Pedidos novos">
          {audioBlocked && soundOn && (
            <button type="button" onClick={() => { unlockAudio(); ring(); }} className="rounded-xl bg-amber-100 px-3 py-2 text-left text-xs font-semibold text-amber-900 shadow-lg">
              O navegador bloqueou o som. Clique aqui para ativar.
            </button>
          )}
          {toasts.slice(-4).map((toast) => (
            <div key={toast.id} role="alert" className="rounded-2xl border-2 border-brand bg-white p-4 shadow-2xl">
              <div className="flex items-start gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand text-white"><Bell className="h-5 w-5" /></span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-brand">Novo pedido {toast.source === "ifood" ? "do iFood" : "do site"}</p>
                  <p className="font-semibold text-ink">{toast.label} · {money(toast.total)}</p>
                  <p className="truncate text-sm text-ink-soft">{toast.customer || "Cliente"} · {toast.type === "delivery" ? "Entrega" : "Retirada"}</p>
                  {toast.print && <p className="mt-1 flex items-center gap-1.5 text-xs text-ink-faint"><Printer className="h-3.5 w-3.5" /> {printText[toast.print]}</p>}
                </div>
                <button type="button" onClick={() => dismiss(toast.id)} aria-label="Fechar aviso" className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-ink-faint hover:bg-[#f3f1ec]"><X className="h-4 w-4" /></button>
              </div>
              <div className="mt-3 flex gap-2">
                <Link href={`/pedidos/${toast.id}`} onClick={() => dismiss(toast.id)} className="flex h-10 flex-1 items-center justify-center rounded-xl bg-btn text-sm font-semibold text-white transition hover:bg-btn-hover">Abrir pedido</Link>
                <button type="button" onClick={() => dismiss(toast.id)} className="h-10 rounded-xl border border-line px-4 text-sm font-semibold text-ink-body transition hover:border-brand">Ciente</button>
              </div>
            </div>
          ))}
          {toasts.length > 4 && <p className="text-right text-xs font-semibold text-ink-soft">+{toasts.length - 4} pedidos</p>}
        </div>
      )}
    </>
  );
}
