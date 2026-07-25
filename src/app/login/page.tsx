import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, LockKeyhole, Mail, ShieldCheck } from "lucide-react";
import { signIn } from "../actions";

function loginErrorMessage(error: string) {
  if (!error) return null;
  const decoded = decodeURIComponent(error);
  if (decoded.toLowerCase().includes("invalid login credentials")) return "E-mail ou senha inválidos. Confira os dados e tente novamente.";
  if (decoded.toLowerCase().includes("email not confirmed")) return "Confirme o e-mail antes de acessar.";
  return decoded;
}

function Brand() {
  return (
    <span className="flex items-center gap-3">
      <Image src="/brand/perinifood-logo.png" alt="" width={48} height={48} priority className="h-11 w-11 rounded-xl bg-white object-contain" />
      <span className="leading-tight">
        <span className="block text-xl font-black text-[#232A31]">Perini<span className="text-[#E50914]">Food</span></span>
        <span className="hidden text-[0.62rem] font-black uppercase tracking-[0.22em] text-slate-500 sm:block">Gestão para restaurantes</span>
      </span>
    </span>
  );
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error: string }> }) {
  const sp = await searchParams;
  const errorMessage = loginErrorMessage(sp.error);

  return (
    <main className="min-h-screen bg-[#f5f7fb] text-[#182b3a]">
      <header className="border-b border-slate-200 bg-white">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4">
          <Link href="/"><Brand /></Link>
          <Link href="/" className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 px-4 text-sm font-black text-slate-700 transition hover:border-[#E50914] hover:text-[#E50914]">
            <ArrowLeft className="h-4 w-4" /> Voltar
          </Link>
        </nav>
      </header>

      <section className="mx-auto grid min-h-[calc(100vh-73px)] max-w-7xl items-center gap-10 px-5 py-12 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-2xl bg-[#12161B] p-7 text-white shadow-2xl shadow-red-950/10 lg:p-10">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-red-100">Painel do restaurante</p>
          <h1 className="mt-4 text-4xl font-black tracking-tight md:text-5xl">Entre e acompanhe sua operação em tempo real.</h1>
          <p className="mt-5 max-w-xl text-lg leading-8 text-white/76">
            Gerencie pedidos, cardápio, clientes, entregas e configurações do restaurante em uma experiência simples e direta.
          </p>
          <div className="mt-8 grid gap-3 text-sm font-bold sm:grid-cols-2">
            {["Pedidos em lista", "Cardápio online", "WhatsApp manual", "Impressão de pedidos"].map((item) => (
              <span key={item} className="flex items-center gap-2 rounded-lg bg-white/8 p-3">
                <CheckCircle2 className="h-5 w-5 text-emerald-400" /> {item}
              </span>
            ))}
          </div>
        </div>

        <form action={signIn} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          <div className="mb-7">
            <span className="grid h-12 w-12 place-items-center rounded-xl bg-red-50 text-[#E50914]">
              <ShieldCheck className="h-6 w-6" />
            </span>
            <h2 className="mt-5 text-3xl font-black">Acessar conta</h2>
            <p className="mt-2 text-sm text-slate-500">Use o e-mail e senha cadastrados para entrar no painel.</p>
          </div>

          {errorMessage && <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700">{errorMessage}</div>}

          <div className="space-y-4">
            <label className="block space-y-1">
              <span className="text-xs font-black uppercase tracking-wide text-slate-500">E-mail</span>
              <span className="relative block">
                <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input className="h-12 w-full rounded-lg border border-slate-200 bg-white pl-12 pr-4 text-sm outline-none transition focus:border-[#E50914] focus:ring-4 focus:ring-red-50" name="email" type="email" placeholder="contato@restaurante.com.br" defaultValue="contato@fornonordestino.com.br" required />
              </span>
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-black uppercase tracking-wide text-slate-500">Senha</span>
              <span className="relative block">
                <LockKeyhole className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input className="h-12 w-full rounded-lg border border-slate-200 bg-white pl-12 pr-4 text-sm outline-none transition focus:border-[#E50914] focus:ring-4 focus:ring-red-50" name="password" type="password" placeholder="Digite sua senha" required />
              </span>
            </label>
            <button className="h-12 w-full rounded-lg bg-[#232A31] px-5 text-sm font-black text-white shadow-lg shadow-red-950/20 transition hover:bg-[#E50914]">Entrar no painel</button>
          </div>

          <p className="mt-6 text-center text-sm text-slate-500">Ainda não tem conta <Link className="font-black text-[#E50914]" href="/register">Saiba mais</Link></p>
        </form>
      </section>
    </main>
  );
}
