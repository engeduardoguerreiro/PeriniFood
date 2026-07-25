import Link from "next/link";
import { Download, FileText, LayoutDashboard } from "lucide-react";
import { reportLinks, type ReportKind, type ReportSearchParams } from "@/lib/reports";
import { cn } from "@/lib/utils";

export function ReportHeader({
  title,
  description,
  active,
  searchParams,
}: {
  title: string;
  description: string;
  active: ReportKind | "exportacoes";
  searchParams: ReportSearchParams;
}) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (Array.isArray(value)) value.forEach((entry) => query.append(key, entry));
    else if (value) query.set(key, value);
  }
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4 p-6">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-red-600">Relatórios</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">{title}</h1>
          <p className="mt-1 max-w-2xl text-sm font-medium text-slate-500">{description}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/relatorios" className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50">
            <LayoutDashboard size={17} />
            Visão geral
          </Link>
          {active !== "exportacoes" ? (
            <>
              <Link href={`/relatorios/pdf?tipo=${active}&${query.toString()}`} target="_blank" rel="noreferrer" className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 transition hover:border-[#E50914] hover:text-[#E50914]">
                <FileText size={17} />
                Exportar PDF
              </Link>
              <Link href={`/api/relatorios/exportar?tipo=${active}&${query.toString()}`} className="inline-flex h-11 items-center gap-2 rounded-xl bg-gradient-to-r from-[#232A31] to-[#E50914] px-4 text-sm font-black text-white shadow-lg shadow-red-500/15">
                <Download size={17} />
                Exportar CSV
              </Link>
            </>
          ) : null}
        </div>
      </div>
      <div className="flex gap-2 overflow-x-auto border-t border-slate-100 bg-slate-50 px-6 py-3">
        <Link href="/relatorios" className={cn("whitespace-nowrap rounded-full px-4 py-2 text-sm font-bold transition", active === "overview" ? "bg-[#E50914] text-white" : "bg-white text-slate-700 hover:text-[#E50914]")}>Visão geral</Link>
        {reportLinks.map((link) => {
          const key = link.href.split("/").pop() ?? "";
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn("whitespace-nowrap rounded-full px-4 py-2 text-sm font-bold transition", active === key ? "bg-[#E50914] text-white" : "bg-white text-slate-700 hover:text-[#E50914]")}
            >
              {link.label}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
