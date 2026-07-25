import { BarChart3 } from "lucide-react";

export function EmptyReportState({ title = "Sem dados no período", text = "Altere os filtros ou aguarde novos pedidos para gerar este relatório." }: { title?: string; text?: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
      <BarChart3 className="mx-auto h-10 w-10 text-slate-400" />
      <h3 className="mt-3 text-lg font-black text-slate-950">{title}</h3>
      <p className="mt-1 text-sm font-medium text-slate-500">{text}</p>
    </div>
  );
}
