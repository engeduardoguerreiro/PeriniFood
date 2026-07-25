import { Ban, CheckCircle2, Clock3, ShoppingBag } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { ReportCard } from "@/components/reports/ReportCard";
import { ReportChart } from "@/components/reports/ReportChart";
import { ReportFilters } from "@/components/reports/ReportFilters";
import { ReportHeader } from "@/components/reports/ReportHeader";
import { ReportTable } from "@/components/reports/ReportTable";
import { requireRestaurant } from "@/lib/auth";
import { buildOrdersReport, loadReportDataset, type ReportSearchParams } from "@/lib/reports";

async function Content({ searchParams }: { searchParams: ReportSearchParams }) {
  const { supabase, restaurant } = await requireRestaurant();
  const report = buildOrdersReport(await loadReportDataset(supabase, restaurant, searchParams));
  return (
    <div className="space-y-5">
      <ReportHeader title="Relatório de pedidos" description="Analise volume, status, origem, tipo do pedido e histórico operacional." active="pedidos" searchParams={searchParams} />
      <ReportFilters searchParams={searchParams} showAdvanced />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <ReportCard title="Total de pedidos" value={String(report.cards.total)} icon={ShoppingBag} />
        <ReportCard title="Pendentes" value={String(report.cards.pending)} icon={Clock3} tone="amber" />
        <ReportCard title="Entregues" value={String(report.cards.completed)} icon={CheckCircle2} tone="green" />
        <ReportCard title="Cancelados" value={String(report.cards.canceled)} icon={Ban} tone="red" />
      </div>
      <div className="grid gap-5 xl:grid-cols-2">
        <ReportChart title="Pedidos por status" data={report.statusChart} currency={false} />
        <ReportChart title="Pedidos por origem" data={report.sourceChart} currency={false} />
      </div>
      <ReportTable title="Lista de pedidos" rows={report.rows} />
    </div>
  );
}

export default async function Page({ searchParams }: { searchParams: Promise<ReportSearchParams> }) {
  return <AppShell><Content searchParams={await searchParams} /></AppShell>;
}
