import { requireRestaurant } from "@/lib/auth";
import { money } from "@/lib/utils";

export default async function CashRegisterPage() {
  const { supabase, restaurant } = await requireRestaurant();
  const { data } = await supabase.from("cash_registers").select("*").eq("restaurant_id", restaurant.id).order("opened_at", { ascending: false }).limit(1).maybeSingle();
  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_1fr]">
      <section className="rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="text-xl font-black">Caixa</h2>
        <p className="mt-3 text-[#9c988f]">Status atual: <strong>{data.status ?? "sem caixa aberto"}</strong></p>
        <p className="mt-2">Abertura: <strong>{money(data.opening_amount ?? 0)}</strong></p>
        <div className="mt-5 grid gap-2 sm:grid-cols-2"><button className="btn-primary">Abrir caixa</button><button className="btn-muted">Fechar caixa</button></div>
      </section>
      <section className="rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="text-xl font-black">Movimentos</h2>
        <div className="mt-4 grid gap-2 sm:grid-cols-3"><button className="btn-muted">Suprimento</button><button className="btn-muted">Sangria</button><button className="btn-muted">Despesa</button></div>
        <p className="mt-5 text-sm text-[#9c988f]">Resumo por forma de pagamento aparece a partir dos pedidos pagos no PDV.</p>
      </section>
    </div>
  );
}
