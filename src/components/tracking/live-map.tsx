"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useRef, useState } from "react";
import type { Map as LeafletMap, Marker, Polyline } from "leaflet";

// Mapa ao vivo do motoboy (Leaflet + OpenStreetMap, sem chave). Busca a posição
// periodicamente em `endpoint` e mostra motoboy, destino e trajeto percorrido.

export type LiveTracking = {
  state: "waiting" | "on_route" | "delivered" | "expired";
  courierName: string | null;
  deliveryCode?: string | null;
  last: { lat: number; lng: number; accuracy: number | null; heading: number | null; at: string } | null;
  dest: { lat: number; lng: number } | null;
  trail: Array<[number, number]>;
};

const courierHtml = `<div style="width:40px;height:40px;border-radius:9999px;background:linear-gradient(180deg,#f26419,#cf4a0a);border:3px solid #fff;box-shadow:0 6px 16px -4px rgba(207,74,10,.8);display:grid;place-items:center;color:#fff"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18.5" cy="17.5" r="3.5"/><circle cx="5.5" cy="17.5" r="3.5"/><circle cx="15" cy="5" r="1"/><path d="M12 17.5V14l-3-3 4-3 2 3h2"/></svg></div>`;
const destHtml = `<div style="width:34px;height:34px;border-radius:9999px 9999px 9999px 0;transform:rotate(-45deg);background:#1b1a17;border:3px solid #fff;box-shadow:0 6px 14px -4px rgba(0,0,0,.6);display:grid;place-items:center"><div style="transform:rotate(45deg);color:#fff;font:700 14px system-ui">⌂</div></div>`;

function minutesAgo(iso: string, now: number) {
  const seconds = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  if (seconds < 60) return `há ${seconds}s`;
  return `há ${Math.round(seconds / 60)} min`;
}

export function LiveMap({ endpoint, intervalMs = 10000, className = "h-72", onData }: { endpoint: string; intervalMs?: number; className?: string; onData?: (data: LiveTracking | null) => void }) {
  const holder = useRef<HTMLDivElement>(null);
  const map = useRef<LeafletMap | null>(null);
  const layers = useRef<{ courier?: Marker; dest?: Marker; trail?: Polyline }>({});
  const fitted = useRef(false);
  const [tracking, setTracking] = useState<LiveTracking | null>(null);
  const [now, setNow] = useState(0);
  const onDataRef = useRef(onData);
  useEffect(() => { onDataRef.current = onData; }, [onData]);

  // Cria o mapa uma vez.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !holder.current || map.current) return;
      map.current = L.map(holder.current, { zoomControl: true, attributionControl: true }).setView([-23.55, -46.63], 12);
      // O site usa Referrer-Policy: no-referrer, e o OpenStreetMap bloqueia (403)
      // imagens sem Referer. Só os tiles enviam a ORIGEM (sem caminho, então o
      // código do pedido/token do link não vaza).
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "© OpenStreetMap",
        referrerPolicy: "strict-origin-when-cross-origin",
      }).addTo(map.current);
    })();
    return () => { cancelled = true; map.current?.remove(); map.current = null; layers.current = {}; fitted.current = false; };
  }, []);

  // Busca a posição periodicamente (só com a aba visível).
  useEffect(() => {
    let stop = false;
    const load = async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const response = await fetch(endpoint, { cache: "no-store" });
        const json = await response.json();
        if (!stop) { setNow(Date.now()); setTracking(json.tracking ?? null); onDataRef.current?.(json.tracking ?? null); }
      } catch { /* mantém o último estado */ }
    };
    load();
    const timer = window.setInterval(load, intervalMs);
    const clock = window.setInterval(() => setNow(Date.now()), 5000);
    document.addEventListener("visibilitychange", load);
    return () => { stop = true; window.clearInterval(timer); window.clearInterval(clock); document.removeEventListener("visibilitychange", load); };
  }, [endpoint, intervalMs]);

  // Atualiza marcadores e trajeto.
  useEffect(() => {
    (async () => {
      const L = (await import("leaflet")).default;
      const m = map.current;
      if (!m || !tracking) return;
      const icon = (html: string, size: number) => L.divIcon({ html, className: "", iconSize: [size, size], iconAnchor: [size / 2, size / 2] });
      if (tracking.dest) {
        const pos: [number, number] = [tracking.dest.lat, tracking.dest.lng];
        if (!layers.current.dest) layers.current.dest = L.marker(pos, { icon: icon(destHtml, 34), title: "Destino" }).addTo(m);
        else layers.current.dest.setLatLng(pos);
      }
      if (tracking.trail.length > 1) {
        if (!layers.current.trail) layers.current.trail = L.polyline(tracking.trail, { color: "#f26419", weight: 4, opacity: 0.8 }).addTo(m);
        else layers.current.trail.setLatLngs(tracking.trail);
      }
      if (tracking.last) {
        const pos: [number, number] = [tracking.last.lat, tracking.last.lng];
        if (!layers.current.courier) layers.current.courier = L.marker(pos, { icon: icon(courierHtml, 40), title: "Motoboy", zIndexOffset: 1000 }).addTo(m);
        else layers.current.courier.setLatLng(pos);
      }
      const points = [tracking.last && [tracking.last.lat, tracking.last.lng], tracking.dest && [tracking.dest.lat, tracking.dest.lng]].filter(Boolean) as [number, number][];
      if (points.length && !fitted.current) {
        if (points.length > 1) m.fitBounds(L.latLngBounds(points), { padding: [40, 40], maxZoom: 16 });
        else m.setView(points[0], 15);
        fitted.current = true;
      } else if (tracking.last && tracking.state === "on_route") {
        m.panTo([tracking.last.lat, tracking.last.lng], { animate: true });
      }
    })();
  }, [tracking]);

  const stale = Boolean(tracking?.last && now && now - new Date(tracking.last.at).getTime() > 90_000);
  return (
    <div className={`relative isolate overflow-hidden rounded-2xl border border-line bg-[#e9e6df] ${className}`}>
      <div ref={holder} className="h-full w-full" aria-label="Mapa da entrega" role="img" />
      {tracking?.last && (
        <p className={`absolute bottom-2 left-2 z-[500] rounded-full px-3 py-1 text-xs font-semibold shadow ${stale ? "bg-amber-100 text-amber-900" : "bg-white/95 text-ink"}`}>
          {stale ? "Sem sinal do motoboy " : "Atualizado "}{minutesAgo(tracking.last.at, now || new Date(tracking.last.at).getTime())}
        </p>
      )}
      {tracking && !tracking.last && tracking.state !== "delivered" && (
        <p className="absolute inset-x-3 top-3 z-[500] rounded-xl bg-white/95 px-3 py-2 text-center text-xs font-semibold text-ink shadow">Aguardando o motoboy iniciar a entrega…</p>
      )}
    </div>
  );
}
