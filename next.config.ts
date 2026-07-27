import type { NextConfig } from "next";

const CANONICAL_HOST = "perinifood.com.br";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "8mb",
    },
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
