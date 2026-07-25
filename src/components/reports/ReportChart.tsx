import type { ChartPoint } from "@/lib/reports";
import { money } from "@/lib/utils";

export function ReportChart({ title, data, currency = true }: { title: string; data: ChartPoint[]; currency?: boolean }) {
  const max = Math.max(...data.map((item) => item.value), 0);
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-black text-slate-950">{title}</h2>
      <div className="mt-5 space-y-3">
        {data.length ? data.map((item) => {
          const width = max ? Math.max((item.value / max) * 100, 4) : 0;
          return (
            <div key={item.label} className="grid gap-2">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="truncate font-bold text-slate-700">{item.label}</span>
                <strong className="whitespace-nowrap text-slate-950">{currency ? money(item.value) : item.value}</strong>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-gradient-to-r from-[#232A31] to-[#E50914]" style={{ width: `${width}%` }} />
              </div>
              {item.helper ? <span className="text-xs font-semibold text-slate-500">{item.helper}</span> : null}
            </div>
          );
        }) : <p className="rounded-xl bg-slate-50 p-8 text-center text-sm font-semibold text-slate-500">Sem dados para o período.</p>}
      </div>
    </section>
  );
}
