import CategoriesPage from "@/app/dashboard/categories/page";

export default function Page({ searchParams }: { searchParams: Promise<{ status: string; error: string }> }) {
  return <><CategoriesPage searchParams={searchParams} returnTo="/cardapio/categorias" /></>;
}
