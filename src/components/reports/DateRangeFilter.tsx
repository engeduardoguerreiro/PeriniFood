import type { ReportSearchParams } from "@/lib/reports";

function pick(searchParams: ReportSearchParams, key: string, fallback = "") {
  const value = searchParams[key];
  return Array.isArray(value) ? value[0] ?? fallback : value ?? fallback;
}

export function DateRangeFilter({ searchParams }: { searchParams: ReportSearchParams }) {
  return (
    <>
      <label className="grid gap-1 text-xs font-black uppercase text-slate-500">
        Início
        <input className="field-light h-11 rounded-xl py-2 text-sm" type="date" name="inicio" defaultValue={pick(searchParams, "inicio")} />
      </label>
      <label className="grid gap-1 text-xs font-black uppercase text-slate-500">
        Fim
        <input className="field-light h-11 rounded-xl py-2 text-sm" type="date" name="fim" defaultValue={pick(searchParams, "fim")} />
      </label>
    </>
  );
}
