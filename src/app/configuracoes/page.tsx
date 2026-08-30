import SettingsPage from "@/app/dashboard/settings/page";

export default function Page({ searchParams }: { searchParams: Promise<{ status: string; error: string; password_success: string; password_error: string }> }) {
  return <><SettingsPage searchParams={searchParams} /></>;
}
