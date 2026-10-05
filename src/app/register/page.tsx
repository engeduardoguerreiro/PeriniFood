import Link from "next/link";
import { BadgeCheck, Building2, Globe2, LockKeyhole, Mail, MessageCircle, Store } from "lucide-react";
import { register } from "../actions";
import { AuthShell, authButton, authIcon, authInput, authInputPlain, authLabel } from "@/components/auth-shell";

const highlights = ["Cardápio digital com a sua marca", "Pedidos do site, balcão e delivery numa fila só", "Ativação após confirmação da assinatura", "Preparado para iFood, 99Food e Keeta"];

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;

  return (
    <AuthShell
      aside={
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-bright">Crie sua conta</p>
          <h1 className="mt-3 max-w-xl text-5xl font-bold leading-[1.02] tracking-tight text-balance">
            Sua venda online com <span className="text-brand-bright">identidade própria.</span>
          </h1>
          <p className="mt-5 max-w-lg text-lg text-white/75">Cadastre o restaurante e tenha cardápio digital, PDV, clientes, WhatsApp e painel operacional num só sistema.</p>
          <ul className="mt-6 grid max-w-xl gap-2.5">
            {highlights.map((item) => (
              <li key={item} className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.06] px-4 py-3 text-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
                <BadgeCheck className="h-5 w-5 shrink-0 text-brand-bright" /> {item}
              </li>
            ))}
          </ul>
          <Link href="/planos" className="mt-6 inline-flex h-11 items-center rounded-xl border border-brand-bright/40 bg-black/30 px-4 text-sm font-semibold text-brand-bright backdrop-blur transition hover:bg-white/10">
            Ver detalhes dos planos
          </Link>
        </div>
      }
    >
      <form action={register}>
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-b from-brand-bright to-brand shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_10px_24px_-8px_rgba(242,100,25,0.8)]">
          <Store className="h-6 w-6" />
        </span>
        <h2 className="mt-5 text-3xl font-bold tracking-tight">Criar conta e restaurante</h2>
        <p className="mt-1.5 text-sm text-white/65">O primeiro usuário será o administrador principal do restaurante.</p>

        {error && <p role="alert" className="mt-5 rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-sm font-medium text-red-200">{error}</p>}

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <label className="block space-y-1.5">
            <span className={authLabel}>E-mail</span>
            <span className="relative block"><Mail className={authIcon} /><input className={authInput} name="email" type="email" autoComplete="email" placeholder="voce@restaurante.com.br" required /></span>
          </label>
          <label className="block space-y-1.5">
            <span className={authLabel}>Senha</span>
            <span className="relative block"><LockKeyhole className={authIcon} /><input className={authInput} name="password" type="password" autoComplete="new-password" placeholder="Mínimo de 6 caracteres" minLength={6} required /></span>
          </label>
          <label className="block space-y-1.5 sm:col-span-2">
            <span className={authLabel}>Nome do restaurante</span>
            <span className="relative block"><Building2 className={authIcon} /><input className={authInput} name="restaurant_name" placeholder="Ex.: Pizzaria Forno Nordestino" required /></span>
          </label>
          <label className="block space-y-1.5 sm:col-span-2">
            <span className={authLabel}>WhatsApp para contato</span>
            <span className="relative block"><MessageCircle className={authIcon} /><input className={authInput} name="whatsapp" type="tel" inputMode="tel" autoComplete="tel" placeholder="(11) 99999-9999" required /></span>
          </label>
          <label className="block space-y-1.5">
            <span className={authLabel}>Endereço do cardápio</span>
            <span className="relative block"><Globe2 className={authIcon} /><input className={authInput} name="slug" placeholder="minha-pizzaria" /></span>
          </label>
          <label className="block space-y-1.5">
            <span className={authLabel}>Descrição curta</span>
            <input className={authInputPlain} name="description" placeholder="Pizza, esfiha, lanches..." />
          </label>
        </div>

        <p className="mt-5 rounded-xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-white/75">
          Depois do cadastro, sua loja fica <strong className="text-white">aguardando ativação</strong>: pague a assinatura ou fale com a nossa equipe para liberar o sistema.
        </p>
        <button className={`${authButton} mt-4`}>Criar conta</button>
        <p className="mt-6 text-center text-sm text-white/60">Já tem conta? <Link className="font-semibold text-brand-bright hover:underline" href="/login">Entrar</Link></p>
      </form>
    </AuthShell>
  );
}
