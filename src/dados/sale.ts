/**
 * Peças da aba Sale.
 *
 * O cadastro extraído não traz preço promocional, então a seleção é manual.
 * Para colocar uma peça no Sale, adicione uma linha com o código dela no
 * catálogo operacional (o mesmo que aparece como "Código" na página do
 * produto) e, se houver desconto, o preço promocional em centavos:
 *
 *   { codigo: "15869060426", precoPromocional: 29900 }, // R$ 299,00
 *   { codigo: "15869059173" }, // entra no Sale com o preço normal
 *
 * O preço promocional só vale se for menor que o preço do cadastro. Aí ele
 * passa a ser o preço da peça no site inteiro (cartão, página, lista e
 * mensagem do WhatsApp) e o preço antigo aparece riscado. Código que não
 * existe no catálogo é ignorado com um aviso no build.
 *
 * Lista vazia: a aba continua no menu e mostra o convite para ser avisada.
 */

export type ItemSale = {
  codigo: string;
  /** Centavos, inteiro. */
  precoPromocional?: number;
};

export const itensSale: ItemSale[] = [];
