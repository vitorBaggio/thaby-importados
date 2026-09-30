/**
 * Formata centavos como moeda brasileira. Sem valor, devolve null.
 *
 * Fica fora de `@/dados/catalogo` para a busca do cabeçalho usar sem puxar o
 * JSON do catálogo inteiro para o bundle de todas as páginas.
 */
export function precoFormatado(centavos: number | null | undefined): string | null {
  if (centavos == null || centavos <= 0) return null;
  return (centavos / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}
