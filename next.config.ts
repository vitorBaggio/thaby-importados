import type { NextConfig } from "next";

/*
  Dois alvos de deploy a partir do mesmo código:

  - Padrão (Vercel / `next dev`): servidor Node. Páginas de produto sob demanda,
    fotos otimizadas pelo next/image.
  - GitHub Pages (`GITHUB_PAGES=true`): exportação 100% estática. Sem servidor,
    então TODAS as páginas são geradas no build e as fotos carregam direto do S3
    (o otimizador do next/image precisa de servidor, que o Pages não tem).

  O basePath existe porque um "project site" do GitHub serve em
  usuario.github.io/<repo>, não na raiz do domínio.
*/
const paraGitHubPages = process.env.GITHUB_PAGES === "true";
// Cloudflare (dominio proprio) tambem usa o export estatico, mas serve na raiz.
const paraCloudflare = process.env.CLOUDFLARE === "true";
const REPO = "thaby-importados";

const nextConfig: NextConfig = paraGitHubPages || paraCloudflare
  ? {
      output: "export",
      ...(paraGitHubPages ? { basePath: `/${REPO}` } : {}),
      trailingSlash: true,
      images: { unoptimized: true },
      experimental: { optimizePackageImports: ["lucide-react", "motion"] },
    }
  : {
      images: {
        formats: ["image/avif", "image/webp"],
        minimumCacheTTL: 31_536_000,
        remotePatterns: [
          {
            protocol: "https",
            hostname: "catalogo-mobile.s3.sa-east-1.amazonaws.com",
            pathname: "/companies/7827/**",
          },
        ],
      },
      experimental: { optimizePackageImports: ["lucide-react", "motion"] },
    };

export default nextConfig;
