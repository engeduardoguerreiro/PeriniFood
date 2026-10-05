import type { ReportSearchParams } from "@/lib/reports";

const fieldCls = "h-9 w-full rounded-lg border border-line bg-white px-3 text-sm text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/12";
const labelCls = "grid gap-1 text-[0.7rem] font-medium uppercase tracking-[0.08em] text-ink-faint";

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
