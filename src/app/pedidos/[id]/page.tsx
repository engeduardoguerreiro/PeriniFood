import OrderDetailPage from "@/app/dashboard/orders/[id]/page";

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return <><OrderDetailPage params={params} /></>;
}
