import type { LucideIcon } from "lucide-react";
import { cn, money } from "@/lib/utils";

export function ReportCard({
  title,
  value,
  helper,
  icon: Icon,
  tone = "default",
}: {
  title: string;
  value: string | number;
  helper?: string;
  icon?: LucideIcon;
  tone?: "default" | "blue" | "green" | "red" | "amber";
}) {
  const valueText = typeof value === "number" ? money(value) : value;
  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div
        className={cn(
          "absolute right-4 top-4 grid h-11 w-11 place-items-center rounded-2xl",
          tone === "blue" && "bg-sky-50 text-sky-700",
          tone === "green" && "bg-emerald-50 text-emerald-700",
          tone === "red" && "bg-red-50 text-red-700",
          tone === "amber" && "bg-amber-50 text-amber-700",
          tone === "default" && "bg-slate-100 text-slate-600",
        )}
      >
        {Icon ? <Icon className="h-5 w-5" /> : null}
      </div>
      <p className="pr-14 text-sm font-semibold text-slate-500">{title}</p>
      <strong className="mt-3 block text-2xl font-black tracking-tight text-slate-950">{valueText}</strong>
      {helper ? <span className="mt-2 block text-xs font-semibold text-slate-500">{helper}</span> : null}
    </div>
  );
}
