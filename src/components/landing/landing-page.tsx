import Image from "next/image";
import Link from "next/link";
import { Yellowtail } from "next/font/google";
import { ArrowRight, BarChart3, Bike, CheckCircle2, ChefHat, Headphones, MessageCircle, PlayCircle, Receipt, Settings2, ShieldCheck, Users } from "lucide-react";
import { WhatsAppFloat } from "@/components/whatsapp-float";
import { HeroDevices } from "./devices";
import { DeliveryFlow } from "./delivery-flow";

const neonFont = Yellowtail({ weight: "400", subsets: ["latin"], display: "swap" });

const features = [
  { title: "Cardápio Digital", text: "Seu menu online, com a sua marca.", Icon: Receipt, tone: "from-[#ff5a3c] to-[#d9261c]" },
  { title: "Pedidos e PDV", text: "Atenda no site, WhatsApp e balcão.", Icon: MessageCircle, tone: "from-[#3ad46b] to-[#169c46]" },
  { title: "Cozinha em tempo real", text: "Acompanhe os pedidos em cada etapa.", Icon: ChefHat, tone: "from-[#ff8a3d] to-[#e2540c]" },
  { title: "Clientes e fidelidade", text: "Histórico, promoções e mais vendas.", Icon: Users, tone: "from-[#9f7bff] to-[#6b46e5]" },
  { title: "Entrega por distância", text: "Calcule a taxa automaticamente.", Icon: Bike, tone: "from-[#46a6ff] to-[#1f6fe0]" },
  { title: "Relatórios completos", text: "Saiba o que vende mais e aumente seu lucro.", Icon: BarChart3, tone: "from-[#ff5f6d] to-[#d42a3c]" },
];

const steps = [
  ["Monte seu cardápio", "Cadastre produtos, fotos, tamanhos e adicionais. Seu site fica no ar com endereço próprio."],
  ["Receba pedidos", "Site, balcão e delivery caem numa fila única, em tempo real, com impressão da comanda."],
  ["Gerencie e cresça", "Acompanhe faturamento, clientes e fidelidade — e decida com dados, não no chute."],
];

const plans = [
  { name: "Básico", price: "R$ 49,90", note: "Cardápio próprio + operação manual" },
  { name: "Completa", price: "R$ 89,90", note: "Marketplaces e automações", highlight: true },
];

const navLink = "rounded-lg px-3 py-1.5 text-sm font-medium text-white/80 transition hover:bg-white/10 hover:text-white";
const ctaPrimary = "inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-brand-bright to-brand font-semibold text-white shadow-[0_12px_30px_-8px_rgba(242,100,25,0.75)] transition hover:-translate-y-0.5 hover:from-[#ff7a2e] hover:to-brand-strong";

function Brand() {
  return (
    <span className="flex items-center gap-2.5">
      <span className="grid h-10 w-10 place-items-center overflow-hidden rounded-xl bg-white shadow-[0_6px_20px_-6px_rgba(242,100,25,0.6)]">
        <Image src="/brand/perinifood-logo.png" alt="" width={40} height={40} loading="eager" className="h-full w-full object-contain" />
      </span>
      <span className="leading-tight">
        <span className="block text-xl font-semibold tracking-tight text-white">Perini<span className="text-brand-bright">Food</span></span>
        <span className="hidden text-[0.6rem] font-medium uppercase tracking-[0.2em] text-white/60 sm:block">Sistema para restaurantes</span>
      </span>
    </span>
  );
}

export function LandingPage() {
  return (
    <main className="min-h-screen bg-[#100b08] text-white">
      <header className="absolute inset-x-0 top-0 z-30">
        <nav className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-4 sm:px-6" aria-label="Principal">
          <Link href="/" aria-label="PeriniFood — início"><Brand /></Link>
          <div className="hidden items-center gap-1 rounded-2xl border border-white/10 bg-white/[0.06] p-1 backdrop-blur-md lg:flex">
            <a href="#recursos" className={navLink}>Produto</a>
            <a href="#fluxo" className={navLink}>Soluções</a>
            <a href="#como-funciona" className={navLink}>Como funciona</a>
            <a href="#planos" className={navLink}>Planos</a>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/login" className="inline-flex h-10 items-center rounded-xl border border-white/15 bg-black/30 px-4 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/10">Entrar</Link>
            <Link href="/register" className={`${ctaPrimary} h-10 whitespace-nowrap px-4 text-sm`}>
              Começar agora <ArrowRight className="hidden h-4 w-4 sm:block" />
            </Link>
          </div>
        </nav>
      </header>

      <section className="relative isolate overflow-hidden pb-10 pt-28 sm:pt-32 lg:pb-16">
        <Image src="/landing/salao.webp" alt="" fill sizes="100vw" fetchPriority="high" loading="eager" className="-z-20 object-cover object-center" />
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(16,11,8,0.96)_0%,rgba(16,11,8,0.82)_42%,rgba(16,11,8,0.55)_70%,rgba(16,11,8,0.75)_100%),linear-gradient(180deg,rgba(16,11,8,0.2)_0%,rgba(16,11,8,0.1)_60%,#100b08_100%)]" />
        <Image src="/landing/pizza.webp" alt="" width={1100} height={700} sizes="(min-width: 1024px) 420px, 0px" className="pointer-events-none absolute -bottom-10 -right-24 -z-10 hidden w-[420px] opacity-90 lg:block" />

        <p className={`${neonFont.className} pointer-events-none absolute right-[2%] top-28 z-10 hidden -rotate-[10deg] text-[3.4rem] leading-[0.9] text-[#ffd0a8] [text-shadow:0_0_6px_#ff8a3d,0_0_18px_#f26419,0_0_42px_#f26419] xl:block`} aria-hidden="true">
          Restaurantes<br />mais fortes
        </p>

        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 sm:px-6 lg:grid-cols-[0.95fr_1.05fr]">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/30 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-white/85 backdrop-blur">
              <ChefHat className="h-4 w-4 text-brand-bright" /> Sistema completo para restaurantes
            </p>
            <h1 className="mt-6 text-5xl font-bold leading-[0.95] tracking-tight text-balance sm:text-6xl xl:text-7xl">
              Do pedido ao seu maior <span className="bg-gradient-to-b from-[#ff8a3d] to-brand-bright bg-clip-text text-transparent">lucro.</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-white/80">
              Controle vendas, cozinha, delivery e relatórios em um só sistema. Simples, rápido e feito para o dia a dia do seu restaurante.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/register" className={`${ctaPrimary} h-13 px-7 text-base`}>
                Começar agora <ArrowRight className="h-5 w-5" />
              </Link>
              <a href="#fluxo" className="inline-flex h-13 items-center justify-center gap-2 rounded-xl border border-white/20 bg-black/30 px-6 text-base font-semibold text-white backdrop-blur transition hover:bg-white/10">
                <PlayCircle className="h-5 w-5 text-brand-bright" /> Ver como funciona
              </a>
            </div>
            <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-sm text-white/80">
              <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-brand-bright" /> Sem taxa de comissão</li>
              <li className="flex items-center gap-2"><Settings2 className="h-4 w-4 text-brand-bright" /> Configuração em minutos</li>
              <li className="flex items-center gap-2"><Headphones className="h-4 w-4 text-brand-bright" /> Suporte especializado</li>
            </ul>
          </div>
          <HeroDevices />
        </div>

        <div id="recursos" className="mx-auto mt-12 max-w-7xl scroll-mt-24 px-4 sm:px-6">
          <h2 className="sr-only">Recursos</h2>
          <ul className="grid grid-cols-2 gap-px overflow-hidden rounded-3xl border border-white/10 bg-white/10 shadow-[0_30px_60px_-20px_rgba(0,0,0,0.8)] backdrop-blur-md md:grid-cols-3 xl:grid-cols-6">
            {features.map(({ title, text, Icon, tone }) => (
              <li key={title} className="flex flex-col items-center bg-[#1a120d]/80 px-3 py-6 text-center sm:px-5">
                <span className={`grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-b ${tone} shadow-[0_10px_24px_-8px_rgba(0,0,0,0.7),inset_0_1px_0_rgba(255,255,255,0.35)]`}>
                  <Icon className="h-7 w-7 text-white" />
                </span>
                <h3 className="mt-4 text-base font-semibold">{title}</h3>
                <p className="mt-1 text-sm leading-snug text-white/70">{text}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section id="fluxo" className="relative scroll-mt-16 overflow-hidden py-16 lg:py-24">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-2 xl:grid-cols-[1.05fr_1fr_0.95fr] xl:gap-10">
          <div className="relative">
            <div className="relative aspect-[4/3] overflow-hidden rounded-3xl border border-white/10 shadow-[0_40px_80px_-24px_rgba(0,0,0,0.9)]">
              <Image src="/landing/cozinha.webp" alt="Equipe de cozinha preparando pedidos" fill sizes="(min-width: 1024px) 50vw, 100vw" className="object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#100b08]/70 to-transparent" />
            </div>
            <div className="absolute -bottom-6 right-4 w-56 rounded-2xl border border-white/10 bg-[#17110c]/95 p-4 shadow-2xl backdrop-blur sm:right-8">
              <p className="flex items-center gap-1.5 text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-brand-bright"><ChefHat className="h-3.5 w-3.5" /> Cozinha</p>
              <p className="mt-2 font-semibold">Novo pedido</p>
              <div className="mt-1 flex items-end justify-between gap-2">
                <p className="text-sm text-white/70">Pizza Calabresa<br />Mesa 4 · 2 itens</p>
                <span className="rounded-lg bg-emerald-500 px-3 py-1.5 text-sm font-semibold text-white">Aceitar</span>
              </div>
            </div>
          </div>

          <div>
            <p className="inline-flex rounded-full border border-brand-bright/50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-brand-bright">Fluxo sem complicação</p>
            <h2 className="mt-4 text-4xl font-bold leading-tight tracking-tight text-balance sm:text-5xl xl:text-[2.6rem]">
              Tudo conectado, <span className="text-brand-bright">do atendimento à entrega.</span>
            </h2>
            <p className="mt-4 max-w-lg text-lg text-white/75">Pedidos chegam, a cozinha prepara, o entregador sai e você acompanha tudo em tempo real.</p>
            <ul className="mt-6 grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
              {["Menos erros", "Mais agilidade", "Clientes mais satisfeitos", "Mais lucro no fim do mês"].map((item) => (
                <li key={item} className="flex items-center gap-2 text-white/85"><CheckCircle2 className="h-5 w-5 shrink-0 text-brand-bright" /> {item}</li>
              ))}
            </ul>
          </div>

          <div className="lg:col-span-2 lg:mx-auto lg:w-full lg:max-w-[520px] xl:col-span-1">
            <DeliveryFlow />
          </div>
        </div>
      </section>

      <section id="como-funciona" className="scroll-mt-16 border-t border-white/10 py-16 lg:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-bright">Como funciona</p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">No ar em minutos, sem complicação.</h2>
          <ol className="mt-10 grid gap-4 md:grid-cols-3">
            {steps.map(([title, text], index) => (
              <li key={title} className="rounded-2xl border border-white/10 bg-white/[0.04] p-6">
                <span className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-b from-brand-bright to-brand font-semibold [font-variant-numeric:tabular-nums]">{index + 1}</span>
                <h3 className="mt-4 text-lg font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-white/70">{text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="planos" className="scroll-mt-16 py-16 lg:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-bright">Planos</p>
              <h2 className="mt-3 max-w-xl text-3xl font-bold tracking-tight sm:text-4xl">Preço justo, sem comissão por pedido.</h2>
              <p className="mt-3 max-w-lg text-white/70">Comece pelo cardápio próprio e avance para integrações quando quiser.</p>
            </div>
            <Link href="/planos" className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-5 py-3 text-sm font-semibold transition hover:bg-white/10">Comparar planos <ArrowRight className="h-4 w-4" /></Link>
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:max-w-3xl">
            {plans.map((plan) => (
              <article key={plan.name} className={`rounded-2xl border p-6 ${plan.highlight ? "border-brand-bright/70 bg-gradient-to-b from-brand/20 to-transparent" : "border-white/10 bg-white/[0.04]"}`}>
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">{plan.name}</h3>
                  {plan.highlight && <span className="rounded-full bg-brand-bright/20 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide text-[#ffb27a]">Mais completo</span>}
                </div>
                <p className="mt-3 text-3xl font-bold tracking-tight">{plan.price}<span className="text-sm font-normal text-white/60">/mês</span></p>
                <p className="mt-2 text-sm text-white/70">{plan.note}</p>
                <Link href="/register" className={plan.highlight ? `${ctaPrimary} mt-5 h-11 w-full text-sm` : "mt-5 inline-flex h-11 w-full items-center justify-center rounded-xl border border-white/15 text-sm font-semibold transition hover:bg-white/10"}>Escolher {plan.name}</Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 pb-16 sm:px-6 lg:pb-20">
        <div className="relative isolate mx-auto max-w-7xl overflow-hidden rounded-3xl border border-white/10 px-6 py-14 text-center sm:px-12 sm:py-20">
          <Image src="/landing/forno.webp" alt="" fill sizes="(min-width: 1280px) 1280px, 100vw" className="-z-20 object-cover" />
          <div className="absolute inset-0 -z-10 bg-[#100b08]/75" />
          <h2 className="mx-auto max-w-2xl text-3xl font-bold tracking-tight text-balance sm:text-4xl">Pronto para vender no seu próprio nome?</h2>
          <p className="mx-auto mt-4 max-w-xl text-white/75">Crie sua conta, fale com a nossa equipe para ativar e coloque o cardápio no ar. Sem comissão por venda.</p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link href="/register" className={`${ctaPrimary} h-12 px-7`}>Começar agora <ArrowRight className="h-4 w-4" /></Link>
            <Link href="/login" className="inline-flex h-12 items-center justify-center rounded-xl border border-white/20 bg-black/30 px-7 font-semibold backdrop-blur transition hover:bg-white/10">Já tenho conta</Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-5 px-4 py-8 text-sm text-white/60 sm:px-6">
          <Brand />
          <nav className="flex flex-wrap gap-x-6 gap-y-2" aria-label="Rodapé">
            <a href="#recursos" className="transition hover:text-white">Recursos</a>
            <a href="#planos" className="transition hover:text-white">Planos</a>
            <Link href="/login" className="transition hover:text-white">Entrar</Link>
            <a href="https://wa.me/5511930230911" target="_blank" rel="noreferrer" className="flex items-center gap-1.5 transition hover:text-white"><MessageCircle className="h-4 w-4" /> WhatsApp</a>
          </nav>
          <p className="flex w-full items-center gap-1.5 text-xs text-white/40"><ShieldCheck className="h-3.5 w-3.5" /> © {new Date().getFullYear()} PeriniFood. Fotos: Unsplash.</p>
        </div>
      </footer>

      <WhatsAppFloat />
    </main>
  );
}
