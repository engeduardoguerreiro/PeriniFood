import type { NextConfig } from "next";

const CANONICAL_HOST = "perinifood.com.br";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "8mb",
      // Quem abre o painel por www leva um 308 para o domínio canônico. O POST da
      // Server Action segue o redirecionamento, mas o header Origin continua sendo
      // o de origem: sem esta lista o Next recusa com "Invalid Server Actions
      // request" e o formulário parece travado em "Salvando...".
      allowedOrigins: [CANONICAL_HOST, `www.${CANONICAL_HOST}`, "perinifood.vercel.app"],
    },
  },
  async headers() {
    return [{ source: "/:path*", headers: [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Referrer-Policy", value: "no-referrer" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self)" },
      { key: "Content-Security-Policy", value: "object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'" },
    ] }, { source: "/pedido/:path*", headers: [{ key: "Cache-Control", value: "private, no-store" }, { key: "X-Robots-Tag", value: "noindex, nofollow" }] },
    { source: "/entrega/:path*", headers: [{ key: "Cache-Control", value: "private, no-store" }, { key: "X-Robots-Tag", value: "noindex, nofollow" }, { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self)" }] },
    { source: "/api/customer-auth/:path*", headers: [{ key: "Cache-Control", value: "private, no-store" }] }];
  },
  async redirects() {
    // Domínio canônico: www e a URL do Vercel apontam para perinifood.com.br.
    return ["www.perinifood.com.br", "perinifood.vercel.app"].map((host) => ({
      source: "/:path*",
      has: [{ type: "host" as const, value: host }],
      destination: `https://${CANONICAL_HOST}/:path*`,
      permanent: true,
    }));
  },
};

export default nextConfig;
