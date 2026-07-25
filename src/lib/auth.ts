import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Restaurant, Role } from "./types";

export async function getSessionContext() {
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
}

export async function requireRestaurant() {
  const context = await getSessionContext();
  if (!context.user) redirect("/login");
  if (!context.restaurant) redirect("/register");
  return context as Awaited<ReturnType<typeof getSessionContext>> & { restaurant: Restaurant };
}
