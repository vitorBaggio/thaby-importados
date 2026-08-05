/**
 * Prefixo de caminho para imagens locais (`/public`).
 *
 * Por quê: o `next/image` aplica o `basePath` automaticamente aos links, mas
 * NÃO ao `src` de imagens locais quando o site é exportado estático (GitHub
 * Pages serve em `/thaby-importados`, não na raiz). Sem este prefixo, a logo e
 * as fotos locais dariam 404.
 *
 * `NEXT_PUBLIC_BASE_PATH` é definido no build do GitHub Pages; vazio no dev e na
 * Vercel (que servem na raiz). URLs absolutas (S3) passam intactas.
 */
const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export function asset(caminho: string): string {
  if (/^https?:\/\//.test(caminho)) return caminho;
  return `${BASE}${caminho}`;
}
