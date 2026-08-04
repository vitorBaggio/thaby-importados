import type { MetadataRoute } from "next";
import { categorias, produtos } from "@/dados/catalogo";
import { url } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const agora = new Date();

  const fixas: MetadataRoute.Sitemap = [
    { url: url("/"), changeFrequency: "weekly", priority: 1 },
    { url: url("/catalogo"), changeFrequency: "weekly", priority: 0.9 },
    { url: url("/categorias"), changeFrequency: "monthly", priority: 0.8 },
    { url: url("/sobre"), changeFrequency: "yearly", priority: 0.5 },
    { url: url("/contato"), changeFrequency: "yearly", priority: 0.6 },
  ];

  return [
    ...fixas,
    ...categorias.map((categoria) => ({
      url: url(`/categorias/${categoria.slug}`),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
    ...produtos.map((produto) => ({
      url: url(`/produtos/${produto.slug}`),
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
  ].map((entrada) => ({ lastModified: agora, ...entrada }));
}
