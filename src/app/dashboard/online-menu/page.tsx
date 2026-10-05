import Link from "next/link";
import { requireRestaurant } from "@/lib/auth";
import { Icon3D } from "@/components/ui/icon-3d";
import { QrCode } from "lucide-react";

export default async function OnlineMenuPage() {
  const { restaurant } = await requireRestaurant();
  const url = `/cardapio/${restaurant.slug}`;
  return (
    <section className="rounded-2xl bg-white p-6 shadow-sm">
      <h2 className="text-2xl font-black flex items-center gap-3"><Icon3D icon={QrCode} tone="cyan" size="sm" /><span className="min-w-0">Site/Cardápio Online</span></h2>
      <p className="mt-2 text-ink-faint">Compartilhe este link com seus clientes para receber pedidos direto no painel.</p>
      <div className="mt-6 rounded-2xl border border-dashed border-brand bg-btn/10 p-5">
        <p className="font-secondary text-lg font-black text-brand">{url}</p>
      </div>
      <Link href={url} className="btn-primary mt-6">Abrir cardápio</Link>
    </section>
  );
}
