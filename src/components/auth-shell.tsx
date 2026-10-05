import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

// Moldura das telas de login e cadastro, no mesmo visual escuro e 3D da landing:
// foto do salão ao fundo, conteúdo à esquerda e formulário em cartão de vidro.

export const authInput =
  "h-12 w-full rounded-xl border border-white/15 bg-black/30 pl-12 pr-4 text-sm text-white placeholder:text-white/40 shadow-[inset_0_2px_6px_rgba(0,0,0,0.35)] outline-none transition focus:border-brand-bright focus:ring-4 focus:ring-brand-bright/20";
export const authInputPlain = authInput.replace("pl-12 pr-4", "px-4");
export const authLabel = "text-xs font-semibold uppercase tracking-wide text-white/60";
export const authIcon = "pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/40";
export const authButton =
  "h-12 w-full rounded-xl bg-gradient-to-b from-brand-bright to-brand px-5 text-sm font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.3),0_14px_30px_-10px_rgba(242,100,25,0.8)] transition hover:-translate-y-0.5 hover:to-brand-strong";

export function AuthShell({ aside, children, back = "/" }: { aside: React.ReactNode; children: React.ReactNode; back?: string }) {
  return (
    <main className="relative isolate min-h-screen overflow-hidden bg-[#100b08] text-white">
      <Image src="/landing/salao.webp" alt="" fill sizes="100vw" fetchPriority="high" loading="eager" className="-z-20 object-cover" />
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(16,11,8,0.95)_0%,rgba(16,11,8,0.8)_50%,rgba(16,11,8,0.7)_100%)]" />

      <header className="relative">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5" aria-label="PeriniFood — início">
            <span className="grid h-10 w-10 place-items-center overflow-hidden rounded-xl bg-white shadow-[0_6px_20px_-6px_rgba(242,100,25,0.6)]">
              <Image src="/brand/perinifood-logo.png" alt="" width={40} height={40} loading="eager" className="h-full w-full object-contain" />
            </span>
            <span className="leading-tight">
              <span className="block text-xl font-semibold tracking-tight">Perini<span className="text-brand-bright">Food</span></span>
              <span className="hidden text-[0.6rem] font-medium uppercase tracking-[0.2em] text-white/60 sm:block">Sistema para restaurantes</span>
            </span>
          </Link>
          <Link href={back} className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/15 bg-black/30 px-4 text-sm font-semibold backdrop-blur transition hover:bg-white/10">
            <ArrowLeft className="h-4 w-4" /> Voltar
          </Link>
        </nav>
      </header>

      <section className="mx-auto grid max-w-7xl items-center gap-8 px-4 pb-12 pt-4 sm:px-6 lg:min-h-[calc(100vh-80px)] lg:grid-cols-[1.05fr_0.95fr] lg:pt-0">
        <div className="hidden lg:block">{aside}</div>
        <div className="mx-auto w-full max-w-lg [perspective:1600px]">
          <div className="rounded-3xl border border-white/10 bg-[#1a120d]/80 p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_40px_80px_-24px_rgba(0,0,0,0.9),0_0_0_1px_rgba(0,0,0,0.4)] backdrop-blur-xl sm:p-8 lg:[transform:rotateY(-4deg)]">
            {children}
          </div>
        </div>
      </section>
    </main>
  );
}
