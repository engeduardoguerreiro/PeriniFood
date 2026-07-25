import { redirect } from "next/navigation";

export default async function LegacyRestaurantMenuPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  redirect(`/cardapio/${slug}`);
}
