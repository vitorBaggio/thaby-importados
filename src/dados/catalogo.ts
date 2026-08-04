/**
 * Catálogo da Thaby Importados.
 *
 * IDs, nomes de categoria e fotos vieram do catálogo operacional da loja.
 * O acervo completo fica atrás de sessão autenticada, então o que está aqui é
 * o recorte público — a estrutura já está pronta para receber o export integral
 * (basta acrescentar itens a `produtos` mantendo o formato).
 *
 * Os textos de vitrine são editoriais e devem ser revisados pela loja antes de
 * publicar: descrevem a peça, nunca prometem especificação técnica.
 */

import { slugify } from "@/lib/texto";

export type Categoria = {
  id: number;
  nome: string;
  /** Nome exatamente como está cadastrado no ERP da loja. */
  nomeErp: string;
  slug: string;
  imagem: string | null;
  resumo: string;
  /** Ordem de exibição na vitrine. */
  ordem: number;
};

export type Produto = {
  id: number;
  nome: string;
  slug: string;
  imagem: string | null;
  categoriaId: number;
  destaque: boolean;
  marca: string | null;
  origem: string;
  resumo: string;
};

/* ------------------------------------------------------------------ */
/* Categorias                                                          */
/* ------------------------------------------------------------------ */

const categoriasBase: Omit<Categoria, "slug">[] = [
  {
    id: 249687,
    nome: "Beleza",
    nomeErp: "BELEZA",
    imagem: "/categorias/beleza.webp",
    ordem: 1,
    resumo:
      "Skincare coreano, maquiagem de cult e perfumaria fina. As linhas que costumam esgotar lá fora, garimpadas uma a uma.",
  },
  {
    id: 249720,
    nome: "Bem-estar e estilo de vida",
    nomeErp: "BEM ESTAR E ESTILO DE VIDA",
    imagem: "/categorias/bem-estar-e-estilo-de-vida.webp",
    ordem: 2,
    resumo:
      "O cuidado diário que não se encontra por aqui: farmácia americana, aromas de casa e pequenos rituais importados.",
  },
  {
    id: 249681,
    nome: "Bolsas femininas",
    nomeErp: "BOLSAS FEMININAS",
    imagem: "/categorias/bolsas-femininas.webp",
    ordem: 3,
    resumo:
      "Peças de grife e modelos de temporada, selecionadas por acabamento e procedência antes de entrar no acervo.",
  },
  {
    id: 249680,
    nome: "Acessórios e moda",
    nomeErp: "ACESSÓRIOS E MODA",
    imagem: "/categorias/acessorios-e-moda.webp",
    ordem: 4,
    resumo:
      "O detalhe que muda o look inteiro. Acessórios de assinatura para quem constrói o próprio estilo.",
  },
  {
    id: 278550,
    nome: "Acessórios",
    nomeErp: "ACESSÓRIOS",
    imagem: "/categorias/acessorios.webp",
    ordem: 5,
    resumo:
      "Objetos úteis com desenho impecável — de viagem à escrivaninha. Utilidade tratada como item de desejo.",
  },
  {
    id: 249707,
    nome: "Cabelos",
    nomeErp: "CABELOS",
    imagem: "/categorias/cabelos.webp",
    ordem: 6,
    resumo:
      "Tratamento e finalização das marcas que ditam o padrão internacional de cuidado capilar.",
  },
  {
    id: 249724,
    nome: "Alimentação",
    nomeErp: "ALIMENTAÇÃO",
    imagem: "/categorias/alimentacao.webp",
    ordem: 7,
    resumo:
      "Confeitaria europeia, doces de coleção e temperos que transformam o comum em ocasião.",
  },
  {
    id: 249752,
    nome: "Acessórios de alimentação",
    nomeErp: "ACESSÓRIOS DE ALIMENTAÇÃO",
    imagem: "/categorias/acessorios-de-alimentacao.webp",
    ordem: 8,
    resumo:
      "Do enxoval do bebê à garrafa que acompanha o dia inteiro. Praticidade com padrão de acabamento importado.",
  },
  {
    id: 249739,
    nome: "Brinquedos",
    nomeErp: "BRINQUEDOS",
    imagem: "/categorias/brinquedos.webp",
    ordem: 9,
    resumo:
      "Coleções e licenças oficiais que chegam ao Brasil em quantidade contada. Presente que ninguém mais tem.",
  },
  {
    id: 278938,
    nome: "Bonés",
    nomeErp: "BONÉS",
    imagem: "/categorias/bones.webp",
    ordem: 10,
    resumo:
      "Modelos originais de marcas e times, direto das lojas oficiais lá fora.",
  },
];

export const categorias: Categoria[] = categoriasBase
  .map((c) => ({ ...c, slug: slugify(c.nome) }))
  .sort((a, b) => a.ordem - b.ordem);

/* ------------------------------------------------------------------ */
/* Produtos                                                            */
/* ------------------------------------------------------------------ */

type ProdutoBase = Omit<Produto, "slug" | "imagem"> & { temFoto?: boolean };

const produtosBase: ProdutoBase[] = [
  {
    id: 3863144,
    nome: "Kit Gucci Guilty Pour Homme EDT — 3 peças",
    categoriaId: 249687,
    destaque: true,
    marca: "Gucci",
    origem: "Estados Unidos",
    temFoto: true,
    resumo:
      "O coffret da linha Guilty Pour Homme reunido em três peças. Amadeirado, seco, com aquela assinatura que fica no ambiente depois que a pessoa já saiu.",
  },
  {
    id: 2426645,
    nome: "Máscara em Gel PDRN Medicube — 4 unidades",
    categoriaId: 249687,
    destaque: true,
    marca: "Medicube",
    origem: "Coreia do Sul",
    resumo:
      "A linha PDRN da Medicube é o capítulo mais recente do skincare coreano de alta performance. Textura em gel, ritual de fim de noite.",
  },
  {
    id: 2594929,
    nome: "Zero Pore Cooling Mask Medicube",
    categoriaId: 249687,
    destaque: false,
    marca: "Medicube",
    origem: "Coreia do Sul",
    resumo:
      "Máscara com efeito refrescante da linha Zero Pore, uma das mais procuradas da marca coreana.",
  },
  {
    id: 2426489,
    nome: "Corretivo Shape Tape",
    categoriaId: 249687,
    destaque: false,
    marca: "Tarte",
    origem: "Estados Unidos",
    resumo:
      "O corretivo que virou referência de cobertura no mundo inteiro. Continua sem equivalente no mercado nacional.",
  },
  {
    id: 2439740,
    nome: "On The Glow Bronze Pixi",
    categoriaId: 249687,
    destaque: false,
    marca: "Pixi",
    origem: "Estados Unidos",
    resumo:
      "Bronzer em bastão para um brilho construído em camadas — o acabamento que a Pixi consagrou.",
  },
  {
    id: 2426502,
    nome: "Sombra Avulsa Kiko",
    categoriaId: 249687,
    destaque: false,
    marca: "Kiko Milano",
    origem: "Itália",
    resumo:
      "Pigmento italiano vendido por unidade, para montar a paleta exatamente do seu jeito.",
  },
  {
    id: 3669864,
    nome: "Animal Sheet Mask For Kids",
    categoriaId: 249687,
    destaque: true,
    marca: null,
    origem: "Coreia do Sul",
    resumo:
      "Máscara facial em formato de bichinho — o primeiro ritual de skincare da casa, feito para divertir.",
  },

  {
    id: 2437967,
    nome: "Sinus Rinse — unidade",
    categoriaId: 249720,
    destaque: true,
    marca: "NeilMed",
    origem: "Estados Unidos",
    resumo:
      "O sistema de lavagem nasal que virou item obrigatório de armário americano. Vendido por unidade.",
  },
  {
    id: 2437449,
    nome: "Lens Wipes — unidade",
    categoriaId: 249720,
    destaque: true,
    marca: null,
    origem: "Estados Unidos",
    temFoto: true,
    resumo:
      "Lenços de limpeza para lentes, individualmente selados. Cabem no bolso do casaco e resolvem o dia.",
  },
  {
    id: 2438049,
    nome: "Refil VapoPads — cada",
    categoriaId: 249720,
    destaque: true,
    marca: "Vicks",
    origem: "Estados Unidos",
    resumo:
      "Refil aromático para vaporizador, vendido avulso. Um clássico das noites de inverno lá fora.",
  },
  {
    id: 2448440,
    nome: "Boogie Wipes — 30 unidades",
    categoriaId: 249720,
    destaque: false,
    marca: "Boogie",
    origem: "Estados Unidos",
    resumo:
      "Lenços umedecidos com solução salina, pensados para a pele sensível do rostinho.",
  },
  {
    id: 2438103,
    nome: "Oxigênio Enlatado 2L",
    categoriaId: 249720,
    destaque: false,
    marca: null,
    origem: "Estados Unidos",
    resumo:
      "Oxigênio portátil em lata — recuperação para treino, altitude e viagem.",
  },
  {
    id: 3550243,
    nome: "Suporte Home Fragrance Duplo",
    categoriaId: 249720,
    destaque: false,
    marca: "Bath & Body Works",
    origem: "Estados Unidos",
    resumo:
      "Base dupla para difusor de tomada da Bath & Body Works. A casa inteira com a mesma assinatura olfativa.",
  },
  {
    id: 2426855,
    nome: "Bolinhas de Pelúcia para Gato",
    categoriaId: 249720,
    destaque: false,
    marca: null,
    origem: "Estados Unidos",
    resumo:
      "Brinquedo leve em pelúcia, no tamanho certo para a caça de fim de tarde.",
  },

  {
    id: 3733022,
    nome: "PocketBac Holder — Preto",
    categoriaId: 278550,
    destaque: true,
    marca: "Bath & Body Works",
    origem: "Estados Unidos",
    temFoto: true,
    resumo:
      "Porta-álcool em gel da Bath & Body Works em preto. O acessório que virou objeto de coleção.",
  },
  {
    id: 3733021,
    nome: "PocketBac Holder — Mocha",
    categoriaId: 278550,
    destaque: true,
    marca: "Bath & Body Works",
    origem: "Estados Unidos",
    temFoto: true,
    resumo:
      "A mesma peça no tom mocha — o acabamento mais discreto da linha, e o que sai mais rápido.",
  },
  {
    id: 2631573,
    nome: "Acessório de Bolsa Cerejinha Piper K",
    categoriaId: 278550,
    destaque: false,
    marca: "Piper K",
    origem: "Estados Unidos",
    resumo:
      "Charm de cereja para pendurar na alça. Pequeno, mas é ele que assina a bolsa.",
  },
  {
    id: 2439514,
    nome: "Cabo de Aço para Mala",
    categoriaId: 278550,
    destaque: true,
    marca: null,
    origem: "Estados Unidos",
    resumo:
      "Cabo de segurança para bagagem — o item que só se lembra que existe quando faz falta.",
  },
  {
    id: 3882749,
    nome: "Silicone Bottle Covers Travel",
    categoriaId: 278550,
    destaque: true,
    marca: null,
    origem: "Estados Unidos",
    resumo:
      "Capas de silicone para frascos de viagem. Nada vaza dentro da necessaire.",
  },
  {
    id: 2437631,
    nome: "Tesoura Kids Pecula",
    categoriaId: 278550,
    destaque: true,
    marca: "Pecula",
    origem: "Estados Unidos",
    resumo:
      "Tesoura escolar com ponta arredondada, no formato pensado para a mão pequena.",
  },
  {
    id: 2426947,
    nome: "Caneta Gelly Roll 0.5mm Sakura",
    categoriaId: 278550,
    destaque: false,
    marca: "Sakura",
    origem: "Japão",
    resumo:
      "A gel japonesa que atravessou gerações de cadernos. Traço opaco, sem borrar.",
  },

  {
    id: 2453520,
    nome: "Hair Finishing Stick Bestland",
    categoriaId: 249707,
    destaque: false,
    marca: "Bestland",
    origem: "Estados Unidos",
    resumo:
      "Bastão de finalização para domar o fio rebelde na hora — de bolsa, sem retoque de escova.",
  },

  {
    id: 2426870,
    nome: "Bombom de Cereja Fabbri — unidade",
    categoriaId: 249724,
    destaque: true,
    marca: "Fabbri",
    origem: "Itália",
    temFoto: true,
    resumo:
      "A amarena da Fabbri envolvida em chocolate, vendida por unidade. Confeitaria italiana de tradição centenária.",
  },
  {
    id: 2439234,
    nome: "Pirulito Mellow Buddies Olly",
    categoriaId: 249724,
    destaque: true,
    marca: "Olly",
    origem: "Estados Unidos",
    temFoto: true,
    resumo:
      "A linha Buddies da Olly no formato que as crianças pedem primeiro.",
  },
  {
    id: 2439579,
    nome: "Pirulito Focus Buddies Olly",
    categoriaId: 249724,
    destaque: true,
    marca: "Olly",
    origem: "Estados Unidos",
    temFoto: true,
    resumo:
      "Versão Focus da mesma linha — a favorita da temporada de aula.",
  },
  {
    id: 2590544,
    nome: "Tempero para Pipoca Kernel Season's 80g",
    categoriaId: 249724,
    destaque: false,
    marca: "Kernel Season's",
    origem: "Estados Unidos",
    resumo:
      "O tempero que transforma pipoca de casa em pipoca de cinema. Vários sabores.",
  },

  {
    id: 2437432,
    nome: "Bombilla Stanley Colher — Black",
    categoriaId: 249752,
    destaque: false,
    marca: "Stanley",
    origem: "Estados Unidos",
    resumo:
      "Bombilla com colher em acabamento preto, no padrão de robustez que fez o nome da Stanley.",
  },
  {
    id: 2438037,
    nome: "Saco Esterilizador Latch Munchkin",
    categoriaId: 249752,
    destaque: false,
    marca: "Munchkin",
    origem: "Estados Unidos",
    resumo:
      "Esterilização de mamadeiras e bicos no micro-ondas, em minutos. Item de primeira viagem da maternidade americana.",
  },
  {
    id: 2438036,
    nome: "Saco Esterilizador Medela",
    categoriaId: 249752,
    destaque: false,
    marca: "Medela",
    origem: "Suíça",
    resumo:
      "A versão da Medela, marca suíça de referência em amamentação.",
  },

  {
    id: 2437363,
    nome: "Carrinho Stitch Disney",
    categoriaId: 249739,
    destaque: true,
    marca: "Disney",
    origem: "Estados Unidos",
    temFoto: true,
    resumo:
      "Licenciado oficial da Disney. Dos itens que chegam em quantidade contada e não voltam.",
  },
  {
    id: 3650064,
    nome: "Mini Brands Fill The Fridge",
    categoriaId: 249739,
    destaque: true,
    marca: "Zuru",
    origem: "Estados Unidos",
    temFoto: true,
    resumo:
      "A febre das miniaturas de mercado, no set de geladeira. Colecionável com surpresa.",
  },
  {
    id: 3862151,
    nome: "Adesivos 3D Puffy Vestir Princesa",
    categoriaId: 249739,
    destaque: false,
    marca: null,
    origem: "Estados Unidos",
    resumo:
      "Cartela de adesivos em relevo para montar e vestir. Entretenimento de mesa que dura a tarde inteira.",
  },
  {
    id: 2439503,
    nome: "Bolha de Sabão Skip Hop Zoo 60ml",
    categoriaId: 249739,
    destaque: false,
    marca: "Skip Hop",
    origem: "Estados Unidos",
    resumo:
      "Bolhas de sabão na coleção Zoo da Skip Hop — desenho impecável até no frasco.",
  },
  {
    id: 2439501,
    nome: "Bolha de Sabão Metoo Sereias 60ml",
    categoriaId: 249739,
    destaque: false,
    marca: "Metoo",
    origem: "Estados Unidos",
    resumo:
      "Versão sereias, na embalagem que já é metade do presente.",
  },
];

export const produtos: Produto[] = produtosBase.map(({ temFoto, ...p }) => ({
  ...p,
  slug: slugify(p.nome),
  imagem: temFoto ? `/produtos/${p.id}.webp` : null,
}));

/* ------------------------------------------------------------------ */
/* Marcas — extraídas dos produtos, para a vitrine de procedência      */
/* ------------------------------------------------------------------ */

export const marcas: string[] = [
  "Gucci",
  "Medicube",
  "Tarte",
  "Bath & Body Works",
  "Stanley",
  "Kiko Milano",
  "Pixi",
  "Disney",
  "Sakura",
  "Munchkin",
  "Medela",
  "Skip Hop",
  "Olly",
  "Fabbri",
  "Zuru",
  "Vicks",
  "NeilMed",
  "Kernel Season's",
];

/* ------------------------------------------------------------------ */
/* Consultas                                                           */
/* ------------------------------------------------------------------ */

const porSlugCategoria = new Map(categorias.map((c) => [c.slug, c]));
const porIdCategoria = new Map(categorias.map((c) => [c.id, c]));
const porSlugProduto = new Map(produtos.map((p) => [p.slug, p]));

export const categoriaPorSlug = (slug: string) => porSlugCategoria.get(slug);
export const categoriaPorId = (id: number) => porIdCategoria.get(id);
export const produtoPorSlug = (slug: string) => porSlugProduto.get(slug);

export const produtosDaCategoria = (categoriaId: number) =>
  produtos.filter((p) => p.categoriaId === categoriaId);

export const destaques = produtos.filter((p) => p.destaque);

/** Produtos com foto primeiro: a vitrine não pode abrir com placeholders. */
export const vitrine = [...produtos].sort((a, b) => {
  if (!!a.imagem !== !!b.imagem) return a.imagem ? -1 : 1;
  if (a.destaque !== b.destaque) return a.destaque ? -1 : 1;
  return a.nome.localeCompare(b.nome, "pt-BR");
});

export function relacionados(produto: Produto, limite = 4) {
  const mesmaCategoria = vitrine.filter(
    (p) => p.categoriaId === produto.categoriaId && p.id !== produto.id,
  );
  if (mesmaCategoria.length >= limite) return mesmaCategoria.slice(0, limite);

  const complemento = vitrine.filter(
    (p) => p.categoriaId !== produto.categoriaId && p.id !== produto.id,
  );
  return [...mesmaCategoria, ...complemento].slice(0, limite);
}

/** Busca sem acento, por nome, marca e categoria. */
export function buscar(termo: string, lista: Produto[] = vitrine) {
  const alvo = slugify(termo);
  if (!alvo) return lista;

  return lista.filter((p) => {
    const categoria = categoriaPorId(p.categoriaId);
    const indice = slugify(
      [p.nome, p.marca ?? "", p.origem, categoria?.nome ?? ""].join(" "),
    );
    return alvo.split("-").every((parte) => indice.includes(parte));
  });
}

export const totais = {
  produtos: produtos.length,
  categorias: categorias.length,
  marcas: marcas.length,
};
