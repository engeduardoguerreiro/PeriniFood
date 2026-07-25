import { CreditCard, Landmark, Receipt, WalletCards } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { ReportCard } from "@/components/reports/ReportCard";
import { ReportChart } from "@/components/reports/ReportChart";
import { ReportFilters } from "@/components/reports/ReportFilters";
import { ReportHeader } from "@/components/reports/ReportHeader";
import { ReportTable } from "@/components/reports/ReportTable";
import { requireRestaurant } from "@/lib/auth";
import { buildPaymentsReport, loadReportDataset, type ReportSearchParams } from "@/lib/reports";

async function Content({ searchParams }: { searchParams: ReportSearchParams }) {
  const { supabase, restaurant } = await requireRestaurant();
  const report = buildPaymentsReport(await loadReportDataset(supabase, restaurant, searchParams));
  return (
    <div className="space-y-5">
      <ReportHeader title="Pagamentos" description="Acompanhe formas de pagamento, faturamento por método e participação nas vendas." active="pagamentos" searchParams={searchParams} />
      <ReportFilters searchParams={searchParams} showAdvanced />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <ReportCard title="Total recebido" value={report.cards.total} icon={Landmark} tone="green" />
        <ReportCard title="Métodos usados" value={String(report.cards.methods)} icon={WalletCards} />
        <ReportCard title="Mais usado" value={report.cards.top} icon={CreditCard} tone="blue" />
        <ReportCard title="Pedidos pagos" value={String(report.cards.paidOrders)} icon={Receipt} tone="amber" />
      </div>
      <ReportChart title="Faturamento por forma de pagamento" data={report.chart} />
      <ReportTable title="Resumo de pagamentos" rows={report.rows} />
    </div>
  );
}

export default async function Page({ searchParams }: { searchParams: Promise<ReportSearchParams> }) {
  return <AppShell><Content searchParams={await searchParams} /></AppShell>;
}
