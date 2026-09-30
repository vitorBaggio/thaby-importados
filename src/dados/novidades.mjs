/**
 * Regras de Novidades, num lugar so: o site (build) e a sincronizacao com o
 * Bling (`scripts/bling`) importam daqui. JavaScript puro para rodar nos dois.
 *
 * Novidade = produto incluido no Bling nos ultimos DIAS_NOVIDADE dias. A
 * sincronizacao grava no catalogo `novidadeAte` (AAAA-MM-DD); o site mostra em
 * Novidades quem tem `novidadeAte` >= data do build.
 */

export const DIAS_NOVIDADE = 15;
export const FUSO_LOJA = "America/Sao_Paulo";

const formatoData = new Intl.DateTimeFormat("en-CA", {
  timeZone: FUSO_LOJA,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/**
 * Data AAAA-MM-DD no fuso da loja.
 * @param {Date} [instante]
 * @returns {string}
 */
export const dataNaLoja = (instante = new Date()) => formatoData.format(instante);

/**
 * Soma dias de calendario a uma data AAAA-MM-DD.
 * @param {string} data
 * @param {number} dias
 * @returns {string}
 */
export function somarDias(data, dias) {
  const [ano, mes, dia] = data.split("-").map(Number);
  return new Date(Date.UTC(ano, mes - 1, dia + dias)).toISOString().slice(0, 10);
}

/**
 * Catalogo sem nenhum `novidadeAte` (anterior a sincronizacao) mantem o
 * criterio antigo: os `qtdSemData` maiores ids. Com o campo, so os vigentes
 * (`novidadeAte` >= `hoje`), mais recentes primeiro; pode dar lista vazia.
 *
 * @template {{ id: number, novidadeAte?: string | null }} T
 * @param {T[]} produtos
 * @param {string} hoje AAAA-MM-DD
 * @param {number} qtdSemData
 * @returns {{ porData: boolean, lista: T[] }}
 */
export function selecionarNovidades(produtos, hoje, qtdSemData) {
  const ate = (p) => (typeof p.novidadeAte === "string" ? p.novidadeAte : "");
  const porData = produtos.some((p) => ate(p) !== "");
  if (!porData) {
    return { porData, lista: [...produtos].sort((a, b) => b.id - a.id).slice(0, qtdSemData) };
  }
  const lista = produtos
    .filter((p) => ate(p) !== "" && ate(p) >= hoje)
    .sort((a, b) => ate(b).localeCompare(ate(a)) || b.id - a.id);
  return { porData, lista };
}
