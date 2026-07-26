import type { LucideIcon } from "lucide-react";
import { money } from "@/lib/utils";

export function ReportCard({
  title,
  value,
  helper,
  icon: Icon,
}: {
  title: string;
  value: string | number;
  helper?: string;
  icon?: LucideIcon;
  // aceito mas não usado: mantém compatibilidade com chamadas existentes
  tone?: "default" | "blue" | "green" | "red" | "amber";
}) {
  const valueText = typeof value === "number" ? money(value) : value;
  return (
    <div className="rounded-2xl border border-[#e7e4dd] bg-white p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[0.7rem] font-medium uppercase tracking-[0.09em] text-[#9c988f]">{title}</p>
        {Icon ? <Icon className="h-4 w-4 shrink-0 text-[#c4bdb0]" /> : null}
      </div>
      <strong className="mt-2 block text-[1.6rem] font-semibold leading-none tracking-tight text-[#1b1a17] [font-variant-numeric:tabular-nums]">{valueText}</strong>
      {helper ? <span className="mt-1.5 block text-xs text-[#9c988f]">{helper}</span> : null}
    </div>
  );
}
