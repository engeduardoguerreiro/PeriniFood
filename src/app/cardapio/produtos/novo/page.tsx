import NewProductPage from "@/app/dashboard/products/new/page";

export default function Page({ searchParams }: { searchParams: Promise<{ status: string; error: string }> }) {
  return <><NewProductPage searchParams={searchParams} /></>;
}
