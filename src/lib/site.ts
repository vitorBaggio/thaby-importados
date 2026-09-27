/**
 * Origem pública do site.
 * Trocar por variável de ambiente na Vercel (NEXT_PUBLIC_SITE_URL) assim que o
 * domínio definitivo estiver apontado.
 */
export const urlBase =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://thabyimportados.com.br";

/**
 * URL absoluta que respeita subcaminho na base (GitHub Pages: /thaby-importados).
 * Caminho relativo + base com barra final: `new URL("/x", base)` descartaria o subcaminho.
 */
export const url = (caminho = "/") =>
  new URL(caminho.replace(/^\/+/, ""), urlBase.replace(/\/?$/, "/")).toString();
