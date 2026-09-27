import type { MetadataRoute } from "next";
import { categorias, subcategorias, produtos } from "@/dados/catalogo";
import { url } from "@/lib/site";

// Exigido pela exportação estática (GitHub Pages).
export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const agora = new Date();

  const fixas: MetadataRoute.Sitemap = [
    { url: url("/"), changeFrequency: "weekly", priority: 1 },
    { url: url("/novidades"), changeFrequency: "weekly", priority: 0.9 },
    { url: url("/sale"), changeFrequency: "weekly", priority: 0.8 },
    { url: url("/catalogo"), changeFrequency: "weekly", priority: 0.9 },
    { url: url("/categorias"), changeFrequency: "monthly", priority: 0.8 },
    { url: url("/sobre"), changeFrequency: "yearly", priority: 0.5 },
    { url: url("/contato"), changeFrequency: "yearly", priority: 0.6 },
  ];

  // Super e subcategorias têm slug único no mesmo espaço.
  const rotasCategoria = [...categorias, ...subcategorias].map((c) => ({
    url: url(`/categorias/${c.slug}`),
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  return [
    ...fixas,
    ...rotasCategoria,
    ...produtos.map((produto) => ({
      url: url(`/produtos/${produto.slug}`),
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
  ].map((entrada) => ({ lastModified: agora, ...entrada }));
}
