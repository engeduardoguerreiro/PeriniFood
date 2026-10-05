"use client";

import { useState } from "react";
import { money } from "@/lib/utils";

// Gráficos do dashboard em SVG puro (sem biblioteca): marcas finas, topo
// arredondado ancorado na base, grade discreta e tooltip ao passar o mouse/toque.
// Uma série = uma cor (laranja da marca); texto sempre nas cores de texto.

const BRAND = "#cf4a0a";
const BRAND_SOFT = "#f6b48a";
const GRID = "#ece8e1";

function niceMax(value: number) {
  if (value <= 0) return 1;
  const power = 10 ** Math.floor(Math.log10(value));
  const step = [1, 2, 2.5, 5, 10].find((s) => s * power >= value / 4) ?? 10;
  return Math.ceil(value / (step * power)) * step * power;
}

function compactMoney(value: number) {
  if (value >= 1000) return `R$ ${(value / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mil`;
  return `R$ ${Math.round(value)}`;
}

type Tip = { x: number; y: number; title: string; lines: string[] } | null;

function Tooltip({ tip }: { tip: Tip }) {
  if (!tip) return null;
  return (
    <div
      role="status"
      className="pointer-events-none absolute z-10 min-w-36 -translate-x-1/2 -translate-y-full rounded-xl border border-line bg-white/95 px-3 py-2 text-xs shadow-[0_12px_28px_-10px_rgba(27,26,23,0.35)] backdrop-blur"
      style={{ left: `${tip.x}%`, top: `${tip.y}%` }}
    >
      <p className="font-semibold text-ink">{tip.title}</p>
      {tip.lines.map((line) => <p key={line} className="text-ink-soft [font-variant-numeric:tabular-nums]">{line}</p>)}
    </div>
  );
}

export type DayPoint = { label: string; revenue: number; orders: number; today?: boolean };

export function RevenueColumns({ data }: { data: DayPoint[] }) {
  const [tip, setTip] = useState<Tip>(null);
  const W = 720, H = 240, left = 56, right = 8, top = 12, bottom = 28;
  const max = niceMax(Math.max(...data.map((d) => d.revenue)));
  const plotW = W - left - right, plotH = H - top - bottom;
  const slot = plotW / data.length;
  const barW = Math.min(30, slot * 0.62);
  const y = (v: number) => top + plotH - (v / max) * plotH;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => t * max);

  return (
    // No celular o gráfico mantém largura legível e rola na horizontal.
    <div className="-mx-1 overflow-x-auto px-1"><div className="relative min-w-[540px]" onMouseLeave={() => setTip(null)}>
      <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="img" aria-label="Faturamento por dia nos últimos 14 dias">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={left} x2={W - right} y1={y(t)} y2={y(t)} stroke={GRID} strokeWidth="1" />
            <text x={left - 8} y={y(t) + 4} textAnchor="end" className="fill-ink-faint text-[11px]">{compactMoney(t)}</text>
          </g>
        ))}
        {data.map((d, i) => {
          const cx = left + slot * i + slot / 2;
          const h = Math.max(d.revenue > 0 ? 3 : 0, (d.revenue / max) * plotH);
          const r = Math.min(4, barW / 2, h);
          const x0 = cx - barW / 2, y0 = top + plotH - h;
          // Topo arredondado, base reta apoiada no eixo.
          const path = h > 0 ? `M${x0} ${top + plotH} V${y0 + r} Q${x0} ${y0} ${x0 + r} ${y0} H${x0 + barW - r} Q${x0 + barW} ${y0} ${x0 + barW} ${y0 + r} V${top + plotH} Z` : "";
          return (
            <g key={d.label}>
              {path && <path d={path} fill={d.today ? BRAND : BRAND_SOFT} />}
              {(i % 2 === 0 || d.today) && (
                <text x={cx} y={H - 8} textAnchor="middle" className={d.today ? "fill-ink text-[11px] font-semibold" : "fill-ink-faint text-[11px]"}>{d.today ? "Hoje" : d.label}</text>
              )}
              {/* Área de toque maior que a barra. */}
              <rect
                x={left + slot * i} y={top} width={slot} height={plotH} fill="transparent"
                onMouseEnter={() => setTip({ x: (cx / W) * 100, y: (Math.min(y0, top + plotH - 4) / H) * 100, title: d.today ? `Hoje (${d.label})` : d.label, lines: [money(d.revenue), `${d.orders} ${d.orders === 1 ? "pedido" : "pedidos"}`] })}
                onTouchStart={() => setTip({ x: (cx / W) * 100, y: (Math.min(y0, top + plotH - 4) / H) * 100, title: d.label, lines: [money(d.revenue), `${d.orders} pedidos`] })}
              />
            </g>
          );
        })}
        <line x1={left} x2={W - right} y1={top + plotH} y2={top + plotH} stroke="#d6d0c5" strokeWidth="1" />
      </svg>
      <Tooltip tip={tip} />
      <table className="sr-only">
        <caption>Faturamento por dia</caption>
        <tbody>{data.map((d) => <tr key={d.label}><th scope="row">{d.label}</th><td>{money(d.revenue)}</td><td>{d.orders} pedidos</td></tr>)}</tbody>
      </table>
    </div></div>
  );
}

export type Slice = { label: string; value: number; revenue: number; color: string };

export function ChannelDonut({ data, total }: { data: Slice[]; total: number }) {
  const [active, setActive] = useState<number | null>(null);
  const R = 70, stroke = 22, C = 2 * Math.PI * R;
  const gap = data.length > 1 ? 2 : 0;
  // Início de cada fatia ao longo do círculo (soma das anteriores).
  const offsets = data.map((_, i) => data.slice(0, i).reduce((acc, s) => acc + (s.value / (total || 1)) * C, 0));
  const shown = active === null ? null : data[active];

  if (!total) return <p className="rounded-xl bg-[#faf9f6] p-4 text-center text-sm text-ink-faint">Sem pedidos no período.</p>;

  return (
    <div className="grid items-center gap-5">
      <div className="relative mx-auto h-[180px] w-[180px]">
        <svg viewBox="0 0 180 180" className="h-full w-full -rotate-90" role="img" aria-label="Pedidos por canal">
          <circle cx="90" cy="90" r={R} fill="none" stroke="#f1eee8" strokeWidth={stroke} />
          {data.map((slice, i) => {
            const length = (slice.value / total) * C;
            const dash = Math.max(0, length - gap);
            return (
              <circle
                key={slice.label} cx="90" cy="90" r={R} fill="none" stroke={slice.color} strokeWidth={active === i ? stroke + 4 : stroke}
                strokeDasharray={`${dash} ${C - dash}`} strokeDashoffset={-offsets[i]}
                className="cursor-pointer transition-[stroke-width]"
                onMouseEnter={() => setActive(i)} onMouseLeave={() => setActive(null)}
              />
            );
          })}
        </svg>
        <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
          <div>
            <p className="text-2xl font-semibold text-ink [font-variant-numeric:tabular-nums]">{shown ? shown.value : total}</p>
            <p className="max-w-24 truncate text-xs text-ink-faint">{shown ? shown.label : "pedidos"}</p>
          </div>
        </div>
      </div>
      <ul className="space-y-2">
        {data.map((slice, i) => (
          <li key={slice.label} onMouseEnter={() => setActive(i)} onMouseLeave={() => setActive(null)} className={`flex items-center gap-3 rounded-lg px-2 py-1.5 text-sm transition ${active === i ? "bg-[#faf7f2]" : ""}`}>
            <span className="h-3 w-3 shrink-0 rounded-sm" style={{ background: slice.color }} />
            <span className="min-w-0 flex-1 truncate font-medium text-ink">{slice.label}</span>
            <span className="shrink-0 text-ink-soft [font-variant-numeric:tabular-nums]">{slice.value} · {Math.round((slice.value / total) * 100)}%</span>
            <span className="hidden w-24 shrink-0 text-right font-medium text-ink [font-variant-numeric:tabular-nums] sm:block">{money(slice.revenue)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function HourColumns({ data }: { data: number[] }) {
  const [tip, setTip] = useState<Tip>(null);
  const W = 720, H = 230, left = 8, right = 8, top = 10, bottom = 24;
  const max = Math.max(1, ...data);
  const plotW = W - left - right, plotH = H - top - bottom;
  const slot = plotW / 24;
  const barW = slot * 0.6;
  const peak = data.indexOf(Math.max(...data));

  return (
    // No celular o gráfico mantém largura legível e rola na horizontal.
    <div className="-mx-1 overflow-x-auto px-1"><div className="relative min-w-[540px]" onMouseLeave={() => setTip(null)}>
      <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="img" aria-label="Pedidos por hora do dia">
        {data.map((count, hour) => {
          const cx = left + slot * hour + slot / 2;
          const h = count ? Math.max(3, (count / max) * plotH) : 0;
          const r = Math.min(3, h);
          const x0 = cx - barW / 2, y0 = top + plotH - h;
          const path = h ? `M${x0} ${top + plotH} V${y0 + r} Q${x0} ${y0} ${x0 + r} ${y0} H${x0 + barW - r} Q${x0 + barW} ${y0} ${x0 + barW} ${y0 + r} V${top + plotH} Z` : "";
          return (
            <g key={hour}>
              {path && <path d={path} fill={hour === peak && count ? BRAND : BRAND_SOFT} />}
              {hour % 3 === 0 && <text x={cx} y={H - 6} textAnchor="middle" className="fill-ink-faint text-[11px]">{hour}h</text>}
              <rect x={left + slot * hour} y={top} width={slot} height={plotH} fill="transparent"
                onMouseEnter={() => setTip({ x: (cx / W) * 100, y: (Math.min(y0, top + plotH - 4) / H) * 100, title: `${hour}h às ${hour + 1}h`, lines: [`${count} ${count === 1 ? "pedido" : "pedidos"}`] })} />
            </g>
          );
        })}
        <line x1={left} x2={W - right} y1={top + plotH} y2={top + plotH} stroke="#d6d0c5" strokeWidth="1" />
      </svg>
      <Tooltip tip={tip} />
    </div></div>
  );
}
