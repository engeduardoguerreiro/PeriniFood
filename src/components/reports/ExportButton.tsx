import Link from "next/link";
import { Download } from "lucide-react";
import type { ReportKind, ReportSearchParams } from "@/lib/reports";

export function ExportButton({ type, searchParams }: { type: ReportKind; searchParams: ReportSearchParams }) {
  const query = new URLSearchParams({ tipo: type });
  for (const [key, value] of Object.entries(searchParams)) {
    if (Array.isArray(value)) value.forEach((entry) => query.append(key, entry));
    else if (value) query.set(key, value);
  }
  return (
    <Link href={`/api/relatorios/exportar?${query.toString()}`} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 transition hover:border-[#E50914] hover:text-[#E50914]">
      <Download size={16} />
      Baixar CSV
    </Link>
  );
}
