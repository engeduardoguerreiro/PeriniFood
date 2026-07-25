import Link from "next/link";
import { AppShell } from "@/components/app-shell";

const menuItems = [
  {
    title: "Produtos",
    description: "Cadastre, edite, ative e organize os itens vendidos no cardápio.",
    href: "/cardapio/produtos",
    primary: true,
  },
  {
    title: "Categorias",
    description: "Organize o cardápio por grupos e ordem de exibição.",
    href: "/cardapio/categorias",
  },
  {
    title: "Tipos",
    description: "Classifique produtos como pizza, esfiha, bebida, combo e sobremesa.",
    href: "/cardapio/tipos",
  },
  {
    title: "Opções pizza",
    description: "Configure massas, bordas e adicionais usados nas pizzas.",
    href: "/cardapio/opcoes-pizza",
  },
];

function CardapioHome() {
  return (
    <section className="rounded-2xl bg-white p-6 shadow-sm">
      <h2 className="text-2xl font-black">Cardápio administrativo</h2>
      <p className="mt-2 text-slate-500">Gerencie produtos, categorias, tipos e opções de pizza.</p>

      <div className="mt-5 overflow-hidden rounded-xl border border-slate-200">
        <div className="grid grid-cols-[220px_1fr_120px] gap-3 border-b border-slate-200 bg-slate-50/80 px-4 py-2 text-[11px] font-black uppercase text-slate-500 max-md:hidden">
          <span>AREA</span>
          <span>Descrição</span>
          <span className="text-right">Ação</span>
        </div>
        <div className="divide-y divide-slate-200">
          {menuItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="grid gap-2 px-4 py-3 transition hover:bg-red-50/60 md:grid-cols-[220px_1fr_120px] md:items-center"
            >
              <span className="text-base font-black text-slate-900">{item.title}</span>
              <span className="text-sm text-slate-500">{item.description}</span>
              <span className={item.primary ? "inline-flex h-9 items-center justify-center rounded-lg bg-[#E50914] px-3 text-xs font-black text-white" : "inline-flex h-9 items-center justify-center rounded-lg border border-red-200 bg-white px-3 text-xs font-black text-slate-800"}>
                Abrir
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function Page() {
  return <AppShell><CardapioHome /></AppShell>;
}
