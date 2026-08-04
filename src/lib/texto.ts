/** Slug estável para URLs em português (remove acentos e pontuação). */
export function slugify(valor: string) {
  return valor
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/&/g, " e ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Os nomes vêm do ERP em caixa alta e com ruído de importação
 * ("- EAN 7908080810775 _ SKIP HOP"). Aqui deixamos apresentável.
 */
export function nomeApresentavel(nome: string) {
  const limpo = nome
    .replace(/\s*-\s*EAN\s*\d+.*$/i, "")
    .replace(/\s*_\s*[A-Z\s]+$/,'')
    .replace(/\s+/g, " ")
    .trim();

  const todoMaiusculo = limpo === limpo.toUpperCase();
  if (!todoMaiusculo) return limpo;

  const minusculas = new Set(["de", "da", "do", "das", "dos", "e", "para", "com", "em", "a", "o"]);

  return limpo
    .toLowerCase()
    .split(" ")
    .map((palavra, indice) => {
      // Siglas e medidas mantêm a forma original (ML, 3D, 0.5MM, 4UNID).
      const original = limpo.split(" ")[indice] ?? "";
      if (/\d/.test(original) || (original.length <= 3 && original === original.toUpperCase() && indice > 0)) {
        return original;
      }
      if (indice > 0 && minusculas.has(palavra)) return palavra;
      return palavra.charAt(0).toUpperCase() + palavra.slice(1);
    })
    .join(" ");
}

/**
 * Iniciais para o marcador usado quando o produto ainda não tem foto.
 * Marca de uma palavra só ("Vicks") vira "VI" — uma letra isolada fica pobre.
 */
export function iniciais(nome: string, quantidade = 2) {
  const palavras = nome
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter(Boolean);

  if (palavras.length === 0) return "";
  if (palavras.length === 1) return palavras[0].slice(0, quantidade).toUpperCase();

  return palavras
    .slice(0, quantidade)
    .map((p) => p[0].toUpperCase())
    .join("");
}
