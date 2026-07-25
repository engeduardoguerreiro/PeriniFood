import { AppShell } from "@/components/app-shell";
import OrderDetailPage from "@/app/dashboard/orders/[id]/page";

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return <AppShell><OrderDetailPage params={params} /></AppShell>;
}
