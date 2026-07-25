import { AppShell } from "@/components/app-shell";
import EditProductPage from "@/app/dashboard/products/[id]/edit/page";

export default function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ status: string; error: string }> }) {
  return <AppShell><EditProductPage params={params} searchParams={searchParams} /></AppShell>;
}
