import { BadgeDollarSign, CreditCard, ShoppingBag, Users, Package, Percent, Store, TrendingUp } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { ReportCard } from "@/components/reports/ReportCard";
import { ReportChart } from "@/components/reports/ReportChart";
import { ReportFilters } from "@/components/reports/ReportFilters";
import { ReportHeader } from "@/components/reports/ReportHeader";
import { requireRestaurant } from "@/lib/auth";
import { buildOverviewReport, loadReportDataset, type ReportSearchParams } from "@/lib/reports";

async function OverviewContent({ searchParams }: { searchParams: ReportSearchParams }) {
  const { supabase, restaurant } = await requireRestaurant();
  const dataset = await loadReportDataset(supabase, restaurant, searchParams);
  const report = buildOverviewReport(dataset);

  return (
    <div className="space-y-5">
      <ReportHeader title="Visão geral" description="Resumo comercial do restaurante com faturamento, pedidos, clientes, canais e formas de pagamento." active="overview" searchParams={searchParams} />
      <ReportFilters searchParams={searchParams} showAdvanced />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <ReportCard title="Faturamento total" value={report.cards.revenue} icon={BadgeDollarSign} tone="green" />
        <ReportCard title="Pedidos" value={String(report.cards.orders)} icon={ShoppingBag} tone="blue" />
        <ReportCard title="Ticket médio" value={report.cards.averageTicket} icon={TrendingUp} />
        <ReportCard title="Produtos vendidos" value={String(report.cards.productQuantity)} icon={Package} tone="amber" />
        <ReportCard title="Clientes atendidos" value={String(report.cards.customers)} icon={Users} />
        <ReportCard title="Taxa de cancelamento" value={`${report.cards.cancelRate.toFixed(1)}%`} icon={Percent} tone="red" />
        <ReportCard title="Canal com mais vendas" value={report.cards.topSource} icon={Store} tone="blue" />
        <ReportCard title="Pagamento mais usado" value={report.cards.topPayment} icon={CreditCard} />
      </div>
      <div className="grid gap-5 xl:grid-cols-3">
        <div className="xl:col-span-2"><ReportChart title="Faturamento por dia" data={report.dailySales} /></div>
        <ReportChart title="Pedidos por canal" data={report.bySource} currency={false} />
      </div>
      <ReportChart title="Pagamentos mais usados" data={report.byPayment} currency={false} />
    </div>
  );
}

export default async function Page({ searchParams }: { searchParams: Promise<ReportSearchParams> }) {
  const sp = await searchParams;
  return <AppShell><OverviewContent searchParams={sp} /></AppShell>;
}
