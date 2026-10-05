import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, BadgeCheck, Building2, Globe2, LockKeyhole, Mail, MessageCircle, Store } from "lucide-react";
import { register } from "../actions";

function Brand() {
  return (
    <span className="flex items-center gap-3">
      <Image src="/brand/perinifood-logo.png" alt="" width={48} height={48} loading="eager" className="h-11 w-11 rounded-xl bg-white object-contain" />
      <span className="leading-tight">
        <span className="block text-xl font-black text-ink">Perini<span className="text-brand">Food</span></span>
        <span className="hidden text-[0.62rem] font-black uppercase tracking-[0.22em] text-slate-500 sm:block">Gestão para restaurantes</span>
      </span>
    </span>
  );
}

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <main className="min-h-screen bg-[#f5f7fb] text-ink">
      <header className="border-b border-slate-200 bg-white">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4">
          <Link href="/"><Brand /></Link>
          <div className="flex items-center gap-2">
            <Link href="/" className="hidden h-10 items-center gap-2 rounded-lg border border-slate-200 px-4 text-sm font-black text-slate-700 transition hover:border-brand hover:text-brand sm:inline-flex">
              <ArrowLeft className="h-4 w-4" /> Voltar
            </Link>
            <Link href="/login" className="h-10 rounded-lg bg-ink px-4 py-2 text-sm font-black text-white transition hover:bg-brand">Login</Link>
          </div>
        </nav>
      </header>

      <section className="mx-auto grid min-h-[calc(100vh-73px)] max-w-7xl items-center gap-10 px-5 py-12 lg:grid-cols-[0.9fr_1.1fr]">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.24em] text-brand">Saiba mais</p>
          <h1 className="mt-4 text-4xl font-black tracking-tight md:text-6xl">Crie sua estrutura de venda online com identidade própria.</h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
            Cadastre o restaurante e comece com cardápio digital, pedido manual, clientes, WhatsApp e painel operacional.
          </p>
          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            {["Plano Básico para operação manual", "Plano Completa para integrações", "Ativação após confirmação da assinatura", "Preparado para iFood, 99Food e Keeta"].map((item) => (
              <span key={item} className="flex items-center gap-2 rounded-xl bg-white p-4 text-sm font-bold shadow-sm">
                <BadgeCheck className="h-5 w-5 shrink-0 text-emerald-500" /> {item}
              </span>
            ))}
          </div>
          <Link href="/planos" className="mt-6 inline-flex h-11 items-center rounded-lg border border-brand/30 bg-white px-4 text-sm font-black text-brand transition hover:bg-brand-soft">
            Ver detalhes dos planos
          </Link>
        </div>

        <form action={register} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          <div className="mb-7">
            <span className="grid h-12 w-12 place-items-center rounded-xl bg-brand-soft text-brand">
              <Store className="h-6 w-6" />
            </span>
            <h2 className="mt-5 text-3xl font-black">Criar conta e restaurante</h2>
            <p className="mt-2 text-sm text-slate-500">O primeiro usuário será o administrador principal do restaurante.</p>
          </div>

          {error && (
            <p role="alert" className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</p>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <label className="block space-y-1">
              <span className="text-xs font-black uppercase tracking-wide text-slate-500">E-mail</span>
              <span className="relative block">
                <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input className="h-12 w-full rounded-lg border border-slate-200 bg-white pl-12 pr-4 text-sm outline-none transition focus:border-brand focus:ring-4 focus:ring-brand-soft" name="email" type="email" placeholder="voce@restaurante.com.br" required />
              </span>
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-black uppercase tracking-wide text-slate-500">Senha</span>
              <span className="relative block">
                <LockKeyhole className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input className="h-12 w-full rounded-lg border border-slate-200 bg-white pl-12 pr-4 text-sm outline-none transition focus:border-brand focus:ring-4 focus:ring-brand-soft" name="password" type="password" placeholder="Mínimo de 6 caracteres" minLength={6} required />
              </span>
            </label>
            <label className="block space-y-1 md:col-span-2">
              <span className="text-xs font-black uppercase tracking-wide text-slate-500">Nome do restaurante</span>
              <span className="relative block">
                <Building2 className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input className="h-12 w-full rounded-lg border border-slate-200 bg-white pl-12 pr-4 text-sm outline-none transition focus:border-brand focus:ring-4 focus:ring-brand-soft" name="restaurant_name" placeholder="Ex.: Pizzaria Forno Nordestino" required />
              </span>
            </label>
            <label className="block space-y-1 md:col-span-2">
              <span className="text-xs font-black uppercase tracking-wide text-slate-500">WhatsApp para contato</span>
              <span className="relative block">
                <MessageCircle className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input className="h-12 w-full rounded-lg border border-slate-200 bg-white pl-12 pr-4 text-sm outline-none transition focus:border-brand focus:ring-4 focus:ring-brand-soft" name="whatsapp" type="tel" inputMode="tel" autoComplete="tel" placeholder="(11) 99999-9999" required />
              </span>
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-black uppercase tracking-wide text-slate-500">Slug público</span>
              <span className="relative block">
                <Globe2 className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input className="h-12 w-full rounded-lg border border-slate-200 bg-white pl-12 pr-4 text-sm outline-none transition focus:border-brand focus:ring-4 focus:ring-brand-soft" name="slug" placeholder="minha-pizzaria" />
              </span>
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-black uppercase tracking-wide text-slate-500">Descrição curta</span>
              <input className="h-12 w-full rounded-lg border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-brand focus:ring-4 focus:ring-brand-soft" name="description" placeholder="Pizza, esfiha, lanches..." />
            </label>
          </div>

          <p className="mt-6 rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-600">
            Depois do cadastro, sua loja fica <strong>aguardando ativação</strong>: pague a assinatura ou fale com a nossa equipe para liberar o sistema.
          </p>
          <button className="mt-4 h-12 w-full rounded-lg bg-brand px-5 text-sm font-black text-white shadow-lg shadow-orange-950/20 transition hover:bg-brand-strong">Criar conta</button>
          <p className="mt-6 text-center text-sm text-slate-500">Já tem conta? <Link className="font-black text-brand" href="/login">Entrar</Link></p>
        </form>
      </section>
    </main>
  );
}
