import Link from "next/link";
import { FileText } from "lucide-react";
import type { ReportKind, ReportSearchParams } from "@/lib/reports";

export function PdfButton({ type, searchParams }: { type: ReportKind; searchParams: ReportSearchParams }) {
  const query = new URLSearchParams({ tipo: type });
  for (const [key, value] of Object.entries(searchParams)) {
    if (Array.isArray(value)) value.forEach((entry) => query.append(key, entry));
    else if (value) query.set(key, value);
  }

  return (
    <Link
      href={`/relatorios/pdf?${query.toString()}`}
      target="_blank"
      rel="noreferrer"
      className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 transition hover:border-[#E50914] hover:text-[#E50914]"
    >
      <FileText size={16} />
      Baixar PDF
    </Link>
  );
}
