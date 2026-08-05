import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 31_536_000,
    // As fotos do acervo (2200+) ficam no S3 do catálogo. next/image otimiza
    // sob demanda, então nada é baixado no build — o repositório fica leve.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "catalogo-mobile.s3.sa-east-1.amazonaws.com",
        pathname: "/companies/7827/**",
      },
    ],
  },
  experimental: {
    optimizePackageImports: ["lucide-react", "motion"],
  },
};

export default nextConfig;
