import { AppShell } from "@/components/app-shell";
import ProductsPage from "@/app/dashboard/products/page";

export default async function Page({ searchParams }: { searchParams: Promise<{ status?: string; error?: string }> }) {
  const sp = await searchParams;
  return <AppShell><ProductsPage status={sp.status ?? ""} error={sp.error ?? ""} /></AppShell>;
}
