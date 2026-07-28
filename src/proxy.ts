import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  // Subdomínio do painel administrativo (ex.: admin.perinifood.com.br): a raiz
  // vira /admin — os links internos do painel já usam /admin/... e funcionam em
  // qualquer host. Basta apontar o subdomínio para o projeto na Vercel.
  const host = request.headers.get("host") ?? "";
  if (request.nextUrl.pathname === "/") {
    if (host.startsWith("admin.")) {
      const url = request.nextUrl.clone();
      url.pathname = "/admin";
      return NextResponse.rewrite(url);
    }
    // Landing pública: não precisa renovar sessão aqui.
    return NextResponse.next();
  }

  let response = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://example.supabase.co",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "missing-anon-key",
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );
  await supabase.auth.getUser();
  return response;
}

export const config = {
  matcher: ["/", "/admin/:path*", "/dashboard/:path*", "/cardapio", "/cardapio/categorias", "/cardapio/produtos/:path*", "/cardapio/adicionais", "/pedidos/:path*", "/clientes/:path*", "/configuracoes", "/login", "/register"],
};
