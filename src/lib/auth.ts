import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Restaurant, Role } from "./types";

// Memoizado por requisição: layout e página compartilham a mesma validação de
// auth + query de membership, em vez de refazer getUser()/consulta duas vezes.
export const getSessionContext = cache(async () => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, restaurant: null, role: null as Role | null };

  const { data: membership } = await supabase
    .from("restaurant_users")
    .select("role, restaurants(*)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  return {
    supabase,
    user,
    restaurant: (membership?.restaurants ?? null) as unknown as Restaurant | null,
    role: (membership?.role ?? null) as Role | null,
  };
});

export async function requireRestaurant() {
  const context = await getSessionContext();
  if (!context.user) redirect("/login");
  if (!context.restaurant) {
    // Admins da plataforma não têm restaurante — vão para o painel /admin.
    const { isPlatformAdminEmail } = await import("./platform-admin");
    if (isPlatformAdminEmail(context.user.email)) redirect("/admin");
    redirect("/register");
  }
  // Assinatura suspensa/cancelada pela equipe PeriniFood corta o acesso ao
  // sistema (os dados do cliente ficam intactos até a reativação).
  const { getAccessState } = await import("./platform-billing");
  const access = await getAccessState(context.restaurant.id);
  if (access.status === "pending") redirect("/ativacao");
  if (access.blocked) redirect("/assinatura-suspensa");

  return context as Awaited<ReturnType<typeof getSessionContext>> & { restaurant: Restaurant };
}
