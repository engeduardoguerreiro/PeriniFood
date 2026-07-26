import Link from "next/link";
import { ArrowUpRight, Layers, Pizza, ShoppingBag, Tags } from "lucide-react";
import { AppShell } from "@/components/app-shell";

const menuItems = [
  {
    title: "Produtos",
    description: "Cadastre, edite, ative e organize os itens vendidos no cardápio.",
    href: "/cardapio/produtos",
    icon: ShoppingBag,
    primary: true,
  },
  {
    title: "Categorias",
    description: "Organize o cardápio por grupos e ordem de exibição.",
    href: "/cardapio/categorias",
    icon: Layers,
  },
  {
    title: "Tipos",
    description: "Classifique produtos como pizza, esfiha, bebida, combo e sobremesa.",
    href: "/cardapio/tipos",
    icon: Tags,
  },
  {
    title: "Opções de pizza",
    description: "Configure massas, bordas e adicionais usados nas pizzas.",
    href: "/cardapio/opcoes-pizza",
    icon: Pizza,
  },
];

function CardapioHome() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[#1b1a17]">Cardápio</h1>
        <p className="text-sm text-[#9c988f]">Gerencie produtos, categorias, tipos e opções de pizza.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="group flex items-start gap-4 rounded-2xl border border-[#e7e4dd] bg-white p-5 shadow-[0_1px_2px_rgba(27,26,23,0.04)] transition hover:border-[#dcd8cf] hover:shadow-[0_2px_8px_rgba(27,26,23,0.06)]"
            >
              <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${item.primary ? "bg-[#211d19] text-white" : "bg-[#faf9f6] text-[#6d6a63]"}`}>
                <Icon size={19} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-[0.95rem] font-semibold text-[#1b1a17]">{item.title}</h2>
                  <ArrowUpRight size={16} className="shrink-0 text-[#c4bdb0] transition group-hover:text-[#c5362e]" />
                </div>
                <p className="mt-1 text-sm text-[#9c988f]">{item.description}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export default function Page() {
  return <AppShell><CardapioHome /></AppShell>;
}
