import { Bike, MapPin, PackageCheck, ReceiptText } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { ReportCard } from "@/components/reports/ReportCard";
import { ReportChart } from "@/components/reports/ReportChart";
import { ReportFilters } from "@/components/reports/ReportFilters";
import { ReportHeader } from "@/components/reports/ReportHeader";
import { ReportTable } from "@/components/reports/ReportTable";
import { requireRestaurant } from "@/lib/auth";
import { buildDeliveryReport, loadReportDataset, type ReportSearchParams } from "@/lib/reports";

async function Content({ searchParams }: { searchParams: ReportSearchParams }) {
  const { supabase, restaurant } = await requireRestaurant();
  const report = buildDeliveryReport(await loadReportDataset(supabase, restaurant, searchParams));
  return (
    <div className="space-y-5">
      <ReportHeader title="Delivery" description="Resumo de entregas, taxas cobradas, ticket de delivery e endereços atendidos." active="delivery" searchParams={searchParams} />
      <ReportFilters searchParams={searchParams} showAdvanced />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <ReportCard title="Pedidos delivery" value={String(report.cards.orders)} icon={Bike} />
        <ReportCard title="Taxas cobradas" value={report.cards.fees} icon={ReceiptText} tone="amber" />
        <ReportCard title="Taxa média" value={report.cards.averageFee} icon={MapPin} tone="blue" />
        <ReportCard title="Faturamento delivery" value={report.cards.revenue} icon={PackageCheck} tone="green" />
      </div>
      <ReportChart title="Entregas por dia" data={report.chart} currency={false} />
      <ReportTable title="Pedidos de delivery" rows={report.rows} />
    </div>
  );
}

export default async function Page({ searchParams }: { searchParams: Promise<ReportSearchParams> }) {
  return <AppShell><Content searchParams={await searchParams} /></AppShell>;
}
