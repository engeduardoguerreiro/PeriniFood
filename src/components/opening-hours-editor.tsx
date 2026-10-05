import { openingHourDays, type OpeningHours } from "@/lib/opening-hours";
import type { Restaurant } from "@/lib/types";

const timeInput = "h-9 w-full rounded-lg border border-line bg-white px-3 text-sm text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/12";
const colLabel = "text-[0.7rem] font-medium uppercase tracking-[0.08em] text-ink-faint";

export function OpeningHoursEditor({ openingHours }: { openingHours: Restaurant["opening_hours"] }) {
  const hours = (openingHours ?? {}) as OpeningHours;

  return (
    <div className="overflow-hidden rounded-xl border border-line bg-white">
      <div className={`grid grid-cols-[150px_1fr_1fr_92px] gap-3 border-b border-line-soft bg-[#faf9f6] px-4 py-2 ${colLabel} max-md:hidden`}>
        <span>Dia</span>
        <span>Abertura</span>
        <span>Fechamento</span>
        <span>Aberto</span>
      </div>
      <div className="divide-y divide-line-soft">
        {openingHourDays.map(([key, label]) => {
          const day = hours[key] ?? {};
          return (
            <div key={key} className="grid gap-2 px-4 py-2 md:grid-cols-[150px_1fr_1fr_92px] md:items-center">
              <strong className="text-sm font-medium text-ink-body">{label}</strong>
              <label className="space-y-1 md:space-y-0">
                <span className={`${colLabel} md:hidden`}>Abertura</span>
                <input className={timeInput} name={`opening_${key}_open`} type="time" defaultValue={day.open ?? "18:00"} />
              </label>
              <label className="space-y-1 md:space-y-0">
                <span className={`${colLabel} md:hidden`}>Fechamento</span>
                <input className={timeInput} name={`opening_${key}_close`} type="time" defaultValue={day.close ?? "23:00"} />
              </label>
              <label className="flex items-center gap-2 text-sm text-[#403d38] md:justify-center">
                <input name={`opening_${key}_active`} type="checkbox" defaultChecked={day.active ?? true} className="accent-brand" />
                Aberto
              </label>
            </div>
          );
        })}
      </div>
    </div>
  );
}
