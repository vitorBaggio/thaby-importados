/**
 * Origem pública do site.
 * Trocar por variável de ambiente na Vercel (NEXT_PUBLIC_SITE_URL) assim que o
 * domínio definitivo estiver apontado.
 */
export const urlBase =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://thabyimportados.com.br";

export const url = (caminho = "/") => new URL(caminho, urlBase).toString();
