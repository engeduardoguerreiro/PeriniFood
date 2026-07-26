import { Download, FileSpreadsheet } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { ExportButton } from "@/components/reports/ExportButton";
import { PdfButton } from "@/components/reports/PdfButton";
import { ReportFilters } from "@/components/reports/ReportFilters";
import { ReportHeader } from "@/components/reports/ReportHeader";
import type { ReportKind, ReportSearchParams } from "@/lib/reports";

const exports: { type: ReportKind; title: string; description: string }[] = [
  { type: "vendas", title: "Vendas", description: "Pedidos, faturamento, desconto, entrega e total." },
  { type: "produtos", title: "Produtos", description: "Ranking de produtos vendidos por quantidade e faturamento." },
  { type: "pedidos", title: "Pedidos", description: "Histórico operacional por status, origem e tipo." },
  { type: "clientes", title: "Clientes", description: "Clientes atendidos, pedidos e faturamento por cliente." },
  { type: "pagamentos", title: "Pagamentos", description: "Formas de pagamento e participação nas vendas." },
  { type: "delivery", title: "Delivery", description: "Entregas, taxas e endereços do período." },
];

async function Content({ searchParams }: { searchParams: ReportSearchParams }) {
  return (
    <div className="space-y-5">
      <ReportHeader title="Exportações" description="Baixe relatórios em PDF para apresentação ou CSV para abrir em Excel, Google Sheets e sistemas externos." active="exportacoes" searchParams={searchParams} />
      <ReportFilters searchParams={searchParams} showAdvanced />
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {exports.map((item) => (
          <article key={item.type} className="rounded-2xl border border-[#e7e4dd] bg-white p-5 shadow-sm">
            <div className="flex items-start gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#f6ece9] text-[#c5362e]"><FileSpreadsheet size={20} /></span>
              <div>
                <h2 className="text-lg font-black text-slate-950">{item.title}</h2>
                <p className="mt-1 text-sm font-medium text-[#9c988f]">{item.description}</p>
              </div>
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <PdfButton type={item.type} searchParams={searchParams} />
              <ExportButton type={item.type} searchParams={searchParams} />
            </div>
          </article>
        ))}
      </section>
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm font-semibold text-amber-900">
        <Download className="mr-2 inline h-4 w-4" />
        Os arquivos respeitam o restaurante logado e os filtros aplicados no topo da página.
      </div>
    </div>
  );
}

export default async function Page({ searchParams }: { searchParams: Promise<ReportSearchParams> }) {
  return <AppShell><Content searchParams={await searchParams} /></AppShell>;
}
