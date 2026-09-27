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
import { itensSale, type ItemSale } from "./sale";
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
  /** Preço do cadastro em centavos quando a peça está no Sale com desconto; `preco` já é o promocional. */
  precoAnterior: number | null;
};

/* ------------------------------------------------------------------ */
/* Carregamento                                                       */
/* ------------------------------------------------------------------ */

export const categorias = dados.categorias as Categoria[];

/** Todas as subcategorias, achatadas, para busca e navegação. */
export const subcategorias: Subcategoria[] = categorias.flatMap(
  (c) => c.subcategorias,
);

/**
 * Grafias diferentes da mesma marca no cadastro (apóstrofo reto/curvo/ausente,
 * acento, typo, singular/plural). Tudo converge para a grafia oficial. O JSON
 * fica intocado; a normalização acontece aqui, no carregamento.
 */
const APELIDOS_MARCA: Record<string, string> = {
  "Victorias Secret": "Victoria's Secret",
  "Victoria’s Secret": "Victoria's Secret",
  Lancome: "Lancôme",
  Hermes: "Hermès",
  "Round Labs": "Round Lab",
  "Dr Althea": "Dr. Althea",
  "Kernel Seasons": "Kernel Season's",
  "Kernel Season’s": "Kernel Season's",
  "Seasons Kernel": "Kernel Season's",
  "Bath Andd Body Works": "Bath & Body Works",
  "Mchael Kors": "Michael Kors",
  Kiko: "Kiko Milano",
  "Caudalie Paris": "Caudalie",
  Vt: "VT Cosmetics",
  "Vt Cosmetics": "VT Cosmetics",
  "Pink Stuff": "The Pink Stuff",
  Castebel: "Castelbel",
  "By Mario": "Makeup By Mario",
};

const normalizarMarca = (marca: string | null): string | null =>
  marca ? (APELIDOS_MARCA[marca] ?? marca) : null;

/** Corte de presença real no acervo: o mesmo da lista original do JSON. */
const MIN_PECAS_MARCA = 3;

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

/**
 * Tira travessões (– e —) da descrição do cadastro: faixa entre dígitos vira
 * hífen ("10–15" → "10-15"); o resto, com os espaços em volta, vira vírgula.
 */
function limparTravessoes(texto: string): string {
  // Marcador provisório: a limpeza de pontuação só age onde havia travessão.
  const M = "";
  return texto
    .replace(/(\d)[–—](?=\d)/g, "$1-")
    .replace(/(?:[ \t]*[–—][ \t]*)+/g, M)
    .replace(new RegExp(`^${M}|${M}$`, "gm"), "")
    .replace(new RegExp(`([.,;:!?])${M}`, "g"), "$1 ")
    .replace(new RegExp(`${M}(?=[.,;:!?])`, "g"), "")
    .replaceAll(M, ", ");
}

const produtosBase: Produto[] = (dados.produtos as ProdutoBruto[]).map((p) => {
  const marca = normalizarMarca(p.marca);
  return {
    ...p,
    // A limpeza do nome continua recebendo a marca crua do cadastro.
    nome: limparNome(p.nome, p.marca),
    descricao: p.descricao && limparTravessoes(p.descricao),
    marca,
    imagem: urlFoto(p.fotos[0]),
    destaque:
      p.fotos.length > 0 && p.preco != null && !!marca && MARCAS_ANCORA.has(marca),
    precoAnterior: null,
  };
});

/* ------------------------------------------------------------------ */
/* Sale                                                               */
/* ------------------------------------------------------------------ */

/** Só aplica promoção inteira, positiva e menor que o preço do cadastro. */
const comPrecoSale = (p: Produto, promocional?: number): Produto =>
  promocional != null &&
  Number.isInteger(promocional) &&
  promocional > 0 &&
  p.preco != null &&
  promocional < p.preco
    ? { ...p, preco: promocional, precoAnterior: p.preco }
    : p;

/**
 * Resolve os itens do Sale (código → produto), já com o preço promocional.
 * Código inexistente fica de fora com aviso no build. Há códigos repetidos no
 * cadastro: nesse caso todas as peças com o código entram, uma vez cada.
 */
export function resolverSale(
  itens: readonly ItemSale[],
  lista: Produto[] = produtosBase,
): Produto[] {
  const porCodigo = new Map<string, Produto[]>();
  for (const p of lista) {
    if (!p.codigo) continue;
    const grupo = porCodigo.get(p.codigo);
    if (grupo) grupo.push(p);
    else porCodigo.set(p.codigo, [p]);
  }

  const vistos = new Set<number>();
  return itens.flatMap((item) => {
    const achados = porCodigo.get(item.codigo.trim());
    if (!achados) {
      if (typeof window === "undefined") {
        console.warn(`[sale] Código "${item.codigo}" não existe no catálogo; item ignorado.`);
      }
      return [];
    }
    return achados
      .filter((p) => !vistos.has(p.id) && !!vistos.add(p.id))
      .map((p) => comPrecoSale(p, item.precoPromocional));
  });
}

const emSale = resolverSale(itensSale);
const salePorId = new Map(emSale.map((p) => [p.id, p]));

/** Acervo com o preço do Sale aplicado: cartão, página e lista usam o mesmo valor. */
export const produtos: Produto[] = produtosBase.map((p) => salePorId.get(p.id) ?? p);

const pecasPorMarca = new Map<string, number>();
for (const p of produtos) {
  if (p.marca) pecasPorMarca.set(p.marca, (pecasPorMarca.get(p.marca) ?? 0) + 1);
}

/** Marcas já normalizadas, da mais para a menos representada. */
export const marcas: string[] = [...pecasPorMarca]
  .filter(([, total]) => total >= MIN_PECAS_MARCA)
  .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "pt-BR"))
  .map(([marca]) => marca);

/**
 * Faixa de marcas da home: só grifes e beleza de desejo, da maior assinatura
 * para a mais acessível. Toda marca daqui precisa ter peça no acervo; a que
 * não tiver cai fora sozinha, sem deixar nome vazio na faixa.
 */
const MARCAS_VITRINE = [
  "Chanel",
  "Dior",
  "Gucci",
  "Yves Saint Laurent",
  "Burberry",
  "Versace",
  "Dolce & Gabbana",
  "Lalique",
  "Montblanc",
  "Carolina Herrera",
  "Kenzo",
  "Mugler",
  "Marc Jacobs",
  "Michael Kors",
  "Coach",
  "Kate Spade",
  "Lancôme",
  "Shiseido",
  "Charlotte Tilbury",
  "Natasha Denona",
  "Huda Beauty",
  "Laura Mercier",
  "Fenty Beauty",
  "Too Faced",
  "Tarte",
  "Victoria's Secret",
  "Bath & Body Works",
  "Sephora",
  "Laneige",
  "Glow Recipe",
  "Medicube",
  "Stanley",
  "Disney",
];

export const marcasVitrine: string[] = MARCAS_VITRINE.filter((m) =>
  pecasPorMarca.has(m),
);

/* ------------------------------------------------------------------ */
/* Índices                                                            */
/* ------------------------------------------------------------------ */

const superPorId = new Map(categorias.map((c) => [c.id, c]));
const superPorSlug = new Map(categorias.map((c) => [c.slug, c]));
const subPorId = new Map(subcategorias.map((s) => [s.id, s]));
const subPorSlug = new Map(subcategorias.map((s) => [s.slug, s]));
const superDeSub = new Map(subcategorias.map((s) => [s.id, superPorId.get(s.superId)!]));
const produtoPorSlugMap = new Map(produtos.map((p) => [p.slug, p]));
/**
 * Com foto antes de sem foto, mantendo a ordem do cadastro dentro de cada
 * grupo (o sort do JS é estável). As listagens de categoria saem daqui.
 */
const fotoPrimeiro = (lista: Produto[]) =>
  [...lista].sort((a, b) => Number(!!b.imagem) - Number(!!a.imagem));

const produtosPorSub = new Map<number, Produto[]>();
for (const p of fotoPrimeiro(produtos)) {
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
    "Bolsas, carteiras, óculos e relógios de grife. O detalhe que assina o visual.",
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
    "Canetas, adesivos e papelaria de coleção: utilidade tratada como item de desejo.",
  tecnologia: "Acessórios e gadgets que ainda não chegaram por aqui.",
  vestuario: "Peças de vestuário adulto e infantil, selecionadas por acabamento.",
  "outros-importados": "Achados que fogem das prateleiras comuns.",
};

export function resumoCategoria(c: Categoria | Subcategoria): string {
  if ("super" in c) {
    return (
      RESUMO_SUPER[c.slug] ??
      `${c.subcategorias.length} frentes, ${c.total.toLocaleString("pt-BR")} peças no acervo.`
    );
  }
  const sup = superDeSub.get(c.id);
  const pecas = `${c.total.toLocaleString("pt-BR")} ${c.total === 1 ? "peça" : "peças"}`;
  return sup
    ? `Parte da curadoria de ${sup.nome}. ${pecas} no acervo.`
    : `${pecas} no acervo.`;
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
  | "id"
  | "nome"
  | "slug"
  | "marca"
  | "preco"
  | "precoAnterior"
  | "codigo"
  | "categoriaId"
  | "imagem"
  | "destaque"
>;

const resumir = (p: Produto): ProdutoResumo => ({
  id: p.id,
  nome: p.nome,
  slug: p.slug,
  marca: p.marca,
  preco: p.preco,
  precoAnterior: p.precoAnterior,
  codigo: p.codigo,
  categoriaId: p.categoriaId,
  imagem: p.imagem,
  destaque: p.destaque,
});

export const vitrineResumo: ProdutoResumo[] = vitrine.map(resumir);

/** Quantas peças a aba Novidades mostra. */
export const QTD_NOVIDADES = 60;

/**
 * O cadastro não tem data de entrada, mas os ids do catálogo operacional são
 * crescentes: as novidades são os maiores ids. Depois do corte, foto primeiro
 * (sort estável, então cada grupo segue do mais novo para o mais antigo).
 */
export const novidades: Produto[] = fotoPrimeiro(
  [...produtos].sort((a, b) => b.id - a.id).slice(0, QTD_NOVIDADES),
);

export const novidadesResumo: ProdutoResumo[] = novidades.map(resumir);

/** Peças da aba Sale, na ordem de `sale.ts`. */
export const saleResumo: ProdutoResumo[] = emSale.map(resumir);

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

const totaisJson = dados.totais as {
  produtos: number;
  comFoto: number;
  supercategorias: number;
  subcategorias: number;
  marcas: number;
};

export const totais = { ...totaisJson, marcas: marcas.length };
