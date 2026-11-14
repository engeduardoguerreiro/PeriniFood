"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  Bell, BellOff, Bike, Check, ChevronDown, ClipboardList, Copy, LayoutDashboard, MessageCircle, Plus, Receipt, Send,
  Settings, Wifi, WifiOff, X,
} from "lucide-react";
import { gestorCourierLink, gestorStoreMode, gestorUpdateStatus } from "@/app/gestor/actions";
import { money } from "@/lib/utils";
import type { OrderStatus } from "@/lib/types";
import {
  SourceBadge, dateTimeFormat, isAlertable, isIFood, readLocal, statusInfo, typeInfo, waLink, waNumber, writeLocal,
  type Detail, type ListOrder, type StoreInfo, type StoreMode,
} from "./gestor-shared";

// Casca do Gestor de Pedidos (layout de /gestor): barra superior, menu lateral e
// tudo o que precisa continuar rodando em qualquer tela — consulta dos pedidos,
// alerta sonoro e aviso de pedido novo, impressão, despacho do motoboy,
// cancelamento e configurações. As telas (pedidos, novo pedido, entregas) usam
// useGestor(). Dentro do app desktop (gestor-desktop/) existe window.perinifoodDesktop.

type PrintState = "fila" | "imprimindo" | "ok" | "falhou";
type DesktopBridge = { isDesktop: true; attention: (count: number) => void; notify: (title: string, body: string) => void };
type SavedCourier = { name: string; phone: string };

declare global {
  interface Window { perinifoodDesktop?: DesktopBridge }
}

const POLL_MS = 6_000;
const RING_MS = 6_000;
const SEEN_KEY = "perinifood_gestor_vistos";
const SOUND_KEY = "perinifood_alerta_som";
const STATION_KEY = "perinifood_estacao_impressao";
const AUTO_ACCEPT_KEY = "perinifood_gestor_aceite_auto";
const PRINT_ON_ACCEPT_KEY = "perinifood_gestor_imprimir_ao_aceitar";
const COURIERS_KEY = "perinifood_gestor_motoboys";
const AGENT_URL = "http://127.0.0.1:4127";

const storeModes: Array<{ value: StoreMode; label: string; hint: string }> = [
  { value: "auto", label: "Automático", hint: "Abre e fecha pelo horário de funcionamento" },
  { value: "open", label: "Aberta", hint: "Recebe pedidos fora do horário" },
  { value: "closed", label: "Fechada", hint: "Não recebe pedidos" },
  { value: "offline", label: "Pausada", hint: "Pausa os pedidos do cardápio" },
];

type GestorContextValue = {
  orders: ListOrder[];
  store: StoreInfo | null;
  loaded: boolean;
  now: number;
  busy: Record<string, boolean>;
  printing: Record<string, PrintState>;
  detailVersion: number;
  canManageStore: boolean;
  isDesktop: boolean;
  changeStatus: (order: ListOrder, status: OrderStatus, quiet?: boolean) => Promise<boolean>;
  print: (id: string) => void;
  refresh: () => void;
  showToast: (kind: "ok" | "error", text: string) => void;
  requestCancel: (order: ListOrder) => void;
  openDispatch: (order: ListOrder) => void;
  selectOrder: (id: string | null, view?: "pedidos" | "entregas") => void;
};

const GestorContext = createContext<GestorContextValue | null>(null);

export function useGestor() {
  const value = useContext(GestorContext);
  if (!value) throw new Error("useGestor fora do GestorShell");
  return value;
}

function readSeen(): Record<string, number> {
  try {
    const seen = JSON.parse(readLocal(SEEN_KEY) ?? "{}") as Record<string, number>;
    const limit = Date.now() - 24 * 60 * 60 * 1000;
    return Object.fromEntries(Object.entries(seen).filter(([, at]) => at > limit));
  } catch {
    return {};
  }
}

function readCouriers(): SavedCourier[] {
  try {
    const list = JSON.parse(readLocal(COURIERS_KEY) ?? "[]") as SavedCourier[];
    return Array.isArray(list) ? list.filter((item) => item && typeof item.name === "string").slice(0, 30) : [];
  } catch {
    return [];
  }
}

// Campainha sintetizada (sem arquivo de áudio), três toques em duas notas.
function chime(context: AudioContext) {
  const start = context.currentTime + 0.02;
  [0, 0.5, 1].forEach((offset) => {
    [[988, 0], [1319, 0.16]].forEach(([frequency, delay]) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = "triangle";
      oscillator.frequency.value = frequency;
      const at = start + offset + delay;
      gain.gain.setValueAtTime(0.0001, at);
      gain.gain.exponentialRampToValueAtTime(0.6, at + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.3);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start(at);
      oscillator.stop(at + 0.32);
    });
  });
}

function Toggle({ checked, onChange, label, hint }: { checked: boolean; onChange: (value: boolean) => void; label: string; hint: string }) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4 rounded-xl border border-zinc-200 p-3 hover:border-zinc-300">
      <span>
        <span className="block font-semibold text-zinc-900">{label}</span>
        <span className="block text-xs text-zinc-500">{hint}</span>
      </span>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="mt-1 h-4 w-4 shrink-0 accent-red-600" />
    </label>
  );
}

function courierMessage(link: string) {
  return `Entrega PeriniFood — abra o link, toque em "Iniciar entrega" e mantenha a página aberta:\n${link}`;
}

export function customerTrackingMessage(name: string | null, trackingUrl: string, deliveryCode: string | null) {
  return `Olá${name ? ` ${name.split(" ")[0]}` : ""}! Seu pedido saiu para entrega. Acompanhe o motoboy no mapa:\n${trackingUrl}${deliveryCode ? `\n\nCódigo de entrega: *${deliveryCode}* — informe ao entregador ao receber.` : ""}`;
}

type DispatchResult = { link: string | null; courierPhone: string; trackingUrl: string | null; customerDigits: string; deliveryCode: string | null; customer: string | null };

export function GestorShell({ storeName, canManageStore, children }: { storeName: string; canManageStore: boolean; children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [orders, setOrders] = useState<ListOrder[]>([]);
  const [store, setStore] = useState<StoreInfo | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [online, setOnline] = useState(true);
  const [now, setNow] = useState(() => Date.now());
  const [incoming, setIncoming] = useState<string[]>([]);
  const [soundOn, setSoundOn] = useState(true);
  const [station, setStation] = useState(false);
  const [autoAccept, setAutoAccept] = useState(false);
  const [printOnAccept, setPrintOnAccept] = useState(false);
  const [audioBlocked, setAudioBlocked] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [storeMenuOpen, setStoreMenuOpen] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<ListOrder | null>(null);
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const [printing, setPrinting] = useState<Record<string, PrintState>>({});
  const [toast, setToast] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [isDesktop, setIsDesktop] = useState(false);
  const [detailVersion, setDetailVersion] = useState(0);
  // Despacho / motoboy
  const [dispatchTarget, setDispatchTarget] = useState<ListOrder | null>(null);
  const [dispatchName, setDispatchName] = useState("");
  const [dispatchPhone, setDispatchPhone] = useState("");
  const [dispatchLink, setDispatchLink] = useState(true);
  const [dispatchBusy, setDispatchBusy] = useState(false);
  const [dispatchResult, setDispatchResult] = useState<DispatchResult | null>(null);
  const [couriers, setCouriers] = useState<SavedCourier[]>([]);
  const [copied, setCopied] = useState(false);

  const audioRef = useRef<AudioContext | null>(null);
  const soundRef = useRef(true);
  const stationRef = useRef(false);
  const autoAcceptRef = useRef(false);
  const printOnAcceptRef = useRef(false);
  const autoTriedRef = useRef<Set<string>>(new Set());
  const queueRef = useRef<string[]>([]);
  const printingRef = useRef(false);
  const runQueueRef = useRef<() => void>(() => {});
  const firstPollRef = useRef(true);
  const pollRef = useRef<() => void>(() => {});

  useEffect(() => { soundRef.current = soundOn; }, [soundOn]);
  useEffect(() => { stationRef.current = station; }, [station]);
  useEffect(() => { autoAcceptRef.current = autoAccept; }, [autoAccept]);
  useEffect(() => { printOnAcceptRef.current = printOnAccept; }, [printOnAccept]);

  // Preferências deste computador. Estação de impressão é a mesma chave do painel.
  useEffect(() => {
    const savedStation = readLocal(STATION_KEY);
    Promise.resolve().then(() => {
      setSoundOn(readLocal(SOUND_KEY) !== "0");
      setAutoAccept(readLocal(AUTO_ACCEPT_KEY) === "1");
      setPrintOnAccept(readLocal(PRINT_ON_ACCEPT_KEY) === "1");
      setIsDesktop(Boolean(window.perinifoodDesktop?.isDesktop));
      setCouriers(readCouriers());
      if (savedStation === "1" || savedStation === "0") setStation(savedStation === "1");
    });
    if (savedStation === "1" || savedStation === "0") return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 3000);
    fetch(`${AGENT_URL}/status`, { cache: "no-store", signal: controller.signal })
      .then((response) => response.json() as Promise<{ ok?: boolean }>)
      .then((data) => setStation(Boolean(data.ok)))
      .catch(() => {})
      .finally(() => window.clearTimeout(timer));
    return () => { controller.abort(); window.clearTimeout(timer); };
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 15_000);
    return () => window.clearInterval(timer);
  }, []);

  // F2 abre o novo pedido de qualquer tela.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === "F2") { event.preventDefault(); router.push("/gestor/novo"); } };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router]);

  const showToast = useCallback((kind: "ok" | "error", text: string) => setToast({ kind, text }), []);
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), toast.kind === "error" ? 7000 : 3000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  // ---------- Som ----------
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

  const ring = useCallback((force = false) => {
    if (!soundRef.current && !force) return;
    try {
      audioRef.current ??= new AudioContext();
      const context = audioRef.current;
      if (context.state === "running") { setAudioBlocked(false); chime(context); return; }
      const blocked = window.setTimeout(() => setAudioBlocked(true), 600);
      void context.resume().then(() => { window.clearTimeout(blocked); setAudioBlocked(false); chime(context); }).catch(() => setAudioBlocked(true));
    } catch {
      setAudioBlocked(true);
    }
  }, []);

  // ---------- Impressão (uma comanda por vez, num quadro invisível) ----------
  const runQueue = useCallback(() => {
    if (printingRef.current) return;
    const id = queueRef.current.shift();
    if (!id) return;
    printingRef.current = true;
    setPrinting((current) => ({ ...current, [id]: "imprimindo" }));
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
      window.setTimeout(() => frame.remove(), 1000);
      setPrinting((current) => ({ ...current, [id]: ok ? "ok" : "falhou" }));
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
  }, []);
  useEffect(() => { runQueueRef.current = runQueue; }, [runQueue]);

  const print = useCallback((id: string) => {
    if (queueRef.current.includes(id)) return;
    queueRef.current.push(id);
    setPrinting((current) => ({ ...current, [id]: "fila" }));
    runQueue();
  }, [runQueue]);

  // Pedido novo do site/iFood: só um computador reserva e imprime (auto_printed_at).
  const claimAndPrint = useCallback(async (id: string) => {
    try {
      const response = await fetch("/api/pedidos/alertas", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
      const data = await response.json() as { claimed?: boolean };
      if (response.ok && data.claimed) print(id);
    } catch {}
  }, [print]);

  // ---------- Mudança de status ----------
  const changeStatus = useCallback(async (order: ListOrder, status: OrderStatus, quiet = false) => {
    setBusy((current) => ({ ...current, [order.id]: true }));
    const result = await gestorUpdateStatus(order.id, status);
    setBusy((current) => ({ ...current, [order.id]: false }));
    if (!result.ok) {
      showToast("error", `Pedido ${order.label}: ${result.error}`);
      return false;
    }
    setOrders((current) => current.map((item) => (item.id === order.id ? { ...item, status, updatedAt: new Date().toISOString() } : item)));
    setIncoming((current) => current.filter((id) => id !== order.id));
    if (!quiet) showToast("ok", `Pedido ${order.label}: ${statusInfo[status].label.toLowerCase()}.`);
    if (order.status === "pending" && status !== "canceled" && printOnAcceptRef.current && stationRef.current) print(order.id);
    return true;
  }, [print, showToast]);

  // ---------- Consulta periódica ----------
  const poll = useCallback(async () => {
    try {
      const response = await fetch("/api/gestor/pedidos", { cache: "no-store" });
      if (response.status === 401) { window.location.href = "/login?next=/gestor"; return; }
      if (!response.ok) { setOnline(false); return; }
      const data = await response.json() as { ok: boolean; store: StoreInfo; orders: ListOrder[] };
      if (!data.ok) { setOnline(false); return; }
      setOnline(true);
      setStore(data.store);
      setOrders(data.orders);
      setLoaded(true);

      const seen = readSeen();
      const waitingNow = data.orders.filter((order) => order.status === "pending" && isAlertable(order));
      const fresh = waitingNow.filter((order) => !seen[order.id]);
      // Ao abrir o gestor, pedido que ainda espera aceite volta a mostrar o aviso.
      if (firstPollRef.current && waitingNow.length) {
        setIncoming((current) => [...current, ...waitingNow.map((order) => order.id).filter((id) => !current.includes(id))]);
      }
      firstPollRef.current = false;
      if (fresh.length) {
        for (const order of fresh) seen[order.id] = Date.now();
        writeLocal(SEEN_KEY, JSON.stringify(seen));
        setIncoming((current) => [...current, ...fresh.map((order) => order.id).filter((id) => !current.includes(id))]);
        ring();
        const first = fresh[0];
        const body = fresh.length > 1 ? `${fresh.length} pedidos aguardando confirmação` : `${first.label} · ${first.customer ?? "Cliente"} · ${money(first.total)}`;
        if (window.perinifoodDesktop) window.perinifoodDesktop.notify("Novo pedido!", body);
        else if (typeof Notification !== "undefined" && Notification.permission === "granted" && document.visibilityState !== "visible") {
          try { new Notification("Novo pedido!", { body, tag: "perinifood-gestor" }); } catch {}
        }
      }

      if (stationRef.current) {
        for (const order of data.orders.filter((item) => isAlertable(item) && !item.printed && item.status !== "canceled")) await claimAndPrint(order.id);
      }
      if (autoAcceptRef.current) {
        for (const order of waitingNow.filter((item) => !autoTriedRef.current.has(item.id))) {
          autoTriedRef.current.add(order.id);
          await changeStatus(order, "preparing", true);
        }
      }
    } catch {
      setOnline(false);
    }
  }, [changeStatus, claimAndPrint, ring]);
  useEffect(() => { pollRef.current = () => void poll(); }, [poll]);

  useEffect(() => {
    const first = window.setTimeout(() => void poll(), 0);
    const timer = window.setInterval(() => void poll(), POLL_MS);
    const onVisible = () => { if (document.visibilityState === "visible") void poll(); };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", onVisible);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", onVisible);
    };
  }, [poll]);

  // Troca de tela (ex.: voltou do novo pedido): atualiza na hora.
  useEffect(() => { pollRef.current(); }, [pathname]);

  const refresh = useCallback(() => pollRef.current(), []);

  // Toca sem parar enquanto houver pedido novo do site/iFood esperando aceite (até 15 min).
  const waiting = useMemo(() => orders.filter((order) => order.status === "pending" && isAlertable(order) && now - new Date(order.createdAt).getTime() < 15 * 60_000), [orders, now]);
  useEffect(() => {
    if (!waiting.length) return;
    const timer = window.setInterval(() => ring(), RING_MS);
    return () => window.clearInterval(timer);
  }, [waiting.length, ring]);

  // App desktop: pisca a janela e mostra a contagem na barra de tarefas/bandeja.
  useEffect(() => { window.perinifoodDesktop?.attention(waiting.length); }, [waiting.length]);

  useEffect(() => {
    const original = "Gestor de Pedidos · PeriniFood";
    if (!waiting.length) { document.title = original; return; }
    let on = false;
    const timer = window.setInterval(() => {
      on = !on;
      document.title = on ? `🔔 (${waiting.length}) Novo pedido` : original;
    }, 1000);
    return () => { window.clearInterval(timer); document.title = original; };
  }, [waiting.length]);

  const incomingOrders = useMemo(() => incoming.map((id) => orders.find((order) => order.id === id)).filter((order): order is ListOrder => Boolean(order && order.status === "pending")), [incoming, orders]);

  const selectOrder = useCallback((id: string | null, view: "pedidos" | "entregas" = "pedidos") => {
    const base = view === "entregas" ? "/gestor/entregas" : "/gestor";
    router.push(id ? `${base}?pedido=${id}` : base, { scroll: false });
  }, [router]);

  // ---------- Despacho / motoboy ----------
  const openDispatch = useCallback((order: ListOrder) => {
    setDispatchTarget(order);
    setDispatchResult(null);
    setDispatchName(order.courier?.name ?? "");
    setDispatchPhone(couriers.find((item) => item.name === order.courier?.name)?.phone ?? "");
    setDispatchLink(!isIFood(order));
    setCopied(false);
  }, [couriers]);

  async function confirmDispatch() {
    const order = dispatchTarget;
    if (!order) return;
    setDispatchBusy(true);
    let token: string | null = null;
    if (dispatchLink) {
      const result = await gestorCourierLink(order.id, dispatchName.trim());
      if (!result.ok) { setDispatchBusy(false); showToast("error", result.error); return; }
      token = result.token;
    }
    if (order.status === "ready") {
      const ok = await changeStatus(order, "out_for_delivery", true);
      if (!ok) { setDispatchBusy(false); return; }
    }
    const name = dispatchName.trim();
    if (name) {
      const next = [{ name, phone: dispatchPhone.replace(/\D/g, "") }, ...couriers.filter((item) => item.name.toLowerCase() !== name.toLowerCase())].slice(0, 30);
      setCouriers(next);
      writeLocal(COURIERS_KEY, JSON.stringify(next));
    }
    setDetailVersion((value) => value + 1);
    refresh();
    if (!token) {
      setDispatchBusy(false);
      setDispatchTarget(null);
      showToast("ok", `Pedido ${order.label} despachado.`);
      return;
    }
    let detail: Detail | null = null;
    try {
      const response = await fetch(`/api/gestor/pedidos/${order.id}`, { cache: "no-store" });
      detail = ((await response.json()) as { order?: Detail }).order ?? null;
    } catch {}
    setDispatchBusy(false);
    setDispatchResult({
      link: `${window.location.origin}/entrega/${token}`,
      courierPhone: dispatchPhone.replace(/\D/g, ""),
      trackingUrl: detail?.trackingCode && !isIFood(order) ? `${window.location.origin}/pedido/${detail.trackingCode}` : null,
      customerDigits: detail?.phoneDigits ?? "",
      deliveryCode: detail?.courier?.deliveryCode ?? null,
      customer: order.customer,
    });
  }

  async function chooseStoreMode(mode: StoreMode) {
    setStoreMenuOpen(false);
    const result = await gestorStoreMode(mode);
    if (!result.ok) showToast("error", result.error);
    else { showToast("ok", "Status da loja atualizado."); refresh(); }
  }

  function toggleSound(value: boolean) {
    setSoundOn(value);
    writeLocal(SOUND_KEY, value ? "1" : "0");
    if (value) { unlockAudio(); ring(true); }
  }

  const completedToday = orders.filter((order) => order.status === "completed");
  const revenueToday = completedToday.reduce((sum, order) => sum + order.total, 0);
  const activeCount = orders.filter((order) => !["completed", "canceled"].includes(order.status)).length;
  const deliveryCount = orders.filter((order) => order.type === "delivery" && ["ready", "out_for_delivery"].includes(order.status)).length;
  const storeMode = store?.mode ?? "auto";

  const nav = [
    { href: "/gestor", label: "Pedidos", icon: ClipboardList, count: activeCount, active: pathname === "/gestor" },
    { href: "/gestor/novo", label: "Novo pedido", icon: Plus, count: 0, active: pathname.startsWith("/gestor/novo") || pathname.startsWith("/gestor/pedido/") },
    { href: "/gestor/entregas", label: "Entregas", icon: Bike, count: deliveryCount, active: pathname.startsWith("/gestor/entregas") },
  ];

  const context: GestorContextValue = {
    orders, store, loaded, now, busy, printing, detailVersion, canManageStore, isDesktop,
    changeStatus, print, refresh, showToast, requestCancel: setCancelTarget, openDispatch, selectOrder,
  };

  return (
    <GestorContext.Provider value={context}>
      <div className="fixed inset-0 flex flex-col bg-zinc-100 font-sans text-zinc-900">
        {/* Barra superior */}
        <header className="flex h-14 shrink-0 items-center gap-3 bg-red-600 px-4 text-white shadow">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-white/15"><Receipt className="h-5 w-5" /></span>
            <div className="min-w-0 leading-tight">
              <p className="text-[0.7rem] font-semibold uppercase tracking-widest text-white/75">Gestor de Pedidos</p>
              <p className="truncate font-bold">{store?.name ?? storeName}</p>
            </div>
          </div>

          <div className="relative ml-2">
            <button type="button" disabled={!canManageStore} onClick={() => setStoreMenuOpen((open) => !open)} className="flex h-9 items-center gap-2 rounded-full bg-white px-3 text-sm font-semibold text-zinc-900 shadow-sm disabled:cursor-default">
              <span className={`h-2.5 w-2.5 rounded-full ${store?.open ? "bg-emerald-500" : "bg-zinc-400"}`} />
              <span className="max-w-[220px] truncate">{store ? store.text : "Carregando…"}</span>
              {canManageStore && <ChevronDown className="h-4 w-4 text-zinc-500" />}
            </button>
            {storeMenuOpen && (
              <div className="absolute left-0 top-11 z-40 w-72 rounded-xl border border-zinc-200 bg-white p-1.5 text-zinc-900 shadow-xl">
                {storeModes.map((mode) => (
                  <button key={mode.value} type="button" onClick={() => void chooseStoreMode(mode.value)} className={`flex w-full items-start gap-2 rounded-lg p-2.5 text-left hover:bg-zinc-50 ${storeMode === mode.value ? "bg-red-50" : ""}`}>
                    <Check className={`mt-0.5 h-4 w-4 shrink-0 ${storeMode === mode.value ? "text-red-600" : "text-transparent"}`} />
                    <span><span className="block text-sm font-semibold">{mode.label}</span><span className="block text-xs text-zinc-500">{mode.hint}</span></span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <Link href="/gestor/novo" title="Novo pedido (F2)" className="ml-2 hidden h-9 items-center gap-1.5 rounded-full border-2 border-white/80 px-3.5 text-sm font-bold hover:bg-white hover:text-red-600 lg:flex">
            <Plus className="h-4 w-4" /> Novo pedido <kbd className="rounded bg-white/20 px-1 text-[0.65rem]">F2</kbd>
          </Link>

          <div className="ml-auto flex items-center gap-1.5">
            <div className="hidden items-center gap-4 pr-3 text-xs xl:flex">
              <span><strong className="block text-base leading-none [font-variant-numeric:tabular-nums]">{completedToday.length}</strong>concluídos hoje</span>
              <span><strong className="block text-base leading-none [font-variant-numeric:tabular-nums]">{money(revenueToday)}</strong>faturado hoje</span>
            </div>
            <span title={online ? "Conectado" : "Sem conexão com o servidor"} className={`grid h-9 w-9 place-items-center rounded-lg ${online ? "text-white/80" : "bg-white text-red-600"}`}>
              {online ? <Wifi className="h-5 w-5" /> : <WifiOff className="h-5 w-5" />}
            </span>
            <button type="button" onClick={() => toggleSound(!soundOn)} title={soundOn ? "Silenciar alertas" : "Ligar som"} className="grid h-9 w-9 place-items-center rounded-lg hover:bg-white/15">
              {soundOn ? <Bell className="h-5 w-5" /> : <BellOff className="h-5 w-5" />}
            </button>
            <button type="button" onClick={() => setSettingsOpen(true)} title="Configurações" className="grid h-9 w-9 place-items-center rounded-lg hover:bg-white/15">
              <Settings className="h-5 w-5" />
            </button>
          </div>
        </header>

        {audioBlocked && soundOn && (
          <button type="button" onClick={() => { unlockAudio(); ring(true); }} className="shrink-0 bg-amber-100 px-4 py-2 text-left text-sm font-semibold text-amber-900">
            O som de alerta está bloqueado. Clique aqui para ativar.
          </button>
        )}
        {!online && <p className="shrink-0 bg-zinc-900 px-4 py-2 text-sm font-semibold text-white">Sem conexão com o servidor. Tentando de novo…</p>}

        <div className="flex min-h-0 flex-1">
          {/* Menu lateral */}
          <nav className="flex w-[84px] shrink-0 flex-col items-center gap-1 border-r border-zinc-200 bg-white py-3">
            {nav.map((item) => (
              <Link key={item.href} href={item.href} className={`relative flex w-[72px] flex-col items-center gap-1 rounded-xl px-1 py-2.5 text-[0.7rem] font-semibold ${item.active ? "bg-red-50 text-red-600" : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-800"}`}>
                <item.icon className="h-5 w-5" />
                {item.label}
                {item.count > 0 && <span className="absolute right-2 top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-red-600 px-1 text-[0.6rem] font-bold text-white">{item.count}</span>}
              </Link>
            ))}
            <a href="/dashboard" target="_blank" rel="noreferrer" title="Cadastros, cardápio, relatórios" className="mt-auto flex w-[72px] flex-col items-center gap-1 rounded-xl px-1 py-2.5 text-center text-[0.7rem] font-semibold text-zinc-500 hover:bg-zinc-50 hover:text-zinc-800">
              <LayoutDashboard className="h-5 w-5" />
              Painel online
            </a>
          </nav>

          <div className="min-h-0 min-w-0 flex-1">{children}</div>
        </div>

        {/* Aviso de pedido novo (fica até aceitar ou ver) */}
        {incomingOrders.length > 0 && (
          <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4">
            <div role="alertdialog" aria-label="Novo pedido" className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
              <div className="flex items-center gap-3 bg-red-600 px-5 py-4 text-white">
                <span className="grid h-11 w-11 place-items-center rounded-full bg-white/20"><Bell className="h-6 w-6 motion-safe:animate-bounce" /></span>
                <div>
                  <p className="text-xl font-black">{incomingOrders.length > 1 ? `${incomingOrders.length} pedidos novos!` : "Novo pedido!"}</p>
                  <p className="text-sm text-white/80">Confirme para iniciar o preparo</p>
                </div>
              </div>
              <div className="max-h-[50vh] divide-y divide-zinc-100 overflow-y-auto">
                {incomingOrders.map((order) => (
                  <div key={order.id} className="p-4">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2"><SourceBadge source={order.source} /><strong className="text-lg">{order.label}</strong></div>
                      <strong className="text-lg [font-variant-numeric:tabular-nums]">{money(order.total)}</strong>
                    </div>
                    <p className="mt-1 text-sm text-zinc-600">{order.customer || "Cliente"} · {typeInfo[order.type]?.label ?? order.type}{order.schedule ? ` · agendado ${dateTimeFormat.format(new Date(order.schedule.start))}` : ""}</p>
                    <div className="mt-3 flex gap-2">
                      <button type="button" onClick={() => { setIncoming((current) => current.filter((id) => id !== order.id)); selectOrder(order.id); }} className="h-10 flex-1 rounded-xl border border-zinc-200 text-sm font-bold text-zinc-700 hover:bg-zinc-50">Ver detalhes</button>
                      <button type="button" disabled={busy[order.id]} onClick={() => { selectOrder(order.id); void changeStatus(order, "preparing"); }} className="h-10 flex-1 rounded-xl bg-red-600 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-60">{busy[order.id] ? "Enviando…" : "Aceitar"}</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Despacho: escolher motoboy, gerar link de rastreio e avisar por WhatsApp */}
        {dispatchTarget && (
          <div className="fixed inset-0 z-[55] grid place-items-center bg-black/50 p-4">
            <div role="dialog" aria-label="Despachar pedido" className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="flex items-center gap-2 text-lg font-black"><Bike className="h-5 w-5 text-red-600" /> {dispatchResult ? "Motoboy a caminho" : dispatchTarget.status === "ready" ? "Despachar pedido" : "Motoboy do pedido"}</p>
                  <p className="text-sm text-zinc-500">{dispatchTarget.label} · {dispatchTarget.customer || "Cliente"}</p>
                </div>
                <button type="button" onClick={() => setDispatchTarget(null)} className="grid h-9 w-9 place-items-center rounded-lg hover:bg-zinc-100" aria-label="Fechar"><X className="h-5 w-5" /></button>
              </div>

              {!dispatchResult ? (
                <div className="mt-4 space-y-3">
                  <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-zinc-200 p-3">
                    <input type="checkbox" checked={dispatchLink} onChange={(event) => setDispatchLink(event.target.checked)} className="mt-0.5 h-4 w-4 accent-red-600" />
                    <span>
                      <span className="block text-sm font-semibold">Motoboy da loja (link de rastreio)</span>
                      <span className="block text-xs text-zinc-500">{isIFood(dispatchTarget) ? "Desmarque se o entregador for do iFood." : "Ele abre o link no celular, sem app, e a loja e o cliente acompanham no mapa."}</span>
                    </span>
                  </label>
                  {dispatchLink && (
                    <>
                      <label className="block text-sm">
                        <span className="font-semibold">Nome do motoboy</span>
                        <input
                          list="gestor-motoboys"
                          value={dispatchName}
                          onChange={(event) => {
                            setDispatchName(event.target.value);
                            const known = couriers.find((item) => item.name.toLowerCase() === event.target.value.trim().toLowerCase());
                            if (known) setDispatchPhone(known.phone);
                          }}
                          placeholder="Opcional"
                          className="mt-1 h-10 w-full rounded-lg border border-zinc-200 px-3 outline-none focus:border-red-600"
                        />
                        <datalist id="gestor-motoboys">{couriers.map((item) => <option key={item.name} value={item.name} />)}</datalist>
                      </label>
                      <label className="block text-sm">
                        <span className="font-semibold">WhatsApp do motoboy</span>
                        <input value={dispatchPhone} onChange={(event) => setDispatchPhone(event.target.value)} inputMode="tel" placeholder="(11) 99999-9999 · opcional" className="mt-1 h-10 w-full rounded-lg border border-zinc-200 px-3 outline-none focus:border-red-600" />
                      </label>
                      {couriers.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {couriers.slice(0, 6).map((item) => (
                            <button key={item.name} type="button" onClick={() => { setDispatchName(item.name); setDispatchPhone(item.phone); }} className={`h-7 rounded-full px-3 text-xs font-semibold ${dispatchName === item.name ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"}`}>{item.name}</button>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                  <div className="flex gap-2 pt-2">
                    <button type="button" onClick={() => setDispatchTarget(null)} className="h-11 flex-1 rounded-xl border border-zinc-200 text-sm font-bold text-zinc-700 hover:bg-zinc-50">Voltar</button>
                    <button type="button" disabled={dispatchBusy || (!dispatchLink && dispatchTarget.status !== "ready")} onClick={() => void confirmDispatch()} className="h-11 flex-1 rounded-xl bg-red-600 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-60">
                      {dispatchBusy ? "Enviando…" : dispatchTarget.status === "ready" ? "Despachar" : dispatchTarget.courier ? "Trocar motoboy" : "Gerar link"}
                    </button>
                  </div>
                  {dispatchTarget.courier && dispatchLink && <p className="text-xs text-zinc-500">Gerar de novo troca o link: o anterior deixa de funcionar.</p>}
                </div>
              ) : (
                <div className="mt-4 space-y-2.5">
                  {dispatchResult.deliveryCode && (
                    <p className="rounded-xl bg-zinc-900 px-3 py-2 text-center text-sm text-white">Código de entrega do cliente: <strong className="tracking-[0.25em]">{dispatchResult.deliveryCode}</strong></p>
                  )}
                  {dispatchResult.link && (
                    <>
                      <div className="flex gap-2">
                        <input readOnly value={dispatchResult.link} onFocus={(event) => event.currentTarget.select()} aria-label="Link do motoboy" className="h-10 min-w-0 flex-1 rounded-lg border border-zinc-200 px-3 text-xs" />
                        <button type="button" onClick={() => { void navigator.clipboard?.writeText(dispatchResult.link ?? ""); setCopied(true); }} className="grid h-10 w-10 place-items-center rounded-lg border border-zinc-200 hover:bg-zinc-50" aria-label="Copiar link">
                          {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                        </button>
                      </div>
                      <a href={dispatchResult.courierPhone ? waLink(dispatchResult.courierPhone, courierMessage(dispatchResult.link)) : `https://wa.me/?text=${encodeURIComponent(courierMessage(dispatchResult.link))}`} target="_blank" rel="noreferrer" className="flex h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 text-sm font-bold text-white hover:bg-emerald-700">
                        <Send className="h-4 w-4" /> Enviar link ao motoboy
                      </a>
                    </>
                  )}
                  {dispatchResult.trackingUrl && waNumber(dispatchResult.customerDigits) && (
                    <a href={waLink(dispatchResult.customerDigits, customerTrackingMessage(dispatchResult.customer, dispatchResult.trackingUrl, dispatchResult.deliveryCode))} target="_blank" rel="noreferrer" className="flex h-11 items-center justify-center gap-2 rounded-xl border border-zinc-200 text-sm font-bold text-zinc-700 hover:bg-zinc-50">
                      <MessageCircle className="h-4 w-4" /> Enviar acompanhamento ao cliente
                    </a>
                  )}
                  <button type="button" onClick={() => setDispatchTarget(null)} className="h-10 w-full rounded-xl text-sm font-bold text-zinc-500 hover:bg-zinc-50">Fechar</button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Confirmação de cancelamento (sem window.confirm) */}
        {cancelTarget && (
          <div className="fixed inset-0 z-[55] grid place-items-center bg-black/50 p-4">
            <div role="dialog" aria-label="Cancelar pedido" className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl">
              <p className="text-lg font-black">{cancelTarget.status === "pending" ? "Recusar" : "Cancelar"} o pedido {cancelTarget.label}?</p>
              <p className="mt-1 text-sm text-zinc-600">
                {isIFood(cancelTarget) ? "O cancelamento também será enviado ao iFood e não pode ser desfeito." : "O pedido sai da fila e não pode ser reaberto."}
              </p>
              <div className="mt-5 flex gap-2">
                <button type="button" onClick={() => setCancelTarget(null)} className="h-10 flex-1 rounded-xl border border-zinc-200 text-sm font-bold text-zinc-700 hover:bg-zinc-50">Voltar</button>
                <button type="button" onClick={() => { const target = cancelTarget; setCancelTarget(null); void changeStatus(target, "canceled"); }} className="h-10 flex-1 rounded-xl bg-red-600 text-sm font-bold text-white hover:bg-red-700">
                  Sim, {cancelTarget.status === "pending" ? "recusar" : "cancelar"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Configurações deste computador */}
        {settingsOpen && (
          <div className="fixed inset-0 z-[55] flex justify-end bg-black/40" onClick={() => setSettingsOpen(false)}>
            <div className="flex h-full w-full max-w-sm flex-col gap-3 overflow-y-auto bg-white p-5 shadow-2xl" onClick={(event) => event.stopPropagation()}>
              <div className="flex items-center justify-between">
                <p className="text-lg font-black">Configurações</p>
                <button type="button" onClick={() => setSettingsOpen(false)} className="grid h-9 w-9 place-items-center rounded-lg hover:bg-zinc-100" aria-label="Fechar"><X className="h-5 w-5" /></button>
              </div>
              <p className="text-xs text-zinc-500">Valem só para este computador.</p>
              <Toggle checked={soundOn} onChange={toggleSound} label="Som de pedido novo" hint="Toca a cada 6 segundos até alguém aceitar." />
              <Toggle checked={autoAccept} onChange={(value) => { setAutoAccept(value); writeLocal(AUTO_ACCEPT_KEY, value ? "1" : "0"); }} label="Aceitar pedidos automaticamente" hint="Pedidos do cardápio e do iFood vão direto para o preparo." />
              <Toggle checked={station} onChange={(value) => { setStation(value); writeLocal(STATION_KEY, value ? "1" : "0"); }} label="Imprimir comanda neste computador" hint="Marque só no computador ligado à impressora. Pedido novo sai impresso sozinho." />
              <Toggle checked={printOnAccept} onChange={(value) => { setPrintOnAccept(value); writeLocal(PRINT_ON_ACCEPT_KEY, value ? "1" : "0"); }} label="Imprimir de novo ao aceitar" hint="Uma segunda via para a cozinha quando o pedido é aceito (precisa da opção acima)." />
              <button type="button" onClick={() => { unlockAudio(); ring(true); }} className="h-10 rounded-xl border border-zinc-200 text-sm font-bold text-zinc-700 hover:bg-zinc-50">Testar som</button>
              {!isDesktop && typeof Notification !== "undefined" && (
                <button type="button" onClick={() => void Notification.requestPermission()} className="h-10 rounded-xl border border-zinc-200 text-sm font-bold text-zinc-700 hover:bg-zinc-50">Ativar notificações do navegador</button>
              )}
              <a href="/impressao" target="_blank" className="flex h-10 items-center justify-center rounded-xl border border-zinc-200 text-sm font-bold text-zinc-700 hover:bg-zinc-50">Configurar impressora</a>
              {couriers.length > 0 && (
                <div className="rounded-xl border border-zinc-200 p-3">
                  <p className="text-sm font-semibold">Motoboys salvos</p>
                  <ul className="mt-2 space-y-1">
                    {couriers.map((item) => (
                      <li key={item.name} className="flex items-center justify-between gap-2 text-sm">
                        <span>{item.name}{item.phone && <span className="ml-1 text-xs text-zinc-500">{item.phone}</span>}</span>
                        <button type="button" onClick={() => { const next = couriers.filter((courier) => courier.name !== item.name); setCouriers(next); writeLocal(COURIERS_KEY, JSON.stringify(next)); }} className="text-xs font-semibold text-red-600 hover:underline">Remover</button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <p className="mt-auto text-xs text-zinc-400">{isDesktop ? "App desktop PeriniFood Gestor" : "Versão web"} · atualiza a cada {POLL_MS / 1000} s · F2 novo pedido</p>
            </div>
          </div>
        )}

        {toast && (
          <div role="status" className={`fixed bottom-5 left-1/2 z-[60] -translate-x-1/2 rounded-xl px-4 py-3 text-sm font-semibold shadow-xl ${toast.kind === "ok" ? "bg-zinc-900 text-white" : "bg-red-600 text-white"}`}>
            {toast.text}
          </div>
        )}
      </div>
    </GestorContext.Provider>
  );
}
