"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  ["Assinantes", "/admin"],
  ["Relatórios", "/admin/relatorios"],
] as const;

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav className="flex items-center gap-1">
      {tabs.map(([label, href]) => {
        const active = href === "/admin" ? pathname === "/admin" || pathname.startsWith("/admin/clientes") : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${active ? "bg-[#f6ece9] text-[#c5362e]" : "text-[#6d6a63] hover:text-[#c5362e]"}`}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
