import { Package, Star, TrendingUp, Utensils } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { ReportCard } from "@/components/reports/ReportCard";
import { ReportChart } from "@/components/reports/ReportChart";
import { ReportFilters } from "@/components/reports/ReportFilters";
import { ReportHeader } from "@/components/reports/ReportHeader";
import { ReportTable } from "@/components/reports/ReportTable";
import { requireRestaurant } from "@/lib/auth";
import { buildProductsReport, loadReportDataset, type ReportSearchParams } from "@/lib/reports";

async function Content({ searchParams }: { searchParams: ReportSearchParams }) {
  const { supabase, restaurant } = await requireRestaurant();
  const report = buildProductsReport(await loadReportDataset(supabase, restaurant, searchParams));
  return (
    <div className="space-y-5">
      <ReportHeader title="Produtos vendidos" description="Veja ranking de produtos por quantidade, faturamento e preço médio." active="produtos" searchParams={searchParams} />
      <ReportFilters searchParams={searchParams} />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <ReportCard title="Unidades vendidas" value={String(report.cards.sold)} icon={Package} tone="blue" />
        <ReportCard title="Faturamento em produtos" value={report.cards.revenue} icon={TrendingUp} tone="green" />
        <ReportCard title="Produto campeão" value={report.cards.top} icon={Star} tone="amber" />
        <ReportCard title="Produtos ativos" value={String(report.cards.activeProducts)} icon={Utensils} />
      </div>
      <ReportChart title="Top produtos por faturamento" data={report.chart} />
      <ReportTable title="Ranking de produtos" rows={report.rows} />
    </div>
  );
}

export default async function Page({ searchParams }: { searchParams: Promise<ReportSearchParams> }) {
  return <AppShell><Content searchParams={await searchParams} /></AppShell>;
}
