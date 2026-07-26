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
    <Link href={`/api/relatorios/exportar?${query.toString()}`} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[#e7e4dd] bg-white px-4 text-sm font-black text-[#403d38] transition hover:border-[#c5362e] hover:text-[#c5362e]">
      <Download size={16} />
      Baixar CSV
    </Link>
  );
}
