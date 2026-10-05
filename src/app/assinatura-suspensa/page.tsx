import { Lock, MessageCircle } from "lucide-react";
import { redirect } from "next/navigation";
import { getSessionContext } from "@/lib/auth";
import { getAccessState } from "@/lib/platform-billing";
import { signOut } from "@/app/actions";

export const metadata = { title: "Assinatura suspensa · PeriniFood" };

// Tela exibida ao cliente cujo acesso foi suspenso pela equipe PeriniFood
// (mensalidade em atraso). A liberação é feita no painel administrativo.
export default async function SuspendedPage() {
  const { restaurant } = await getSessionContext();
  const access = restaurant ? await getAccessState(restaurant.id) : null;
  if (access?.status === "pending") redirect("/ativacao");
  const supportPhone = "5511930230911";

  return (
    <div className="grid min-h-screen place-items-center bg-[#faf9f6] px-6 py-12">
      <div className="w-full max-w-md rounded-2xl border border-line bg-white p-8 text-center shadow-[0_1px_2px_rgba(27,26,23,0.04)]">
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-[#f6ece9] text-brand"><Lock size={20} /></span>
        <h1 className="mt-4 text-xl font-semibold tracking-tight text-ink">Assinatura suspensa</h1>
        <p className="mt-2 text-sm text-ink-soft">
          O acesso {restaurant ? <>de <strong>{restaurant.name}</strong></> : null} ao PeriniFood está temporariamente bloqueado
          {access?.reason ? <> — {access.reason.toLowerCase()}</> : null}.
        </p>
        <p className="mt-3 text-sm text-ink-faint">
          Seus dados estão preservados. Assim que o pagamento for confirmado, liberamos o sistema na hora.
        </p>
        <a
          href={`https://wa.me/${supportPhone}?text=${encodeURIComponent("Olá! Quero regularizar a assinatura do PeriniFood.")}`}
          target="_blank"
          className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand px-4 py-3 text-sm font-medium text-white transition hover:bg-[#a92c25]"
        >
          <MessageCircle size={15} /> Falar com o financeiro
        </a>
        <form action={signOut} className="mt-3">
          <button className="text-xs font-medium text-ink-faint transition hover:text-brand">Sair da conta</button>
        </form>
      </div>
    </div>
  );
}
