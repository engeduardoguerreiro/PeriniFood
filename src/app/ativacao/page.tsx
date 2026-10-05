import Link from "next/link";
import { redirect } from "next/navigation";
import { CreditCard, Hourglass, MessageCircle } from "lucide-react";
import { getSessionContext } from "@/lib/auth";
import { getAccessState } from "@/lib/platform-billing";
import { signOut } from "@/app/actions";

export const metadata = { title: "Ativação da loja · PeriniFood" };

const SUPPORT_WHATSAPP = "5511930230911";

// Loja recém-cadastrada: o sistema só libera depois que a equipe PeriniFood
// confirma a assinatura (painel /admin → "Ativar loja").
export default async function ActivationPage() {
  const { user, restaurant } = await getSessionContext();
  if (!user) redirect("/login");
  if (!restaurant) redirect("/register");

  const access = await getAccessState(restaurant.id);
  if (access.status !== "pending") redirect(access.blocked ? "/assinatura-suspensa" : "/dashboard");

  // Link de pagamento da assinatura (ex.: checkout do gateway). Sem ele configurado,
  // o botão não aparece e a ativação é feita pelo contato.
  const paymentUrl = process.env.PLATFORM_PAYMENT_URL?.trim();
  const message = `Olá! Acabei de cadastrar a loja "${restaurant.name}" (/${restaurant.slug}) no PeriniFood e quero ativar a assinatura.`;

  return (
    <main className="grid min-h-screen place-items-center bg-paper px-4 py-12 text-ink">
      <div className="w-full max-w-lg rounded-2xl border border-line bg-white p-6 shadow-[0_1px_2px_rgba(27,26,23,0.04)] sm:p-8">
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-violet-50 text-violet-700"><Hourglass size={20} /></span>
        <h1 className="mt-4 text-center text-2xl font-semibold tracking-tight">Cadastro recebido!</h1>
        <p className="mt-2 text-center text-sm text-ink-soft">
          A loja <strong className="text-ink">{restaurant.name}</strong> está <strong className="text-ink">aguardando ativação</strong>.
          Para liberar o sistema, pague a assinatura ou fale com a nossa equipe.
        </p>

        <ol className="mt-6 space-y-3 text-sm text-ink-body">
          <li className="flex gap-3"><span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-line-soft text-xs font-semibold">1</span>Escolha o plano e pague a assinatura{paymentUrl ? "" : " (nossa equipe envia o link de pagamento)"}.</li>
          <li className="flex gap-3"><span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-line-soft text-xs font-semibold">2</span>Confirmado o pagamento, liberamos o acesso — normalmente no mesmo dia.</li>
          <li className="flex gap-3"><span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-line-soft text-xs font-semibold">3</span>Entre de novo com seu e-mail e senha e comece a montar o cardápio.</li>
        </ol>

        <div className="mt-6 grid gap-2">
          {paymentUrl && (
            <a href={paymentUrl} target="_blank" rel="noreferrer" className="btn-primary w-full py-3">
              <CreditCard size={16} /> Pagar assinatura
            </a>
          )}
          <a
            href={`https://wa.me/${SUPPORT_WHATSAPP}?text=${encodeURIComponent(message)}`}
            target="_blank"
            rel="noreferrer"
            className={paymentUrl ? "btn-muted w-full py-3" : "btn-primary w-full py-3"}
          >
            <MessageCircle size={16} /> Falar com a equipe para ativar
          </a>
          <Link href="/planos" className="mt-1 text-center text-sm font-medium text-brand hover:underline">Ver planos e valores</Link>
        </div>

        <form action={signOut} className="mt-6 text-center">
          <button className="text-xs font-medium text-ink-faint transition hover:text-brand">Sair da conta</button>
        </form>
      </div>
    </main>
  );
}
