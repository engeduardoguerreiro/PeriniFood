import { BadgeDollarSign, ReceiptText, Truck, Wallet } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { ReportCard } from "@/components/reports/ReportCard";
import { ReportChart } from "@/components/reports/ReportChart";
import { ReportFilters } from "@/components/reports/ReportFilters";
import { ReportHeader } from "@/components/reports/ReportHeader";
import { ReportTable } from "@/components/reports/ReportTable";
import { requireRestaurant } from "@/lib/auth";
import { buildSalesReport, loadReportDataset, type ReportSearchParams } from "@/lib/reports";

async function Content({ searchParams }: { searchParams: ReportSearchParams }) {
  const { supabase, restaurant } = await requireRestaurant();
  const report = buildSalesReport(await loadReportDataset(supabase, restaurant, searchParams));
  return (
    <div className="space-y-5">
      <ReportHeader title="Relatório de vendas" description="Acompanhe faturamento bruto, descontos, entrega, total líquido e vendas por dia." active="vendas" searchParams={searchParams} />
      <ReportFilters searchParams={searchParams} showAdvanced />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <ReportCard title="Venda bruta" value={report.cards.gross} icon={ReceiptText} />
        <ReportCard title="Descontos" value={report.cards.discount} icon={Wallet} tone="red" />
        <ReportCard title="Taxas de entrega" value={report.cards.delivery} icon={Truck} tone="amber" />
        <ReportCard title="Venda líquida" value={report.cards.net} icon={BadgeDollarSign} tone="green" />
        <ReportCard title="Ticket médio" value={report.cards.average} icon={BadgeDollarSign} tone="blue" />
      </div>
      <ReportChart title="Venda líquida por dia" data={report.chart} />
      <ReportTable title="Pedidos do período" rows={report.rows} />
    </div>
  );
}

export default async function Page({ searchParams }: { searchParams: Promise<ReportSearchParams> }) {
  return <AppShell><Content searchParams={await searchParams} /></AppShell>;
}
