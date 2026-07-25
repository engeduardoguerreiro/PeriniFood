import { Crown, UserPlus, Users, Wallet } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { ReportCard } from "@/components/reports/ReportCard";
import { ReportChart } from "@/components/reports/ReportChart";
import { ReportFilters } from "@/components/reports/ReportFilters";
import { ReportHeader } from "@/components/reports/ReportHeader";
import { ReportTable } from "@/components/reports/ReportTable";
import { requireRestaurant } from "@/lib/auth";
import { buildCustomersReport, loadReportDataset, type ReportSearchParams } from "@/lib/reports";

async function Content({ searchParams }: { searchParams: ReportSearchParams }) {
  const { supabase, restaurant } = await requireRestaurant();
  const report = buildCustomersReport(await loadReportDataset(supabase, restaurant, searchParams));
  return (
    <div className="space-y-5">
      <ReportHeader title="Relatório de clientes" description="Entenda clientes ativos, novos cadastros, recompra e faturamento por cliente." active="clientes" searchParams={searchParams} />
      <ReportFilters searchParams={searchParams} />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <ReportCard title="Clientes ativos" value={String(report.cards.active)} icon={Users} />
        <ReportCard title="Novos clientes" value={String(report.cards.newCustomers)} icon={UserPlus} tone="blue" />
        <ReportCard title="Cliente campeão" value={report.cards.top} icon={Crown} tone="amber" />
        <ReportCard title="Média por cliente" value={report.cards.average} icon={Wallet} tone="green" />
      </div>
      <ReportChart title="Clientes por faturamento" data={report.chart} />
      <ReportTable title="Clientes do período" rows={report.rows} />
    </div>
  );
}

export default async function Page({ searchParams }: { searchParams: Promise<ReportSearchParams> }) {
  return <AppShell><Content searchParams={await searchParams} /></AppShell>;
}
