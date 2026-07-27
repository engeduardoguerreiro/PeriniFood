"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Bell,
  CheckCircle2,
  ClipboardList,
  CreditCard,
  CupSoda,
  Globe,
  MessageCircle,
  Pizza,
  Plus,
  QrCode,
  ShieldCheck,
  ShoppingBag,
  Smartphone,
  Store,
  Truck,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { WhatsAppFloat } from "@/components/whatsapp-float";

const benefits: Array<[string, string, LucideIcon]> = [
  ["Canal próprio, sem comissão", "Venda pelo seu cardápio online e fique com 100% de cada pedido — nada de repasse de marketplace.", Smartphone],
  ["Operação numa tela só", "Pedidos do site e do balcão numa fila visual para o atendimento e a cozinha acompanharem juntos.", ClipboardList],
  ["O cliente é seu", "Base de clientes, histórico, WhatsApp e fidelidade ficam com o restaurante — não com o app.", ShieldCheck],
];

const features: Array<[string, string, LucideIcon]> = [
  ["Cardápio digital", "Produtos com foto, tamanhos, massas, bordas e adicionais por item.", QrCode],
  ["Pedido no balcão", "PDV para retirada e delivery manual com total calculado na hora.", CreditCard],
  ["Painel operacional", "Status por etapa, impressão da comanda e WhatsApp em poucos cliques.", ClipboardList],
  ["Clientes e fidelidade", "Cadastro automático, endereço, histórico e pontos por pedido.", Store],
  ["Entrega por raio", "Frete por distância, calculado a partir do endereço do cliente.", Truck],
  ["Relatórios de verdade", "Faturamento, ticket médio, canais e produtos mais vendidos.", BarChart3],
];

const steps: Array<[string, string]> = [
  ["Monte seu cardápio", "Cadastre produtos, fotos, tamanhos e adicionais. Seu site fica no ar com endereço próprio."],
  ["Receba pedidos", "Site, balcão e delivery caem numa fila única, em tempo real, com impressão da comanda."],
  ["Gerencie e cresça", "Acompanhe faturamento, clientes e fidelidade — e decida com dados, não no chute."],
];

const plansTeaser = [
  { name: "Básico", price: "R$ 49,90", note: "Cardápio próprio + operação manual" },
  { name: "Completa", price: "R$ 89,90", note: "Marketplaces e automações", highlight: true },
];

const liveOrders = [
  { code: "#PF1029", client: "Mesa 04", item: "Pizza Grande", value: "R$ 72,00", status: "Novo" },
  { code: "#PF1030", client: "Eduardo", item: "Combo família", value: "R$ 96,90", status: "Em preparo" },
  { code: "#PF1031", client: "Retirada", item: "2 esfihas + bebida", value: "R$ 28,00", status: "Pronto" },
  { code: "#PF1032", client: "Delivery", item: "Pizza 2 sabores", value: "R$ 85,00", status: "Saiu p/ entrega" },
];

const menuItems: Array<{ name: string; note: string; price: string; icon: LucideIcon }> = [
  { name: "Pizza Calabresa", note: "Mussarela, calabresa e cebola", price: "R$ 45,00", icon: Pizza },
  { name: "Pizza Portuguesa", note: "Presunto, ovo, cebola e ervilha", price: "R$ 49,00", icon: Pizza },
  { name: "Refrigerante 2L", note: "Coca, Guaraná ou Fanta", price: "R$ 15,00", icon: CupSoda },
];

function Brand({ subtitle = "Gestão para restaurantes" }: { subtitle?: string }) {
  return (
    <span className="flex items-center gap-2.5">
      <Image src="/brand/perinifood-logo.png" alt="" width={72} height={72} priority className="h-10 w-10 rounded-xl object-contain" />
      <span className="leading-tight">
        <span className="block text-lg font-semibold tracking-tight text-[#211d19]">
          Perini<span className="text-[#c5362e]">Food</span>
        </span>
        <span className="hidden text-[0.6rem] font-medium uppercase tracking-[0.16em] text-[#9c988f] sm:block">{subtitle}</span>
      </span>
    </span>
  );
}

function heroGradient(x: number, y: number) {
  return `radial-gradient(circle at ${x}% ${y}%, rgba(197,54,46,0.22), transparent 22rem), linear-gradient(135deg, #2a231d, #1c1712 58%, #14100c)`;
}

function LiveHeroPanel({ active }: { active: number }) {
  const order = liveOrders[active % liveOrders.length];
  return (
    <div className="relative mx-auto w-full max-w-[330px]">
      <div className="absolute -top-4 right-1 z-10 w-56 rounded-2xl border border-[#efece6] bg-white p-3 shadow-2xl shadow-black/25">
        <div className="flex items-center gap-2.5">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-emerald-50 text-emerald-600"><Bell className="h-4 w-4" /></span>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-[#211d19]">Novo pedido recebido</p>
            <p className="truncate text-[0.66rem] text-[#9c988f]">{order.code} · {order.status} · {order.value}</p>
          </div>
        </div>
      </div>

      <div className="rounded-[2.2rem] border-[6px] border-[#211d19] bg-[#211d19] shadow-2xl shadow-black/40">
        <div className="overflow-hidden rounded-[1.7rem] bg-white">
          <div className="flex items-center justify-between px-4 pb-3 pt-4">
            <div className="flex items-center gap-2">
              <Image src="/brand/perinifood-logo.png" alt="" width={28} height={28} className="h-7 w-7 rounded-lg object-contain" />
              <div className="leading-tight">
                <p className="text-xs font-semibold text-[#211d19]">Sua Pizzaria</p>
                <p className="text-[0.6rem] text-[#9c988f]">Pizzaria · Delivery</p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[0.6rem] font-semibold text-emerald-700"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Aberto</span>
          </div>

          <div className="mx-4 flex h-16 items-end justify-between rounded-xl bg-[#211d19] p-3">
            <div>
              <p className="text-[0.58rem] font-medium uppercase tracking-wide text-white/50">Cardápio online</p>
              <p className="text-sm font-semibold text-white">Peça em poucos toques</p>
            </div>
            <Pizza className="h-6 w-6 text-[#e2705f]" />
          </div>

          <div className="flex gap-2 px-4 pt-3">
            <span className="rounded-full bg-[#211d19] px-3 py-1 text-[0.6rem] font-medium text-white">Pizzas</span>
            <span className="rounded-full bg-[#f1efea] px-3 py-1 text-[0.6rem] font-medium text-[#6d6a63]">Bebidas</span>
            <span className="rounded-full bg-[#f1efea] px-3 py-1 text-[0.6rem] font-medium text-[#6d6a63]">Doces</span>
          </div>

          <div className="mt-3 space-y-2 px-4">
            {menuItems.map((item, index) => {
              const Icon = item.icon;
              return (
                <div key={item.name} className={`flex items-center gap-3 rounded-xl border p-2.5 transition duration-500 ${index === active % menuItems.length ? "border-[#e7c3bf] bg-[#f6ece9]" : "border-[#efece6] bg-white"}`}>
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-[#f6ece9] text-[#c5362e]"><Icon className="h-5 w-5" /></span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-[#211d19]">{item.name}</p>
                    <p className="truncate text-[0.62rem] text-[#9c988f]">{item.note}</p>
                  </div>
                  <span className="shrink-0 text-xs font-semibold text-[#211d19]">{item.price}</span>
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#211d19] text-white"><Plus className="h-3.5 w-3.5" /></span>
                </div>
              );
            })}
          </div>

          <div className="mt-3 flex items-center justify-between bg-[#211d19] px-4 py-3.5">
            <span className="flex items-center gap-2 text-white"><ShoppingBag className="h-4 w-4" /> <span className="text-xs font-medium">Sacola · 3 itens</span></span>
            <span className="text-sm font-semibold text-white">R$ 96,90</span>
          </div>
        </div>
      </div>
    </div>
  );
}

const navLink = "text-sm font-medium text-[#6d6a63] transition hover:text-[#c5362e]";

export function LandingExperience() {
  const [active, setActive] = useState(0);
  const glowRef = useRef<HTMLDivElement>(null);
  const coords = useRef({ x: 50, y: 50 });
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const timer = window.setInterval(() => setActive((current) => current + 1), 2400);
    return () => window.clearInterval(timer);
  }, []);

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

  useEffect(() => () => { if (rafRef.current !== null) window.cancelAnimationFrame(rafRef.current); }, []);

  const statusText = useMemo(() => liveOrders[active % liveOrders.length].status, [active]);

  return (
    <main className="min-h-screen bg-[#f7f4ee] text-[#211d19]" onMouseMove={handlePointerMove}>
      <header className="sticky top-0 z-40 border-b border-[#e7e4dd] bg-[#f7f4ee]/85 backdrop-blur-xl">
        <nav className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3">
          <Link href="/" aria-label="PeriniFood"><Brand /></Link>
          <div className="hidden items-center gap-8 lg:flex">
            <a href="#beneficios" className={navLink}>Benefícios</a>
            <a href="#funcionalidades" className={navLink}>Funcionalidades</a>
            <a href="#operacao" className={navLink}>Operação</a>
            <Link href="/planos" className={navLink}>Planos</Link>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/login" className="hidden rounded-lg border border-[#e7e4dd] bg-white px-4 py-2 text-sm font-medium text-[#403d38] transition hover:border-[#c5362e] hover:text-[#c5362e] sm:inline-flex">Entrar</Link>
            <Link href="/register" className="rounded-lg bg-[#211d19] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#37312a]">Criar conta</Link>
          </div>
        </nav>
      </header>

      <section className="relative overflow-hidden bg-[#14100c] text-white">
        <div ref={glowRef} className="absolute inset-0" style={{ background: heroGradient(50, 40) }} />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[size:46px_46px]" />

        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-5 py-16 md:py-20 lg:grid-cols-[0.92fr_1.08fr]">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.07] px-3.5 py-1.5 text-xs font-medium uppercase tracking-[0.16em] text-white/80">
              <span className="h-1.5 w-1.5 rounded-full bg-[#e2705f]" /> Plataforma própria de delivery
            </p>
            <h1 className="mt-6 max-w-2xl text-4xl font-semibold leading-[1.05] tracking-tight text-balance md:text-6xl">
              Seu delivery, sua marca, <span className="text-[#e2705f]">sua margem.</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-white/75">
              O PeriniFood reúne cardápio digital, PDV, impressão, clientes, WhatsApp e painel operacional num sistema próprio — para você vender direto e parar de repassar comissão para marketplace.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/register" className="inline-flex h-12 items-center gap-2 rounded-xl bg-[#c5362e] px-5 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-[#a92c25]">
                Começar agora <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/planos" className="inline-flex h-12 items-center gap-2 rounded-xl border border-white/20 bg-white/[0.06] px-5 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-white/10">Ver planos</Link>
            </div>
            <div className="mt-8 grid max-w-xl gap-3 text-sm text-white/80 sm:grid-cols-3">
              {["Sem comissão por venda", "Pedidos em tempo real", `Agora: ${statusText}`].map((item) => (
                <span key={item} className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-400" /> {item}</span>
              ))}
            </div>
          </div>

          <LiveHeroPanel active={active} />
        </div>
      </section>

      <section className="border-b border-[#e7e4dd] bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-8 gap-y-3 px-5 py-5 text-sm font-medium text-[#6d6a63]">
          <span className="text-[#9c988f]">Feito para</span>
          <span className="flex items-center gap-2"><Pizza className="h-4 w-4 text-[#c5362e]" /> Pizzarias</span>
          <span className="flex items-center gap-2"><UtensilsCrossed className="h-4 w-4 text-[#c5362e]" /> Restaurantes</span>
          <span className="flex items-center gap-2"><Truck className="h-4 w-4 text-[#c5362e]" /> Deliveries</span>
          <span className="flex items-center gap-2"><Store className="h-4 w-4 text-[#c5362e]" /> Lanchonetes</span>
        </div>
      </section>

      <section id="beneficios" className="bg-[#f7f4ee] py-16 md:py-20">
        <div className="mx-auto max-w-6xl px-5">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#c5362e]">Por que ter um canal próprio</p>
          <h2 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight text-balance md:text-4xl">Menos improviso. Mais margem, dados e clientes que voltam.</h2>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {benefits.map(([title, description, Icon], index) => (
              <article key={title} className="group rounded-2xl border border-[#e7e4dd] bg-white p-6 transition duration-300 hover:-translate-y-1 hover:border-[#dcd8cf] hover:shadow-[0_12px_30px_rgba(27,26,23,0.06)]">
                <div className="flex items-center justify-between">
                  <span className="grid h-11 w-11 place-items-center rounded-xl bg-[#f6ece9] text-[#c5362e]"><Icon className="h-5 w-5" /></span>
                  <span className="text-sm font-semibold text-[#e0dbd1] [font-variant-numeric:tabular-nums]">0{index + 1}</span>
                </div>
                <h3 className="mt-5 text-lg font-semibold tracking-tight text-[#211d19]">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-[#6d6a63]">{description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="funcionalidades" className="bg-white py-16 md:py-20">
        <div className="mx-auto max-w-6xl px-5">
          <div className="grid gap-10 lg:grid-cols-[0.7fr_1.3fr]">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#c5362e]">Funcionalidades</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-balance md:text-4xl">Tudo o que a operação precisa, num lugar só.</h2>
              <p className="mt-4 text-[#6d6a63]">Pensado para o atendimento real: pouco atrito, decisões rápidas e a ferramenta certa no momento certo.</p>
              <Link href="/planos" className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-[#c5362e] transition hover:gap-3">Ver planos e preços <ArrowRight className="h-4 w-4" /></Link>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {features.map(([title, description, Icon]) => (
                <article key={title} className="rounded-2xl border border-[#e7e4dd] bg-[#faf9f6] p-5 transition hover:border-[#dcd8cf] hover:bg-white">
                  <div className="flex items-start gap-3.5">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#f6ece9] text-[#c5362e]"><Icon className="h-5 w-5" /></span>
                    <div>
                      <h3 className="text-sm font-semibold text-[#211d19]">{title}</h3>
                      <p className="mt-1.5 text-sm leading-6 text-[#6d6a63]">{description}</p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="operacao" className="bg-[#f7f4ee] py-16 md:py-20">
        <div className="mx-auto max-w-6xl px-5">
          <div className="overflow-hidden rounded-3xl bg-[#211d19] text-white shadow-2xl shadow-black/20">
            <div className="grid gap-0 lg:grid-cols-[0.82fr_1.18fr]">
              <div className="p-7 md:p-9">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#e2705f]">Fluxo da cozinha ao histórico</p>
                <h2 className="mt-3 text-3xl font-semibold tracking-tight text-balance md:text-4xl">O painel mostra o que precisa de ação agora.</h2>
                <p className="mt-4 text-white/70">Cada pedido avança por etapas com um clique. Entregues saem da esteira e ficam no histórico do dia — a tela nunca vira bagunça.</p>
                <div className="mt-8 flex flex-wrap gap-3">
                  <Link href="/register" className="rounded-xl bg-[#c5362e] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#a92c25]">Criar minha conta</Link>
                  <Link href="/planos" className="rounded-xl border border-white/20 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10">Ver planos</Link>
                </div>
              </div>
              <div className="border-t border-white/10 bg-white/[0.04] p-4 lg:border-l lg:border-t-0">
                <div className="grid gap-3 sm:grid-cols-2">
                  {["Pendentes", "Em produção", "Pronto", "Saiu p/ entrega"].map((column, index) => (
                    <div key={column} className="rounded-2xl border border-white/10 bg-white/[0.05] p-3.5">
                      <div className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${index === active % 4 ? "bg-[#c5362e] text-white" : "bg-white/10 text-white/75"}`}>{column}</div>
                      <div className="mt-3 rounded-lg bg-white p-3 text-[#211d19]">
                        <strong className="text-sm font-semibold">{liveOrders[(active + index) % liveOrders.length].code}</strong>
                        <p className="text-xs text-[#9c988f]">{liveOrders[(active + index) % liveOrders.length].item}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white py-16 md:py-20">
        <div className="mx-auto max-w-6xl px-5">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#c5362e]">Como funciona</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-balance md:text-4xl">No ar em minutos, sem complicação.</h2>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {steps.map(([title, description], index) => (
              <div key={title} className="relative rounded-2xl border border-[#e7e4dd] bg-[#faf9f6] p-6">
                <span className="grid h-9 w-9 place-items-center rounded-full bg-[#211d19] text-sm font-semibold text-white [font-variant-numeric:tabular-nums]">{index + 1}</span>
                <h3 className="mt-4 text-lg font-semibold tracking-tight text-[#211d19]">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-[#6d6a63]">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#f7f4ee] py-16 md:py-20">
        <div className="mx-auto max-w-6xl px-5">
          <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#c5362e]">Planos</p>
              <h2 className="mt-3 max-w-xl text-3xl font-semibold tracking-tight text-balance md:text-4xl">Preço justo, sem comissão por pedido.</h2>
              <p className="mt-4 max-w-lg text-[#6d6a63]">Comece vendendo no seu cardápio próprio e avance para integrações quando quiser. Cancele quando precisar.</p>
            </div>
            <Link href="/planos" className="inline-flex items-center gap-2 rounded-xl border border-[#e7e4dd] bg-white px-5 py-3 text-sm font-semibold text-[#403d38] transition hover:border-[#c5362e] hover:text-[#c5362e]">Comparar planos <ArrowRight className="h-4 w-4" /></Link>
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:max-w-3xl">
            {plansTeaser.map((plan) => (
              <article key={plan.name} className={`rounded-2xl border bg-white p-6 ${plan.highlight ? "border-[#c5362e]" : "border-[#e7e4dd]"}`}>
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-[#211d19]">{plan.name}</h3>
                  {plan.highlight && <span className="rounded-full bg-[#f6ece9] px-2.5 py-0.5 text-[0.62rem] font-semibold uppercase tracking-wide text-[#c5362e]">Mais completo</span>}
                </div>
                <p className="mt-3 text-3xl font-semibold tracking-tight text-[#211d19]">{plan.price}<span className="text-sm font-normal text-[#9c988f]">/mês</span></p>
                <p className="mt-2 text-sm text-[#6d6a63]">{plan.note}</p>
                <Link href="/register" className={`mt-5 inline-flex h-10 w-full items-center justify-center rounded-lg px-5 text-sm font-medium transition ${plan.highlight ? "bg-[#211d19] text-white hover:bg-[#37312a]" : "border border-[#e7e4dd] text-[#403d38] hover:border-[#c5362e] hover:text-[#c5362e]"}`}>Escolher {plan.name}</Link>
              </article>
            ))}
          </div>
          <p className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#f6ece9] px-4 py-2 text-sm font-medium text-[#8a2f28]">
            <Globe className="h-4 w-4 text-[#c5362e]" /> No plano anual pelo cartão, o domínio .com.br da sua pizzaria é grátis.
          </p>
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto max-w-6xl px-5 pb-16 md:pb-20">
          <div className="overflow-hidden rounded-3xl bg-[#211d19] px-7 py-12 text-center text-white md:px-12 md:py-16">
            <h2 className="mx-auto max-w-2xl text-3xl font-semibold tracking-tight text-balance md:text-4xl">Pronto para vender no seu próprio nome?</h2>
            <p className="mx-auto mt-4 max-w-xl text-white/70">Crie sua conta e coloque o cardápio no ar hoje. Sem comissão por venda, com a operação inteira na sua mão.</p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link href="/register" className="inline-flex h-12 items-center gap-2 rounded-xl bg-[#c5362e] px-6 text-sm font-semibold text-white transition hover:bg-[#a92c25]">Começar agora <ArrowRight className="h-4 w-4" /></Link>
              <Link href="/login" className="inline-flex h-12 items-center rounded-xl border border-white/20 px-6 text-sm font-semibold text-white transition hover:bg-white/10">Já tenho conta</Link>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-[#e7e4dd] bg-[#f7f4ee]">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-5 px-5 py-8 text-sm text-[#9c988f]">
          <Brand />
          <div className="flex flex-wrap gap-6">
            <a href="#funcionalidades" className={navLink}>Funcionalidades</a>
            <a href="#operacao" className={navLink}>Operação</a>
            <Link href="/planos" className={navLink}>Planos</Link>
            <Link href="/login" className={navLink}>Entrar</Link>
            <a href="https://wa.me/5511930230911" className="flex items-center gap-1.5 font-medium text-[#6d6a63] transition hover:text-[#c5362e]"><MessageCircle className="h-4 w-4" /> WhatsApp</a>
          </div>
        </div>
      </footer>

      <WhatsAppFloat />
    </main>
  );
}
