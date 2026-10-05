import { BarChart3, Bell, Bike, ChefHat, ClipboardList, Cog, Home, Monitor, Search, ShoppingCart, Users } from "lucide-react";

// Aparelhos da vitrine (tablet com o painel, celular com o cardápio e impressora
// com a comanda) montados em HTML/CSS: ficam nítidos em qualquer tela e mostram
// o produto de verdade. A perspectiva 3D vem só de transform — sem biblioteca.

const sidebar = [
  [Home, "Início"],
  [ClipboardList, "Pedidos"],
  [ChefHat, "Cardápio"],
  [Monitor, "PDV"],
  [Users, "Clientes"],
  [Bike, "Entregas"],
  [BarChart3, "Relatórios"],
  [Cog, "Configurações"],
] as const;

const orders = [
  { code: "#1042", where: "Mesa 4", items: "Pizza Calabresa · Refrigerante 2L", status: "Em preparo", tone: "bg-orange-100 text-orange-700", bar: "bg-orange-500", time: "12 min" },
  { code: "#1043", where: "Delivery", items: "Pizza Frango c/ Catupiry", status: "Novo", tone: "bg-sky-100 text-sky-700", bar: "bg-sky-500", time: "2 min" },
  { code: "#1041", where: "Balcão", items: "Pizza Portuguesa · Coca-Cola 2L", status: "Pronto", tone: "bg-emerald-100 text-emerald-700", bar: "bg-emerald-500", time: "18 min" },
  { code: "#1040", where: "Mesa 2", items: "Pizza Marguerita · Água", status: "Em entrega", tone: "bg-violet-100 text-violet-700", bar: "bg-violet-500", time: "25 min" },
];

function PizzaThumb({ className = "" }: { className?: string }) {
  return <span className={`block bg-[url('/landing/pizza.webp')] bg-cover bg-center ${className}`} aria-hidden="true" />;
}

function TabletScreen() {
  return (
    <div className="grid h-full grid-cols-[27%_1fr] overflow-hidden rounded-[0.9rem] bg-[#f7f6f3] text-[0.5rem] leading-tight text-ink sm:text-[0.56rem]">
      <aside className="flex flex-col gap-0.5 bg-[#17110c] px-2 py-3 text-white/70">
        <span className="mb-2 flex items-center gap-1 px-1 text-[0.62rem] font-semibold text-white">Perini<span className="text-brand-bright">Food</span></span>
        {sidebar.map(([Icon, label], index) => (
          <span key={label} className={`flex items-center gap-1.5 rounded-md px-1.5 py-1 ${index === 0 ? "bg-brand text-white" : ""}`}>
            <Icon className="h-2.5 w-2.5 shrink-0" /> {label}
          </span>
        ))}
      </aside>
      <div className="grid grid-cols-[1fr_38%] gap-2 p-2.5">
        <div className="min-w-0">
          <div className="flex items-center justify-between">
            <strong className="text-[0.72rem] font-semibold">Pedidos</strong>
            <span className="flex items-center gap-1 rounded-md border border-line bg-white px-1.5 py-0.5 text-ink-faint"><Search className="h-2 w-2" /> Buscar pedido…</span>
          </div>
          <div className="mt-2 flex gap-1">
            {["Todos (12)", "Balcão (3)", "Delivery (6)", "Mesa (3)"].map((tab, index) => (
              <span key={tab} className={`rounded-md px-1.5 py-0.5 ${index === 0 ? "border border-brand/40 bg-brand-soft text-brand" : "bg-white text-ink-soft"}`}>{tab}</span>
            ))}
          </div>
          <div className="mt-2 space-y-1.5">
            {orders.map((order) => (
              <div key={order.code} className="relative flex items-center justify-between gap-2 overflow-hidden rounded-md bg-white py-1.5 pl-2.5 pr-1.5 shadow-[0_1px_2px_rgba(0,0,0,0.06)]">
                <span className={`absolute inset-y-0 left-0 w-[3px] ${order.bar}`} />
                <span className="min-w-0">
                  <strong className="font-semibold">{order.code}</strong> <span className="text-ink-faint">{order.where}</span>
                  <span className="block truncate text-ink-faint">{order.items}</span>
                </span>
                <span className="flex shrink-0 flex-col items-end gap-0.5">
                  <span className={`rounded px-1 py-px font-medium ${order.tone}`}>{order.status}</span>
                  <span className="text-ink-faint">{order.time}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
        <div className="flex min-w-0 flex-col rounded-md bg-white p-1.5 shadow-[0_1px_2px_rgba(0,0,0,0.06)]">
          <PizzaThumb className="aspect-[4/3] w-full rounded" />
          <strong className="mt-1.5 text-[0.62rem] font-semibold">Pizza Calabresa</strong>
          <span className="text-ink-faint">Molho de tomate, mussarela e calabresa</span>
          <strong className="mt-1 text-[0.62rem]">R$ 44,90</strong>
          <span className="mt-1.5 text-ink-soft">Tamanho</span>
          <span className="mt-0.5 grid grid-cols-3 gap-1 text-center">
            {["P", "M", "G"].map((size) => <span key={size} className={`rounded py-0.5 ${size === "G" ? "bg-brand text-white" : "border border-line"}`}>{size}</span>)}
          </span>
          <span className="mt-auto rounded bg-brand py-1 text-center font-semibold text-white">Adicionar</span>
        </div>
      </div>
    </div>
  );
}

function PhoneScreen() {
  return (
    <div className="h-full overflow-hidden rounded-[1.35rem] bg-white text-[0.5rem] leading-tight text-ink">
      <div className="flex items-center justify-between px-2.5 pb-1 pt-3">
        <span className="font-semibold">Perini<span className="text-brand">Food</span></span>
        <ShoppingCart className="h-2.5 w-2.5 text-brand" />
      </div>
      <div className="relative mx-2 h-16 overflow-hidden rounded-lg bg-[#2a1608]">
        <PizzaThumb className="absolute -right-3 top-0 h-16 w-24 opacity-90" />
        <p className="relative px-2 pt-2 text-[0.72rem] font-black uppercase leading-none text-white">Pizzas<span className="block text-[0.5rem] font-semibold normal-case text-brand-bright">com mais sabor</span></p>
      </div>
      <div className="flex gap-2 px-2.5 pt-2 text-ink-faint">
        <span className="border-b border-brand font-semibold text-brand">Pizzas</span><span>Lanches</span><span>Bebidas</span><span>Combos</span>
      </div>
      <div className="grid grid-cols-2 gap-1.5 p-2">
        {[["Calabresa", "44,90"], ["Marguerita", "42,90"], ["Frango", "46,90"], ["Portuguesa", "45,90"]].map(([name, price]) => (
          <div key={name} className="overflow-hidden rounded-md border border-line-soft">
            <PizzaThumb className="aspect-square w-full" />
            <p className="px-1 pt-1 font-medium">Pizza {name}</p>
            <p className="px-1 pb-1 font-semibold">R$ {price}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function HeroDevices() {
  return (
    // Em telas largas deixa a faixa da direita livre para o letreiro neon.
    <div className="relative mx-auto aspect-[16/11] w-full max-w-[640px] [perspective:1800px] xl:ml-0 xl:max-w-[560px]" aria-hidden="true">
      {/* Sombra no "balcão" para os aparelhos parecerem apoiados. */}
      <div className="absolute inset-x-[8%] bottom-[2%] h-[12%] rounded-[50%] bg-black/60 blur-2xl" />

      <div className="absolute right-[2%] top-[4%] w-[78%] origin-right [transform:rotateY(-16deg)_rotateX(5deg)] [transform-style:preserve-3d] motion-safe:animate-[float_7s_ease-in-out_infinite]">
        <div className="rounded-[1.4rem] bg-gradient-to-br from-[#3a3632] via-[#151311] to-[#060505] p-[3.2%] shadow-[0_40px_80px_-20px_rgba(0,0,0,0.85),0_0_0_1px_rgba(255,255,255,0.08)_inset]">
          <div className="aspect-[16/10.4]">
            <TabletScreen />
          </div>
        </div>
        <div className="mx-auto h-3 w-1/4 rounded-b-xl bg-gradient-to-b from-[#1d1a17] to-[#0b0a09]" />
      </div>

      <div className="absolute bottom-[5%] left-[3%] w-[28%] [transform:rotateY(14deg)_rotateZ(-3deg)] motion-safe:animate-[float_6s_ease-in-out_0.8s_infinite]">
        <div className="rounded-[1.7rem] bg-gradient-to-br from-[#45403b] via-[#141210] to-black p-[5%] shadow-[0_30px_60px_-12px_rgba(0,0,0,0.9),0_0_0_1px_rgba(255,255,255,0.1)_inset]">
          <div className="aspect-[9/19]">
            <PhoneScreen />
          </div>
        </div>
      </div>

      <div className="absolute -right-[4%] bottom-[8%] hidden w-[24%] sm:block">
        <div className="mx-auto w-[78%] rounded-t-sm bg-white px-2 pb-3 pt-2 text-[0.42rem] leading-tight text-ink shadow-lg [transform:rotateZ(3deg)]">
          <p className="text-center font-semibold italic">PeriniFood</p>
          <p className="mt-1 text-center">PEDIDO #1042</p>
          <p className="mt-1 flex justify-between border-t border-dashed border-ink/30 pt-1"><span>Pizza Calabresa</span><span>1</span></p>
          <p className="flex justify-between"><span>Refrigerante 2L</span><span>1</span></p>
          <p className="mt-1 border-t border-dashed border-ink/30 pt-1 font-semibold">Mesa 4 · R$ 89,90</p>
        </div>
        <div className="relative -mt-1 rounded-xl bg-gradient-to-b from-[#2b2724] to-[#0d0c0b] px-3 pb-6 pt-4 shadow-[0_24px_40px_-10px_rgba(0,0,0,0.9),0_0_0_1px_rgba(255,255,255,0.08)_inset]">
          <span className="absolute inset-x-3 top-1.5 h-1 rounded-full bg-black/80" />
          <p className="text-center text-[0.5rem] font-semibold text-white/60">PeriniFood</p>
        </div>
      </div>

      <div className="absolute left-[30%] top-[-2%] hidden items-center gap-2 rounded-xl border border-white/10 bg-white/95 px-3 py-2 text-ink shadow-2xl md:flex motion-safe:animate-[float_5s_ease-in-out_1.5s_infinite]">
        <span className="grid h-7 w-7 place-items-center rounded-full bg-emerald-50 text-emerald-600"><Bell className="h-3.5 w-3.5" /></span>
        <span className="text-[0.68rem] leading-tight"><strong className="block font-semibold">Novo pedido recebido</strong><span className="text-ink-faint">#1043 · Delivery · R$ 46,90</span></span>
      </div>
    </div>
  );
}
