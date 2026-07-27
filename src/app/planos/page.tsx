import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, ClipboardList, Globe, MessageCircle, Plug, QrCode, Truck, X, type LucideIcon } from "lucide-react";
import { WhatsAppFloat } from "@/components/whatsapp-float";

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
    description: "Para quem quer vender pelo próprio cardápio e controlar os pedidos manualmente.",
    icon: ClipboardList,
    features: [
      "Cardápio digital público",
      "Produtos, categorias, tipos e opções de pizza",
      "Checkout online (sem pagamento integrado)",
      "Pedido manual no painel (PDV)",
      "Clientes cadastrados automaticamente",
      "WhatsApp manual",
      "Impressão de comandas",
      "Painel operacional e relatórios",
      "Taxa de entrega por raio",
    ],
    notIncluded: ["Integração com marketplaces", "Pagamento online"],
  },
  {
    name: "Completa",
    subtitle: "Integrações e escala",
    price: "R$ 89,90",
    description: "Para centralizar site próprio, balcão e marketplaces numa fila única.",
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

const comparison: Array<[string, boolean, boolean]> = [
  ["Cardápio online", true, true],
  ["Pedido manual (PDV)", true, true],
  ["Clientes e histórico", true, true],
  ["Impressão e WhatsApp manual", true, true],
  ["Taxa de entrega por km", true, true],
  ["iFood / 99Food / Keeta", false, true],
  ["Webhooks externos", false, true],
  ["Relatórios por canal", false, true],
];

function Brand() {
  return (
    <span className="flex items-center gap-2.5">
      <Image src="/brand/perinifood-logo.png" alt="" width={48} height={48} className="h-10 w-10 rounded-xl object-contain" />
      <span className="leading-tight">
        <span className="block text-lg font-semibold tracking-tight text-[#211d19]">Perini<span className="text-[#c5362e]">Food</span></span>
        <span className="hidden text-[0.6rem] font-medium uppercase tracking-[0.16em] text-[#9c988f] sm:block">Planos para restaurantes</span>
      </span>
    </span>
  );
}

export default function PlansPage() {
  return (
    <main className="min-h-screen bg-[#f7f4ee] text-[#211d19]">
      <header className="border-b border-[#e7e4dd] bg-[#f7f4ee]/85 backdrop-blur-xl">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3">
          <Link href="/"><Brand /></Link>
          <div className="flex items-center gap-2">
            <Link href="/" className="hidden h-10 items-center gap-2 rounded-lg border border-[#e7e4dd] bg-white px-4 text-sm font-medium text-[#403d38] transition hover:border-[#c5362e] hover:text-[#c5362e] sm:inline-flex">
              <ArrowLeft className="h-4 w-4" /> Início
            </Link>
            <Link href="/login" className="h-10 rounded-lg bg-[#211d19] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#37312a]">Entrar</Link>
          </div>
        </nav>
      </header>

      <section className="border-b border-[#e7e4dd] bg-white">
        <div className="mx-auto max-w-6xl px-5 py-14 text-center md:py-16">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#c5362e]">Planos PeriniFood</p>
          <h1 className="mx-auto mt-4 max-w-3xl text-4xl font-semibold tracking-tight text-balance md:text-5xl">Opere manualmente ou integre todos os seus canais.</h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-[#6d6a63]">
            Comece com o essencial para vender no site próprio ou avance para uma operação completa com marketplaces e automações. <strong className="font-semibold text-[#211d19]">Sem comissão por venda.</strong>
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-5 pt-10">
        <div className="flex flex-col items-start gap-4 rounded-2xl border border-[#e7c3bf] bg-[#f6ece9] p-5 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-3.5">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#c5362e] text-white"><Globe className="h-5 w-5" /></span>
            <div>
              <p className="text-sm font-semibold text-[#211d19]">Assine no plano anual pelo cartão e ganhe o domínio da sua pizzaria.</p>
              <p className="mt-1 text-sm text-[#6d6a63]">Fechando qualquer plano no anual com cartão de crédito, a gente registra o domínio <strong className="font-semibold text-[#211d19]">.com.br</strong> do seu restaurante sem custo — caso você ainda não tenha um.</p>
            </div>
          </div>
          <Link href="/register" className="inline-flex h-10 shrink-0 items-center gap-2 rounded-lg bg-[#211d19] px-5 text-sm font-medium text-white transition hover:bg-[#37312a]">Assinar anual <ArrowRight className="h-4 w-4" /></Link>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-5 pb-12 pt-8">
        <div className="grid gap-5 lg:grid-cols-2">
          {plans.map((plan) => {
            const Icon = plan.icon;
            return (
              <article key={plan.name} className={plan.highlight ? "relative rounded-3xl border-2 border-[#c5362e] bg-white p-6 shadow-[0_16px_40px_rgba(197,54,46,0.10)]" : "rounded-3xl border border-[#e7e4dd] bg-white p-6"}>
                {plan.highlight && <span className="absolute right-6 top-6 rounded-full bg-[#f6ece9] px-3 py-1 text-[0.62rem] font-semibold uppercase tracking-wide text-[#c5362e]">Mais completo</span>}
                <div className="flex items-start gap-3.5 pr-24">
                  <span className={plan.highlight ? "grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#c5362e] text-white" : "grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#f6ece9] text-[#c5362e]"}>
                    <Icon className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-[#9c988f]">{plan.subtitle}</p>
                    <h2 className="mt-1 text-2xl font-semibold tracking-tight text-[#211d19]">{plan.name}</h2>
                  </div>
                </div>
                <p className="mt-4 text-sm text-[#6d6a63]">{plan.description}</p>
                <p className="mt-5 text-4xl font-semibold tracking-tight text-[#211d19]">{plan.price}<span className="text-sm font-normal text-[#9c988f]">/mês</span></p>

                <Link href="/register" className={plan.highlight ? "mt-6 inline-flex h-11 w-full items-center justify-center rounded-lg bg-[#211d19] px-5 text-sm font-medium text-white transition hover:bg-[#37312a]" : "mt-6 inline-flex h-11 w-full items-center justify-center rounded-lg border border-[#e7e4dd] bg-white px-5 text-sm font-medium text-[#403d38] transition hover:border-[#c5362e] hover:text-[#c5362e]"}>
                  Escolher {plan.name}
                </Link>

                <div className="mt-6 space-y-2.5 border-t border-[#efece6] pt-5">
                  {plan.features.map((feature) => (
                    <p key={feature} className="flex gap-2.5 text-sm text-[#403d38]">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#1f8a54]" /> {feature}
                    </p>
                  ))}
                  {plan.notIncluded.map((feature) => (
                    <p key={feature} className="flex gap-2.5 text-sm text-[#b0aaa0]">
                      <X className="mt-0.5 h-4 w-4 shrink-0 text-[#d8d2c7]" /> {feature}
                    </p>
                  ))}
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-5 pb-14">
        <div className="overflow-hidden rounded-3xl border border-[#e7e4dd] bg-white">
          <div className="border-b border-[#efece6] px-6 py-4">
            <h2 className="text-[0.95rem] font-semibold text-[#211d19]">Comparativo rápido</h2>
            <p className="mt-0.5 text-sm text-[#9c988f]">A diferença prática entre operação manual e integrada.</p>
          </div>
          <div className="grid grid-cols-[1fr_120px_120px] items-center gap-3 border-b border-[#efece6] bg-[#faf9f6] px-6 py-2.5 text-[0.7rem] font-medium uppercase tracking-[0.08em] text-[#9c988f]">
            <span>Recurso</span>
            <span className="text-center">Básico</span>
            <span className="text-center">Completa</span>
          </div>
          <div className="divide-y divide-[#efece6]">
            {comparison.map(([label, basic, complete]) => (
              <div key={label} className="grid grid-cols-[1fr_120px_120px] items-center gap-3 px-6 py-2.5 text-sm">
                <span className="text-[#403d38]">{label}</span>
                <span className="flex justify-center">{basic ? <Check className="h-4 w-4 text-[#1f8a54]" /> : <span className="text-[#d8d2c7]">—</span>}</span>
                <span className="flex justify-center">{complete ? <Check className="h-4 w-4 text-[#1f8a54]" /> : <span className="text-[#d8d2c7]">—</span>}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-8 overflow-hidden rounded-3xl bg-[#211d19] px-7 py-10 text-center text-white md:px-10">
          <h2 className="mx-auto max-w-xl text-2xl font-semibold tracking-tight text-balance md:text-3xl">Ainda com dúvida sobre qual plano?</h2>
          <p className="mx-auto mt-3 max-w-lg text-white/70">Crie sua conta no plano Básico e faça upgrade quando precisar de integrações.</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link href="/register" className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#c5362e] px-5 text-sm font-semibold text-white transition hover:bg-[#a92c25]">Começar agora <ArrowRight className="h-4 w-4" /></Link>
            <a href="https://wa.me/5511930230911" className="inline-flex h-11 items-center gap-2 rounded-xl border border-white/20 px-5 text-sm font-semibold text-white transition hover:bg-white/10"><MessageCircle className="h-4 w-4" /> Falar no WhatsApp</a>
          </div>
        </div>
      </section>

      <footer className="border-t border-[#e7e4dd] bg-[#f7f4ee]">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-5 px-5 py-8 text-sm text-[#9c988f]">
          <Brand />
          <div className="flex flex-wrap gap-5 font-medium text-[#6d6a63]">
            <span className="flex items-center gap-1.5"><QrCode className="h-4 w-4 text-[#c5362e]" /> Cardápio online</span>
            <span className="flex items-center gap-1.5"><Truck className="h-4 w-4 text-[#c5362e]" /> Delivery</span>
            <Link href="/" className="transition hover:text-[#c5362e]">Início</Link>
            <Link href="/register" className="font-semibold text-[#c5362e]">Começar agora</Link>
          </div>
        </div>
      </footer>

      <WhatsAppFloat />
    </main>
  );
}
