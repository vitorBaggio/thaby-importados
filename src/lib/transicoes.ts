/**
 * Nomes de View Transition.
 *
 * O nome cria a identidade que o navegador usa para parear o mesmo elemento
 * entre duas páginas. Precisa ser único no documento e idêntico dos dois lados
 * — por isso mora aqui, e não escrito à mão em cada componente.
 */

export const nomeTransicaoProduto = (id: number) => `produto-${id}`;

/** Cabeçalho fixo: ancorado para não deslizar junto com o conteúdo. */
export const NOME_CABECALHO = "cabecalho-do-site";
