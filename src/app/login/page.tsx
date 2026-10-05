import Link from "next/link";
import { CheckCircle2, LockKeyhole, Mail, ShieldCheck } from "lucide-react";
import { signIn } from "../actions";
import { AuthShell, authButton, authIcon, authInput, authLabel } from "@/components/auth-shell";
import { HeroDevices } from "@/components/landing/devices";

function loginErrorMessage(error: string) {
  if (!error) return null;
  const decoded = decodeURIComponent(error);
  if (decoded.toLowerCase().includes("invalid login credentials")) return "E-mail ou senha inválidos. Confira os dados e tente novamente.";
  if (decoded.toLowerCase().includes("email not confirmed")) return "Confirme o e-mail antes de acessar.";
  return decoded;
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error: string; message?: string }> }) {
  const sp = await searchParams;
  const errorMessage = loginErrorMessage(sp.error);

  return (
    <AuthShell
      aside={
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-bright">Painel do restaurante</p>
          <h1 className="mt-3 max-w-xl text-5xl font-bold leading-[1.02] tracking-tight text-balance">
            Entre e acompanhe sua operação <span className="text-brand-bright">em tempo real.</span>
          </h1>
          <div className="mt-6 max-w-[520px]">
            <HeroDevices />
          </div>
          <ul className="mt-4 grid max-w-xl grid-cols-2 gap-2 text-sm">
            {["Pedidos em tempo real", "Cardápio online", "Impressão da comanda", "Relatórios de vendas"].map((item) => (
              <li key={item} className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-brand-bright" /> {item}
              </li>
            ))}
          </ul>
        </div>
      }
    >
      <form action={signIn}>
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-b from-brand-bright to-brand shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_10px_24px_-8px_rgba(242,100,25,0.8)]">
          <ShieldCheck className="h-6 w-6" />
        </span>
        <h2 className="mt-5 text-3xl font-bold tracking-tight">Acessar conta</h2>
        <p className="mt-1.5 text-sm text-white/65">Use o e-mail e a senha cadastrados para entrar no painel.</p>

        {sp.message && <p role="status" className="mt-5 rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-3 text-sm font-medium text-emerald-200">{decodeURIComponent(sp.message)}</p>}
        {errorMessage && <p role="alert" className="mt-5 rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-sm font-medium text-red-200">{errorMessage}</p>}

        <div className="mt-6 space-y-4">
          <label className="block space-y-1.5">
            <span className={authLabel}>E-mail</span>
            <span className="relative block">
              <Mail className={authIcon} />
              <input className={authInput} name="email" type="email" autoComplete="email" placeholder="contato@restaurante.com.br" required />
            </span>
          </label>
          <label className="block space-y-1.5">
            <span className={authLabel}>Senha</span>
            <span className="relative block">
              <LockKeyhole className={authIcon} />
              <input className={authInput} name="password" type="password" autoComplete="current-password" placeholder="Digite sua senha" required />
            </span>
          </label>
          <button className={authButton}>Entrar no painel</button>
        </div>

        <p className="mt-6 text-center text-sm text-white/60">Ainda não tem conta? <Link className="font-semibold text-brand-bright hover:underline" href="/register">Criar conta</Link></p>
      </form>
    </AuthShell>
  );
}
