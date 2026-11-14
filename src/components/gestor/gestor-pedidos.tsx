"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  AlertTriangle, Bell, BellOff, Bike, CalendarClock, Check, CheckCircle2, ChefHat, ChevronDown, Clock3, ExternalLink,
  LayoutDashboard, MapPin, MessageCircle, Package, Phone, Printer, Receipt, Search, Settings, ShoppingBag, Store,
  UtensilsCrossed, Wifi, WifiOff, X, XCircle,
} from "lucide-react";
import { gestorStoreMode, gestorUpdateStatus } from "@/app/gestor/actions";
import { money } from "@/lib/utils";
import type { OrderStatus } from "@/lib/types";

// Gestor de Pedidos (estilo gestor do iFood): lista à esquerda agrupada por etapa,
// detalhe à direita com a próxima ação em destaque, alerta sonoro insistente para
// pedido novo, aceite e impressão automáticos opcionais. Roda no navegador e
// dentro do app desktop (gestor-desktop/), que expõe window.perinifoodDesktop.

type Schedule = { start: string; end: string } | null;
type ListOrder = {
  id: string; label: string; source: string; type: "delivery" | "pickup" | "dine_in"; status: OrderStatus; total: number;
  customer: string | null; address: string | null; payment: string; paymentDetail: string | null;
  createdAt: string; updatedAt: string; printed: boolean; schedule: Schedule;
};
type StoreInfo = { name: string; logo: string | null; slug: string; open: boolean; text: string; mode: StoreMode };
type StoreMode = "auto" | "open" | "closed" | "offline";
type Detail = {
  id: string; updatedAt: string; phone: string; phoneDigits: string; address: string | null; notes: string | null;
  subtotal: number; deliveryFee: number; discount: number; total: number; paymentMethod: string; paymentStatus: string;
  paymentNote: string | null; changeFor: number | null; externalId: string | null; schedule: Schedule;
  items: Array<{ id: string; name: string; quantity: number; total: number; notes: string | null; lines: string[] }>;
};
type Tab = "andamento" | "agendados" | "concluidos";
type TypeFilter = "todos" | "delivery" | "pickup" | "dine_in";
type DesktopBridge = { isDesktop: true; attention: (count: number) => void; notify: (title: string, body: string) => void };

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
const AGENT_URL = "http://127.0.0.1:4127";
// Canais que chegam sozinhos (cliente pediu): tocam alerta e abrem o aviso de pedido novo.
const ALERT_SOURCES = new Set(["site", "ifood", "99food", "keeta", "rappi"]);

const sourceInfo: Record<string, { label: string; className: string }> = {
  ifood: { label: "iFood", className: "bg-red-600 text-white" },
  "99food": { label: "99Food", className: "bg-yellow-400 text-black" },
  keeta: { label: "Keeta", className: "bg-amber-500 text-white" },
  rappi: { label: "Rappi", className: "bg-orange-500 text-white" },
  site: { label: "Cardápio", className: "bg-brand text-white" },
  pdv: { label: "PDV", className: "bg-zinc-700 text-white" },
  mesa: { label: "Mesa", className: "bg-zinc-700 text-white" },
  manual: { label: "Manual", className: "bg-zinc-500 text-white" },
  delivery: { label: "Delivery", className: "bg-zinc-500 text-white" },
};

const typeInfo = {
  delivery: { label: "Entrega", icon: Bike },
  pickup: { label: "Retirada", icon: ShoppingBag },
  dine_in: { label: "Mesa", icon: UtensilsCrossed },
} as const;

const paymentLabel: Record<string, string> = {
  cash: "Dinheiro", credit_card: "Cartão de crédito", debit_card: "Cartão de débito", pix: "Pix", online: "Pago online", other: "Outro",
};

const statusInfo: Record<OrderStatus, { label: string; className: string }> = {
  pending: { label: "Novo", className: "bg-red-100 text-red-700" },
  accepted: { label: "Confirmado", className: "bg-sky-100 text-sky-700" },
  preparing: { label: "Em preparo", className: "bg-amber-100 text-amber-800" },
  ready: { label: "Pronto", className: "bg-emerald-100 text-emerald-700" },
  out_for_delivery: { label: "Em entrega", className: "bg-indigo-100 text-indigo-700" },
  completed: { label: "Concluído", className: "bg-zinc-100 text-zinc-600" },
  canceled: { label: "Cancelado", className: "bg-zinc-200 text-zinc-600" },
};

const groups: Array<{ key: string; title: string; statuses: OrderStatus[]; dot: string }> = [
  { key: "novos", title: "Novos", statuses: ["pending"], dot: "bg-red-600" },
  { key: "preparo", title: "Em preparo", statuses: ["accepted", "preparing"], dot: "bg-amber-500" },
  { key: "prontos", title: "Prontos", statuses: ["ready"], dot: "bg-emerald-500" },
  { key: "entrega", title: "Em entrega", statuses: ["out_for_delivery"], dot: "bg-indigo-500" },
];

const storeModes: Array<{ value: StoreMode; label: string; hint: string }> = [
  { value: "auto", label: "Automático", hint: "Abre e fecha pelo horário de funcionamento" },
  { value: "open", label: "Aberta", hint: "Recebe pedidos fora do horário" },
  { value: "closed", label: "Fechada", hint: "Não recebe pedidos" },
  { value: "offline", label: "Pausada", hint: "Pausa os pedidos do cardápio" },
];

const timeFormat = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" });
const dateTimeFormat = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

function readLocal(key: string) {
  try { return window.localStorage.getItem(key); } catch { return null; }
}
function writeLocal(key: string, value: string) {
  try { window.localStorage.setItem(key, value); } catch {}
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

function isAlertable(order: ListOrder) {
  return ALERT_SOURCES.has(order.source);
}
function isIFood(order: ListOrder) {
  return order.source === "ifood";
}
function scheduled(order: ListOrder, now: number) {
  return Boolean(order.schedule && new Date(order.schedule.start).getTime() > now);
}
function minutesSince(iso: string, now: number) {
  return Math.max(0, Math.floor((now - new Date(iso).getTime()) / 60_000));
}
function elapsedLabel(minutes: number) {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h${String(minutes % 60).padStart(2, "0")}`;
}
function elapsedClass(order: ListOrder, minutes: number) {
  if (order.status === "pending") return minutes >= 5 ? "bg-red-600 text-white" : "bg-red-100 text-red-700";
  if (minutes >= 50) return "bg-red-100 text-red-700";
  if (minutes >= 30) return "bg-amber-100 text-amber-800";
  return "bg-zinc-100 text-zinc-600";
}

// Próxima etapa do pedido (botão principal). Pedido do iFood não é concluído pela
// loja: o iFood finaliza sozinho depois da entrega/retirada.
function nextStep(order: ListOrder, now: number): { status: OrderStatus; label: string } | { blocked: string } | null {
  switch (order.status) {
    case "pending":
      return { status: "preparing", label: "Aceitar pedido" };
    case "accepted":
      return { status: "preparing", label: "Iniciar preparo" };
    case "preparing":
      return { status: "ready", label: "Pedido pronto" };
    case "ready":
      if (order.type === "delivery") {
        if (isIFood(order) && scheduled(order, now)) return { blocked: "Agendado: despacho liberado no início da janela" };
        return { status: "out_for_delivery", label: "Despachar" };
      }
      return isIFood(order) ? { blocked: "Aguardando retirada — o iFood conclui" } : { status: "completed", label: "Concluir" };
    case "out_for_delivery":
      return isIFood(order) ? { blocked: "Em entrega — o iFood conclui" } : { status: "completed", label: "Concluir entrega" };
    default:
      return null;
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

function SourceBadge({ source }: { source: string }) {
  const info = sourceInfo[source] ?? { label: source.toUpperCase(), className: "bg-zinc-500 text-white" };
  return <span className={`inline-flex h-5 items-center rounded px-1.5 text-[0.68rem] font-bold uppercase tracking-wide ${info.className}`}>{info.label}</span>;
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

function OrderCard({ order, now, active, onSelect }: { order: ListOrder; now: number; active: boolean; onSelect: (id: string) => void }) {
  const minutes = minutesSince(order.createdAt, now);
  const TypeIcon = typeInfo[order.type]?.icon ?? Package;
  return (
    <button
      type="button"
      onClick={() => onSelect(order.id)}
      className={`w-full rounded-xl border bg-white p-3 text-left transition ${active ? "border-red-600 ring-2 ring-red-600/15" : "border-zinc-200 hover:border-zinc-300"} ${order.status === "pending" ? "border-l-4 border-l-red-600" : ""}`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <SourceBadge source={order.source} />
          <span className="truncate font-bold text-zinc-900">{order.label}</span>
        </div>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[0.7rem] font-bold [font-variant-numeric:tabular-nums] ${["completed", "canceled"].includes(order.status) ? statusInfo[order.status].className : elapsedClass(order, minutes)}`}>
          {["completed", "canceled"].includes(order.status) ? statusInfo[order.status].label : elapsedLabel(minutes)}
        </span>
      </div>
      <p className="mt-1.5 truncate text-sm font-medium text-zinc-700">{order.customer || "Cliente balcão"}</p>
      <div className="mt-1 flex items-center justify-between gap-2 text-xs text-zinc-500">
        <span className="flex items-center gap-1"><TypeIcon className="h-3.5 w-3.5" /> {typeInfo[order.type]?.label ?? order.type} · {timeFormat.format(new Date(order.createdAt))}</span>
        <strong className="text-zinc-900 [font-variant-numeric:tabular-nums]">{money(order.total)}</strong>
      </div>
      {order.schedule && (
        <p className="mt-2 flex items-center gap-1 rounded-md bg-amber-50 px-2 py-1 text-[0.7rem] font-semibold text-amber-800">
          <CalendarClock className="h-3.5 w-3.5" /> Agendado {dateTimeFormat.format(new Date(order.schedule.start))}
        </p>
      )}
    </button>
  );
}

export function GestorPedidos({ storeName, canManageStore }: { storeName: string; canManageStore: boolean }) {
  const [orders, setOrders] = useState<ListOrder[]>([]);
  const [store, setStore] = useState<StoreInfo | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [online, setOnline] = useState(true);
  const [now, setNow] = useState(() => Date.now());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [details, setDetails] = useState<Record<string, Detail>>({});
  const [detailError, setDetailError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("andamento");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("todos");
  const [search, setSearch] = useState("");
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
  const [printing, setPrinting] = useState<Record<string, "fila" | "imprimindo" | "ok" | "falhou">>({});
  const [toast, setToast] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [isDesktop, setIsDesktop] = useState(false);
  const [, startTransition] = useTransition();

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

  const showToast = useCallback((kind: "ok" | "error", text: string) => {
    setToast({ kind, text });
  }, []);
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
        for (const order of data.orders.filter((item) => item.status === "pending" && isAlertable(item) && !autoTriedRef.current.has(item.id))) {
          autoTriedRef.current.add(order.id);
          await changeStatus(order, "preparing", true);
        }
      }
    } catch {
      setOnline(false);
    }
  }, [changeStatus, claimAndPrint, ring]);

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

  // Toca sem parar enquanto houver pedido novo do site/iFood esperando aceite (até 15 min).
  const waiting = useMemo(() => orders.filter((order) => order.status === "pending" && isAlertable(order) && now - new Date(order.createdAt).getTime() < 15 * 60_000), [orders, now]);
  useEffect(() => {
    if (!waiting.length) return;
    const timer = window.setInterval(() => ring(), RING_MS);
    return () => window.clearInterval(timer);
  }, [waiting.length, ring]);

  // App desktop: pisca a janela e mostra a contagem na barra de tarefas/bandeja.
  useEffect(() => {
    window.perinifoodDesktop?.attention(waiting.length);
  }, [waiting.length]);

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

  // O aviso de pedido novo some quando o pedido sai de "Novo" (aceito em outro computador, cancelado).
  const incomingOrders = useMemo(() => incoming.map((id) => orders.find((order) => order.id === id)).filter((order): order is ListOrder => Boolean(order && order.status === "pending")), [incoming, orders]);

  // ---------- Detalhe ----------
  const selected = orders.find((order) => order.id === selectedId) ?? null;
  const detail = selected ? details[selected.id] : undefined;
  const selectedUpdatedAt = selected?.updatedAt;
  useEffect(() => {
    if (!selectedId) return;
    const cached = details[selectedId];
    if (cached && cached.updatedAt === selectedUpdatedAt) return;
    let alive = true;
    fetch(`/api/gestor/pedidos/${selectedId}`, { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json() as { ok: boolean; order?: Detail; error?: string };
        if (!alive) return;
        if (data.ok && data.order) { setDetailError(null); setDetails((current) => ({ ...current, [selectedId]: data.order! })); }
        else setDetailError(data.error ?? "Não foi possível abrir o pedido.");
      })
      .catch(() => alive && setDetailError("Sem conexão para abrir o pedido."));
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- recarrega só quando o pedido muda no servidor
  }, [selectedId, selectedUpdatedAt]);

  // ---------- Filtros ----------
  const term = search.trim().toLowerCase();
  const matches = useCallback((order: ListOrder) => {
    if (typeFilter !== "todos" && order.type !== typeFilter) return false;
    if (!term) return true;
    return order.label.toLowerCase().includes(term) || (order.customer ?? "").toLowerCase().includes(term);
  }, [term, typeFilter]);

  const activeOrders = orders.filter((order) => !["completed", "canceled"].includes(order.status));
  const scheduledOrders = activeOrders.filter((order) => scheduled(order, now) && order.status !== "pending");
  const runningOrders = activeOrders.filter((order) => !scheduledOrders.includes(order));
  const closedOrders = orders.filter((order) => ["completed", "canceled"].includes(order.status));
  const tabOrders = (tab === "andamento" ? runningOrders : tab === "agendados" ? scheduledOrders : closedOrders).filter(matches);

  const completedToday = closedOrders.filter((order) => order.status === "completed");
  const revenueToday = completedToday.reduce((sum, order) => sum + order.total, 0);

  async function chooseStoreMode(mode: StoreMode) {
    setStoreMenuOpen(false);
    const result = await gestorStoreMode(mode);
    if (!result.ok) showToast("error", result.error);
    else { showToast("ok", "Status da loja atualizado."); startTransition(() => void poll()); }
  }

  function toggleSound(value: boolean) {
    setSoundOn(value);
    writeLocal(SOUND_KEY, value ? "1" : "0");
    if (value) { unlockAudio(); ring(true); }
  }

  function selectOrder(id: string) {
    setSelectedId(id);
    setDetailError(null);
  }

  const step = selected ? nextStep(selected, now) : null;
  const selectedClosed = selected ? ["completed", "canceled"].includes(selected.status) : true;
  const storeMode = store?.mode ?? "auto";

  return (
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
          <button
            type="button"
            disabled={!canManageStore}
            onClick={() => setStoreMenuOpen((open) => !open)}
            className="flex h-9 items-center gap-2 rounded-full bg-white px-3 text-sm font-semibold text-zinc-900 shadow-sm disabled:cursor-default"
          >
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

        <div className="ml-auto flex items-center gap-1.5">
          <div className="hidden items-center gap-4 pr-3 text-xs md:flex">
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
          <a href="/pedidos" target="_blank" title="Abrir painel completo" className="grid h-9 w-9 place-items-center rounded-lg hover:bg-white/15">
            <LayoutDashboard className="h-5 w-5" />
          </a>
        </div>
      </header>

      {audioBlocked && soundOn && (
        <button type="button" onClick={() => { unlockAudio(); ring(true); }} className="shrink-0 bg-amber-100 px-4 py-2 text-left text-sm font-semibold text-amber-900">
          O som de alerta está bloqueado. Clique aqui para ativar.
        </button>
      )}

      <div className="flex min-h-0 flex-1">
        {/* Lista */}
        <aside className="flex w-[380px] shrink-0 flex-col border-r border-zinc-200 bg-zinc-50">
          <div className="grid grid-cols-3 border-b border-zinc-200 bg-white text-sm font-semibold">
            {([
              ["andamento", "Em andamento", runningOrders.length],
              ["agendados", "Agendados", scheduledOrders.length],
              ["concluidos", "Encerrados", closedOrders.length],
            ] as Array<[Tab, string, number]>).map(([key, label, count]) => (
              <button key={key} type="button" onClick={() => setTab(key)} className={`flex items-center justify-center gap-1.5 border-b-2 px-2 py-3 ${tab === key ? "border-red-600 text-red-600" : "border-transparent text-zinc-500 hover:text-zinc-800"}`}>
                {label}
                <span className={`rounded-full px-1.5 text-[0.7rem] [font-variant-numeric:tabular-nums] ${tab === key ? "bg-red-600 text-white" : "bg-zinc-200 text-zinc-600"}`}>{count}</span>
              </button>
            ))}
          </div>
          <div className="space-y-2 border-b border-zinc-200 p-3">
            <label className="relative block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por número ou cliente" className="h-9 w-full rounded-lg border border-zinc-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-red-600" />
            </label>
            <div className="flex gap-1.5">
              {([["todos", "Todos"], ["delivery", "Entrega"], ["pickup", "Retirada"], ["dine_in", "Mesa"]] as Array<[TypeFilter, string]>).map(([key, label]) => (
                <button key={key} type="button" onClick={() => setTypeFilter(key)} className={`h-7 rounded-full px-3 text-xs font-semibold ${typeFilter === key ? "bg-zinc-900 text-white" : "bg-white text-zinc-600 ring-1 ring-zinc-200 hover:ring-zinc-300"}`}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-3">
            {!loaded && <p className="p-6 text-center text-sm text-zinc-500">Carregando pedidos…</p>}
            {loaded && tab === "andamento" && groups.map((group) => {
              const rows = tabOrders.filter((order) => group.statuses.includes(order.status));
              if (!rows.length) return null;
              return (
                <section key={group.key}>
                  <h3 className="mb-2 flex items-center gap-2 px-1 text-xs font-bold uppercase tracking-wide text-zinc-500">
                    <span className={`h-2 w-2 rounded-full ${group.dot}`} /> {group.title} <span className="text-zinc-400">{rows.length}</span>
                  </h3>
                  <div className="space-y-2">{rows.map((order) => <OrderCard key={order.id} order={order} now={now} active={order.id === selectedId} onSelect={selectOrder} />)}</div>
                </section>
              );
            })}
            {loaded && tab !== "andamento" && <div className="space-y-2">{tabOrders.map((order) => <OrderCard key={order.id} order={order} now={now} active={order.id === selectedId} onSelect={selectOrder} />)}</div>}
            {loaded && !tabOrders.length && (
              <div className="flex flex-col items-center gap-2 p-10 text-center text-sm text-zinc-500">
                <Package className="h-8 w-8 text-zinc-300" />
                {tab === "andamento" ? "Nenhum pedido em andamento." : tab === "agendados" ? "Nenhum pedido agendado." : "Nenhum pedido encerrado hoje."}
              </div>
            )}
          </div>
        </aside>

        {/* Detalhe */}
        <main className="flex min-w-0 flex-1 flex-col">
          {!selected ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center text-zinc-500">
              <span className="grid h-20 w-20 place-items-center rounded-full bg-white shadow-sm"><Receipt className="h-9 w-9 text-zinc-300" /></span>
              <p className="text-lg font-semibold text-zinc-700">Selecione um pedido</p>
              <p className="max-w-sm text-sm">Os pedidos novos do cardápio e do iFood aparecem aqui com alerta sonoro.</p>
            </div>
          ) : (
            <>
              <div className="min-h-0 flex-1 overflow-y-auto p-6">
                <div className="mx-auto max-w-3xl space-y-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <SourceBadge source={selected.source} />
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${statusInfo[selected.status].className}`}>{statusInfo[selected.status].label}</span>
                      </div>
                      <h1 className="mt-2 text-3xl font-black tracking-tight">Pedido {selected.label}</h1>
                      <p className="mt-1 flex items-center gap-1.5 text-sm text-zinc-500">
                        <Clock3 className="h-4 w-4" /> Feito às {timeFormat.format(new Date(selected.createdAt))} · há {elapsedLabel(minutesSince(selected.createdAt, now))}
                        {detail?.externalId && <span className="ml-2">· ID externo {detail.externalId.slice(0, 8)}</span>}
                      </p>
                    </div>
                    <button type="button" onClick={() => setSelectedId(null)} className="grid h-9 w-9 place-items-center rounded-lg text-zinc-400 hover:bg-white hover:text-zinc-700" aria-label="Fechar pedido"><X className="h-5 w-5" /></button>
                  </div>

                  {selected.schedule && (
                    <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-900">
                      <CalendarClock className="h-5 w-5 shrink-0" />
                      Agendado: entregar entre {dateTimeFormat.format(new Date(selected.schedule.start))} e {timeFormat.format(new Date(selected.schedule.end))}
                    </div>
                  )}

                  {detailError && !detail && <p className="rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">{detailError}</p>}

                  <div className="grid gap-3 md:grid-cols-2">
                    <section className="rounded-xl border border-zinc-200 bg-white p-4">
                      <h2 className="text-xs font-bold uppercase tracking-wide text-zinc-500">Cliente</h2>
                      <p className="mt-1.5 text-lg font-bold">{selected.customer || "Cliente balcão"}</p>
                      {detail?.phone && (
                        <div className="mt-1 flex flex-wrap items-center gap-3 text-sm">
                          <span className="flex items-center gap-1.5 text-zinc-700"><Phone className="h-4 w-4" /> {detail.phone}</span>
                          {detail.phoneDigits.length >= 10 && (
                            <a href={`https://wa.me/${detail.phoneDigits.startsWith("55") ? detail.phoneDigits : `55${detail.phoneDigits}`}`} target="_blank" rel="noreferrer" className="flex items-center gap-1 font-semibold text-emerald-700 hover:underline">
                              <MessageCircle className="h-4 w-4" /> WhatsApp
                            </a>
                          )}
                        </div>
                      )}
                    </section>
                    <section className="rounded-xl border border-zinc-200 bg-white p-4">
                      <h2 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-zinc-500">
                        {(() => { const Icon = typeInfo[selected.type]?.icon ?? Store; return <Icon className="h-4 w-4" />; })()}
                        {typeInfo[selected.type]?.label ?? selected.type}
                      </h2>
                      {selected.type === "delivery" ? (
                        <p className="mt-1.5 flex items-start gap-1.5 text-sm font-medium text-zinc-800"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-red-600" /> {detail?.address ?? selected.address ?? "Endereço não informado"}</p>
                      ) : (
                        <p className="mt-1.5 text-sm font-medium text-zinc-800">{selected.type === "pickup" ? "Cliente retira no balcão" : "Consumo no local"}</p>
                      )}
                    </section>
                  </div>

                  <section className="rounded-xl border border-zinc-200 bg-white">
                    <h2 className="border-b border-zinc-100 px-4 py-3 text-xs font-bold uppercase tracking-wide text-zinc-500">Itens do pedido</h2>
                    {!detail && !detailError && <p className="p-4 text-sm text-zinc-500">Carregando itens…</p>}
                    {detail?.items.map((item) => (
                      <div key={item.id} className="border-b border-zinc-100 px-4 py-3 last:border-b-0">
                        <div className="flex items-start justify-between gap-3">
                          <p className="font-semibold"><span className="mr-2 inline-grid h-6 min-w-6 place-items-center rounded bg-zinc-900 px-1 text-xs font-bold text-white">{item.quantity}x</span>{item.name}</p>
                          <strong className="shrink-0 [font-variant-numeric:tabular-nums]">{money(item.total)}</strong>
                        </div>
                        {item.lines.map((line) => <p key={line} className="ml-8 mt-0.5 text-sm text-zinc-600">• {line}</p>)}
                        {item.notes && <p className="ml-8 mt-1 rounded bg-amber-50 px-2 py-1 text-sm font-semibold text-amber-900">Obs.: {item.notes}</p>}
                      </div>
                    ))}
                    {detail && !detail.items.length && <p className="p-4 text-sm text-zinc-500">Pedido sem itens.</p>}
                  </section>

                  {detail?.notes && (
                    <section className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                      <h2 className="text-xs font-bold uppercase tracking-wide text-amber-800">Observações do pedido</h2>
                      <p className="mt-1 whitespace-pre-line font-semibold text-amber-950">{detail.notes}</p>
                    </section>
                  )}

                  {detail && (
                    <div className="grid gap-3 md:grid-cols-2">
                      <section className="rounded-xl border border-zinc-200 bg-white p-4">
                        <h2 className="text-xs font-bold uppercase tracking-wide text-zinc-500">Pagamento</h2>
                        <p className="mt-1.5 font-bold">{paymentLabel[detail.paymentMethod] ?? detail.paymentMethod}{detail.paymentStatus === "paid" && <span className="ml-2 rounded bg-emerald-100 px-1.5 py-0.5 text-xs text-emerald-700">Pago</span>}</p>
                        {detail.paymentNote && <p className="mt-1 text-sm font-semibold text-red-700">{detail.paymentNote}</p>}
                        {detail.changeFor != null && detail.changeFor > 0 && (
                          <p className="mt-1 text-sm text-zinc-700">Troco para {money(detail.changeFor)} · levar <strong>{money(Math.max(0, detail.changeFor - detail.total))}</strong></p>
                        )}
                      </section>
                      <section className="space-y-1 rounded-xl border border-zinc-200 bg-white p-4 text-sm [font-variant-numeric:tabular-nums]">
                        <p className="flex justify-between text-zinc-600"><span>Subtotal</span><span>{money(detail.subtotal)}</span></p>
                        <p className="flex justify-between text-zinc-600"><span>Taxa de entrega</span><span>{detail.deliveryFee > 0 ? money(detail.deliveryFee) : "Grátis"}</span></p>
                        {detail.discount > 0 && <p className="flex justify-between text-emerald-700"><span>Desconto</span><span>− {money(detail.discount)}</span></p>}
                        <p className="flex justify-between border-t border-zinc-100 pt-1.5 text-lg font-black text-zinc-900"><span>Total</span><span>{money(detail.total)}</span></p>
                      </section>
                    </div>
                  )}
                </div>
              </div>

              {/* Barra de ações */}
              <footer className="shrink-0 border-t border-zinc-200 bg-white px-6 py-3">
                <div className="mx-auto flex max-w-3xl flex-wrap items-center gap-2">
                  {!selectedClosed && (
                    <button type="button" onClick={() => setCancelTarget(selected)} disabled={busy[selected.id]} className="flex h-11 items-center gap-2 rounded-xl border border-red-200 px-4 text-sm font-bold text-red-600 hover:bg-red-50 disabled:opacity-50">
                      <XCircle className="h-4 w-4" /> {selected.status === "pending" ? "Recusar" : "Cancelar"}
                    </button>
                  )}
                  <button type="button" onClick={() => print(selected.id)} className="flex h-11 items-center gap-2 rounded-xl border border-zinc-200 px-4 text-sm font-bold text-zinc-700 hover:bg-zinc-50">
                    <Printer className="h-4 w-4" />
                    {printing[selected.id] === "fila" || printing[selected.id] === "imprimindo" ? "Imprimindo…" : printing[selected.id] === "falhou" ? "Tentar imprimir de novo" : "Imprimir"}
                  </button>
                  <a href={`/pedidos/${selected.id}`} target="_blank" className="flex h-11 items-center gap-2 rounded-xl border border-zinc-200 px-4 text-sm font-bold text-zinc-700 hover:bg-zinc-50">
                    <ExternalLink className="h-4 w-4" /> Mais opções
                  </a>
                  <div className="ml-auto">
                    {step && "status" in step ? (
                      <button
                        type="button"
                        disabled={busy[selected.id]}
                        onClick={() => void changeStatus(selected, step.status)}
                        className="flex h-11 min-w-[200px] items-center justify-center gap-2 rounded-xl bg-red-600 px-6 text-sm font-bold text-white shadow-sm hover:bg-red-700 disabled:opacity-60"
                      >
                        {selected.status === "pending" ? <CheckCircle2 className="h-5 w-5" /> : selected.status === "preparing" ? <ChefHat className="h-5 w-5" /> : selected.status === "ready" && selected.type === "delivery" ? <Bike className="h-5 w-5" /> : <Check className="h-5 w-5" />}
                        {busy[selected.id] ? "Enviando…" : step.label}
                      </button>
                    ) : step && "blocked" in step ? (
                      <span className="flex h-11 items-center gap-2 rounded-xl bg-zinc-100 px-4 text-sm font-semibold text-zinc-500"><AlertTriangle className="h-4 w-4" /> {step.blocked}</span>
                    ) : null}
                  </div>
                </div>
              </footer>
            </>
          )}
        </main>
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
                    <button type="button" onClick={() => { selectOrder(order.id); setTab("andamento"); setIncoming((current) => current.filter((id) => id !== order.id)); }} className="h-10 flex-1 rounded-xl border border-zinc-200 text-sm font-bold text-zinc-700 hover:bg-zinc-50">Ver detalhes</button>
                    <button type="button" disabled={busy[order.id]} onClick={() => { selectOrder(order.id); void changeStatus(order, "preparing"); }} className="h-10 flex-1 rounded-xl bg-red-600 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-60">{busy[order.id] ? "Enviando…" : "Aceitar"}</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Confirmação de cancelamento (sem window.confirm, que trava o app desktop) */}
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
            <p className="mt-auto text-xs text-zinc-400">{isDesktop ? "App desktop PeriniFood Gestor" : "Versão web"} · atualiza a cada {POLL_MS / 1000} s</p>
          </div>
        </div>
      )}

      {toast && (
        <div role="status" className={`fixed bottom-5 left-1/2 z-[60] -translate-x-1/2 rounded-xl px-4 py-3 text-sm font-semibold shadow-xl ${toast.kind === "ok" ? "bg-zinc-900 text-white" : "bg-red-600 text-white"}`}>
          {toast.text}
        </div>
      )}
    </div>
  );
}
