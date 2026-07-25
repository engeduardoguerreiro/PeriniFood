"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  CheckCircle2,
  ClipboardList,
  CreditCard,
  MessageCircle,
  Pizza,
  QrCode,
  ShieldCheck,
  Smartphone,
  Store,
  Truck,
  type LucideIcon,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const benefits: Array<[string, string, LucideIcon]> = [
  ["Canal próprio", "Cardápio online com checkout, endereço, taxa automática e acompanhamento do pedido.", Smartphone],
  ["Operação clara", "Pedidos do site e do balcão em uma fila visual para atendimento e cozinha.", ClipboardList],
  ["Cliente da casa", "Base de clientes, histórico, WhatsApp e fidelidade ficam com o restaurante.", ShieldCheck],
];

const features: Array<[string, string, LucideIcon]> = [
  ["Cardápio digital", "Produtos, fotos, tamanhos, massas, bordas e adicionais por item.", QrCode],
  ["Pedido manual", "Balcão, retirada e delivery com cálculo automático do total.", CreditCard],
  ["Painel operacional", "Status, impressão, WhatsApp e reimpressão em poucos cliques.", ClipboardList],
  ["Clientes", "Cadastro automático, edição, endereço, histórico e fidelidade.", Store],
  ["Delivery por raio", "Frete por distância calculado a partir do endereço do cliente.", Truck],
  ["Relatórios", "Pedidos, faturamento, ticket médio e produtos mais vendidos.", BarChart3],
];

const liveOrders = [
  { code: "#PF1029", client: "Mesa 04", item: "Pizza Grande", value: "R$ 72,00", status: "Novo" },
  { code: "#PF1030", client: "Eduardo", item: "Combo família", value: "R$ 96,90", status: "Em preparo" },
  { code: "#PF1031", client: "Retirada", item: "2 esfihas + bebida", value: "R$ 28,00", status: "Pronto" },
  { code: "#PF1032", client: "Delivery", item: "Pizza 2 sabores", value: "R$ 85,00", status: "Saiu para entrega" },
];

const metrics = [
  { label: "Pedidos hoje", values: [18, 19, 21, 24] },
  { label: "Faturamento", values: [1240, 1368, 1512, 1689], prefix: "R$ " },
  { label: "Ticket médio", values: [58, 61, 64, 67], prefix: "R$ " },
];

function Brand() {
  return (
    <span className="flex items-center gap-3">
      <Image src="/brand/perinifood-logo.png" alt="" width={72} height={72} priority className="h-11 w-11 rounded-xl bg-white object-contain shadow-sm" />
      <span className="leading-tight">
        <span className="block text-xl font-black tracking-tight text-[#232A31]">
          Perini<span className="text-[#E50914]">Food</span>
        </span>
        <span className="hidden text-[0.62rem] font-black uppercase tracking-[0.22em] text-slate-500 sm:block">Gestão para restaurantes</span>
      </span>
    </span>
  );
}

function formatMetric(value: number, prefix = "") {
  if (prefix) return `${prefix}${value.toLocaleString("pt-BR")}`;
  return value.toLocaleString("pt-BR");
}

function heroGradient(x: number, y: number) {
  return `radial-gradient(circle at ${x}% ${y}%, rgba(229,9,20,0.24), transparent 24rem), linear-gradient(120deg, #242B33, #10141A 58%, #05070A)`;
}

function LiveHeroPanel({ active }: { active: number }) {
  const order = liveOrders[active % liveOrders.length];

  return (
    <div className="relative rounded-[1.35rem] border border-white/12 bg-white p-3 text-[#10202b] shadow-2xl shadow-slate-950/25">
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-[#f4f7fb]">
        <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
          <div className="flex items-center gap-2">
            <Image src="/brand/perinifood-logo.png" alt="" width={36} height={36} className="h-9 w-9 rounded-lg bg-white object-contain" />
            <strong>Farol da operação</strong>
          </div>
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">Ao vivo</span>
        </div>

        <div className="grid gap-4 p-4 lg:grid-cols-[1fr_245px]">
          <div>
            <div className="grid gap-3 sm:grid-cols-3">
              {metrics.map((metric, index) => (
                <div key={metric.label} className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
                  <span className="text-[0.68rem] font-black uppercase text-slate-400">{metric.label}</span>
                  <strong className="mt-2 block text-2xl text-[#232A31]">
                    {formatMetric(metric.values[(active + index) % metric.values.length], metric.prefix)}
                  </strong>
                </div>
              ))}
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-4">
              {["Novo", "Em preparo", "Pronto", "Entrega"].map((status, index) => (
                <div
                  key={status}
                  className={`rounded-xl border p-4 transition duration-500 ${index === active % 4 ? "border-[#E50914]/30 bg-red-50 shadow-lg shadow-red-950/5" : "border-slate-100 bg-white"}`}
                >
                  <span className="text-xs font-black uppercase text-slate-500">{status}</span>
                  <div className="mt-6 h-16 rounded-lg border border-dashed border-slate-200 bg-slate-50" />
                </div>
              ))}
            </div>

            <div className="mt-4 rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <strong className="block text-lg">{order.code}</strong>
                  <span className="text-sm text-slate-500">{order.client} - {order.item}</span>
                </div>
                <div className="text-right">
                  <strong className="block text-lg">{order.value}</strong>
                  <span className="text-xs font-black uppercase text-[#E50914]">{order.status}</span>
                </div>
              </div>
            </div>
          </div>

          <aside className="rounded-xl bg-[#232A31] p-4 text-white shadow-sm">
            <div className="flex items-center justify-between">
              <strong>Cardápio ativo</strong>
              <span className="rounded-full bg-white/10 px-2 py-1 text-xs font-black">Site</span>
            </div>
            <div className="mt-4 space-y-3 text-sm">
              {["Pizza Calabresa", "Pizza Mussarela", "Refrigerante 2L"].map((item, index) => (
                <div key={item} className="rounded-lg border border-white/10 bg-white/8 p-3">
                  <strong>{item}</strong>
                  <p className="text-xs text-white/60">{index === 2 ? "Bebida" : "Tamanhos e adicionais configurados"}</p>
                </div>
              ))}
            </div>
            <div className="mt-5 rounded-lg bg-white p-3 text-[#232A31]">
              <div className="flex justify-between text-sm"><span>Conversão</span><strong>+23%</strong></div>
              <div className="mt-3 h-2 rounded-full bg-slate-100"><div className="h-2 w-3/4 rounded-full bg-[#E50914]" /></div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

export function LandingExperience() {
  const [active, setActive] = useState(0);
  const glowRef = useRef<HTMLDivElement>(null);
  const coords = useRef({ x: 50, y: 50 });
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const timer = window.setInterval(() => setActive((current) => current + 1), 2200);
    return () => window.clearInterval(timer);
  }, []);

  // Atualiza o brilho que segue o mouse escrevendo direto no DOM (via ref + rAF),
  // sem disparar re-render do React a cada movimento — evita travamentos.
  const handlePointerMove = useCallback((event: React.MouseEvent<HTMLElement>) => {
    coords.current = {
      x: Math.round((event.clientX / window.innerWidth) * 100),
      y: Math.round((event.clientY / window.innerHeight) * 100),
    };
    if (rafRef.current !== null) return;
    rafRef.current = window.requestAnimationFrame(() => {
      rafRef.current = null;
      const el = glowRef.current;
      if (el) el.style.background = heroGradient(coords.current.x, coords.current.y);
    });
  }, []);

  useEffect(
    () => () => {
      if (rafRef.current !== null) window.cancelAnimationFrame(rafRef.current);
    },
    [],
  );

  const statusText = useMemo(() => liveOrders[active % liveOrders.length].status, [active]);

  return (
    <main
      className="min-h-screen bg-[#f5f7fb] text-[#182b3a]"
      onMouseMove={handlePointerMove}
    >
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/92 backdrop-blur-xl">
        <nav className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-3">
          <Link href="/" aria-label="PeriniFood"><Brand /></Link>
          <div className="hidden items-center gap-8 text-sm font-black uppercase tracking-wide text-slate-600 lg:flex">
            <a href="#beneficios" className="transition hover:text-[#E50914]">Benefícios</a>
            <a href="#funcionalidades" className="transition hover:text-[#E50914]">Funcionalidades</a>
            <a href="#operacao" className="transition hover:text-[#E50914]">Operação</a>
            <Link href="/planos" className="transition hover:text-[#E50914]">Planos</Link>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/login" className="hidden rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700 transition hover:border-[#E50914] hover:text-[#E50914] sm:inline-flex">Login</Link>
            <Link href="/register" className="rounded-xl bg-[#232A31] px-4 py-2 text-sm font-black text-white shadow-lg shadow-red-950/20 transition hover:bg-[#E50914]">Saiba mais</Link>
          </div>
        </nav>
      </header>

      <section className="relative overflow-hidden bg-[#11161C] text-white">
        <div
          ref={glowRef}
          className="absolute inset-0 opacity-80"
          style={{ background: heroGradient(50, 50) }}
        />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:44px_44px]" />

        <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-5 py-16 md:py-20 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <p className="inline-flex rounded-full border border-white/18 bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-[0.22em] text-red-100">
              Plataforma própria de delivery
            </p>
            <h1 className="mt-6 max-w-4xl text-4xl font-black leading-[1.02] tracking-tight md:text-6xl">
              Venda online com a operação acontecendo na sua frente.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-white/82">
              O PeriniFood conecta cardápio digital, pedido manual, impressão local, clientes, WhatsApp e painel operacional em uma experiência própria para restaurantes e pizzarias.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/register" className="inline-flex h-12 items-center gap-2 rounded-xl bg-[#E50914] px-5 text-sm font-black text-white shadow-xl shadow-red-950/30 transition hover:-translate-y-0.5 hover:bg-[#B90710]">
                Começar agora <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/cardapio/forno-nordestino" className="inline-flex h-12 items-center gap-2 rounded-xl bg-white px-5 text-sm font-black text-[#232A31] transition hover:-translate-y-0.5 hover:bg-slate-100">Ver cardápio online</Link>
            </div>
            <div className="mt-8 grid max-w-xl gap-3 text-sm font-bold text-white/88 sm:grid-cols-3">
              {["Sem comissão por venda", "Pedidos em tempo real", "Status atual: " + statusText].map((item) => (
                <span key={item} className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-400" /> {item}</span>
              ))}
            </div>
          </div>

          <LiveHeroPanel active={active} />
        </div>
      </section>

      <section id="beneficios" className="bg-white py-16">
        <div className="mx-auto max-w-7xl px-5">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-[#E50914]">Canal próprio</p>
          <h2 className="mt-3 max-w-3xl text-3xl font-black tracking-tight md:text-5xl">Menos improviso. Mais margem, dados e recorrência.</h2>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {benefits.map(([title, description, Icon], index) => (
              <article key={title} className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition duration-300 hover:-translate-y-1 hover:border-red-200 hover:shadow-xl">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-50 text-[#E50914] transition group-hover:bg-red-50">
                  <Icon className="h-6 w-6" />
                </div>
                <span className="mt-5 inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-[0.68rem] font-black uppercase text-slate-500">0{index + 1}</span>
                <h3 className="mt-4 text-xl font-black">{title}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">{description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="funcionalidades" className="bg-[#f5f7fb] py-16">
        <div className="mx-auto max-w-7xl px-5">
          <div className="grid gap-8 lg:grid-cols-[0.72fr_1.28fr]">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-[#E50914]">Funcionalidades</p>
              <h2 className="mt-3 text-3xl font-black tracking-tight md:text-5xl">Um sistema enxuto, mas com estrutura de SaaS.</h2>
              <p className="mt-5 text-slate-600">A interface foi pensada para atendimento real: pouco atrito, decisões rápidas e ferramentas que aparecem no momento certo.</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {features.map(([title, description, Icon]) => (
                <article key={title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-red-200">
                  <div className="flex items-start gap-4">
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-red-50 text-[#E50914]"><Icon className="h-5 w-5" /></span>
                    <div><h3 className="font-black">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{description}</p></div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="operacao" className="bg-white py-16">
        <div className="mx-auto max-w-7xl px-5">
          <div className="overflow-hidden rounded-[1.5rem] bg-[#232A31] text-white shadow-2xl shadow-slate-950/20">
            <div className="grid gap-0 lg:grid-cols-[0.85fr_1.15fr]">
              <div className="p-6 md:p-8">
                <p className="text-xs font-black uppercase tracking-[0.24em] text-red-100">Fluxo inteligente</p>
                <h2 className="mt-3 text-3xl font-black md:text-5xl">Do pedido ao histórico, tudo no mesmo ritmo.</h2>
                <p className="mt-5 text-white/72">O painel destaca o que precisa de ação agora. Entregues saem da esteira e ficam no histórico do dia.</p>
                <div className="mt-8 flex flex-wrap gap-3">
                  <Link href="/login" className="rounded-xl bg-white px-5 py-3 text-sm font-black text-[#232A31]">Acessar sistema</Link>
                  <Link href="/planos" className="rounded-xl border border-white/18 px-5 py-3 text-sm font-black text-white">Ver planos</Link>
                </div>
              </div>
              <div className="border-t border-white/10 bg-white/5 p-5 lg:border-l lg:border-t-0">
                <div className="grid gap-3 sm:grid-cols-2">
                  {["Pendentes", "Em produção", "Pronto", "Saiu para entrega"].map((column, index) => (
                    <div key={column} className="min-h-36 rounded-2xl border border-white/10 bg-white/8 p-4">
                      <div className={`rounded-xl px-3 py-2 text-sm font-black ${index === active % 4 ? "bg-[#E50914] text-white" : "bg-white/10 text-white/80"}`}>
                        {column}
                      </div>
                      <div className="mt-5 rounded-xl bg-white p-3 text-[#232A31]">
                        <strong>{liveOrders[(active + index) % liveOrders.length].code}</strong>
                        <p className="text-xs text-slate-500">{liveOrders[(active + index) % liveOrders.length].item}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-5 px-5 py-7 text-sm text-slate-500">
          <Brand />
          <div className="flex flex-wrap gap-5 font-bold">
            <span className="flex items-center gap-1"><Pizza className="h-4 w-4 text-[#E50914]" /> Pizzarias</span>
            <span className="flex items-center gap-1"><Store className="h-4 w-4 text-[#E50914]" /> Restaurantes</span>
            <span className="flex items-center gap-1"><Truck className="h-4 w-4 text-[#E50914]" /> Deliveries</span>
            <span className="flex items-center gap-1"><MessageCircle className="h-4 w-4 text-[#E50914]" /> WhatsApp</span>
            <span className="flex items-center gap-1"><BadgeCheck className="h-4 w-4 text-[#E50914]" /> SaaS próprio</span>
          </div>
        </div>
      </footer>
    </main>
  );
}
