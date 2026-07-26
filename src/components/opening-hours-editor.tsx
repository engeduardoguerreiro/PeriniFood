import { openingHourDays, type OpeningHours } from "@/lib/opening-hours";
import type { Restaurant } from "@/lib/types";

const timeInput = "h-9 w-full rounded-lg border border-[#e7e4dd] bg-white px-3 text-sm text-[#1b1a17] outline-none transition focus:border-[#c5362e] focus:ring-2 focus:ring-[#c5362e]/12";
const colLabel = "text-[0.7rem] font-medium uppercase tracking-[0.08em] text-[#9c988f]";

export function OpeningHoursEditor({ openingHours }: { openingHours: Restaurant["opening_hours"] }) {
  const hours = (openingHours ?? {}) as OpeningHours;

  return (
    <div className="overflow-hidden rounded-xl border border-[#e7e4dd] bg-white">
      <div className={`grid grid-cols-[150px_1fr_1fr_92px] gap-3 border-b border-[#efece6] bg-[#faf9f6] px-4 py-2 ${colLabel} max-md:hidden`}>
        <span>Dia</span>
        <span>Abertura</span>
        <span>Fechamento</span>
        <span>Aberto</span>
      </div>
      <div className="divide-y divide-[#efece6]">
        {openingHourDays.map(([key, label]) => {
          const day = hours[key] ?? {};
          return (
            <div key={key} className="grid gap-2 px-4 py-2 md:grid-cols-[150px_1fr_1fr_92px] md:items-center">
              <strong className="text-sm font-medium text-[#2b2925]">{label}</strong>
              <label className="space-y-1 md:space-y-0">
                <span className={`${colLabel} md:hidden`}>Abertura</span>
                <input className={timeInput} name={`opening_${key}_open`} type="time" defaultValue={day.open ?? "18:00"} />
              </label>
              <label className="space-y-1 md:space-y-0">
                <span className={`${colLabel} md:hidden`}>Fechamento</span>
                <input className={timeInput} name={`opening_${key}_close`} type="time" defaultValue={day.close ?? "23:00"} />
              </label>
              <label className="flex items-center gap-2 text-sm text-[#403d38] md:justify-center">
                <input name={`opening_${key}_active`} type="checkbox" defaultChecked={day.active ?? true} className="accent-[#c5362e]" />
                Aberto
              </label>
            </div>
          );
        })}
      </div>
    </div>
  );
}
