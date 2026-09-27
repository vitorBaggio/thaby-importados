/**
 * Contas e mensagem do pedido.
 *
 * Tudo em centavos inteiros, como o preço vem do cadastro: soma e multiplicação
 * de inteiros não perdem precisão. A conversão para reais acontece só na hora
 * de exibir. Sem dependências de propósito: o teste roda direto no node.
 */

/** O que a conta e a mensagem precisam de cada linha do pedido. */
export type LinhaPedido = {
  nome: string;
  codigo: string | null;
  /** Centavos. Nulo (ou zero) quando o preço é sob consulta. */
  preco: number | null;
  quantidade: number;
};

const moeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

/** Centavos para "R$ 1.539,00". O Intl separa com espaço fixo; aqui vira espaço comum. */
export function formatarBRL(centavos: number): string {
  return moeda.format(centavos / 100).replace(/\s/g, " ");
}

export const temPreco = (linha: Pick<LinhaPedido, "preco">): linha is { preco: number } =>
  linha.preco != null && linha.preco > 0;

/** Subtotal da linha em centavos; sem preço, não entra na conta. */
export const subtotal = (linha: LinhaPedido): number =>
  temPreco(linha) ? linha.preco * linha.quantidade : 0;

export const totalPedido = (linhas: LinhaPedido[]): number =>
  linhas.reduce((total, linha) => total + subtotal(linha), 0);

export const algumSobConsulta = (linhas: LinhaPedido[]): boolean =>
  linhas.some((linha) => !temPreco(linha));

/** Acompanha todo total: a soma é estimativa, quem confirma é a consultora. */
export const NOTA_TOTAL =
  "Valores e disponibilidade confirmados pela consultora no WhatsApp.";

export const NOTA_SOB_CONSULTA ="Itens sob consulta não entram no total.";

/** Mensagem pronta para o WhatsApp da consultora escolhida. */
export function montarMensagemPedido({
  consultora,
  loja,
  linhas,
  nomeCliente,
}: {
  consultora: string;
  loja: string;
  linhas: LinhaPedido[];
  nomeCliente?: string;
}): string {
  const itens = linhas.flatMap((linha, indice) => {
    const codigo = linha.codigo ? ` (cód. ${linha.codigo})` : "";
    const conta = temPreco(linha)
      ? `${linha.quantidade} x ${formatarBRL(linha.preco)} = ${formatarBRL(subtotal(linha))}`
      : `${linha.quantidade} x valor sob consulta`;
    return [`${indice + 1}. ${linha.nome}${codigo}`, `   ${conta}`];
  });

  const nome = nomeCliente?.trim();

  return [
    `Olá, ${consultora}! Vim pelo catálogo da ${loja} e gostaria de verificar a disponibilidade desses produtos:`,
    "",
    ...itens,
    "",
    `Total estimado: ${formatarBRL(totalPedido(linhas))}`,
    ...(algumSobConsulta(linhas) ? [NOTA_SOB_CONSULTA] : []),
    ...(nome ? ["", `Meu nome é ${nome}.`] : []),
  ].join("\n");
}
