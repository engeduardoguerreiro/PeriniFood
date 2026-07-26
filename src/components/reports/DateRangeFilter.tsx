import type { ReportSearchParams } from "@/lib/reports";

const fieldCls = "h-9 w-full rounded-lg border border-[#e7e4dd] bg-white px-3 text-sm text-[#1b1a17] outline-none transition focus:border-[#c5362e] focus:ring-2 focus:ring-[#c5362e]/12";
const labelCls = "grid gap-1 text-[0.7rem] font-medium uppercase tracking-[0.08em] text-[#9c988f]";

function pick(searchParams: ReportSearchParams, key: string, fallback = "") {
  const value = searchParams[key];
  return Array.isArray(value) ? value[0] ?? fallback : value ?? fallback;
}

export function DateRangeFilter({ searchParams }: { searchParams: ReportSearchParams }) {
  return (
    <>
      <label className={labelCls}>
        Início
        <input className={fieldCls} type="date" name="inicio" defaultValue={pick(searchParams, "inicio")} />
      </label>
      <label className={labelCls}>
        Fim
        <input className={fieldCls} type="date" name="fim" defaultValue={pick(searchParams, "fim")} />
      </label>
    </>
  );
}
