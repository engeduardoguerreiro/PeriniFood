import Link from "next/link";
import { ArrowUpRight, ClipboardCheck, Layers, Pizza, ShoppingBag, Tags, ChefHat } from "lucide-react";
import { Icon3D } from "@/components/ui/icon-3d";

const menuItems = [
  {
    title: "Produtos",
    tone: "red" as const,
    description: "Cadastre, edite, ative e organize os itens vendidos no cardápio.",
    href: "/cardapio/produtos",
    icon: ShoppingBag,
  },
  {
    title: "Categorias",
    tone: "orange" as const,
    description: "Organize o cardápio por grupos e ordem de exibição.",
    href: "/cardapio/categorias",
    icon: Layers,
  },
  {
    title: "Tipos",
    tone: "violet" as const,
    description: "Classifique produtos como pizza, esfiha, bebida, combo e sobremesa.",
    href: "/cardapio/tipos",
    icon: Tags,
  },
  {
    title: "Fichas técnicas",
    tone: "amber" as const,
    description: "Padronize o preparo: ingredientes, montagem e padrão visual para imprimir.",
    href: "/cardapio/fichas",
    icon: ClipboardCheck,
  },
  {
    title: "Opções de pizza",
    tone: "pink" as const,
    description: "Configure massas, bordas e adicionais usados nas pizzas.",
    href: "/cardapio/opcoes-pizza",
    icon: Pizza,
  },
];

function CardapioHome() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink flex items-center gap-3"><Icon3D icon={ChefHat} tone="red" size="sm" /><span className="min-w-0">Cardápio</span></h1>
        <p className="text-sm text-ink-faint">Gerencie produtos, categorias, tipos e opções de pizza.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="group flex items-start gap-4 rounded-2xl border border-line bg-white p-5 shadow-[0_1px_2px_rgba(27,26,23,0.04)] transition hover:border-[#dcd8cf] hover:shadow-[0_2px_8px_rgba(27,26,23,0.06)]"
            >
              <Icon3D icon={Icon} tone={item.tone} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-[0.95rem] font-semibold text-ink">{item.title}</h2>
                  <ArrowUpRight size={16} className="shrink-0 text-[#c4bdb0] transition group-hover:text-brand" />
                </div>
                <p className="mt-1 text-sm text-ink-faint">{item.description}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export default function Page() {
  return <><CardapioHome /></>;
}
