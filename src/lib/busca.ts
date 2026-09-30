import { slugify } from "./texto";

/**
 * Critério único de busca do site (catálogo e lupa do cabeçalho): sem acento,
 * sem caixa e sem pontuação; cada palavra digitada precisa aparecer em algum
 * lugar do nome, da marca ou do código da peça.
 */
export function partesDaBusca(termo: string): string[] {
  return slugify(termo).split("-").filter(Boolean);
}

/** Texto onde a busca procura, já normalizado. Calcule uma vez por produto. */
export function indiceDeBusca(p: {
  nome: string;
  marca: string | null;
  codigo: string | null;
}): string {
  return slugify(`${p.nome} ${p.marca ?? ""} ${p.codigo ?? ""}`);
}

export function casaBusca(indice: string, partes: string[]): boolean {
  return partes.every((parte) => indice.includes(parte));
}

/** Página do catálogo já filtrada pelo termo. */
export const hrefBusca = (termo: string) =>
  `/catalogo?busca=${encodeURIComponent(termo.trim())}`;

/**
 * Índice estático da lupa (`/busca-indice.json`), gerado no build. Cada item é
 * uma tupla para o arquivo ficar leve: [id, nome, slug, marca, codigo, preco, foto].
 */
export type ItemIndice = [
  id: number,
  nome: string,
  slug: string,
  marca: string | null,
  codigo: string | null,
  preco: number | null,
  foto: string | null,
];
