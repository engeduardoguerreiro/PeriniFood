"use client";

/* eslint-disable @next/next/no-img-element */
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Cable,
  ChefHat,
  ChevronDown,
  ChevronsLeft,
  ChevronsRight,
  ClipboardCheck,
  ClipboardList,
  Cog,
  Home,
  LogOut,
  Menu,
  MessageCircle,
  Plus,
  TicketPercent,
  QrCode,
  ShoppingBag,
  Phone,
  Users,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { signOut, updateStoreOperationStatus } from "@/app/actions";
import { isRestaurantOpen } from "@/lib/opening-hours";
import type { Restaurant } from "@/lib/types";
import { cn } from "@/lib/utils";
import { PrinterAgentIndicator } from "./printer-agent-indicator";

const navGroups = [
  ["Operação", [
    ["Início", "/dashboard", Home],
    ["Pedidos", "/pedidos", ClipboardList],
    ["Novo pedido", "/pedidos/novo", ShoppingBag],
  ]],
  ["Catálogo", [
    ["Cardápio", "/cardapio", ChefHat],
    ["Fichas técnicas", "/cardapio/fichas", ClipboardCheck],
    ["Cupons", "/cupons", TicketPercent],
    ["Integrações", "/integracoes", Cable],
  ]],
  ["Gestão", [
    ["Clientes", "/clientes", Users],
    ["Relatórios", "/relatorios", BarChart3],
    ["Site online", "/dashboard/online-menu", QrCode],
    ["Configurações", "/configuracoes", Cog],
  ]],
] as const;

const integrationSubnav = [
  ["Visão geral", "/integracoes"],
  ["99Food", "/integracoes/99food"],
  ["iFood", "/integracoes/ifood"],
  ["Keeta", "/integracoes/keeta"],
  ["WhatsApp", "/integracoes/whatsapp"],
  ["Webhooks / API", "/integracoes/webhooks"],
  ["Logs", "/integracoes/logs"],
] as const;

export type FrameRestaurant = Pick<Restaurant, "name" | "logo_url" | "is_open" | "manual_open_status" | "opening_hours">;

// Cor da pastilha 3D de cada item do menu.
const navTone: Record<string, string> = {
  "/dashboard": "from-[#ff8a3d] to-[#d9480f]",
  "/pedidos": "from-[#4aa8ff] to-[#1d64d8]",
  "/pedidos/novo": "from-[#40d878] to-[#14964a]",
  "/cardapio": "from-[#ff6b5a] to-[#d42a1f]",
  "/cardapio/fichas": "from-[#ffc24a] to-[#d98a00]",
  "/cupons": "from-[#ff7ab6] to-[#d63384]",
  "/integracoes": "from-[#a38bff] to-[#6741e0]",
  "/clientes": "from-[#3fd6c6] to-[#0e9488]",
  "/relatorios": "from-[#7c8cff] to-[#4338ca]",
  "/dashboard/online-menu": "from-[#4fd1ff] to-[#0891b2]",
  "/configuracoes": "from-[#a3acb9] to-[#4b5563]",
};

const allNavHrefs: string[] = navGroups.flatMap(([, items]) => items.map(([, href]) => href));

// Item ativo = o href MAIS LONGO que casa com a rota: em /pedidos/novo só
// "Novo pedido" fica ativo (antes "Pedidos" também acendia).
function activeHref(pathname: string) {
  return allNavHrefs
    .filter((href) => pathname === href || pathname.startsWith(`${href}/`))
    .sort((a, b) => b.length - a.length)[0] ?? null;
}

function NavLinks({ pathname, collapsed, onNavigate }: { pathname: string; collapsed: boolean; onNavigate?: () => void }) {
  const current = activeHref(pathname);
  return (
    <>
      {navGroups.map(([groupLabel, items]) => (
        <div key={groupLabel}>
          {collapsed ? (
            <div className="mx-3 my-2 border-t border-white/10" />
          ) : (
            <p className="px-4 pb-1 pt-3 text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-white/45">{groupLabel}</p>
          )}
          <div className="space-y-0.5">
            {items.map(([label, href, Icon]) => {
              const active = current === href;
              return (
                <div key={href}>
                  <Link
                    href={href}
                    title={collapsed ? label : undefined}
                    aria-label={collapsed ? label : undefined}
                    aria-current={active ? "page" : undefined}
                    onClick={onNavigate}
                    className={cn(
                      "relative mx-2 flex h-10 items-center gap-3 rounded-xl px-2 text-sm transition",
                      collapsed && "justify-center px-0",
                      active ? "bg-gradient-to-r from-white/[0.14] to-white/[0.04] font-semibold text-white ring-1 ring-white/10" : "text-white/70 hover:bg-white/[0.06] hover:text-white",
                    )}
                  >
                    {active && <span className="absolute -left-2 top-2 bottom-2 w-1 rounded-r-full bg-brand-bright shadow-[0_0_10px_rgba(242,100,25,0.9)]" aria-hidden="true" />}
                    <span className={cn("grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-gradient-to-b text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.4),0_4px_10px_-3px_rgba(0,0,0,0.6)] transition", navTone[href] ?? "from-[#a3acb9] to-[#4b5563]", !active && "opacity-85 saturate-[0.85]")}>
                      <Icon className="h-4 w-4" />
                    </span>
                    {!collapsed && <span className="truncate">{label}</span>}
                  </Link>
                  {!collapsed && href === "/integracoes" && pathname.startsWith("/integracoes") && (
                    <div className="mx-2 mb-1 ml-9 space-y-0.5 border-l border-white/10 pl-3">
                      {integrationSubnav.map(([subLabel, subHref]) => (
                        <Link
                          key={subHref}
                          href={subHref}
                          onClick={onNavigate}
                          aria-current={pathname === subHref ? "page" : undefined}
                          className={cn(
                            "block rounded-lg px-2.5 py-1.5 text-xs transition",
                            pathname === subHref ? "font-medium text-[#ff9b5c]" : "text-white/55 hover:text-white",
                          )}
                        >
                          {subLabel}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </>
  );
}

export function AppFrame({ restaurant, children }: { restaurant: FrameRestaurant; children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  // Fecha o menu do celular com Esc e trava a rolagem da página por trás.
  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") setMobileOpen(false); };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [mobileOpen]);
  const supportPhone = "11930230911";
  const storeOpen = isRestaurantOpen(restaurant);
  const manualStatus = restaurant.manual_open_status;
  const statusLabel = manualStatus === "open" ?
     "Aberta manualmente"
    : manualStatus === "closed" ?
       "Fechada manualmente"
      : storeOpen ? "Loja aberta" : "Loja fechada";
  const operationValue = !restaurant.is_open ? "offline" : manualStatus === "open" ? "open" : manualStatus === "closed" ? "closed" : "auto";

  return (
    <div className="panel-3d min-h-screen bg-paper text-ink">
      <header className="fixed inset-x-0 top-0 z-30 grid h-[70px] grid-cols-[auto_1fr_auto] items-center gap-2 border-b border-white/60 bg-white/80 px-3 shadow-[0_10px_30px_-18px_rgba(27,26,23,0.35)] backdrop-blur-xl sm:gap-3 sm:px-5 lg:grid-cols-[1fr_auto_1fr]">
        <div className="flex min-w-0 items-center gap-2">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          aria-label="Abrir menu"
          aria-expanded={mobileOpen}
          aria-controls="menu-mobile"
          className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-line bg-white text-[#403d38] lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>
        <Link href="/dashboard" aria-label="PeriniFood — início" className="flex min-w-0 items-center gap-3">
          <span className="grid h-11 w-11 place-items-center overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
            <Image src="/brand/perinifood-logo.png" alt="" width={40} height={40} className="h-full w-full object-contain" loading="eager" />
          </span>
          <span className="hidden min-w-0 md:block">
            <span className="block whitespace-nowrap text-[1.2em] font-black text-ink">Perini<span className="text-brand">Food</span></span>
            <span className="hidden text-[0.72em] font-bold uppercase text-ink-faint xl:block">Gestão para restaurantes</span>
          </span>
        </Link>
        </div>

        <div className="flex min-w-0 justify-center">
          <form action={updateStoreOperationStatus} className="group relative flex min-w-0 max-w-full items-center justify-center gap-2 rounded-2xl border border-line bg-white px-2.5 py-1.5 shadow-[0_1px_2px_rgba(27,26,23,0.04)] transition focus-within:ring-2 focus-within:ring-brand sm:min-w-[300px] sm:gap-3 sm:px-4 sm:py-2">
            <span className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full bg-[#403d38] text-xs font-medium text-white sm:h-10 sm:w-10">
              {restaurant.logo_url ? <img src={restaurant.logo_url} alt="" className="h-full w-full object-cover" /> : restaurant.name.slice(0, 2)}
            </span>
            <span className="min-w-0">
              <span className="block max-w-28 truncate text-[0.95em] font-bold sm:max-w-56">{restaurant.name}</span>
              <span className="flex items-center gap-1.5 text-[0.72em] text-ink-faint">
                <span className={storeOpen ? "h-2 w-2 rounded-full bg-emerald-500" : "h-2 w-2 rounded-full bg-brand"} />
                {statusLabel}
              </span>
            </span>
            <select
              name="operation_status"
              defaultValue={operationValue}
              onChange={(event) => event.currentTarget.form?.requestSubmit()}
              className="absolute inset-0 cursor-pointer opacity-0"
              title="Alterar status da loja"
              aria-label={`Status da loja: ${statusLabel}. Alterar`}
            >
              <option value="auto">Automático pelo horário</option>
              <option value="open">Abrir manualmente</option>
              <option value="closed">Fechar manualmente</option>
              <option value="offline">Desligar pedidos</option>
            </select>
            <ChevronDown className="h-4 w-4 shrink-0 text-ink-faint transition group-hover:text-brand" />
          </form>
        </div>

        <div className="flex justify-end gap-2 sm:gap-3">
          <PrinterAgentIndicator />
          <a href={`tel:+55${supportPhone}`} title="Telefone do suporte" aria-label="Ligar para o suporte" className="hidden h-12 w-12 place-items-center md:grid rounded-2xl border border-line bg-white text-[#403d38] shadow-sm transition hover:-translate-y-0.5 hover:border-brand hover:text-brand">
            <Phone className="h-5 w-5" />
          </a>
          <a href={`https://wa.me/55${supportPhone}`} target="_blank" rel="noreferrer" title="Suporte no WhatsApp" aria-label="Falar com o suporte no WhatsApp" className="hidden h-12 w-12 place-items-center md:grid rounded-2xl border border-line bg-white text-[#403d38] shadow-sm transition hover:-translate-y-0.5 hover:border-brand hover:text-brand">
            <MessageCircle className="h-6 w-6" />
          </a>
          <form action={signOut} className="hidden sm:block">
            <button title="Sair do sistema" aria-label="Sair do sistema" className="grid h-12 w-12 place-items-center rounded-2xl border border-line bg-white text-[#403d38] shadow-sm transition hover:-translate-y-0.5 hover:border-brand hover:text-brand">
              <LogOut className="h-5 w-5" />
            </button>
          </form>
        </div>
      </header>

      <aside className={cn(
        "fixed bottom-0 left-0 top-[70px] z-20 hidden bg-gradient-to-b from-[#1a1a1c] via-[#0f0f10] to-[#070708] text-white shadow-[inset_-1px_0_0_rgba(255,255,255,0.06),10px_0_30px_-18px_rgba(0,0,0,0.45)] transition-[width] duration-200 lg:block",
        collapsed ? "w-[70px]" : "w-64",
      )}>
        <nav className="flex h-full flex-col overflow-y-auto py-2">
          <button
            type="button"
            onClick={() => setCollapsed((value) => !value)}
            className={cn("mx-2 mb-1 flex h-8 items-center gap-2 rounded-xl px-3 text-white/50 transition hover:bg-white/[0.07] hover:text-white", collapsed && "justify-center px-0")}
            title={collapsed ? "Expandir menu" : "Recolher menu"}
            aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
            aria-expanded={!collapsed}
          >
            {collapsed ? <ChevronsRight className="h-[18px] w-[18px]" /> : <><ChevronsLeft className="h-[18px] w-[18px]" /><span className="text-xs font-medium uppercase tracking-[0.08em]">Recolher</span></>}
          </button>
          <NavLinks pathname={pathname} collapsed={collapsed} />
          <div className="mt-auto space-y-1 border-t border-white/10 pt-3">
            <Link href="/pedidos/novo" title="Novo pedido" aria-label={collapsed ? "Novo pedido" : undefined} className={cn("mx-2 flex h-10 items-center gap-3 rounded-xl bg-btn px-3 text-sm font-medium text-white shadow-[0_6px_16px_-6px_rgba(242,100,25,0.7)] transition hover:bg-btn-hover", collapsed && "justify-center px-0")}>
              <Plus className="h-[18px] w-[18px] shrink-0" />
              {!collapsed && <span>Novo pedido</span>}
            </Link>
            <form action={signOut}>
              <button title="Sair" aria-label={collapsed ? "Sair" : undefined} className={cn("mx-2 flex h-10 w-[calc(100%-1rem)] items-center gap-3 rounded-xl px-3 text-sm font-medium text-white/70 transition hover:bg-white/[0.07] hover:text-white", collapsed && "justify-center px-0")}>
                <LogOut className="h-5 w-5 shrink-0" />
                {!collapsed && <span>Sair</span>}
              </button>
            </form>
          </div>
        </nav>
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <button type="button" aria-label="Fechar menu" className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <nav id="menu-mobile" className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col overflow-y-auto bg-gradient-to-b from-[#1a1a1c] to-[#070708] pb-[max(1rem,env(safe-area-inset-bottom))] text-white shadow-xl">
            <div className="flex h-[70px] shrink-0 items-center justify-between border-b border-white/10 px-4">
              <span className="text-[1.2em] font-black text-white">Perini<span className="text-[#ff9b5c]">Food</span></span>
              <button type="button" onClick={() => setMobileOpen(false)} aria-label="Fechar menu" className="grid h-11 w-11 place-items-center rounded-2xl text-white/70 hover:bg-white/[0.07]">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="py-2">
              <NavLinks pathname={pathname} collapsed={false} onNavigate={() => setMobileOpen(false)} />
            </div>
            <div className="mt-auto space-y-1 border-t border-white/10 px-2 pt-3">
              <a href={`https://wa.me/55${supportPhone}`} target="_blank" rel="noreferrer" className="flex h-10 items-center gap-3 rounded-xl px-3 text-sm text-white/70 hover:bg-white/[0.07]">
                <MessageCircle className="h-5 w-5" /> Suporte no WhatsApp
              </a>
              <form action={signOut}>
                <button className="flex h-10 w-full items-center gap-3 rounded-xl px-3 text-sm font-medium text-white/70 hover:bg-white/[0.07] hover:text-white">
                  <LogOut className="h-5 w-5" /> Sair
                </button>
              </form>
            </div>
          </nav>
        </div>
      )}

      <main className={cn("min-h-screen pt-[70px] transition-[padding] duration-200", collapsed ? "lg:pl-[70px]" : "lg:pl-64")}>
        <div className="px-4 py-5 sm:px-5 sm:py-6 lg:px-8">{children}</div>
      </main>
    </div>
  );
}
