import type { MetadataRoute } from "next";
import { url } from "@/lib/site";

// Exigido pela exportação estática (GitHub Pages).
export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: url("/sitemap.xml"),
  };
}
