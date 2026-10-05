import type { ChartPoint } from "@/lib/reports";
import { money } from "@/lib/utils";

export function ReportChart({ title, data, currency = true }: { title: string; data: ChartPoint[]; currency?: boolean }) {
  const max = Math.max(...data.map((item) => item.value), 0);
  return (
    <section className="rounded-2xl border border-line bg-white shadow-[0_1px_2px_rgba(27,26,23,0.04)]">
      <div className="border-b border-line-soft px-5 py-3.5">
        <h2 className="text-[0.95rem] font-semibold text-ink">{title}</h2>
      </div>
      <div className="space-y-3 p-5">
        {data.length ? data.map((item) => {
          const width = max ? Math.max((item.value / max) * 100, 4) : 0;
          return (
            <div key={item.label}>
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="truncate font-medium text-ink">{item.label}</span>
                <span className="shrink-0 text-ink-soft [font-variant-numeric:tabular-nums]">{currency ? money(item.value) : item.value}</span>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[#f1efea]">
                <div className="h-full rounded-full bg-brand" style={{ width: `${width}%` }} />
              </div>
              {item.helper ? <span className="mt-1 block text-xs text-ink-faint">{item.helper}</span> : null}
            </div>
          );
        }) : <p className="rounded-xl bg-[#faf9f6] p-6 text-center text-sm text-ink-faint">Sem dados para o período.</p>}
      </div>
    </section>
  );
}
