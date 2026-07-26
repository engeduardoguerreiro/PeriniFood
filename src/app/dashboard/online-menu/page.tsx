import Link from "next/link";
import { requireRestaurant } from "@/lib/auth";

export default async function OnlineMenuPage() {
  const { restaurant } = await requireRestaurant();
  const url = `/cardapio/${restaurant.slug}`;
  return (
    <section className="rounded-2xl bg-white p-6 shadow-sm">
      <h2 className="text-2xl font-black">Site/Cardápio Online</h2>
      <p className="mt-2 text-[#9c988f]">Compartilhe este link com seus clientes para receber pedidos direto no painel.</p>
      <div className="mt-6 rounded-2xl border border-dashed border-[#c5362e] bg-[#211d19]/10 p-5">
        <p className="font-secondary text-lg font-black text-[#c5362e]">{url}</p>
      </div>
      <Link href={url} className="btn-primary mt-6">Abrir cardápio</Link>
    </section>
  );
}
