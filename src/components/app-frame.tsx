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
  ClipboardList,
  Cog,
  Home,
  LogOut,
  MessageCircle,
  Plus,
  TicketPercent,
  QrCode,
  ShoppingBag,
  Phone,
  Users,
} from "lucide-react";
import { useState } from "react";
import { signOut, updateStoreOperationStatus } from "@/app/actions";
import { isRestaurantOpen } from "@/lib/opening-hours";
import type { Restaurant } from "@/lib/types";
import { cn } from "@/lib/utils";
import { PrinterAgentIndicator } from "./printer-agent-indicator";

const navGroups = [
  ["Operação", [
    ["Dashboard", "/dashboard", Home],
    ["Pedidos", "/pedidos", ClipboardList],
    ["Novo pedido", "/pedidos/novo", ShoppingBag],
  ]],
  ["Catálogo", [
    ["Cardápio", "/cardapio", ChefHat],
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

export function AppFrame({ restaurant, children }: { restaurant: Restaurant; children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
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
    <div className="min-h-screen bg-[#f7f6f3] text-[#1b1a17]">
      <header style={{ fontSize: "14px" }} className="fixed inset-x-0 top-0 z-30 grid h-[70px] grid-cols-[1fr_auto_1fr] items-center border-b border-[#e7e4dd] bg-white/90 px-5 shadow-[0_1px_2px_rgba(27,26,23,0.04)] backdrop-blur-xl">
        <Link href="/dashboard" className="flex min-w-0 items-center gap-3">
          <span className="grid h-11 w-11 place-items-center overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
            <Image src="/brand/perinifood-logo.png" alt="" width={40} height={40} className="h-full w-full object-contain" priority />
          </span>
          <span className="min-w-0">
            <span className="block whitespace-nowrap text-[1.2em] font-black text-[#1b1a17]">Perini<span className="text-[#c5362e]">Food</span></span>
            <span className="hidden text-[0.72em] font-bold uppercase text-[#9c988f] sm:block">Gestão para restaurantes</span>
          </span>
        </Link>

        <div className="flex justify-center">
          <form action={updateStoreOperationStatus} className="group relative flex min-w-[300px] items-center justify-center gap-3 rounded-2xl border border-[#e7e4dd] bg-white px-4 py-2 shadow-[0_1px_2px_rgba(27,26,23,0.04)] transition">
            <span className="grid h-10 w-10 place-items-center overflow-hidden rounded-full bg-[#403d38] text-xs font-medium text-white">
              {restaurant.logo_url ? <img src={restaurant.logo_url} alt="" className="h-full w-full object-cover" /> : restaurant.name.slice(0, 2)}
            </span>
            <span className="min-w-0">
              <span className="block max-w-56 truncate text-[0.95em] font-bold">{restaurant.name}</span>
              <span className="flex items-center gap-1.5 text-[0.72em] text-[#9c988f]">
                <span className={storeOpen ? "h-2 w-2 rounded-full bg-emerald-500" : "h-2 w-2 rounded-full bg-[#c5362e]"} />
                {statusLabel}
              </span>
            </span>
            <select
              name="operation_status"
              defaultValue={operationValue}
              onChange={(event) => event.currentTarget.form?.requestSubmit()}
              className="absolute inset-0 cursor-pointer opacity-0"
              title="Alterar status da loja"
            >
              <option value="auto">Automático pelo horário</option>
              <option value="open">Abrir manualmente</option>
              <option value="closed">Fechar manualmente</option>
              <option value="offline">Desligar pedidos</option>
            </select>
            <ChevronDown className="h-4 w-4 text-[#9c988f] transition group-hover:text-[#c5362e]" />
          </form>
        </div>

        <div className="flex justify-end gap-3">
          <PrinterAgentIndicator />
          <a href={`tel:+55${supportPhone}`} title="Telefone" className="grid h-12 w-12 place-items-center rounded-2xl border border-[#e7e4dd] bg-white text-[#403d38] shadow-sm transition hover:-translate-y-0.5 hover:border-[#c5362e] hover:text-[#c5362e]">
            <Phone className="h-5 w-5" />
          </a>
          <a href={`https://wa.me/55${supportPhone}`} target="_blank" rel="noreferrer" title="Chat WhatsApp" className="grid h-12 w-12 place-items-center rounded-2xl border border-[#e7e4dd] bg-white text-[#403d38] shadow-sm transition hover:-translate-y-0.5 hover:border-[#c5362e] hover:text-[#c5362e]">
            <MessageCircle className="h-6 w-6" />
          </a>
          <form action={signOut}>
            <button title="Sair do sistema" className="grid h-12 w-12 place-items-center rounded-2xl border border-[#e7e4dd] bg-white text-[#403d38] shadow-sm transition hover:-translate-y-0.5 hover:border-[#c5362e] hover:text-[#c5362e]">
              <LogOut className="h-5 w-5" />
            </button>
          </form>
        </div>
      </header>

      <aside className={cn(
        "fixed bottom-0 left-0 top-[70px] z-20 hidden border-r border-[#e7e4dd] bg-white/90 backdrop-blur-xl transition-[width] duration-200 lg:block",
        collapsed ? "w-[70px]" : "w-64",
      )}>
        <nav className="flex h-full flex-col overflow-y-auto py-3">
          <button
            type="button"
            onClick={() => setCollapsed((value) => !value)}
            className={cn("mx-2 mb-2 flex h-9 items-center gap-2 rounded-xl px-3 text-[#9c988f] transition hover:bg-[#faf9f6] hover:text-[#403d38]", collapsed && "justify-center px-0")}
            title={collapsed ? "Expandir menu" : "Recolher menu"}
          >
            {collapsed ? <ChevronsRight className="h-[18px] w-[18px]" /> : <><ChevronsLeft className="h-[18px] w-[18px]" /><span className="text-xs font-medium uppercase tracking-[0.08em]">Recolher</span></>}
          </button>
          {navGroups.map(([groupLabel, items]) => (
            <div key={groupLabel}>
              {collapsed ? (
                <div className="mx-3 my-2 border-t border-[#efece6]" />
              ) : (
                <p className="px-4 pb-1 pt-4 text-[0.62rem] font-semibold uppercase tracking-[0.12em] text-[#b0aaa0]">{groupLabel}</p>
              )}
              <div className="space-y-0.5">
                {items.map(([label, href, Icon]) => {
                  const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
                  return (
                    <div key={href}>
                      <Link
                        href={href}
                        title={label}
                        className={cn(
                          "mx-2 flex h-10 items-center gap-3 rounded-xl px-3 text-sm transition",
                          collapsed && "justify-center px-0",
                          active ? "bg-[#f3f1ea] font-medium text-[#1b1a17]" : "text-[#6d6a63] hover:bg-[#faf9f6] hover:text-[#1b1a17]",
                        )}
                      >
                        <Icon className={cn("h-[18px] w-[18px] shrink-0", active ? "text-[#c5362e]" : "text-[#9c988f]")} />
                        {!collapsed && <span className="truncate">{label}</span>}
                      </Link>
                      {!collapsed && href === "/integracoes" && pathname.startsWith("/integracoes") && (
                        <div className="mx-2 mb-1 ml-9 space-y-0.5 border-l border-[#efece6] pl-3">
                          {integrationSubnav.map(([subLabel, subHref]) => (
                            <Link
                              key={subHref}
                              href={subHref}
                              className={cn(
                                "block rounded-lg px-2.5 py-1.5 text-xs transition",
                                pathname === subHref ? "font-medium text-[#c5362e]" : "text-[#9c988f] hover:text-[#403d38]",
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
          <div className="mt-auto space-y-1 border-t border-[#efece6] pt-3">
            <Link href="/pedidos/novo" title="Novo pedido" className={cn("mx-2 flex h-10 items-center gap-3 rounded-xl bg-[#211d19] px-3 text-sm font-medium text-white shadow-[0_1px_2px_rgba(27,26,23,0.08)] transition hover:bg-[#37312a]", collapsed && "justify-center px-0")}>
              <Plus className="h-[18px] w-[18px] shrink-0" />
              {!collapsed && <span>Novo pedido</span>}
            </Link>
            <form action={signOut}>
              <button title="Sair" className={cn("mx-2 flex h-10 w-[calc(100%-1rem)] items-center gap-3 rounded-xl px-3 text-sm font-medium text-[#6d6a63] transition hover:bg-[#faf9f6] hover:text-[#1b1a17]", collapsed && "justify-center px-0")}>
                <LogOut className="h-5 w-5 shrink-0" />
                {!collapsed && <span>Sair</span>}
              </button>
            </form>
          </div>
        </nav>
      </aside>

      <main className={cn("min-h-screen pt-[70px] transition-[padding] duration-200", collapsed ? "lg:pl-[70px]" : "lg:pl-64")}>
        <div className="px-5 py-8 lg:px-12">{children}</div>
      </main>
    </div>
  );
}
