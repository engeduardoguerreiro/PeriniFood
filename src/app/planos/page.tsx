import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, BadgeCheck, CheckCircle2, ClipboardList, Globe2, MessageCircle, Plug, QrCode, Truck, XCircle, type LucideIcon } from "lucide-react";

const plans: Array<{
  name: string;
  subtitle: string;
  price: string;
  description: string;
  highlight?: boolean;
  icon: LucideIcon;
  features: string[];
  notIncluded: string[];
}> = [
  {
    name: "Básico",
    subtitle: "Operação manual",
    price: "R$ 49,90",
    description: "Para restaurantes que querem vender pelo próprio cardápio e controlar pedidos manualmente.",
    icon: ClipboardList,
    features: [
      "Cardápio digital público",
      "Produtos, categorias, tipos e opções de pizza",
      "Checkout online sem pagamento integrado",
      "Pedido manual no painel",
      "Clientes cadastrados automaticamente",
      "WhatsApp manual",
      "Impressão de pedidos",
      "Dashboard operacional",
      "Taxa de entrega por raio",
    ],
    notIncluded: ["Integração com marketplaces", "Robô oficial de WhatsApp", "Pagamento online"],
  },
  {
    name: "Completa",
    subtitle: "Integrações e escala",
    price: "R$ 89,90",
    description: "Para operações que querem centralizar site próprio, balcão e marketplaces em uma fila única.",
    highlight: true,
    icon: Plug,
    features: [
      "Tudo do plano Básico",
      "Estrutura para integração com iFood",
      "Estrutura para integração com 99Food",
      "Estrutura para integração com Keeta",
      "Webhooks para pedidos externos",
      "Status centralizado por canal",
      "Relatórios por origem do pedido",
      "Múltiplos perfis de usuário",
      "Prioridade para novas integrações",
    ],
    notIncluded: ["Taxas cobradas pelos marketplaces", "Emissão fiscal", "Pagamento online nativo"],
  },
];

const comparison = [
  ["Cardápio online", true, true],
  ["Pedido manual", true, true],
  ["Clientes e histórico", true, true],
  ["Impressão e WhatsApp manual", true, true],
  ["Taxas de entrega por KM", true, true],
  ["iFood / 99Food / Keeta", false, true],
  ["Webhooks externos", false, true],
  ["Relatórios por canal", false, true],
];

function Brand() {
  return (
    <span className="flex items-center gap-3">
      <Image src="/brand/perinifood-logo.png" alt="" width={48} height={48} className="h-11 w-11 rounded-xl bg-white object-contain" />
      <span className="leading-tight">
        <span className="block text-xl font-black text-[#232A31]">Perini<span className="text-[#E50914]">Food</span></span>
        <span className="hidden text-[0.62rem] font-black uppercase tracking-[0.22em] text-slate-500 sm:block">Planos para restaurantes</span>
      </span>
    </span>
  );
}

export default function PlansPage() {
  return (
    <main className="min-h-screen bg-[#f5f7fb] text-[#182b3a]">
      <header className="border-b border-slate-200 bg-white">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4">
          <Link href="/"><Brand /></Link>
          <div className="flex items-center gap-2">
            <Link href="/" className="hidden h-10 items-center gap-2 rounded-lg border border-slate-200 px-4 text-sm font-black text-slate-700 transition hover:border-[#E50914] hover:text-[#E50914] sm:inline-flex">
              <ArrowLeft className="h-4 w-4" /> Voltar
            </Link>
            <Link href="/login" className="h-10 rounded-lg bg-[#232A31] px-4 py-2 text-sm font-black text-white transition hover:bg-[#E50914]">Entrar</Link>
          </div>
        </nav>
      </header>

      <section className="bg-[#12161B] text-white">
        <div className="mx-auto max-w-7xl px-5 py-16 text-center">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-red-100">Planos PeriniFood</p>
          <h1 className="mx-auto mt-4 max-w-4xl text-4xl font-black tracking-tight md:text-6xl">Escolha entre operar manualmente ou integrar seus canais.</h1>
          <p className="mx-auto mt-5 max-w-3xl text-lg leading-8 text-white/78">
            Planos competitivos para o mercado brasileiro: comece com o essencial para vender no site próprio ou avance para uma operação completa com marketplaces e automações preparadas.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-12">
        <div className="grid gap-6 lg:grid-cols-2">
          {plans.map((plan) => {
            const Icon = plan.icon;
            return (
              <article key={plan.name} className={plan.highlight ? "relative overflow-hidden rounded-2xl border-2 border-[#E50914] bg-white p-6 shadow-2xl shadow-red-950/10" : "rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"}>
                {plan.highlight && <span className="absolute right-5 top-5 rounded-full bg-[#E50914] px-3 py-1 text-xs font-black uppercase tracking-wide text-white">Mais completo</span>}
                <div className="flex items-start gap-4 pr-28">
                  <span className={plan.highlight ? "grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-[#E50914] text-white" : "grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-red-50 text-[#E50914]"}>
                    <Icon className="h-6 w-6" />
                  </span>
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">{plan.subtitle}</p>
                    <h2 className="mt-1 text-3xl font-black">{plan.name}</h2>
                  </div>
                </div>
                <p className="mt-5 text-slate-600">{plan.description}</p>
                <p className="mt-6 text-4xl font-black text-[#232A31]">{plan.price}<span className="text-sm text-slate-500">/mês</span></p>
                <div className="mt-6 grid gap-6 md:grid-cols-2">
                  <div>
                    <h3 className="mb-3 text-sm font-black uppercase tracking-wide text-slate-500">Inclui</h3>
                    <ul className="space-y-3">{plan.features.map((feature) => <li key={feature} className="flex gap-2 text-sm font-semibold text-slate-700"><CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" /> {feature}</li>)}</ul>
                  </div>
                  <div>
                    <h3 className="mb-3 text-sm font-black uppercase tracking-wide text-slate-500">Fora do plano</h3>
                    <ul className="space-y-3">{plan.notIncluded.map((feature) => <li key={feature} className="flex gap-2 text-sm font-semibold text-slate-500"><XCircle className="h-5 w-5 shrink-0 text-slate-300" /> {feature}</li>)}</ul>
                  </div>
                </div>
                <Link href="/register" className={plan.highlight ? "mt-7 inline-flex h-12 w-full items-center justify-center rounded-lg bg-[#232A31] px-5 text-sm font-black text-white transition hover:bg-[#E50914]" : "mt-7 inline-flex h-12 w-full items-center justify-center rounded-lg border border-[#E50914]/30 bg-white px-5 text-sm font-black text-[#E50914] transition hover:bg-red-50"}>
                  Escolher {plan.name}
                </Link>
              </article>
            );
          })}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 pb-16">
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-5">
            <h2 className="text-2xl font-black">Comparativo rápido</h2>
            <p className="mt-1 text-sm text-slate-500">Veja a diferença prática entre operação manual e operação integrada.</p>
          </div>
          <div className="divide-y divide-slate-100">
            {comparison.map(([label, basic, complete]) => (
              <div key={String(label)} className="grid grid-cols-[1fr_90px_100px] items-center gap-3 px-5 py-3 text-sm md:grid-cols-[1fr_160px_160px]">
                <span className="font-bold">{label}</span>
                <span className="text-center">{basic ? <BadgeCheck className="mx-auto h-5 w-5 text-emerald-500" /> : <span className="text-slate-300">-</span>}</span>
                <span className="text-center">{complete ? <BadgeCheck className="mx-auto h-5 w-5 text-emerald-500" /> : <span className="text-slate-300">-</span>}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-5 px-5 py-7 text-sm text-slate-500">
          <div className="flex flex-wrap gap-5 font-bold">
            <span className="flex items-center gap-1"><QrCode className="h-4 w-4 text-[#E50914]" /> Cardápio online</span>
            <span className="flex items-center gap-1"><Truck className="h-4 w-4 text-[#E50914]" /> Delivery</span>
            <span className="flex items-center gap-1"><Globe2 className="h-4 w-4 text-[#E50914]" /> Site próprio</span>
            <span className="flex items-center gap-1"><MessageCircle className="h-4 w-4 text-[#E50914]" /> WhatsApp</span>
          </div>
          <Link href="/register" className="font-black text-[#E50914]">Começar agora</Link>
        </div>
      </footer>
    </main>
  );
}
