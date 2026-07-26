import { BarChart3 } from "lucide-react";

export function EmptyReportState({ title = "Sem dados no período", text = "Altere os filtros ou aguarde novos pedidos para gerar este relatório." }: { title?: string; text?: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-[#dcd8cf] bg-white p-10 text-center">
      <BarChart3 className="mx-auto h-8 w-8 text-[#c4bdb0]" />
      <h3 className="mt-3 text-[0.95rem] font-semibold text-[#1b1a17]">{title}</h3>
      <p className="mt-1 text-sm text-[#9c988f]">{text}</p>
    </div>
  );
}
