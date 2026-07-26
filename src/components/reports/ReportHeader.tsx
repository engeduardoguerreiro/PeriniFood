import Link from "next/link";
import { Download, FileText } from "lucide-react";
import { reportLinks, type ReportKind, type ReportSearchParams } from "@/lib/reports";

const pillActive = "shrink-0 rounded-lg bg-white px-3.5 py-1.5 text-xs font-medium text-[#1b1a17] shadow-[0_1px_2px_rgba(27,26,23,0.06)]";
const pillIdle = "shrink-0 rounded-lg px-3.5 py-1.5 text-xs font-medium text-[#9c988f] transition hover:text-[#403d38]";
const actionBtn = "inline-flex h-9 items-center gap-2 rounded-lg border border-[#e7e4dd] bg-white px-3.5 text-sm font-medium text-[#403d38] transition hover:border-[#c5362e] hover:text-[#c5362e]";

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
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[#1b1a17]">{title}</h1>
          <p className="mt-0.5 max-w-2xl text-sm text-[#9c988f]">{description}</p>
        </div>
        {active !== "exportacoes" ? (
          <div className="flex flex-wrap gap-2">
            <Link href={`/relatorios/pdf?tipo=${active}&${query.toString()}`} target="_blank" rel="noreferrer" className={actionBtn}>
              <FileText size={16} />
              PDF
            </Link>
            <Link href={`/api/relatorios/exportar?tipo=${active}&${query.toString()}`} className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#211d19] px-3.5 text-sm font-medium text-white transition hover:bg-[#37312a]">
              <Download size={16} />
              CSV
            </Link>
          </div>
        ) : null}
      </div>

      <div className="flex gap-1 overflow-x-auto rounded-xl border border-[#e7e4dd] bg-[#faf9f6] p-1">
        <Link href="/relatorios" className={active === "overview" ? pillActive : pillIdle}>Visão geral</Link>
        {reportLinks.map((link) => {
          const key = link.href.split("/").pop() ?? "";
          return (
            <Link key={link.href} href={link.href} className={active === key ? pillActive : pillIdle}>
              {link.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
