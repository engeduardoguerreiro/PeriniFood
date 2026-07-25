import { AppShell } from "@/components/app-shell";
import SettingsPage from "@/app/dashboard/settings/page";

export default function Page({ searchParams }: { searchParams: Promise<{ status: string; error: string; password_success: string; password_error: string }> }) {
  return <AppShell><SettingsPage searchParams={searchParams} /></AppShell>;
}
