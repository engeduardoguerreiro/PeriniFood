import { AppShell } from "@/components/app-shell";
import CategoriesPage from "@/app/dashboard/categories/page";

export default function Page({ searchParams }: { searchParams: Promise<{ status: string; error: string }> }) {
  return <AppShell><CategoriesPage searchParams={searchParams} returnTo="/cardapio/categorias" /></AppShell>;
}
