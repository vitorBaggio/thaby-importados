import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Todas as imagens são locais e já otimizadas em WebP pelo pipeline de assets.
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 31_536_000,
  },
  experimental: {
    optimizePackageImports: ["lucide-react", "motion"],
  },
};

export default nextConfig;
