import { openingHourDays, type OpeningHours } from "@/lib/opening-hours";
import type { Restaurant } from "@/lib/types";

export function OpeningHoursEditor({ openingHours }: { openingHours: Restaurant["opening_hours"] }) {
  const hours = (openingHours ?? {}) as OpeningHours;

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="grid grid-cols-[150px_1fr_1fr_92px] gap-3 border-b border-slate-200 bg-slate-50 px-4 py-2 text-[11px] font-black uppercase text-slate-500 max-md:hidden">
        <span>Dia</span>
        <span>Abertura</span>
        <span>Fechamento</span>
        <span>Ativo</span>
      </div>
      <div className="divide-y divide-slate-200">
        {openingHourDays.map(([key, label]) => {
          const day = hours[key] ?? {};
          return (
            <div key={key} className="grid gap-3 px-4 py-3 md:grid-cols-[150px_1fr_1fr_92px] md:items-center">
              <strong className="text-sm text-slate-800">{label}</strong>
              <label className="space-y-1 md:space-y-0">
                <span className="text-xs font-black uppercase text-slate-500 md:hidden">Abertura</span>
                <input
                  className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold outline-none focus:border-red-300"
                  name={`opening_${key}_open`}
                  type="time"
                  defaultValue={day.open ?? "18:00"}
                />
              </label>
              <label className="space-y-1 md:space-y-0">
                <span className="text-xs font-black uppercase text-slate-500 md:hidden">Fechamento</span>
                <input
                  className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold outline-none focus:border-red-300"
                  name={`opening_${key}_close`}
                  type="time"
                  defaultValue={day.close ?? "23:00"}
                />
              </label>
              <label className="flex items-center gap-2 text-sm font-bold text-slate-700 md:justify-center">
                <input name={`opening_${key}_active`} type="checkbox" defaultChecked={day.active ?? true} />
                Aberto
              </label>
            </div>
          );
        })}
      </div>
    </div>
  );
}
