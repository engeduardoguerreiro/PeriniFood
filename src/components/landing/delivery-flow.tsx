"use client";

import { Bike, CheckCircle2, ChefHat, ClipboardList, MapPin } from "lucide-react";
import { useEffect, useState } from "react";

// Única parte interativa da landing: o status do pedido avança sozinho para
// mostrar o fluxo. Quem prefere menos movimento vê a etapa "Saiu para entrega" fixa.
const steps = [
  { label: "Pedido recebido", Icon: ClipboardList },
  { label: "Em preparo", Icon: ChefHat },
  { label: "Saiu para entrega", Icon: Bike },
  { label: "Entregue", Icon: CheckCircle2 },
];

export function DeliveryFlow() {
  const [active, setActive] = useState(2);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => setActive((current) => (current + 1) % steps.length), 2200);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="relative mx-auto aspect-[5/4] w-full max-w-[520px] [perspective:1400px]">
      {/* Mapa em perspectiva: ruas em SVG com a rota da entrega em laranja. */}
      <div className="absolute inset-[6%_0_0_8%] overflow-hidden rounded-[1.6rem] border border-white/10 bg-[#1b1714] shadow-[0_40px_80px_-20px_rgba(0,0,0,0.9)] [transform:rotateX(38deg)_rotateZ(-14deg)]">
        <svg viewBox="0 0 400 320" className="h-full w-full" aria-hidden="true">
          <defs>
            <linearGradient id="rota" x1="0" x2="1">
              <stop offset="0" stopColor="#f26419" />
              <stop offset="1" stopColor="#ffb27a" />
            </linearGradient>
          </defs>
          <rect width="400" height="320" fill="#1b1714" />
          {[40, 95, 150, 205, 260].map((y) => <path key={y} d={`M0 ${y} L400 ${y + 18}`} stroke="#3a332d" strokeWidth="7" />)}
          {[60, 140, 230, 320].map((x) => <path key={x} d={`M${x} 0 L${x - 30} 320`} stroke="#3a332d" strokeWidth="7" />)}
          <path d="M70 250 L120 215 L200 230 L230 160 L300 120 L335 70" fill="none" stroke="url(#rota)" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" className="drop-shadow-[0_0_6px_rgba(242,100,25,0.9)]" />
          <circle cx="70" cy="250" r="9" fill="#f26419" />
          <circle cx="335" cy="70" r="9" fill="#ffb27a" />
        </svg>
      </div>

      <span className="absolute left-[14%] top-[62%] grid h-10 w-10 place-items-center rounded-full bg-brand text-white shadow-[0_0_24px_rgba(242,100,25,0.8)]"><MapPin className="h-5 w-5" /></span>
      <span className="absolute right-[10%] top-[18%] grid h-10 w-10 place-items-center rounded-full bg-brand-bright text-white shadow-[0_0_24px_rgba(242,100,25,0.8)]"><MapPin className="h-5 w-5" /></span>
      <span className="absolute left-[34%] top-[54%] grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-brand-bright to-brand text-white shadow-[0_16px_30px_-6px_rgba(242,100,25,0.7)] motion-safe:animate-[float_4s_ease-in-out_infinite]">
        <Bike className="h-7 w-7" />
      </span>

      <ol className="absolute right-0 top-0 w-[56%] max-w-[230px] space-y-1 rounded-2xl border border-white/10 bg-[#14100d]/90 p-3 text-sm shadow-2xl backdrop-blur" aria-label="Status do pedido">
        {steps.map(({ label, Icon }, index) => {
          const current = index === active;
          const done = index < active;
          return (
            <li key={label} aria-current={current ? "step" : undefined} className={`flex items-center gap-2.5 rounded-lg px-2 py-1.5 transition ${current ? "bg-brand/15 text-brand-bright" : done ? "text-white/80" : "text-white/45"}`}>
              <Icon className="h-4 w-4 shrink-0" />
              <span className={current ? "font-semibold" : ""}>{label}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
