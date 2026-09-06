import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

// Admins da PLATAFORMA (equipe PeriniFood) — não confundir com donos de
// restaurante. Lista controlada por env: PLATFORM_ADMIN_EMAILS="a@x.com,b@y.com".
export function isPlatformAdminEmail(email: string | null | undefined) {
  if (!email) return false;
  return (process.env.PLATFORM_ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
    .includes(email.toLowerCase());
}

export const getPlatformAdmin = cache(async () => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const email = user?.email?.toLowerCase() ?? null;
  return { user, email, isAdmin: Boolean(user?.email_confirmed_at) && isPlatformAdminEmail(email) };
});

// Bloqueia a rota para quem não é admin da plataforma e entrega um service
// client (ignora RLS) para leitura cross-tenant.
export async function requirePlatformAdmin() {
  const ctx = await getPlatformAdmin();
  if (!ctx.user) redirect("/login");
  if (!ctx.isAdmin) redirect("/dashboard");
  return { ...ctx, service: createServiceClient() };
}

// E-mails dos usuários por id (auth admin). Best-effort: falha de rede no
// endpoint de auth não pode derrubar o painel — retorna mapa vazio.
export async function listUserEmails(service: ReturnType<typeof createServiceClient>): Promise<Map<string, string>> {
  try {
    const { data, error } = await service.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (error) return new Map();
    return new Map(data.users.map((u) => [u.id, u.email ?? ""]));
  } catch {
    return new Map();
  }
}
