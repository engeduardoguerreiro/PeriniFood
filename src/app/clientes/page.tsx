import { AppShell } from "@/components/app-shell";
import CustomersPage from "@/app/dashboard/customers/page";

type CustomersSearchParams = {
  q?: string;
  status?: string;
  error?: string;
};

export default function Page({ searchParams }: { searchParams: Promise<CustomersSearchParams> }) {
  return <AppShell><CustomersPage searchParams={searchParams} /></AppShell>;
}
