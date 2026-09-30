/**
 * Tratamento de texto do catalogo, com o MESMO algoritmo de
 * `scripts/extracao-catalogo/gerar-dados.mjs` (que roda no carregamento e por
 * isso nao pode ser importado). Mudou la, muda aqui: slug e marca diferentes
 * quebram URL indexada e o casamento com o site atual.
 */

export const slugify = (s) =>
  String(s)
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/&/g, " e ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

/** Nome comparavel: sem acento, sem caixa, pontuacao vira espaco. */
export const normalizarNome = (s) => slugify(s ?? "").replace(/-/g, " ");

export const capitalizar = (nome) => {
  const minusc = new Set(["de", "da", "do", "das", "dos", "e", "para", "com", "em", "a", "o"]);
  return String(nome)
    .toLowerCase()
    .split(/\s+/)
    .map((p, i) => {
      if (/\d/.test(p)) return p;
      if (i > 0 && minusc.has(p)) return p;
      return p.charAt(0).toUpperCase() + p.slice(1);
    })
    .join(" ");
};

const MARCA_CANON = {
  "bath and body works": "Bath & Body Works",
  "bath & body works": "Bath & Body Works",
  bbw: "Bath & Body Works",
  "e.l.f.": "e.l.f.",
  elf: "e.l.f.",
  "kiko milano": "Kiko Milano",
  skin1004: "SKIN1004",
  tirtir: "TIRTIR",
};

export function normalizarMarca(bruta) {
  if (!bruta) return null;
  const limpa = String(bruta).replace(/\s+/g, " ").trim();
  if (!limpa) return null;
  return MARCA_CANON[limpa.toLowerCase()] ?? capitalizar(limpa);
}

/** O Bling guarda a descricao em HTML; o site so recebe texto limpo (sem XSS). */
export function limparHtml(bruto) {
  if (!bruto) return null;
  const texto = String(bruto)
    .replace(/<\s*br\s*\/?\s*>/gi, "\n")
    .replace(/<\/\s*(p|div|li)\s*>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/<[a-z/][^]*$/i, "")
    .replace(/https?:\/\/\S+/gi, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&[a-z]+;/gi, " ")
    .replace(/<\/?[a-z][^>]*>?/gi, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{2,}/g, "\n")
    .replace(/^\s+|\s+$/g, "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .join("\n");
  return texto.length > 2 ? texto : null;
}

/** Preco do Bling (reais, number) em centavos inteiros. Zero ou invalido: sem preco. */
export function centavos(preco) {
  const n = Number(preco);
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) : null;
}
