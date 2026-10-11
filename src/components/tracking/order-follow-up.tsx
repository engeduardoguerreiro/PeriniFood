"use client";

import Link from "next/link";
import { CheckCircle2, KeyRound, UtensilsCrossed } from "lucide-react";
import { useEffect, useState } from "react";
import { checkoutEmail, rememberOrder } from "@/lib/recent-orders";

// Guarda o pedido neste aparelho: ao voltar ao cardápio, o cliente vê o pedido
// em andamento sem precisar de conta nem do link.
export function RememberOrder({ slug, code, number }: { slug: string; code: string; number: string }) {
  useEffect(() => { rememberOrder(slug, { code, number }); }, [slug, code, number]);
  return (
    <Link href={`/cardapio/${slug}`} className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-white font-bold text-ink shadow-sm ring-1 ring-black/[0.05]">
      <UtensilsCrossed className="h-5 w-5 text-brand" /> Voltar ao cardápio
    </Link>
  );
}

// Conta em um passo: nome e telefone já vêm do pedido; o cliente só confirma o
// e-mail e cria a senha. O pedido entra no histórico da conta.
export function SaveAccountCard({ slug, code }: { slug: string; code: string }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const saved = checkoutEmail(slug);
    if (saved) Promise.resolve().then(() => setEmail((current) => current || saved));
  }, [slug]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setStatus(null);
    try {
      const response = await fetch("/api/customer-auth/claim", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code, email, password }) });
      const data = await response.json().catch(() => null) as { ok?: boolean; message?: string } | null;
      if (!response.ok || !data?.ok) throw new Error(data?.message ?? "Não foi possível criar a conta agora.");
      setPassword("");
      setStatus({ ok: true, text: "Pronto! Sua conta foi criada. Seus pedidos e dados ficam salvos para a próxima vez." });
    } catch (error) {
      setStatus({ ok: false, text: error instanceof Error ? error.message : "Não foi possível criar a conta agora." });
    } finally {
      setBusy(false);
    }
  }

  if (status?.ok) {
    return (
      <section className="flex items-start gap-3 rounded-2xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">
        <CheckCircle2 className="h-5 w-5 shrink-0" />
        <span>{status.text} <Link href={`/cardapio/${slug}/conta`} className="underline">Ver minha conta</Link></span>
      </section>
    );
  }

  const field = "h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-[0.95rem] outline-none transition focus:border-brand focus:ring-4 focus:ring-brand/10";
  return (
    <section className="rounded-2xl bg-white p-4 shadow-sm" aria-labelledby="salvar-conta">
      <h2 id="salvar-conta" className="flex items-center gap-2 font-black"><KeyRound className="h-5 w-5 text-brand" /> Salve seus dados para o próximo pedido</h2>
      <p className="mt-1 text-sm text-slate-500">Só crie uma senha. Seu nome e telefone já vêm deste pedido, e você poderá acompanhar seus pedidos em qualquer aparelho.</p>
      <form onSubmit={submit} className="mt-3 grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <label className="block"><span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">E-mail</span><input className={field} type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="voce@email.com" /></label>
        <label className="block"><span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Crie uma senha</span><input className={field} type="password" autoComplete="new-password" required minLength={12} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Mínimo de 12 caracteres" /></label>
        <button disabled={busy} className="h-12 rounded-xl bg-gradient-to-b from-brand-bright to-brand px-5 font-bold text-white disabled:opacity-60">{busy ? "Criando…" : "Criar conta"}</button>
      </form>
      {status && !status.ok && <p role="alert" className="mt-3 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">{status.text}</p>}
    </section>
  );
}
