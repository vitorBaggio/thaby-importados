/**
 * Catálogo da Thaby Importados — acervo completo.
 *
 * Os dados em `catalogo-completo.json` foram extraídos do catálogo operacional
 * real da loja (categorias, subcategorias e produtos ativos, com preço, marca,
 * código e fotos). A hierarquia tem dois níveis: supercategoria → subcategoria.
 *
 * As fotos são servidas do S3 do catálogo (ver next.config remotePatterns); no
 * JSON guardamos só o caminho, e `urlFoto` recompõe a URL. Preços vêm em
 * centavos para evitar imprecisão de ponto flutuante.
 */

import dados from "./catalogo-completo.json";
import { slugify } from "@/lib/texto";

const PREFIXO_FOTO = "https://catalogo-mobile.s3.sa-east-1.amazonaws.com/";

/** Recompõe a URL absoluta de uma foto a partir do caminho guardado. */
export function urlFoto(caminho: string | null | undefined): string | null {
  if (!caminho) return null;
  return caminho.startsWith("http") ? caminho : PREFIXO_FOTO + caminho;
}

/** Formata centavos como moeda brasileira. Sem valor, devolve null. */
export function precoFormatado(centavos: number | null | undefined): string | null {
  if (centavos == null || centavos <= 0) return null;
  return (centavos / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

/* ------------------------------------------------------------------ */
/* Tipos                                                              */
/* ------------------------------------------------------------------ */

export type Subcategoria = {
  id: number;
  nome: string;
  nomeErp: string;
  slug: string;
  /** Caminho da imagem no S3 (use `urlFoto`). */
  imagem: string | null;
  superId: number;
  total: number;
};

export type Categoria = {
  id: number;
  nome: string;
  nomeErp: string;
  slug: string;
  imagem: string | null;
  super: true;
  subcategorias: Subcategoria[];
  total: number;
};

type ProdutoBruto = {
  id: number;
  nome: string;
  slug: string;
  marca: string | null;
  preco: number | null;
  categoriaId: number;
  fotos: string[];
  descricao: string | null;
  codigo: string | null;
  ean: string | null;
};

export type Produto = ProdutoBruto & {
  /** URL absoluta da primeira foto, ou null. */
  imagem: string | null;
  destaque: boolean;
};

/* ------------------------------------------------------------------ */
/* Carregamento                                                       */
/* ------------------------------------------------------------------ */

export const categorias = dados.categorias as Categoria[];

/** Todas as subcategorias, achatadas, para busca e navegação. */
export const subcategorias: Subcategoria[] = categorias.flatMap(
  (c) => c.subcategorias,
);

export const marcas = dados.marcas as string[];

/**
 * Destaques da home. Sem flag de destaque na origem, elegemos peças que
 * "vendem sozinhas": com foto, preço e de marca de desejo. É uma curadoria
 * automática, revisável trocando a lista de marcas-âncora.
 */
const MARCAS_ANCORA = new Set([
  "Dior",
  "Charlotte Tilbury",
  "Coach",
  "Michael Kors",
  "Fenty Beauty",
  "Gucci",
  "Bath & Body Works",
  "Medicube",
  "Tarte",
  "Stanley",
]);

/**
 * Limpa o ruído de ERP que vem nos nomes: siglas de marca soltas ("Ct", "Bbw")
 * quando a marca já aparece em separado, typos conhecidos e acrônimos de skincare
 * que deveriam ser caixa-alta. Conservador de propósito: só mexe no que é seguro.
 *
 * A sigla só sai quando o produto tem a marca correspondente no cadastro; sem
 * marca, ela é a única indicação de origem no cartão e fica.
 */
const ABREVIACOES: Record<string, RegExp> = {
  "Charlotte Tilbury": /\bct\b/gi,
  "Bath & Body Works": /\bbbw\b/gi,
  // "Fenty Beauty" sai inteiro (ou "Fenty" solto), nunca deixando "Beauty" órfão.
  "Fenty Beauty": /\bfenty(?:\s+beauty)?\b/gi,
};

/** Sem a sigla, o nome precisa continuar com pelo menos isso de palavras. */
const MIN_PALAVRAS = 2;

const TYPOS: Array<[RegExp, string]> = [
  [/\bselting\b/gi, "Setting"],
  [/\bwaterproof\b/gi, "Waterproof"],
];

const ACRONIMOS = ["pdrn", "spf", "edt", "edp", "edc", "led", "uv"];

const contarPalavras = (texto: string) =>
  texto.split(/\s+/).filter((palavra) => /[\p{L}\p{N}]/u.test(palavra)).length;

function limparNome(nome: string, marca: string | null): string {
  let saida = nome;

  // Remove a sigla correspondente à própria marca do produto, desde que o
  // nome que sobra ainda diga o que é a peça ("Blush Fenty" não vira "Blush").
  if (marca && ABREVIACOES[marca]) {
    const semSigla = saida.replace(ABREVIACOES[marca], " ");
    if (contarPalavras(semSigla) >= MIN_PALAVRAS) saida = semSigla;
  }

  for (const [de, para] of TYPOS) saida = saida.replace(de, para);

  saida = saida
    .split(/\s+/)
    .map((palavra) => {
      const limpo = palavra.replace(/[^a-zA-Z]/g, "").toLowerCase();
      return ACRONIMOS.includes(limpo) ? palavra.toUpperCase() : palavra;
    })
    .join(" ");

  return saida.replace(/\s{2,}/g, " ").replace(/\s+([.,])/g, "$1").trim();
}

const produtosBase: Produto[] = (dados.produtos as ProdutoBruto[]).map((p) => ({
  ...p,
  nome: limparNome(p.nome, p.marca),
  imagem: urlFoto(p.fotos[0]),
  destaque:
    p.fotos.length > 0 && p.preco != null && !!p.marca && MARCAS_ANCORA.has(p.marca),
}));

export const produtos = produtosBase;

/* ------------------------------------------------------------------ */
/* Índices                                                            */
/* ------------------------------------------------------------------ */

const superPorId = new Map(categorias.map((c) => [c.id, c]));
const superPorSlug = new Map(categorias.map((c) => [c.slug, c]));
const subPorId = new Map(subcategorias.map((s) => [s.id, s]));
const subPorSlug = new Map(subcategorias.map((s) => [s.slug, s]));
const superDeSub = new Map(subcategorias.map((s) => [s.id, superPorId.get(s.superId)!]));
const produtoPorSlugMap = new Map(produtos.map((p) => [p.slug, p]));
const produtosPorSub = new Map<number, Produto[]>();
for (const p of produtos) {
  const lista = produtosPorSub.get(p.categoriaId);
  if (lista) lista.push(p);
  else produtosPorSub.set(p.categoriaId, [p]);
}

/* ------------------------------------------------------------------ */
/* Consultas                                                          */
/* ------------------------------------------------------------------ */

export const superPorSlugFn = (slug: string) => superPorSlug.get(slug);
export const subcategoriaPorSlug = (slug: string) => subPorSlug.get(slug);

/** Resolve um slug que pode ser de supercategoria ou de subcategoria. */
export function categoriaPorSlug(
  slug: string,
): { tipo: "super"; dado: Categoria } | { tipo: "sub"; dado: Subcategoria } | undefined {
  const sup = superPorSlug.get(slug);
  if (sup) return { tipo: "super", dado: sup };
  const sub = subPorSlug.get(slug);
  if (sub) return { tipo: "sub", dado: sub };
  return undefined;
}

/**
 * Textos de vitrine das supercategorias. São editoriais — descrevem o recorte,
 * sem prometer especificação. Subcategorias não têm resumo próprio; a UI cai
 * para a contagem de peças.
 */
const RESUMO_SUPER: Record<string, string> = {
  "acessorios-e-moda":
    "Bolsas, carteiras, óculos e relógios de grife. O detalhe que assina o visual, com procedência conferida.",
  beleza:
    "Skincare coreano, maquiagem de cult e perfumaria fina. As linhas que ditam o padrão internacional de beleza.",
  alimentacao:
    "Confeitaria, guloseimas e temperos importados. O sabor que transforma o comum em ocasião.",
  "bem-estar-e-estilo-de-vida":
    "Cuidado diário, aromas de casa e pequenos rituais que não se encontram por aqui.",
  infantil:
    "Brinquedos de licença oficial, beleza e cuidados pensados para os pequenos.",
  "mamae-e-bebe":
    "O enxoval e o cuidado da maternidade, no padrão de acabamento importado.",
  papelaria:
    "Canetas, adesivos e papelaria de coleção — utilidade tratada como item de desejo.",
  tecnologia: "Acessórios e gadgets que ainda não chegaram por aqui.",
  vestuario: "Peças de vestuário adulto e infantil, selecionadas por acabamento.",
  "outros-importados": "Achados que fogem das prateleiras comuns.",
};

export function resumoCategoria(c: Categoria | Subcategoria): string {
  if ("super" in c) {
    return (
      RESUMO_SUPER[c.slug] ??
      `${c.subcategorias.length} frentes, ${c.total} peças no acervo.`
    );
  }
  const sup = superDeSub.get(c.id);
  return sup
    ? `Parte da curadoria de ${sup.nome}. ${c.total} ${c.total === 1 ? "peça" : "peças"} no acervo.`
    : `${c.total} ${c.total === 1 ? "peça" : "peças"} no acervo.`;
}

/**
 * Descrição de vitrine: usa a real quando existe. Sem descrição própria, varia
 * o texto entre alguns moldes (escolhidos pelo id) para não repetir a mesma
 * frase em prateleiras inteiras. A categoria entra como rótulo, sem artigo,
 * para não depender do gênero ("Maquiagem", "Brinquedos").
 */
const MOLDES_RESUMO = [
  (marca: string, cat: string) =>
    `${marca} na seleção de ${cat} da Thaby Importados. Valor e disponibilidade pelo WhatsApp.`,
  (marca: string, cat: string) =>
    `Conheça a seleção de ${cat} da Thaby Importados, com peças da marca ${marca}.`,
  (marca: string) =>
    `${marca} na curadoria da Thaby Importados. Consulte valor e disponibilidade pelo WhatsApp.`,
];

export function resumoProduto(p: Produto): string {
  if (p.descricao && p.descricao.length > 4) return p.descricao;

  const sub = subPorId.get(p.categoriaId);
  const marca = p.marca;
  const cat = sub?.nome;

  if (marca && cat) {
    return MOLDES_RESUMO[p.id % MOLDES_RESUMO.length](marca, cat);
  }
  if (cat) {
    return `Seleção de ${cat} da curadoria Thaby Importados. Valor e disponibilidade no WhatsApp.`;
  }
  return "Peça importada da curadoria Thaby Importados. Consulte disponibilidade e valor no WhatsApp.";
}
export const subcategoriaPorId = (id: number) => subPorId.get(id);
export const superDaSubcategoria = (subId: number) => superDeSub.get(subId);
export const produtoPorSlug = (slug: string) => produtoPorSlugMap.get(slug);

/** A subcategoria de um produto (é onde ele está ancorado). */
export const categoriaPorId = (id: number): Subcategoria | undefined =>
  subPorId.get(id);

/** Produtos de uma subcategoria. */
export const produtosDaSubcategoria = (subId: number): Produto[] =>
  produtosPorSub.get(subId) ?? [];

/** Produtos de uma supercategoria inteira (todas as subs). */
export const produtosDaSuper = (superId: number): Produto[] => {
  const sup = superPorId.get(superId);
  if (!sup) return [];
  return sup.subcategorias.flatMap((s) => produtosDaSubcategoria(s.id));
};

/**
 * Compat: aceita id de subcategoria (comportamento principal) ou de
 * supercategoria, devolvendo os produtos correspondentes.
 */
export const produtosDaCategoria = (id: number): Produto[] => {
  if (subPorId.has(id)) return produtosDaSubcategoria(id);
  if (superPorId.has(id)) return produtosDaSuper(id);
  return [];
};

/** Ordena com foto na frente: a vitrine nunca abre com placeholders. */
function comFotoPrimeiro(lista: Produto[]) {
  return [...lista].sort((a, b) => {
    if (!!a.imagem !== !!b.imagem) return a.imagem ? -1 : 1;
    if (a.destaque !== b.destaque) return a.destaque ? -1 : 1;
    return 0;
  });
}

export const vitrine = comFotoPrimeiro(produtos);
export const destaques = produtos.filter((p) => p.destaque);

/**
 * Versão enxuta do produto — só o que o cartão precisa. É o que atravessa a
 * fronteira servidor→cliente na vitrine, para não serializar 3.000 produtos
 * completos (com descrição, fotos extras, códigos) no payload.
 */
export type ProdutoResumo = Pick<
  Produto,
  "id" | "nome" | "slug" | "marca" | "preco" | "categoriaId" | "imagem" | "destaque"
>;

const resumir = (p: Produto): ProdutoResumo => ({
  id: p.id,
  nome: p.nome,
  slug: p.slug,
  marca: p.marca,
  preco: p.preco,
  categoriaId: p.categoriaId,
  imagem: p.imagem,
  destaque: p.destaque,
});

export const vitrineResumo: ProdutoResumo[] = vitrine.map(resumir);

/** Categorias em forma leve para o filtro do cliente (sem imagens/subs aninhadas pesadas). */
export type SuperResumo = { id: number; nome: string; slug: string; total: number };

export const categoriasResumo: SuperResumo[] = categorias.map((c) => ({
  id: c.id,
  nome: c.nome,
  slug: c.slug,
  total: c.total,
}));

/** Mapa subcategoria → supercategoria, para o filtro agrupar por frente. */
export const mapaSubParaSuper: Record<number, number> = Object.fromEntries(
  subcategorias.map((s) => [s.id, s.superId]),
);

export function relacionados(produto: Produto, limite = 4): Produto[] {
  const mesma = produtosDaSubcategoria(produto.categoriaId).filter(
    (p) => p.id !== produto.id && p.imagem,
  );
  if (mesma.length >= limite) return mesma.slice(0, limite);

  const sup = superDeSub.get(produto.categoriaId);
  const daSuper = sup
    ? produtosDaSuper(sup.id).filter(
        (p) => p.id !== produto.id && p.imagem && p.categoriaId !== produto.categoriaId,
      )
    : [];
  return [...mesma, ...daSuper].slice(0, limite);
}

/** Busca sem acento por nome, marca e subcategoria. */
export function buscar(termo: string, lista: Produto[] = vitrine): Produto[] {
  const alvo = slugify(termo);
  if (!alvo) return lista;
  const partes = alvo.split("-").filter(Boolean);

  return lista.filter((p) => {
    const sub = subPorId.get(p.categoriaId);
    const indice = slugify([p.nome, p.marca ?? "", sub?.nome ?? ""].join(" "));
    return partes.every((parte) => indice.includes(parte));
  });
}

export const totais = dados.totais as {
  produtos: number;
  comFoto: number;
  supercategorias: number;
  subcategorias: number;
  marcas: number;
};
