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

const nav = [
  ["Dashboard", "/dashboard", Home],
  ["Pedidos", "/pedidos", ClipboardList],
  ["Novo pedido", "/pedidos/novo", ShoppingBag],
  ["Cardápio", "/cardapio", ChefHat],
  ["Integrações", "/integracoes", Cable],
  ["Cupons", "/cupons", TicketPercent],
  ["Clientes", "/clientes", Users],
  ["Relatórios", "/relatorios", BarChart3],
  ["Site online", "/dashboard/online-menu", QrCode],
  ["Configurações", "/configuracoes", Cog],
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
    <div className="min-h-screen bg-[#f4f5f7] text-[#242b33]">
      <header className="fixed inset-x-0 top-0 z-30 grid h-[70px] grid-cols-[1fr_auto_1fr] items-center border-b border-slate-200/80 bg-white/95 px-5 shadow-[0_14px_36px_rgba(15,23,42,0.06)] backdrop-blur-xl">
        <Link href="/dashboard" className="flex min-w-0 items-center gap-3">
          <span className="grid h-11 w-11 place-items-center overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
            <Image src="/brand/perinifood-logo.png" alt="" width={40} height={40} className="h-full w-full object-contain" priority />
          </span>
          <span className="min-w-0">
            <span className="block whitespace-nowrap text-lg font-black text-[#232A31]">Perini<span className="text-[#E50914]">Food</span></span>
            <span className="hidden text-xs font-bold uppercase text-slate-500 sm:block">Gestão para restaurantes</span>
          </span>
        </Link>

        <div className="flex justify-center">
          <form action={updateStoreOperationStatus} className="group relative flex min-w-[300px] items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-2 shadow-[0_12px_30px_rgba(15,23,42,0.08)] transition hover:-translate-y-0.5">
            <span className="grid h-10 w-10 place-items-center overflow-hidden rounded-full bg-[#232A31] text-xs font-black text-white">
              {restaurant.logo_url ? <img src={restaurant.logo_url} alt="" className="h-full w-full object-cover" /> : restaurant.name.slice(0, 2)}
            </span>
            <span className="min-w-0">
              <span className="block max-w-56 truncate text-sm font-bold">{restaurant.name}</span>
              <span className="flex items-center gap-1.5 text-xs text-slate-500">
                <span className={storeOpen ? "h-2 w-2 animate-pulse rounded-full bg-emerald-500" : "h-2 w-2 animate-pulse rounded-full bg-red-500"} />
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
            <ChevronDown className="h-4 w-4 text-slate-500 transition group-hover:text-[#E50914]" />
          </form>
        </div>

        <div className="flex justify-end gap-3">
          <PrinterAgentIndicator />
          <a href={`tel:+55${supportPhone}`} title="Telefone" className="grid h-12 w-12 place-items-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-[#E50914] hover:text-[#E50914]">
            <Phone className="h-5 w-5" />
          </a>
          <a href={`https://wa.me/55${supportPhone}`} target="_blank" rel="noreferrer" title="Chat WhatsApp" className="grid h-12 w-12 place-items-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-[#E50914] hover:text-[#E50914]">
            <MessageCircle className="h-6 w-6" />
          </a>
          <form action={signOut}>
            <button title="Sair do sistema" className="grid h-12 w-12 place-items-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-[#E50914] hover:text-[#E50914]">
              <LogOut className="h-5 w-5" />
            </button>
          </form>
        </div>
      </header>

      <aside className={cn(
        "fixed bottom-0 left-0 top-[70px] z-20 hidden border-r border-slate-200 bg-white/95 shadow-[20px_0_45px_rgba(15,23,42,0.04)] backdrop-blur-xl transition-[width] duration-200 lg:block",
        collapsed ? "w-[70px]" : "w-64",
      )}>
        <nav className="flex h-full flex-col py-3">
          <button
            type="button"
            onClick={() => setCollapsed((value) => !value)}
            className="mx-3 mb-3 flex h-11 items-center justify-center rounded-2xl border border-slate-200 text-slate-600 transition hover:-translate-y-0.5 hover:bg-slate-50"
            title={collapsed ? "Expandir menu" : "Recolher menu"}
          >
            {collapsed ? <ChevronsRight className="h-5 w-5" /> : <><ChevronsLeft className="h-5 w-5" /><span className="ml-2 text-sm font-semibold">Recolher</span></>}
          </button>
          <div className="space-y-1">
            {nav.map(([label, href, Icon]) => {
              const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
              return (
                <div key={href}>
                  <Link
                    href={href}
                    title={label}
                    className={cn(
                      "mx-2 flex h-12 items-center gap-3 rounded-2xl px-4 text-sm font-semibold transition hover:-translate-y-0.5 hover:bg-red-50 hover:text-[#E50914]",
                      collapsed && "justify-center px-0",
                      active ? "bg-red-50 text-[#E50914]" : "text-slate-700",
                    )}
                  >
                    <Icon className="h-5 w-5 shrink-0" />
                    {!collapsed && <span className="truncate">{label}</span>}
                  </Link>
                  {!collapsed && href === "/integracoes" && pathname.startsWith("/integracoes") && (
                    <div className="mx-2 mb-2 ml-10 space-y-1">
                      {integrationSubnav.map(([subLabel, subHref]) => (
                        <Link
                          key={subHref}
                          href={subHref}
                          className={cn(
                            "block rounded-lg px-3 py-2 text-xs font-bold transition hover:bg-red-50 hover:text-red-700",
                            pathname === subHref ? "bg-red-50 text-red-700" : "text-slate-500",
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
          <div className="mt-auto space-y-1 border-t border-slate-100 pt-3">
            <Link href="/pedidos/novo" title="Novo pedido" className={cn("mx-2 flex h-12 items-center gap-3 rounded-2xl bg-gradient-to-r from-[#232A31] to-[#E50914] px-4 text-sm font-bold text-white shadow-[0_14px_30px_rgba(229,9,20,0.18)] transition hover:-translate-y-0.5", collapsed && "justify-center px-0")}>
              <Plus className="h-5 w-5 shrink-0" />
              {!collapsed && <span>Novo pedido</span>}
            </Link>
            <form action={signOut}>
              <button title="Sair" className={cn("mx-2 flex h-12 w-[calc(100%-1rem)] items-center gap-3 rounded-xl px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50", collapsed && "justify-center px-0")}>
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
