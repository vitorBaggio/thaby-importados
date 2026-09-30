/**
 * Testes da sincronizacao com um Bling FALSO (sem credencial, sem rede).
 *
 *   node scripts/bling/teste-regras.mjs
 *
 * Cada cenario roda numa pasta temporaria que imita a raiz do projeto; o
 * repositorio nao e tocado.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as acorn from "acorn";
import sharp from "sharp";
import * as cliente from "./cliente.mjs";
import * as sinc from "./sincronizacao.mjs";

const { sincronizar } = sinc;
/** Regras de Novidades do site (compartilhadas com a sincronizacao). */
const regrasNovidade = await import("../../src/dados/novidades.mjs").catch(() => ({}));

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const RAIZ_REPO = path.resolve(AQUI, "../..");
const fixture = (nome) => JSON.parse(fs.readFileSync(path.join(AQUI, "fixtures", nome), "utf8"));

let falhas = 0;
async function teste(nome, fn) {
  try {
    await fn();
    console.log(`ok     ${nome}`);
  } catch (e) {
    falhas++;
    console.log(`FALHOU ${nome}\n       ${e.message.split("\n").join("\n       ")}`);
  }
}

/* ------------------------------------------------------------------ */
/* Bling falso                                                        */
/* ------------------------------------------------------------------ */

/**
 * `inclusoes`: id -> AAAA-MM-DD de inclusao no Bling (listagem com dataInclusaoInicial/Final).
 * `ignoraFiltroData`: a listagem por data de inclusao devolve todos os ativos.
 * `recusaHora`: data com hora no filtro de inclusao responde 400.
 */
function blingFalso({ extras = [], detalhesExtras = {}, falharEm, paginaVazia, inclusoes = {}, ignoraFiltroData = false, recusaHora = false } = {}) {
  const categorias = fixture("categorias.json");
  const lista = [...fixture("produtos-lista.json"), ...extras];
  const detalhes = { ...fixture("produtos-detalhe.json"), ...detalhesExtras };
  const saldos = fixture("estoques-saldos.json");
  const saldoReal = (p) => p.estoque?.saldoVirtualTotal ?? saldos.find((s) => s.produto.id === p.id)?.saldoVirtualTotal ?? 0;
  const faixa = (s) => (s === 0 ? 0 : s > 0 ? 1 : 2);
  const pagina = (itens, { pagina = 1, limite = 100 }) => itens.slice((pagina - 1) * limite, pagina * limite);
  const chamadas = [];

  async function blingGet(caminho, params = {}) {
    chamadas.push({ caminho, params });
    if (falharEm?.(caminho, params)) throw new Error(`Bling GET ${caminho} falhou (500): erro simulado`);
    if (paginaVazia?.(caminho, params)) return { data: [] };
    if (caminho === "/categorias/produtos") return { data: pagina(categorias, params) };
    if (caminho === "/produtos" && params.dataInclusaoInicial != null) {
      if (recusaHora && / /.test(params.dataInclusaoInicial)) throw new Error(`Bling GET ${caminho} falhou (400): data invalida`);
      const dia = (s) => String(s).slice(0, 10);
      const naJanela = (d) =>
        d && d >= dia(params.dataInclusaoInicial) && (params.dataInclusaoFinal == null || d <= dia(params.dataInclusaoFinal));
      const itens = lista.filter((p) => p.situacao === "A" && (ignoraFiltroData || naJanela(inclusoes[p.id])));
      return { data: pagina(itens, params) };
    }
    if (caminho === "/produtos") {
      const situacao = { 2: "A", 3: "I" }[params.criterio];
      const itens = lista.filter((p) => p.situacao === situacao && faixa(saldoReal(p)) === params.filtroSaldoEstoque);
      return { data: pagina(itens, params) };
    }
    const m = /^\/produtos\/(.+)$/.exec(caminho);
    if (m) {
      if (!detalhes[m[1]]) throw new Error(`Bling falso: detalhe ${m[1]} nao previsto`);
      return { data: detalhes[m[1]] };
    }
    if (caminho === "/estoques/saldos") {
      const ids = params["idsProdutos[]"];
      assert.ok(ids.length <= 100, "lote de saldos com mais de 100 ids");
      return { data: saldos.filter((s) => ids.includes(s.produto.id)) };
    }
    throw new Error(`Bling falso: rota nao prevista ${caminho}`);
  }
  return { blingGet, chamadas };
}

const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.from("PNG-FALSO")]);
const JPEG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.from("JPEG-FALSO")]);

/** `respostas`: trecho da URL -> { dados, tipo } ou Error a lancar. Padrao: PNG valido. */
function baixadorFalso(respostas = {}) {
  const pedidos = [];
  return {
    pedidos,
    baixarImagem: async (url) => {
      pedidos.push(url);
      const r = Object.entries(respostas).find(([trecho]) => url.includes(trecho))?.[1];
      if (r instanceof Error) throw r;
      return r ?? { dados: PNG, tipo: "image/png" };
    },
  };
}

/** Pasta que imita a raiz do projeto, com o catalogo "atual" de teste. */
function montarRaiz({ produtosExtras = [], manifesto } = {}) {
  const raiz = fs.mkdtempSync(path.join(os.tmpdir(), "bling-teste-"));
  const copiar = (rel) => {
    fs.mkdirSync(path.dirname(path.join(raiz, rel)), { recursive: true });
    fs.copyFileSync(path.join(RAIZ_REPO, rel), path.join(raiz, rel));
  };
  copiar("scripts/bling/categorias-site.json");
  copiar("scripts/bling/mapa-categorias.json");
  copiar("next.config.ts");
  const atual = fixture("catalogo-atual.json");
  atual.produtos.push(...produtosExtras);
  fs.mkdirSync(path.join(raiz, "src/dados"), { recursive: true });
  fs.writeFileSync(path.join(raiz, "src/dados/catalogo-completo.json"), JSON.stringify(atual));
  if (manifesto) fs.writeFileSync(path.join(raiz, "scripts/bling/fotos-baixadas.json"), JSON.stringify(manifesto));
  return raiz;
}

const ler = (raiz, rel) => fs.readFileSync(path.join(raiz, rel), "utf8");
const existe = (raiz, rel) => fs.existsSync(path.join(raiz, rel));
const arvoreDe = (raiz) => fs.readdirSync(raiz, { recursive: true }).sort();
const raizes = [];
const novaRaiz = (o) => {
  const r = montarRaiz(o);
  raizes.push(r);
  return r;
};
async function erroDe(fn) {
  try {
    await fn();
  } catch (e) {
    return e;
  }
  return null;
}

const S3 = "https://catalogo-mobile.s3.sa-east-1.amazonaws.com/companies/7827/products_imgs/imported/";
/** Produto simples ativo com estoque, para a lista e para o detalhe do Bling falso. */
function produtoExtra(
  id,
  nome,
  { imagens = { externas: [{ link: `${S3}${id}.jpg` }], internas: [] }, imagemURL = "", codigo, preco = 10, descricaoCurta = "", descricaoComplementar, marca = "" } = {},
) {
  const lista = {
    id, nome, codigo: codigo ?? `X-${id}`, preco, estoque: { saldoVirtualTotal: 1 },
    tipo: "P", situacao: "A", formato: "S", descricaoCurta, imagemURL,
  };
  const detalhe = {
    ...lista, gtin: "", marca, categoria: { id: 0 },
    ...(descricaoComplementar != null ? { descricaoComplementar } : {}),
    ...(imagens ? { midia: { imagens } } : {}),
  };
  return { lista, detalhe };
}
const montarExtras = (itens) => ({
  extras: itens.map((i) => i.lista),
  detalhesExtras: Object.fromEntries(itens.map((i) => [String(i.lista.id), i.detalhe])),
});

/* ------------------------------------------------------------------ */
/* Cenario principal                                                  */
/* ------------------------------------------------------------------ */

const raiz = novaRaiz();
const catalogoAntes = ler(raiz, "src/dados/catalogo-completo.json");
const mapaOriginal = ler(raiz, "scripts/bling/mapa-categorias.json");
const bling = blingFalso();
const baixador = baixadorFalso();

const sim = await sincronizar({ blingGet: bling.blingGet, baixarImagem: baixador.baixarImagem, raiz, hoje: "2026-09-30" });
const porCodigo = (r, codigo) => r.catalogo.produtos.find((p) => p.codigo === codigo);

await teste("simulacao nao toca em src/dados nem baixa foto", () => {
  assert.equal(sim.modo, "simulacao");
  assert.equal(ler(raiz, "src/dados/catalogo-completo.json"), catalogoAntes);
  assert.equal(baixador.pedidos.length, 0);
  assert.ok(!existe(raiz, "public/produtos"));
  assert.ok(existe(raiz, "scripts/bling/saida/previa.json"));
  assert.ok(existe(raiz, "scripts/bling/saida/relatorio.md"));
});

await teste("ativo + estoque + imagem: entra", () => {
  assert.ok(porCodigo(sim, "SKU-101"));
  assert.ok(porCodigo(sim, "SKU-109"));
});

await teste("estoque 0: sai", () => {
  assert.equal(porCodigo(sim, "SKU-102"), undefined);
  assert.deepEqual(sim.sairam.find((s) => s.codigo === "SKU-102")?.motivo, "sem estoque");
});

await teste("estoque negativo: sai", () => assert.equal(porCodigo(sim, "SKU-103"), undefined));

await teste("sem imagem: sai", () => {
  assert.equal(porCodigo(sim, "SKU-104"), undefined);
  assert.equal(sim.sairam.find((s) => s.codigo === "SKU-104")?.motivo, "sem imagem");
});

await teste("inativo: sai", () => {
  assert.equal(porCodigo(sim, "SKU-105"), undefined);
  assert.equal(sim.sairam.find((s) => s.codigo === "SKU-105")?.motivo, "inativo");
});

await teste("servico: sai", () => assert.equal(porCodigo(sim, "SKU-106"), undefined));

await teste("produto do site que nao existe mais no Bling: sai", () => {
  assert.equal(sim.sairam.find((s) => s.codigo === "SKU-999")?.motivo, "nao existe mais");
  assert.equal(sim.sairam.length, 4);
});

await teste("estoque ausente na lista: busca em /estoques/saldos", () => {
  const c = bling.chamadas.filter((x) => x.caminho === "/estoques/saldos");
  assert.equal(c.length, 1);
  assert.deepEqual(c[0].params["idsProdutos[]"], [112]);
  assert.ok(porCodigo(sim, "SKU-112"));
});

await teste("preco 12.9 vira 1290 centavos", () => assert.equal(porCodigo(sim, "SKU-101").preco, 1290));

await teste("no maximo 3 fotos; externa do S3 fica encurtada", () => {
  assert.deepEqual(porCodigo(sim, "SKU-101").fotos, [
    "companies/7827/products_imgs/imported/101a.jpg",
    "companies/7827/products_imgs/imported/101b.jpg",
    "companies/7827/products_imgs/imported/101c.jpg",
  ]);
});

await teste("campos: nome, marca normalizada, descricao sem HTML, categoria", () => {
  const p = porCodigo(sim, "SKU-101");
  assert.equal(p.nome, "Serum Vitamina C Medicube 30ml");
  assert.equal(p.marca, "Medicube");
  assert.equal(p.descricao, "Serum com vitamina C para o dia.\nUso diario.");
  assert.equal(p.categoriaId, 249699); // skincare
  assert.equal(porCodigo(sim, "B-111").marca, "Bath & Body Works");
  assert.equal(porCodigo(sim, "SKU-NOVO-107").ean, "7891234567895");
});

await teste("produto existente mantem slug (codigo, gtin, nome)", () => {
  assert.equal(porCodigo(sim, "SKU-101").slug, "serum-antigo-preservado");
  assert.equal(porCodigo(sim, "SKU-NOVO-107").slug, "base-liquida-fenty-antiga");
  assert.equal(porCodigo(sim, "B-111").slug, "vela-aromatica-baunilha");
  assert.deepEqual(sim.porCriterio, { codigo: 1, gtin: 1, nome: 1 });
});

await teste("slug novo em colisao ganha sufixo com o id", () => {
  assert.equal(porCodigo(sim, "SKU-112").slug, "serum-antigo-preservado-112");
  assert.equal(porCodigo(sim, "SKU-109").slug, "chaveiro-torre-eiffel");
  assert.deepEqual(sim.entraram.map((p) => p.codigo).sort(), ["SKU-108", "SKU-109", "SKU-110", "SKU-112"]);
});

await teste("variacoes: 1 elegivel de 3 publica o pai com estoque e foto dela", () => {
  const pai = porCodigo(sim, "SKU-108");
  assert.ok(pai);
  assert.equal(pai.preco, 5500); // pai sem preco: preco da variacao elegivel
  assert.deepEqual(pai.fotos, ["companies/7827/products_imgs/imported/1082.jpg"]);
  assert.equal(pai.categoriaId, 278552); // Cuidados Pessoais de Infantil, desempatado pelo pai
  assert.ok(!sim.catalogo.produtos.some((p) => ["SKU-108-M", "SKU-108-U", "SKU-108-X"].includes(p.codigo)));
  assert.match(sim.relatorio, /Variacoes: 3; elegiveis: 1/);
  assert.match(sim.relatorio, /Politica: o pai e publicado quando ao menos uma variacao/);
});

await teste("categoria sem mapa e produto sem categoria: Outros Importados / Variados + aviso", () => {
  assert.equal(porCodigo(sim, "SKU-109").categoriaId, 801248);
  assert.equal(porCodigo(sim, "SKU-110").categoriaId, 801248);
  assert.equal(sim.semMapa.length, 2);
  assert.match(sim.relatorio, /SEM MAPA: Lembrancinhas de Viagem \(id 30\)/);
  assert.match(sim.relatorio, /SEM MAPA: \(produto sem categoria no Bling\)/);
});

await teste("simulacao nao grava o mapa; casamentos automaticos vao para saida/mapa-categorias-proposto.json", () => {
  assert.equal(ler(raiz, "scripts/bling/mapa-categorias.json"), mapaOriginal);
  const proposto = JSON.parse(ler(raiz, "scripts/bling/saida/mapa-categorias-proposto.json"));
  assert.deepEqual(proposto["11"], { super: "beleza", sub: "skincare", nomeBling: "SKINCARE" });
  assert.deepEqual(proposto["21"], { super: "infantil", sub: "cuidados-pessoais-278552", nomeBling: "CUIDADOS PESSOAIS" });
  assert.equal(proposto["30"], undefined);
  assert.match(sim.relatorio, /propostos \(NAO gravados no mapa\): 4/);
});

await teste("imagem so interna: caminho local planejado; link temporario so no bloco de aplicacao da previa", () => {
  const p = porCodigo(sim, "SKU-NOVO-107");
  assert.deepEqual(p.fotos, ["/produtos/107-1.png"]);
  const { aplicacao, ...catalogoPrevia } = JSON.parse(ler(raiz, "scripts/bling/saida/previa.json"));
  assert.ok(!JSON.stringify(catalogoPrevia).includes("orgbling"));
  assert.ok(aplicacao.fotos.some((f) => f.produtoId === 107 && f.link.includes("orgbling")));
  assert.deepEqual(sim.usoFotos, { externa: 6, interna: 1, mista: 0 });
});

await teste("relatorio sem travessao e com as secoes pedidas", () => {
  assert.ok(!/[–—]/.test(sim.relatorio));
  for (const s of ["## Totais", "## ENTRARAM (4)", "## SAIRAM (4)", "## Categorias SEM MAPA", "## Precos que mudaram", "## Chamadas ao Bling"]) {
    assert.ok(sim.relatorio.includes(s), `faltou "${s}"`);
  }
  assert.match(sim.relatorio, /Serum Vitamina C Medicube 30ml \(codigo SKU-101\): R\$ 10,00 para R\$ 12,90/);
});

await teste("todas as chamadas sao GET em rotas de leitura", () => {
  assert.ok(bling.chamadas.every((c) => /^\/(categorias\/produtos|produtos(\/\d+)?|estoques\/saldos)$/.test(c.caminho)));
});

// --aplicar no mesmo cenario
fs.mkdirSync(path.join(raiz, "public/produtos"), { recursive: true });
fs.writeFileSync(path.join(raiz, "public/produtos/555-1.jpg"), "orfa");
fs.writeFileSync(path.join(raiz, "public/produtos/2426870.webp"), "legado");
const apl = await sincronizar({ blingGet: blingFalso().blingGet, baixarImagem: baixador.baixarImagem, raiz, aplicar: true, hoje: "2026-09-30" });

await teste("--aplicar grava o catalogo no formato do site", () => {
  assert.equal(apl.modo, "aplicada");
  const gravado = JSON.parse(ler(raiz, "src/dados/catalogo-completo.json"));
  assert.deepEqual(Object.keys(gravado), ["geradoEm", "categorias", "produtos", "marcas", "totais"]);
  assert.equal(gravado.produtos.length, 7);
  const chaves = ["id", "nome", "slug", "marca", "preco", "categoriaId", "fotos", "descricao", "codigo", "ean"];
  for (const p of gravado.produtos) assert.deepEqual(Object.keys(p), chaves);
  const beleza = gravado.categorias.find((c) => c.slug === "beleza");
  // Ordem do site preservada; subcategorias vazias somem.
  assert.deepEqual(beleza.subcategorias.map((s) => [s.slug, s.total]), [["maquiagem", 1], ["perfumes", 1], ["skincare", 2]]);
  assert.ok(!gravado.categorias.some((c) => c.slug === "papelaria"), "super vazia deveria sumir");
});

await teste("--aplicar grava o mapa com os casamentos e descarta a proposta", () => {
  const mapa = JSON.parse(ler(raiz, "scripts/bling/mapa-categorias.json"));
  assert.deepEqual(mapa["11"], { super: "beleza", sub: "skincare", nomeBling: "SKINCARE" });
  assert.deepEqual(mapa["21"], { super: "infantil", sub: "cuidados-pessoais-278552", nomeBling: "CUIDADOS PESSOAIS" });
  assert.equal(mapa["30"], undefined);
  assert.ok(!existe(raiz, "scripts/bling/saida/mapa-categorias-proposto.json"));
});

await teste("--aplicar baixa a imagem interna (mock) e usa o caminho local", () => {
  assert.equal(baixador.pedidos.length, 1);
  assert.match(baixador.pedidos[0], /orgbling/);
  assert.deepEqual(fs.readFileSync(path.join(raiz, "public/produtos/107-1.png")), PNG);
  assert.deepEqual(JSON.parse(ler(raiz, "scripts/bling/fotos-baixadas.json")), { "107-1": { chave: "anexo:555", arquivo: "107-1.png" } });
  assert.ok(!existe(raiz, "public/produtos/555-1.jpg"), "foto orfa deveria sair");
  assert.ok(existe(raiz, "public/produtos/2426870.webp"), "arquivo legado nao pode ser apagado");
  assert.ok(!existe(raiz, "scripts/bling/saida/.fotos-novas"), "pasta de preparo deveria sumir");
});

const apl2 = await sincronizar({ blingGet: blingFalso().blingGet, baixarImagem: baixador.baixarImagem, raiz, aplicar: true, hoje: "2026-09-30" });
await teste("--aplicar de novo nao rebaixa imagem que nao mudou", () => {
  assert.equal(baixador.pedidos.length, 1);
  assert.deepEqual(apl2.fotos, { baixadas: 0, reaproveitadas: 1, removidas: 0 });
});

/* ------------------------------------------------------------------ */
/* Trava de 30%                                                       */
/* ------------------------------------------------------------------ */

const extrasSite = Array.from({ length: 10 }, (_, i) => ({
  id: 8000 + i, nome: `Peca Antiga ${i}`, slug: `peca-antiga-${i}`, marca: null, preco: 1000,
  categoriaId: 801248, fotos: [], descricao: null, codigo: `OLD-${i}`, ean: null,
}));
const raizTrava = novaRaiz({ produtosExtras: extrasSite });
const antesTrava = ler(raizTrava, "src/dados/catalogo-completo.json");
const recusada = await sincronizar({ blingGet: blingFalso().blingGet, baixarImagem: baixadorFalso().baixarImagem, raiz: raizTrava, aplicar: true });

await teste("trava de 30%: --aplicar recusa e nao grava o catalogo", () => {
  assert.equal(recusada.modo, "recusada");
  assert.match(recusada.recusa, /de 17 para 7 produtos/);
  assert.match(recusada.recusa, /--forcar/);
  assert.equal(ler(raizTrava, "src/dados/catalogo-completo.json"), antesTrava);
  assert.ok(!existe(raizTrava, "public/produtos"));
});

await teste("trava de 30%: recusa tambem nao grava o mapa (proposta vai para saida/)", () => {
  assert.equal(ler(raizTrava, "scripts/bling/mapa-categorias.json"), mapaOriginal);
  assert.ok(existe(raizTrava, "scripts/bling/saida/mapa-categorias-proposto.json"));
});

await teste("trava de 30%: mensagem explica a primeira sincronizacao e manda revisar SAIRAM", () => {
  assert.ok(
    recusada.recusa.includes(
      "Esta primeira sincronizacao pode passar de 30% ao retirar produtos antigos sem imagem. " +
        "Revise os motivos em SAIRAM no relatorio antes de usar --forcar.",
    ),
    recusada.recusa,
  );
});

const forcada = await sincronizar({ blingGet: blingFalso().blingGet, baixarImagem: baixadorFalso().baixarImagem, raiz: raizTrava, aplicar: true, forcar: true });
await teste("trava de 30%: com --forcar grava", () => {
  assert.equal(forcada.modo, "aplicada");
  assert.equal(JSON.parse(ler(raizTrava, "src/dados/catalogo-completo.json")).produtos.length, 7);
});

/* ------------------------------------------------------------------ */
/* Pagina que falha / pagina vazia no meio                            */
/* ------------------------------------------------------------------ */

const enchimento = (n) =>
  Array.from({ length: n }, (_, i) => produtoExtra(5000 + i, `Enchimento ${i}`, { codigo: `ENC-${i}` }));
const ehAtivosComSaldo = (c, p) => c === "/produtos" && p.criterio === 2 && p.filtroSaldoEstoque === 1;

const raizFalha = novaRaiz();
const antesFalha = arvoreDe(raizFalha);
const mapaAntes = ler(raizFalha, "scripts/bling/mapa-categorias.json");
const blingQuebrado = blingFalso({
  ...montarExtras(enchimento(100)),
  falharEm: (c, p) => ehAtivosComSaldo(c, p) && p.pagina === 2,
});
const erro = await erroDe(() =>
  sincronizar({ blingGet: blingQuebrado.blingGet, baixarImagem: baixadorFalso().baixarImagem, raiz: raizFalha, aplicar: true, forcar: true }),
);

await teste("pagina que falha: aborta e nada e gravado", () => {
  assert.ok(erro, "deveria ter abortado");
  assert.match(erro.message, /falhou \(500\)/);
  assert.ok(blingQuebrado.chamadas.some((c) => c.caminho === "/produtos" && c.params.pagina === 2), "deveria ter pedido a pagina 2");
  assert.deepEqual(arvoreDe(raizFalha), antesFalha);
  assert.equal(ler(raizFalha, "scripts/bling/mapa-categorias.json"), mapaAntes);
});

const raizBuraco = novaRaiz();
const antesBuraco = arvoreDe(raizBuraco);
const blingBuraco = blingFalso({
  ...montarExtras(enchimento(201)),
  paginaVazia: (c, p) => ehAtivosComSaldo(c, p) && p.pagina === 2,
});
const baixadorBuraco = baixadorFalso();
const erroBuraco = await erroDe(() =>
  sincronizar({ blingGet: blingBuraco.blingGet, baixarImagem: baixadorBuraco.baixarImagem, raiz: raizBuraco, aplicar: true, forcar: true }),
);

await teste("pagina vazia no meio (201 produtos, pagina 2 vazia): aborta com zero gravacoes", () => {
  assert.ok(erroBuraco, "deveria ter abortado");
  assert.match(erroBuraco.message, /pagina 2 veio vazia, mas a pagina 3 tem itens/);
  assert.ok(blingBuraco.chamadas.some((c) => ehAtivosComSaldo(c.caminho, c.params) && c.params.pagina === 3), "deveria conferir a pagina 3");
  assert.deepEqual(arvoreDe(raizBuraco), antesBuraco);
  assert.equal(baixadorBuraco.pedidos.length, 0);
});

// Ultima pagina com exatamente 100: a 2 e a 3 vem vazias de verdade; isso e fim legitimo.
const saldosFixture = fixture("estoques-saldos.json");
const jaNaFaixa = fixture("produtos-lista.json").filter(
  (p) => p.situacao === "A" && (p.estoque?.saldoVirtualTotal ?? saldosFixture.find((s) => s.produto.id === p.id)?.saldoVirtualTotal ?? 0) > 0,
).length;
const blingCheio = blingFalso(montarExtras(enchimento(100 - jaNaFaixa)));
const raizCheia = novaRaiz();
const cheia = await sincronizar({ blingGet: blingCheio.blingGet, baixarImagem: baixadorFalso().baixarImagem, raiz: raizCheia });

await teste("pagina vazia terminal legitima (exatamente 100 itens) continua permitida", () => {
  const paginas = blingCheio.chamadas.filter((c) => ehAtivosComSaldo(c.caminho, c.params)).map((c) => c.params.pagina);
  assert.deepEqual(paginas, [1, 2, 3]);
  assert.equal(cheia.catalogo.produtos.filter((p) => p.codigo?.startsWith("ENC-")).length, 100 - jaNaFaixa);
});

/* ------------------------------------------------------------------ */
/* Path traversal                                                     */
/* ------------------------------------------------------------------ */

const escape = produtoExtra("../escape", "Escape", {
  imagens: { externas: [], internas: [{ link: "https://orgbling.s3.amazonaws.com/imagens/esc.png?X-Amz-Signature=e", validade: "2026-10-01 10:00:00", ordem: 1 }] },
});
const raizEscape = novaRaiz();
const antesEscape = arvoreDe(raizEscape);
const baixadorEscape = baixadorFalso();
const erroEscape = await erroDe(() =>
  sincronizar({ blingGet: blingFalso(montarExtras([escape])).blingGet, baixarImagem: baixadorEscape.baixarImagem, raiz: raizEscape, aplicar: true, forcar: true }),
);

await teste('path traversal: id "../escape" aborta e nao grava nada fora de public/produtos', () => {
  assert.ok(erroEscape, "deveria ter abortado");
  assert.match(erroEscape.message, /id invalido/);
  assert.ok(!existe(raizEscape, "public/escape-1.png") && !existe(raizEscape, "public/escape-1.jpg"));
  assert.deepEqual(arvoreDe(raizEscape), antesEscape);
  assert.equal(baixadorEscape.pedidos.length, 0);
});

const raizManifesto = novaRaiz({ manifesto: { "107-1": { chave: "anexo:555", arquivo: "../../fora.png" } } });
fs.writeFileSync(path.join(raizManifesto, "fora.png"), "fora");
const catalogoManifesto = ler(raizManifesto, "src/dados/catalogo-completo.json");
const erroManifesto = await erroDe(() =>
  sincronizar({ blingGet: blingFalso().blingGet, baixarImagem: baixadorFalso().baixarImagem, raiz: raizManifesto, aplicar: true, forcar: true }),
);

await teste("path traversal: item do manifesto fora de public/produtos aborta sem reusar nem gravar", () => {
  assert.ok(erroManifesto, "deveria ter abortado");
  assert.match(erroManifesto.message, /Nome de foto invalido/);
  assert.equal(ler(raizManifesto, "src/dados/catalogo-completo.json"), catalogoManifesto);
  assert.equal(ler(raizManifesto, "fora.png"), "fora");
});

/* ------------------------------------------------------------------ */
/* Slugs                                                              */
/* ------------------------------------------------------------------ */

const raizSlug = novaRaiz();
const simSlug = await sincronizar({
  blingGet: blingFalso(montarExtras([produtoExtra(900, "Teste-902"), produtoExtra(901, "Teste"), produtoExtra(902, "Teste")])).blingGet,
  baixarImagem: baixadorFalso().baixarImagem,
  raiz: raizSlug,
});

await teste("slug: (900,Teste-902), (901,Teste), (902,Teste) geram slugs distintos", () => {
  const slug = (id) => simSlug.catalogo.produtos.find((p) => p.id === id)?.slug;
  assert.deepEqual([slug(900), slug(901), slug(902)], ["teste-902", "teste", "teste-902-1"]);
  const todos = simSlug.catalogo.produtos.map((p) => p.slug);
  assert.equal(new Set(todos).size, todos.length);
});

const siteDuplicado = ["DUP-A", "DUP-B"].map((codigo, i) => ({
  id: 8100 + i, nome: `Duplicado ${codigo}`, slug: "slug-igual", marca: null, preco: 1000,
  categoriaId: 801248, fotos: [], descricao: null, codigo, ean: null,
}));
const raizDup = novaRaiz({ produtosExtras: siteDuplicado });
const antesDup = arvoreDe(raizDup);
const erroDup = await erroDe(() =>
  sincronizar({
    blingGet: blingFalso(montarExtras([produtoExtra(920, "Dup A", { codigo: "DUP-A" }), produtoExtra(921, "Dup B", { codigo: "DUP-B" })])).blingGet,
    baixarImagem: baixadorFalso().baixarImagem,
    raiz: raizDup,
    aplicar: true,
    forcar: true,
  }),
);

await teste("slug: dois herdados iguais abortam antes de gravar", () => {
  assert.ok(erroDup, "deveria ter abortado");
  assert.match(erroDup.message, /Slug duplicado "slug-igual"/);
  assert.deepEqual(arvoreDe(raizDup), antesDup);
});

/* ------------------------------------------------------------------ */
/* Fotos: http, origem, MIME e teto                                   */
/* ------------------------------------------------------------------ */

const interna = (id, arquivo) => ({
  externas: [],
  internas: [{ link: `https://orgbling.s3.amazonaws.com/imagens/${arquivo}?X-Amz-Signature=s${id}`, validade: "2026-10-01 10:00:00", ordem: 1, anexo: { id: id * 10 } }],
});
/** Erro vira resultado vazio: cada teste abaixo falha pela propria assercao. */
const sincronizarOuErro = (o) =>
  sincronizar(o).catch((erro) => ({ erro, modo: "erro", catalogo: { produtos: [] }, sairam: [], avisosFotos: [], relatorio: "" }));
const fotosDe = (r, id) => r.catalogo.produtos.find((p) => p.id === id)?.fotos;

const baixadorFotos = baixadorFalso({ "950.jpg": { dados: PNG, tipo: "image/png" } });
// 941 ja esta no site: assim o motivo da saida aparece em SAIRAM.
const raizFotos = novaRaiz({
  produtosExtras: [{ id: 8941, nome: "So ImagemURL", slug: "so-imagemurl", marca: null, preco: 1000, categoriaId: 801248, fotos: [], descricao: null, codigo: "X-941", ean: null }],
});
const fotosApl = await sincronizarOuErro({
  blingGet: blingFalso(
    montarExtras([
      produtoExtra(930, "Externa Http", { imagens: { externas: [{ link: "http://catalogo-mobile.s3.sa-east-1.amazonaws.com/companies/7827/http.jpg" }], internas: [] } }),
      produtoExtra(941, "So ImagemURL", { imagens: null, imagemURL: "https://cdn.example.test/foto.png" }),
      produtoExtra(950, "Png Com Url Jpg", { imagens: interna(950, "950.jpg") }),
    ]),
  ).blingGet,
  baixarImagem: baixadorFotos.baixarImagem,
  raiz: raizFotos,
  aplicar: true,
});

const recusaTamanho = Object.assign(new Error("Imagem acima do teto de 10485760 bytes (leitura interrompida)."), { imagemRecusada: true });
const baixadorMime = baixadorFalso({
  "951.jpg": { dados: Buffer.from("<html>erro</html>"), tipo: "text/html; charset=utf-8" },
  "952.png": recusaTamanho,
  "953.png": { dados: JPEG, tipo: "image/png" },
});
const raizMime = novaRaiz();
const mimeApl = await sincronizarOuErro({
  blingGet: blingFalso(
    montarExtras([
      produtoExtra(951, "Nao E Imagem", { imagens: interna(951, "951.jpg") }),
      produtoExtra(952, "Grande Demais", { imagens: interna(952, "952.png") }),
      produtoExtra(953, "Assinatura Errada", { imagens: interna(953, "953.png") }),
    ]),
  ).blingGet,
  baixarImagem: baixadorMime.baixarImagem,
  raiz: raizMime,
  aplicar: true,
});

await teste("externa http: e baixada para public/produtos e aplica sem --forcar", () => {
  assert.equal(fotosApl.modo, "aplicada", fotosApl.recusa ?? "");
  assert.ok(baixadorFotos.pedidos.includes("http://catalogo-mobile.s3.sa-east-1.amazonaws.com/companies/7827/http.jpg"));
  assert.deepEqual(fotosDe(fotosApl, 930), ["/produtos/930-1.png"]);
  assert.ok(existe(raizFotos, "public/produtos/930-1.png"));
  assert.ok(!ler(raizFotos, "src/dados/catalogo-completo.json").includes("http://"));
});

await teste("so imagemURL sem midia no detalhe: origem desconhecida, baixada, validada e publicada local", () => {
  assert.ok(baixadorFotos.pedidos.includes("https://cdn.example.test/foto.png"), "deveria baixar o imagemURL");
  assert.deepEqual(fotosDe(fotosApl, 941), ["/produtos/941-1.png"]);
  assert.deepEqual(fs.readFileSync(path.join(raizFotos, "public/produtos/941-1.png")), PNG);
  assert.equal(fotosApl.catalogo.produtos.find((p) => p.id === 941)?.slug, "so-imagemurl", "casado pelo codigo, slug mantido");
  assert.ok(!fotosApl.sairam.some((s) => s.codigo === "X-941"));
  assert.ok(!ler(raizFotos, "src/dados/catalogo-completo.json").includes("cdn.example.test"));
  assert.match(fotosApl.relatorio, /imagemURL \(origem desconhecida, baixada e validada\): 1/);
});

const raizUrlRuim = novaRaiz();
const antesUrlRuim = ler(raizUrlRuim, "src/dados/catalogo-completo.json");
const blingUrlRuim = () => blingFalso(montarExtras([produtoExtra(942, "Url Ruim", { imagens: null, imagemURL: "ftp://x.test/foto.png" })])).blingGet;
const urlRuim = await sincronizarOuErro({ blingGet: blingUrlRuim(), baixarImagem: baixadorFalso().baixarImagem, raiz: raizUrlRuim, aplicar: true });
const depoisUrlRuim = ler(raizUrlRuim, "src/dados/catalogo-completo.json");
const urlRuimForcada = await sincronizarOuErro({ blingGet: blingUrlRuim(), baixarImagem: baixadorFalso().baixarImagem, raiz: raizUrlRuim, aplicar: true, forcar: true });

await teste("imagemURL invalida sem midia: recusa o --aplicar com diagnostico (nao vira 'sem imagem' calado)", () => {
  assert.equal(urlRuim.modo, "recusada", urlRuim.erro?.message ?? "");
  assert.match(urlRuim.recusa, /imagemURL invalida.*942/);
  assert.equal(depoisUrlRuim, antesUrlRuim);
  assert.match(urlRuim.relatorio, /### imagemURL invalida \(1\)/);
  assert.equal(urlRuimForcada.modo, "aplicada", urlRuimForcada.erro?.message ?? "");
  assert.equal(fotosDe(urlRuimForcada, 942), undefined);
});

await teste("MIME: extensao vem do Content-Type validado (url .jpg, conteudo png = .png)", () => {
  assert.deepEqual(fotosDe(fotosApl, 950), ["/produtos/950-1.png"]);
  assert.deepEqual(fs.readFileSync(path.join(raizFotos, "public/produtos/950-1.png")), PNG);
  assert.ok(!existe(raizFotos, "public/produtos/950-1.jpg"));
});

await teste("MIME: nao-imagem, assinatura errada e acima do teto sao pulados com aviso; produto sem foto valida sai", () => {
  assert.equal(mimeApl.modo, "aplicada", mimeApl.erro?.message ?? mimeApl.recusa ?? "");
  const gravados = fs.readdirSync(path.join(raizMime, "public/produtos"));
  for (const id of [951, 952, 953]) {
    assert.equal(fotosDe(mimeApl, id), undefined, `produto ${id} nao deveria publicar`);
    assert.ok(!gravados.some((n) => n.startsWith(`${id}-`)));
  }
  assert.deepEqual(mimeApl.avisosFotos.map((a) => a.produtoId).sort(), [951, 952, 953]);
  assert.match(mimeApl.relatorio, /AVISO: produto 951, foto 1: tipo "text\/html" nao e imagem aceita/);
  assert.match(mimeApl.relatorio, /AVISO: produto 952, foto 1: Imagem acima do teto/);
  assert.match(mimeApl.relatorio, /AVISO: produto 953, foto 1: conteudo nao confere com image\/png/);
});

const baixadorCdn = baixadorFalso();
const raizCdn = novaRaiz();
const antesCdn = ler(raizCdn, "src/dados/catalogo-completo.json");
const cdn = await sincronizarOuErro({
  blingGet: blingFalso(
    montarExtras([produtoExtra(940, "Externa Cdn", { imagens: { externas: [{ link: "https://cdn.example.test/foto.png" }], internas: [] }, imagemURL: "https://cdn.example.test/foto.png" })]),
  ).blingGet,
  baixarImagem: baixadorCdn.baixarImagem,
  raiz: raizCdn,
  aplicar: true,
});

await teste("externa https em externas[]: nao e baixada; fora de remotePatterns recusa --aplicar", () => {
  assert.ok(!baixadorCdn.pedidos.some((u) => u.includes("cdn.example.test")));
  assert.deepEqual(fotosDe(cdn, 940), ["https://cdn.example.test/foto.png"]);
  assert.equal(cdn.modo, "recusada");
  assert.match(cdn.recusa, /remotePatterns.*cdn\.example\.test/);
  assert.equal(ler(raizCdn, "src/dados/catalogo-completo.json"), antesCdn);
});

await teste("download: teto de 10 MiB por Content-Length, sem ler o corpo", async () => {
  assert.equal(cliente.MAX_BYTES, 10 * 1024 * 1024);
  assert.equal(typeof cliente.lerCorpoLimitado, "function");
  let lidos = 0;
  const corpo = new ReadableStream({ pull(c) { lidos++; c.enqueue(new Uint8Array(1024)); } });
  const r = new Response(corpo, { headers: { "content-length": String(11 * 1024 * 1024) } });
  const e = await erroDe(() => cliente.lerCorpoLimitado(r));
  assert.ok(e?.imagemRecusada, "deveria recusar");
  assert.ok(lidos <= 1, `leu ${lidos} pedacos`);
});

await teste("download: sem Content-Length, conta em streaming e aborta ao passar de 10 MiB", async () => {
  let entregues = 0;
  const corpo = new ReadableStream({ pull(c) { entregues++; c.enqueue(new Uint8Array(1024 * 1024)); } }, { highWaterMark: 0 });
  const e = await erroDe(() => cliente.lerCorpoLimitado(new Response(corpo)));
  assert.ok(e?.imagemRecusada, "deveria recusar");
  assert.ok(entregues <= 12, `consumiu ${entregues} MiB`);
  const ok = await cliente.lerCorpoLimitado(new Response(PNG));
  assert.deepEqual(ok, PNG);
});

await teste("download: timeout de 30 s no GET da imagem", () => {
  assert.equal(cliente.TIMEOUT_IMAGEM_MS, 30_000);
  const txt = fs.readFileSync(path.join(AQUI, "cliente.mjs"), "utf8");
  assert.match(txt, /method: "GET", signal: AbortSignal\.timeout\(TIMEOUT_IMAGEM_MS\)/);
});

/* ------------------------------------------------------------------ */
/* AVIF                                                               */
/* ------------------------------------------------------------------ */

const caixa = (tipo, corpo) => {
  const cab = Buffer.alloc(8);
  cab.writeUInt32BE(8 + corpo.length);
  cab.write(tipo, 4, "latin1");
  return Buffer.concat([cab, corpo]);
};
const ftyp = (principal, ...compat) => caixa("ftyp", Buffer.concat([Buffer.from(principal), Buffer.alloc(4), ...compat.map((m) => Buffer.from(m))]));
const AVIF_MONTADO = Buffer.concat([ftyp("avif", "avif", "mif1", "miaf"), caixa("meta", Buffer.alloc(4)), caixa("mdat", Buffer.from("AVIF"))]);
const AVIF_SHARP = await sharp({ create: { width: 8, height: 8, channels: 3, background: "#c33" } }).avif().toBuffer();
const MP4 = Buffer.concat([ftyp("isom", "isom", "mp42"), caixa("moov", Buffer.alloc(4))]);
const avifInterna = (id) => ({
  externas: [],
  internas: [{ link: `https://orgbling.s3.amazonaws.com/imagens/${id}.avif?X-Amz-Signature=a${id}`, validade: "2026-10-01 10:00:00", ordem: 1, anexo: { id: id * 10 } }],
});
const raizAvif = novaRaiz();
const avif = await sincronizarOuErro({
  blingGet: blingFalso(
    montarExtras([
      produtoExtra(980, "Avif Montado", { imagens: avifInterna(980) }),
      produtoExtra(981, "Avif Sharp", { imagens: avifInterna(981) }),
      produtoExtra(982, "Avif Que E Png", { imagens: avifInterna(982) }),
      produtoExtra(983, "Avif Que E Mp4", { imagens: avifInterna(983) }),
      produtoExtra(984, "Avif Truncado", { imagens: avifInterna(984) }),
    ]),
  ).blingGet,
  baixarImagem: baixadorFalso({
    "980.avif": { dados: AVIF_MONTADO, tipo: "image/avif" },
    "981.avif": { dados: AVIF_SHARP, tipo: "image/avif" },
    "982.avif": { dados: PNG, tipo: "image/avif" },
    "983.avif": { dados: MP4, tipo: "image/avif" },
    "984.avif": { dados: AVIF_SHARP.subarray(0, AVIF_SHARP.length - 10), tipo: "image/avif" },
  }).baixarImagem,
  raiz: raizAvif,
  aplicar: true,
});

await teste("AVIF valido (ISO-BMFF com marca avif) entra como .avif", () => {
  assert.equal(avif.modo, "aplicada", avif.erro?.message ?? avif.recusa ?? "");
  assert.deepEqual(fotosDe(avif, 980), ["/produtos/980-1.avif"]);
  assert.deepEqual(fotosDe(avif, 981), ["/produtos/981-1.avif"]);
  assert.deepEqual(fs.readFileSync(path.join(raizAvif, "public/produtos/981-1.avif")), AVIF_SHARP);
});

await teste("AVIF invalido (PNG, MP4 ou truncado com image/avif) e pulado com aviso", () => {
  for (const id of [982, 983, 984]) assert.equal(fotosDe(avif, id), undefined, `produto ${id} nao deveria publicar`);
  assert.deepEqual(avif.avisosFotos.map((a) => a.produtoId).sort(), [982, 983, 984]);
  assert.match(avif.relatorio, /AVISO: produto 983, foto 1: conteudo nao confere com image\/avif/);
});

const raizAvifAntigo = novaRaiz({ manifesto: { "107-1": { chave: "anexo:555", arquivo: "107-1.avif" } } });
fs.mkdirSync(path.join(raizAvifAntigo, "public/produtos"), { recursive: true });
fs.writeFileSync(path.join(raizAvifAntigo, "public/produtos/107-1.avif"), AVIF_SHARP);
const baixadorAvifAntigo = baixadorFalso();
const avifAntigo = await sincronizarOuErro({ blingGet: blingFalso().blingGet, baixarImagem: baixadorAvifAntigo.baixarImagem, raiz: raizAvifAntigo, aplicar: true });

await teste("manifesto antigo com .avif nao aborta e a foto e reaproveitada", () => {
  assert.equal(avifAntigo.modo, "aplicada", avifAntigo.erro?.message ?? avifAntigo.recusa ?? "");
  assert.equal(baixadorAvifAntigo.pedidos.length, 0);
  assert.deepEqual(fotosDe(avifAntigo, 107), ["/produtos/107-1.avif"]);
  assert.ok(existe(raizAvifAntigo, "public/produtos/107-1.avif"));
});

/* ------------------------------------------------------------------ */
/* Gravacao atomica                                                   */
/* ------------------------------------------------------------------ */

/** Todo o estado persistente (caminho -> bytes), fora a pasta de saida. */
function estadoDe(r) {
  const saida = path.join("scripts", "bling", "saida");
  return Object.fromEntries(
    fs
      .readdirSync(r, { recursive: true })
      .filter((rel) => !rel.startsWith(saida) && fs.statSync(path.join(r, rel)).isFile())
      .sort()
      .map((rel) => [rel, fs.readFileSync(path.join(r, rel))]),
  );
}

/** Troca `fs[nome]` por uma versao que lanca quando `falhar(args, n)` for verdadeiro. */
async function comFalha(nome, falhar, fn) {
  const original = fs[nome];
  let n = 0;
  fs[nome] = (...args) => {
    if (falhar(args, ++n)) throw Object.assign(new Error(`falha injetada em ${nome}(${path.basename(String(args[1] ?? args[0]))})`), { code: "EIO" });
    return original.apply(fs, args);
  };
  try {
    return await fn();
  } finally {
    fs[nome] = original;
  }
}

const foraDaSaida = (destino) => !String(destino).includes(path.join("scripts", "bling", "saida"));
/** Estado anterior com catalogo, manifesto, mapa e foto 107-1.png ja publicados. */
async function raizPublicada() {
  const r = novaRaiz();
  await sincronizar({ blingGet: blingFalso().blingGet, baixarImagem: baixadorFalso().baixarImagem, raiz: r, aplicar: true, hoje: "2026-09-30" });
  return r;
}
/** Proxima sincronizacao: 107 com foto nova (outros bytes, mesmo nome) + 3 produtos novos com foto interna. */
const blingSeguinte = () => {
  const novo107 = structuredClone(fixture("produtos-detalhe.json")["107"]);
  novo107.midia.imagens.internas[0].anexo = { id: 556 };
  const { extras, detalhesExtras } = montarExtras([960, 961, 962].map((id) => produtoExtra(id, `Novo ${id}`, { imagens: interna(id, `${id}.png`) })));
  return blingFalso({ extras, detalhesExtras: { ...detalhesExtras, 107: novo107 } }).blingGet;
};
const PNG_NOVO = Buffer.concat([PNG, Buffer.from("-NOVO")]);
const aplicarSeguinte = (r) =>
  sincronizar({ blingGet: blingSeguinte(), baixarImagem: baixadorFalso({ orgbling: { dados: PNG_NOVO, tipo: "image/png" } }).baixarImagem, raiz: r, aplicar: true, hoje: "2026-09-30" });

const raizAtom1 = await raizPublicada();
const antesAtom1 = estadoDe(raizAtom1);
let promocoes1 = 0;
const erroAtom1 = await comFalha("renameSync", ([, destino]) => foraDaSaida(destino) && ++promocoes1 === 2, () => erroDe(() => aplicarSeguinte(raizAtom1)));

await teste("atomica: falha no 2o rename da promocao restaura tudo (bytes identicos)", () => {
  assert.ok(erroAtom1, "deveria ter lancado");
  assert.match(erroAtom1.message, /falha injetada em renameSync/);
  assert.deepEqual(estadoDe(raizAtom1), antesAtom1);
  assert.ok(!existe(raizAtom1, "scripts/bling/saida/.transacao"), "diario/copias deveriam sumir");
});

const raizAtom2 = await raizPublicada();
const antesAtom2 = estadoDe(raizAtom2);
const erroAtom2 = await comFalha("renameSync", ([, destino]) => String(destino).endsWith("fotos-baixadas.json") && foraDaSaida(destino), () => erroDe(() => aplicarSeguinte(raizAtom2)));

await teste("atomica: falha ao gravar o manifesto (depois de fotos e catalogo) restaura tudo", () => {
  assert.ok(erroAtom2, "deveria ter lancado");
  assert.deepEqual(estadoDe(raizAtom2), antesAtom2);
  assert.ok(!existe(raizAtom2, "public/produtos/960-1.png"), "foto criada deveria ser removida");
});

const raizAtom3 = await raizPublicada();
const antesAtom3 = estadoDe(raizAtom3);
const erroAtom3 = await comFalha("openSync", ([arq, flag]) => String(arq).endsWith("fotos-baixadas.json") && flag === "w", () => erroDe(() => aplicarSeguinte(raizAtom3)));

await teste("atomica: falha ao preparar o manifesto temporario nao toca em nada", () => {
  assert.ok(erroAtom3, "deveria ter lancado");
  assert.deepEqual(estadoDe(raizAtom3), antesAtom3);
});

// O proprio desfazer falha (ou o processo morre): o diario fica e a proxima execucao desfaz.
const raizAtom4 = await raizPublicada();
const antesAtom4 = estadoDe(raizAtom4);
let promocoes4 = 0;
const erroAtom4 = await comFalha("renameSync", ([, destino]) => foraDaSaida(destino) && ++promocoes4 >= 2, () => erroDe(() => aplicarSeguinte(raizAtom4)));
const meioAtom4 = estadoDe(raizAtom4);
const logsAtom4 = [];
await sincronizar({ blingGet: blingFalso().blingGet, baixarImagem: baixadorFalso().baixarImagem, raiz: raizAtom4, hoje: "2026-09-30", log: (m) => logsAtom4.push(m) });

await teste("atomica: diario de transacao interrompida e desfeito na execucao seguinte", () => {
  assert.ok(erroAtom4, "deveria ter lancado");
  assert.match(erroAtom4.message, /proxima execucao desfaz/);
  assert.notDeepEqual(meioAtom4, antesAtom4, "cenario deveria deixar estado parcial");
  assert.deepEqual(estadoDe(raizAtom4), antesAtom4);
  assert.ok(logsAtom4.some((m) => /interrompida/.test(m)));
  assert.ok(!existe(raizAtom4, "scripts/bling/saida/.transacao"));
});

const raizAtom5 = await raizPublicada();
const atom5 = await aplicarSeguinte(raizAtom5);
await teste("atomica: sem falha, publica a foto nova sobre a antiga e so entao limpa orfas", () => {
  assert.equal(atom5.modo, "aplicada");
  assert.deepEqual(fs.readFileSync(path.join(raizAtom5, "public/produtos/107-1.png")), PNG_NOVO);
  for (const id of [960, 961, 962]) assert.ok(existe(raizAtom5, `public/produtos/${id}-1.png`));
  assert.ok(!existe(raizAtom5, "scripts/bling/saida/.transacao"));
});

/* ------------------------------------------------------------------ */
/* Ritmo das chamadas ao Bling                                        */
/* ------------------------------------------------------------------ */

function relogioFalso() {
  const r = { t: 0, esperas: [] };
  r.agora = () => r.t;
  r.esperar = async (ms) => {
    r.esperas.push(ms);
    r.t += ms;
  };
  return r;
}
const resposta = (status, cab = {}) => new Response(status === 200 ? "{}" : null, { status, headers: cab });

await teste("ritmo: intervalo minimo de 700 ms entre requisicoes", async () => {
  assert.equal(cliente.INTERVALO_MIN_MS, 700);
  const rel = relogioFalso();
  const ritmo = cliente.criarRitmo(rel);
  await ritmo.aguardarVez();
  await ritmo.aguardarVez();
  rel.t += 300;
  await ritmo.aguardarVez();
  assert.deepEqual(rel.esperas, [700, 400]);
});

await teste("ritmo: 429 sem Retry-After faz backoff exponencial ate 30 s, no maximo 8 tentativas", async () => {
  const rel = relogioFalso();
  const ritmo = cliente.criarRitmo(rel);
  let n = 0;
  const r = await cliente.pedirNoRitmo(ritmo, async () => resposta(++n <= 7 ? 429 : 200), rel);
  assert.equal(r.status, 200);
  assert.equal(n, 8);
  assert.deepEqual(rel.esperas, [1000, 2000, 4000, 8000, 16000, 30000, 30000]);
  let m = 0;
  const falhou = await cliente.pedirNoRitmo(cliente.criarRitmo(relogioFalso()), async () => (m++, resposta(429)), relogioFalso());
  assert.equal(falhou.status, 429);
  assert.equal(m, 8);
});

await teste("ritmo: respeita Retry-After (segundos e data HTTP)", async () => {
  const rel = relogioFalso();
  let n = 0;
  await cliente.pedirNoRitmo(cliente.criarRitmo(rel), async () => (++n === 1 ? resposta(429, { "retry-after": "3" }) : resposta(200)), rel);
  assert.deepEqual(rel.esperas, [3000]);
  assert.equal(cliente.esperaAposRecusa(1, new Date(10_000 + 5000).toUTCString(), 10_000), 5000);
  assert.equal(cliente.esperaAposRecusa(4, null), 8000);
});

await teste("ritmo: 429 aumenta o intervalo em 25% (teto 2 s); 50 respostas 200 seguidas reduzem aos poucos", async () => {
  const ritmo = cliente.criarRitmo(relogioFalso());
  ritmo.limitado();
  assert.equal(ritmo.intervalo(), 875);
  ritmo.limitado();
  assert.equal(ritmo.intervalo(), 1093.75);
  for (let i = 0; i < 49; i++) ritmo.sucesso();
  assert.equal(ritmo.intervalo(), 1093.75);
  ritmo.sucesso();
  assert.equal(ritmo.intervalo(), 875);
  for (let i = 0; i < 100; i++) ritmo.sucesso();
  assert.equal(ritmo.intervalo(), 700, "nunca abaixo do minimo");
  for (let i = 0; i < 20; i++) ritmo.limitado();
  assert.equal(ritmo.intervalo(), 2000);
  for (let i = 0; i < 49; i++) ritmo.sucesso();
  ritmo.limitado();
  for (let i = 0; i < 49; i++) ritmo.sucesso();
  assert.equal(ritmo.intervalo(), 2000, "429 zera a contagem de 200 seguidas");
});

/* ------------------------------------------------------------------ */
/* Novidades                                                          */
/* ------------------------------------------------------------------ */

const blingNovidades = blingFalso({ ...montarExtras([produtoExtra(990, "Novo Recente")]), inclusoes: { 101: "2026-09-27", 107: "2026-09-10", 990: "2026-09-29", 105: "2026-09-25" } });
const simNovidades = await sincronizar({ blingGet: blingNovidades.blingGet, baixarImagem: baixadorFalso().baixarImagem, raiz: novaRaiz(), hoje: "2026-09-30" });
const chamadasInclusao = (b) => b.chamadas.filter((x) => x.caminho === "/produtos" && x.params.dataInclusaoInicial != null);

await teste("novidades: uma listagem /produtos criterio=2 por dia, de hoje ate hoje - 15, cobrindo so aquele dia", () => {
  const c = chamadasInclusao(blingNovidades);
  assert.equal(c.length, 16);
  assert.ok(c.every((x) => x.params.criterio === 2 && x.params.pagina === 1));
  assert.deepEqual(c[0].params, { criterio: 2, dataInclusaoInicial: "2026-09-30 00:00:00", dataInclusaoFinal: "2026-09-30 23:59:59", pagina: 1, limite: 100 });
  assert.equal(c[15].params.dataInclusaoInicial, "2026-09-15 00:00:00");
  assert.equal(c[15].params.dataInclusaoFinal, "2026-09-15 23:59:59");
});

await teste("novidades: incluido ha 3 dias -> novidadeAte = inclusao + 15 (nao hoje + 15)", () => {
  assert.equal(porCodigo(simNovidades, "SKU-101").novidadeAte, "2026-10-12");
  assert.equal(simNovidades.catalogo.produtos.find((p) => p.id === 990).novidadeAte, "2026-10-14");
  assert.equal(porCodigo(simNovidades, "SKU-109").novidadeAte, undefined);
  assert.match(simNovidades.relatorio, /Entraram em Novidades: 2/);
  assert.match(simNovidades.relatorio, /incluidos em 2026-09-29 \(novidade ate 2026-10-14\): 1/);
  assert.match(simNovidades.relatorio, /incluidos em 2026-09-27 \(novidade ate 2026-10-12\): 1/);
  assert.match(simNovidades.relatorio, /formato aceito pelo Bling: AAAA-MM-DD HH:MM:SS/);
  assert.doesNotMatch(simNovidades.relatorio, /hoje \+ 15|ATENCAO: filtro/);
});

await teste("novidades: incluido ha 20 dias nao e novidade e nenhuma janela cobre o dia dele", () => {
  assert.equal(porCodigo(simNovidades, "SKU-NOVO-107").novidadeAte, undefined);
  const c = chamadasInclusao(blingNovidades);
  assert.ok(c.every((x) => x.params.dataInclusaoFinal != null), "toda janela tem inicio e fim");
  assert.ok(!c.some((x) => x.params.dataInclusaoInicial.slice(0, 10) <= "2026-09-10" && x.params.dataInclusaoFinal.slice(0, 10) >= "2026-09-10"));
});

const raizReroda = novaRaiz();
const blingReroda = () => blingFalso({ inclusoes: { 101: "2026-09-27" } }).blingGet;
await sincronizar({ blingGet: blingReroda(), baixarImagem: baixadorFalso().baixarImagem, raiz: raizReroda, aplicar: true, hoje: "2026-09-30" });
const catReroda1 = JSON.parse(ler(raizReroda, "src/dados/catalogo-completo.json"));
await sincronizar({ blingGet: blingReroda(), baixarImagem: baixadorFalso().baixarImagem, raiz: raizReroda, aplicar: true, hoje: "2026-10-07" });
const catReroda2 = JSON.parse(ler(raizReroda, "src/dados/catalogo-completo.json"));

await teste("novidades: rodar de novo 7 dias depois NAO empurra novidadeAte", () => {
  const ate = (cat) => cat.produtos.find((p) => p.codigo === "SKU-101").novidadeAte;
  assert.equal(ate(catReroda1), "2026-10-12");
  assert.equal(ate(catReroda2), "2026-10-12");
});

const blingIgnora = blingFalso({ inclusoes: { 101: "2026-09-27" }, ignoraFiltroData: true });
const simIgnora = await sincronizar({ blingGet: blingIgnora.blingGet, baixarImagem: baixadorFalso().baixarImagem, raiz: novaRaiz(), hoje: "2026-09-30" });

await teste("novidades: filtro de data ignorado pelo Bling -> ninguem vira novidade e o relatorio avisa", () => {
  assert.equal(simIgnora.catalogo.produtos.filter((p) => p.novidadeAte).length, 0);
  assert.match(simIgnora.relatorio, /ATENCAO: filtro de data de inclusao ignorado pelo Bling; Novidades mantida pelo criterio antigo/);
  assert.match(simIgnora.relatorio, /Entraram em Novidades: 0/);
});

const blingSemHora = blingFalso({ inclusoes: { 101: "2026-09-27" }, recusaHora: true });
const simSemHora = await sincronizar({ blingGet: blingSemHora.blingGet, baixarImagem: baixadorFalso().baixarImagem, raiz: novaRaiz(), hoje: "2026-09-30" });

await teste("novidades: Bling recusa data com hora (400) -> tenta AAAA-MM-DD uma vez e registra o formato", () => {
  const c = chamadasInclusao(blingSemHora);
  assert.equal(c[0].params.dataInclusaoInicial, "2026-09-30 00:00:00");
  assert.equal(c[1].params.dataInclusaoInicial, "2026-09-30");
  assert.equal(c[1].params.dataInclusaoFinal, "2026-09-30");
  assert.equal(c.filter((x) => / /.test(x.params.dataInclusaoInicial)).length, 1);
  assert.equal(porCodigo(simSemHora, "SKU-101").novidadeAte, "2026-10-12");
  assert.match(simSemHora.relatorio, /formato aceito pelo Bling: AAAA-MM-DD\./);
});

await teste("novidades (site): DIAS_NOVIDADE = 15 num lugar so, compartilhado com a sincronizacao", () => {
  assert.equal(regrasNovidade.DIAS_NOVIDADE, 15);
  assert.equal(regrasNovidade.somarDias("2026-09-30", -15), "2026-09-15");
  assert.equal(regrasNovidade.somarDias("2026-12-25", 15), "2027-01-09");
  assert.equal(regrasNovidade.dataNaLoja(new Date("2026-10-01T02:00:00Z")), "2026-09-30", "fuso America/Sao_Paulo");
  assert.ok(!/DIAS_NOVIDADE\s*=/.test(fs.readFileSync(path.join(AQUI, "sincronizacao.mjs"), "utf8")));
});

await teste("novidades (site): vigente = novidadeAte >= data do build; catalogo antigo mantem os 60 maiores ids", () => {
  const { selecionarNovidades } = regrasNovidade;
  const antigos = Array.from({ length: 70 }, (_, i) => ({ id: i + 1 }));
  const semCampo = selecionarNovidades(antigos, "2026-09-30", 60);
  assert.equal(semCampo.porData, false);
  assert.equal(semCampo.lista.length, 60);
  assert.equal(semCampo.lista[0].id, 70);
  const comCampo = [{ id: 1, novidadeAte: "2026-09-29" }, { id: 2, novidadeAte: "2026-09-30" }, { id: 3, novidadeAte: "2026-10-10" }, { id: 4 }];
  const vigentes = selecionarNovidades(comCampo, "2026-09-30", 60);
  assert.equal(vigentes.porData, true);
  assert.deepEqual(vigentes.lista.map((p) => p.id), [3, 2]);
  const vencidos = selecionarNovidades([{ id: 1, novidadeAte: "2026-09-01" }, { id: 2 }], "2026-09-30", 60);
  assert.deepEqual(vencidos, { porData: true, lista: [] }, "com o campo mas nada vigente: estado vazio");
});

await teste("novidades (site): pagina /novidades tem estado vazio com link para o catalogo", () => {
  const pagina = fs.readFileSync(path.join(RAIZ_REPO, "src/app/novidades/page.tsx"), "utf8");
  assert.match(pagina, /Novidades chegando em breve/);
  assert.match(pagina, /href="\/catalogo"/);
});

/* ------------------------------------------------------------------ */
/* Descricao, marca, mapa de categorias e alerta de preco             */
/* ------------------------------------------------------------------ */

const siteTextos = [
  { id: 8201, nome: "Site Desc", slug: "site-desc", marca: "Medicube", preco: 1000, categoriaId: 801248, fotos: [], descricao: "Descricao que ja esta no site.", codigo: "TXT-3", ean: null },
  { id: 8202, nome: "Alerta Alta", slug: "alerta-alta", marca: null, preco: 2998, categoriaId: 801248, fotos: [], descricao: null, codigo: "ALERTA-1", ean: null },
  { id: 8203, nome: "Alerta Baixa", slug: "alerta-baixa", marca: null, preco: 100000, categoriaId: 801248, fotos: [], descricao: null, codigo: "ALERTA-2", ean: null },
  { id: 8204, nome: "Sem Alerta", slug: "sem-alerta", marca: null, preco: 1000, categoriaId: 801248, fotos: [], descricao: null, codigo: "ALERTA-3", ean: null },
];
const simTextos = await sincronizar({
  blingGet: blingFalso(
    montarExtras([
      produtoExtra(1001, "Com Curta", { codigo: "TXT-1", descricaoCurta: "<p>Curta boa</p>", descricaoComplementar: "<p>Nao usar</p>" }),
      produtoExtra(1002, "Com Complementar", { codigo: "TXT-2", descricaoCurta: "<p> </p>", descricaoComplementar: "<b>Texto</b> complementar" }),
      produtoExtra(1003, "Do Site", { codigo: "TXT-3" }),
      produtoExtra(1004, "Sem Nada", { codigo: "TXT-4", marca: "tirtir" }),
      produtoExtra(1005, "Alerta Alta", { codigo: "ALERTA-1", preco: 780 }),
      produtoExtra(1006, "Alerta Baixa", { codigo: "ALERTA-2", preco: 150 }),
      produtoExtra(1007, "Sem Alerta", { codigo: "ALERTA-3", preco: 20 }),
    ]),
  ).blingGet,
  baixarImagem: baixadorFalso().baixarImagem,
  raiz: novaRaiz({ produtosExtras: siteTextos }),
  hoje: "2026-09-30",
});
const pTexto = (codigo) => porCodigo(simTextos, codigo);

await teste("descricao: curta limpa > complementar limpa > a do site > null", () => {
  assert.equal(pTexto("TXT-1").descricao, "Curta boa");
  assert.equal(pTexto("TXT-2").descricao, "Texto complementar");
  assert.equal(pTexto("TXT-3").descricao, "Descricao que ja esta no site.");
  assert.equal(pTexto("TXT-4").descricao, null);
  assert.match(simTextos.relatorio, /Descricao curta do Bling: \d+/);
  assert.match(simTextos.relatorio, /Descricao complementar do Bling: 1\b/);
  assert.match(simTextos.relatorio, /Descricao mantida do site: 1\b/);
});

await teste("marca: sem marca no Bling mantem a do site (mesmo casamento do slug)", () => {
  assert.equal(pTexto("TXT-3").marca, "Medicube");
  assert.equal(pTexto("TXT-4").marca, "TIRTIR");
  assert.equal(pTexto("TXT-1").marca, null);
  assert.match(simTextos.relatorio, /Marca mantida do site: 1\b/);
});

await teste("preco: ALERTA DE PRECO no topo para variacao > 5x ou < 1/5 (nao bloqueia)", () => {
  const topo = simTextos.relatorio.split("## Totais")[0];
  assert.match(topo, /ALERTA DE PRECO/);
  assert.match(topo, /Alerta Alta \(codigo ALERTA-1\): R\$ 29,98 para R\$ 780,00/);
  assert.match(topo, /Alerta Baixa \(codigo ALERTA-2\): R\$ 1000,00 para R\$ 150,00/);
  assert.ok(!topo.includes("ALERTA-3"));
});

await teste("mapa de categorias do dono aponta para slugs reais do site", () => {
  const mapa = JSON.parse(fs.readFileSync(path.join(AQUI, "mapa-categorias.json"), "utf8"));
  const arvore = JSON.parse(fs.readFileSync(path.join(AQUI, "categorias-site.json"), "utf8"));
  const esperado = {
    11904893: ["bem-estar-e-estilo-de-vida", "saude"],
    12361463: ["bem-estar-e-estilo-de-vida", "saude"],
    11874698: ["papelaria", "diversos"],
    11874667: ["bem-estar-e-estilo-de-vida", "geral"],
  };
  for (const [id, [sup, sub]] of Object.entries(esperado)) {
    assert.deepEqual([mapa[id]?.super, mapa[id]?.sub], [sup, sub], `id ${id}`);
    const s = arvore.find((x) => x.slug === sup);
    assert.ok(s?.subcategorias.some((f) => f.slug === sub), `${sup}/${sub} nao existe no site`);
  }
  assert.equal(mapa["4341353"], undefined, "4341353 segue para o padrao");
});

/* ------------------------------------------------------------------ */
/* --da-previa                                                        */
/* ------------------------------------------------------------------ */

const T0 = Date.parse("2026-09-30T12:00:00Z");
const HORA = 3600_000;
const blingProibido = { chamadas: 0, blingGet: async () => { blingProibido.chamadas++; throw new Error("nao devia ler o Bling"); } };

const raizPrevia = novaRaiz();
await sincronizar({ blingGet: blingFalso().blingGet, baixarImagem: baixadorFalso().baixarImagem, raiz: raizPrevia, hoje: "2026-09-30", agora: () => T0 });
const previaSalva = JSON.parse(ler(raizPrevia, "scripts/bling/saida/previa.json"));
const baixadorPrevia = baixadorFalso();
const daPrevia = await sincronizarOuErro({ blingGet: blingProibido.blingGet, baixarImagem: baixadorPrevia.baixarImagem, raiz: raizPrevia, aplicar: true, daPrevia: true, agora: () => T0 + 23 * HORA });

await teste("--da-previa: aplica exatamente a previa da simulacao, sem ler o Bling", () => {
  assert.equal(daPrevia.modo, "aplicada", daPrevia.erro?.message ?? daPrevia.recusa ?? "");
  assert.equal(blingProibido.chamadas, 0);
  const { aplicacao, ...catalogoPrevia } = previaSalva;
  assert.ok(aplicacao);
  assert.deepEqual(JSON.parse(ler(raizPrevia, "src/dados/catalogo-completo.json")), catalogoPrevia);
  assert.deepEqual(baixadorPrevia.pedidos.map((u) => u.includes("orgbling")), [true]);
  assert.deepEqual(fs.readFileSync(path.join(raizPrevia, "public/produtos/107-1.png")), PNG);
  assert.deepEqual(JSON.parse(ler(raizPrevia, "scripts/bling/mapa-categorias.json"))["11"], { super: "beleza", sub: "skincare", nomeBling: "SKINCARE" });
  assert.match(daPrevia.relatorio, /da previa/i);
});

const raizVelha = novaRaiz();
await sincronizar({ blingGet: blingFalso().blingGet, baixarImagem: baixadorFalso().baixarImagem, raiz: raizVelha, hoje: "2026-09-30", agora: () => T0 });
const antesVelha = estadoDe(raizVelha);
const erroVelha = await erroDe(() => sincronizar({ blingGet: blingProibido.blingGet, baixarImagem: baixadorFalso().baixarImagem, raiz: raizVelha, aplicar: true, daPrevia: true, agora: () => T0 + 25 * HORA }));

await teste("--da-previa: previa com 24 h ou mais e recusada", () => {
  assert.ok(erroVelha, "deveria recusar");
  assert.match(erroVelha.message, /24 h/);
  assert.match(erroVelha.message, /rode a simulacao de novo/);
  assert.deepEqual(estadoDe(raizVelha), antesVelha);
  assert.equal(blingProibido.chamadas, 0);
});

const baixador403 = baixadorFalso({ orgbling: new Error("Download da imagem falhou (403): orgbling.s3.amazonaws.com/imagens/107.png") });
const erro403 = await erroDe(() => sincronizar({ blingGet: blingProibido.blingGet, baixarImagem: baixador403.baixarImagem, raiz: raizVelha, aplicar: true, daPrevia: true, agora: () => T0 + HORA }));

await teste("--da-previa: link expirado (403) aborta pedindo nova simulacao, nada gravado", () => {
  assert.ok(erro403, "deveria abortar");
  assert.match(erro403.message, /403/);
  assert.match(erro403.message, /rode a simulacao de novo/i);
  assert.deepEqual(estadoDe(raizVelha), antesVelha);
});

const dezPrevia = Array.from({ length: 10 }, (_, i) => produtoExtra(960 + i, `Previa Dez ${i}`, { imagens: interna(960 + i, `${960 + i}.png`) }));
const raizDez = novaRaiz();
await sincronizar({ blingGet: blingFalso(montarExtras(dezPrevia)).blingGet, baixarImagem: baixadorFalso().baixarImagem, raiz: raizDez, hoje: "2026-09-30", agora: () => T0 });
const previaDez = JSON.parse(ler(raizDez, "scripts/bling/saida/previa.json"));
const antesDez = estadoDe(raizDez);
const baixadorDez = baixadorFalso({ "965.png": recusaTamanho });
const erroDez = await erroDe(() => sincronizar({ blingGet: blingProibido.blingGet, baixarImagem: baixadorDez.baixarImagem, raiz: raizDez, aplicar: true, daPrevia: true, agora: () => T0 + HORA }));

await teste("--da-previa: 1 de 10 fotos acima do teto recusa tudo, 0 arquivos alterados", () => {
  const naPrevia = previaDez.produtos.filter((p) => p.id >= 960 && p.id < 970);
  assert.equal(naPrevia.length, 10, "a previa deveria ter os 10 produtos");
  assert.ok(baixadorDez.pedidos.some((u) => u.includes("965.png")), "deveria ter tentado a foto grande");
  assert.ok(erroDez, "deveria recusar em vez de publicar 9 de 10");
  assert.equal(erroDez.message, `Uma foto da previa falhou (965: ${recusaTamanho.message}). Nada foi gravado. Rode a simulacao de novo.`);
  assert.deepEqual(estadoDe(raizDez), antesDez);
  assert.ok(!existe(raizDez, "scripts/bling/saida/.fotos-novas"), "preparo removido");
  assert.equal(blingProibido.chamadas, 0);
});

fs.writeFileSync(path.join(raizVelha, "src/dados/catalogo-completo.json"), ler(raizVelha, "src/dados/catalogo-completo.json") + " ");
const erroMudou = await erroDe(() => sincronizar({ blingGet: blingProibido.blingGet, baixarImagem: baixadorFalso().baixarImagem, raiz: raizVelha, aplicar: true, daPrevia: true, agora: () => T0 + HORA }));
const erroSemAplicar = await erroDe(() => sincronizar({ blingGet: blingProibido.blingGet, baixarImagem: baixadorFalso().baixarImagem, raiz: raizVelha, daPrevia: true, agora: () => T0 + HORA }));

await teste("--da-previa: recusa se o catalogo mudou depois da simulacao, e exige --aplicar", () => {
  assert.match(erroMudou?.message ?? "", /mudaram depois da simulacao/);
  assert.match(erroSemAplicar?.message ?? "", /--aplicar/);
  assert.equal(blingProibido.chamadas, 0);
});

/* ------------------------------------------------------------------ */
/* Somente leitura                                                    */
/* ------------------------------------------------------------------ */

await teste("somente leitura: blingEscrever() lanca", () => {
  assert.throws(() => cliente.blingEscrever(), /somente leitura/);
});

/** Modulos que abrem rede ou processo. Proibidos em scripts/bling fora do cliente. */
const MODULOS_PROIBIDOS = new Set(
  ["http", "https", "http2", "net", "tls", "dgram", "child_process", "undici", "axios", "node-fetch", "got"].flatMap((m) => [m, `node:${m}`]),
);
/** Unica excecao: autorizar.mjs sobe o servidor local do OAuth e abre o navegador. */
const ABRIR_NAVEGADOR = '`cmd.exe /c start "" "http://localhost:${PORTA}"`';
const GLOBAIS = new Set(["globalThis", "global", "window", "self"]);

/** Analise por AST (acorn). Devolve a lista de usos proibidos; vazia = ok. */
function usosDeRede(fonte, arquivo) {
  const ast = acorn.parse(fonte, { ecmaVersion: "latest", sourceType: "module" });
  const autorizar = path.basename(arquivo) === "autorizar.mjs";
  const achados = [];
  const liberados = new Map(); // nome local -> uso permitido
  const usos = []; // [identificador, pai, avo]
  const literal = (n) => (n?.type === "Literal" && typeof n.value === "string" ? n.value : null);
  const modulo = (n) => {
    const s = literal(n);
    if (s == null) return "(dinamico)";
    return MODULOS_PROIBIDOS.has(s) ? s : null;
  };

  (function visitar(no, pai, avo) {
    if (!no || typeof no.type !== "string") return;
    switch (no.type) {
      case "ImportDeclaration": {
        const m = modulo(no.source);
        if (!m) break;
        const [esp, ...resto] = no.specifiers;
        const base = m.replace(/^node:/, "");
        if (autorizar && !resto.length && base === "http" && /^Import(Default|Namespace)Specifier$/.test(esp?.type)) {
          liberados.set(esp.local.name, "createServer");
        } else if (autorizar && !resto.length && base === "child_process" && esp?.type === "ImportSpecifier" && esp.imported.name === "exec") {
          liberados.set(esp.local.name, "abrirNavegador");
        } else {
          achados.push(`import de ${m}`);
        }
        break;
      }
      case "ImportExpression": {
        const m = modulo(no.source);
        if (m) achados.push(`import() de ${m}`);
        break;
      }
      case "CallExpression":
        if (no.callee.type === "Identifier" && no.callee.name === "require") {
          const m = modulo(no.arguments[0]);
          if (m) achados.push(`require de ${m}`);
        }
        break;
      case "MemberExpression":
        if (no.computed && literal(no.property) === "fetch") achados.push("fetch por indice");
        if (no.computed && literal(no.property) === "getBuiltinModule") achados.push("getBuiltinModule por indice");
        if (no.computed && no.object.type === "Identifier" && GLOBAIS.has(no.object.name) && literal(no.property) == null) {
          achados.push(`${no.object.name}[...] dinamico`);
        }
        break;
      case "Property": {
        // `method: "X"`, `"method": "X"` e `["method"]: "X"`.
        const chave = no.computed ? literal(no.key) : (no.key.name ?? no.key.value);
        if (chave === "method" && literal(no.value) != null && literal(no.value).toUpperCase() !== "GET") {
          achados.push(`method ${literal(no.value)}`);
        }
        break;
      }
      case "Identifier":
        // getBuiltinModule abre qualquer modulo nativo (https, child_process...) sem import.
        if (["fetch", "XMLHttpRequest", "WebSocket", "EventSource", "getBuiltinModule"].includes(no.name)) achados.push(no.name);
        if (!/^Import(Default|Namespace)?Specifier$/.test(pai?.type)) usos.push([no, pai, avo]);
        break;
    }
    for (const [chave, v] of Object.entries(no)) {
      if (chave === "type") continue;
      for (const filho of Array.isArray(v) ? v : [v]) if (filho && typeof filho.type === "string") visitar(filho, no, pai);
    }
  })(ast, null, null);

  for (const [id, pai, avo] of usos) {
    const permitido = liberados.get(id.name);
    if (!permitido) continue;
    const ok =
      permitido === "createServer"
        ? pai?.type === "MemberExpression" && pai.object === id && !pai.computed && pai.property.name === "createServer" &&
          avo?.type === "CallExpression" && avo.callee === pai
        : pai?.type === "CallExpression" && pai.callee === id && pai.arguments.length === 1 &&
          fonte.slice(pai.arguments[0].start, pai.arguments[0].end) === ABRIR_NAVEGADOR;
    if (!ok) achados.push(`uso nao permitido de ${id.name} (linha ${fonte.slice(0, id.start).split("\n").length})`);
  }
  return achados;
}

const arquivosBling = fs
  .readdirSync(AQUI, { recursive: true })
  .filter((f) => /\.(mjs|js|cjs)$/.test(f) && path.basename(f) !== "cliente.mjs");
const fonteDe = (f) => fs.readFileSync(path.join(AQUI, f), "utf8");

await teste("somente leitura (AST): nenhum arquivo de scripts/bling alem do cliente usa rede, processo ou metodo != GET", () => {
  assert.ok(["sincronizacao.mjs", "atualizar.mjs", "teste-regras.mjs", "autorizar.mjs"].every((f) => arquivosBling.includes(f)));
  const achados = arquivosBling.flatMap((f) => usosDeRede(fonteDe(f), f).map((a) => `${f}: ${a}`));
  assert.deepEqual(achados, []);
  // Importado pela sincronizacao, fora de scripts/bling.
  const novidades = path.join(RAIZ_REPO, "src/dados/novidades.mjs");
  assert.deepEqual(usosDeRede(fs.readFileSync(novidades, "utf8"), novidades), []);
});

const MUTACOES = [
  ["fetch com PATCH", "sincronizacao.mjs", (s) => `${s}\nexport async function x(u) { await fetch(u, { method: "PATCH" }); }\n`],
  ["import de node:https", "sincronizacao.mjs", (s) => `import https from "node:https";\n${s}`],
  ["http.get", "sincronizacao.mjs", (s) => `import http from "node:http";\n${s}\nhttp.get("http://x");\n`],
  ["exec curl", "sincronizacao.mjs", (s) => `import { exec } from "node:child_process";\n${s}\nexec("curl -X PATCH x");\n`],
  ["http.get no autorizar", "autorizar.mjs", (s) => `${s}\nhttp.get("https://api.bling.com.br/Api/v3/produtos");\n`],
  ["exec curl no autorizar", "autorizar.mjs", (s) => `${s}\nexec("curl -X PATCH https://api.bling.com.br/Api/v3/produtos/1");\n`],
  ["import() dinamico de https", "atualizar.mjs", (s) => `${s}\nawait import("node:https");\n`],
  ["require de axios", "atualizar.mjs", (s) => `${s}\nconst ax = require("axios");\n`],
  ["getBuiltinModule + method computado", "sincronizacao.mjs", (s) => `${s}\nprocess.getBuiltinModule("https").request("https://x", {["method"]:"PATCH"});\n`],
];
for (const [nome, arquivo, mutar] of MUTACOES) {
  await teste(`somente leitura (AST): mutacao "${nome}" em ${arquivo} e detectada`, () => {
    assert.notDeepEqual(usosDeRede(mutar(fonteDe(arquivo)), arquivo), [], "a mutacao deveria falhar a verificacao");
  });
}

await teste("somente leitura: no cliente, o unico metodo nao GET e o POST de /oauth/token", () => {
  const txt = fs.readFileSync(path.join(AQUI, "cliente.mjs"), "utf8");
  const todas = txt.match(new RegExp("\\bfe" + "tch\\s*\\(", "g")) ?? [];
  const comMetodo = [...txt.matchAll(new RegExp("\\bfe" + "tch\\(([^,]+),\\s*\\{\\s*method:\\s*\"(\\w+)\"", "g"))];
  assert.equal(comMetodo.length, todas.length, "toda chamada de rede no cliente precisa declarar o metodo");
  for (const [, url, metodo] of comMetodo) {
    assert.ok(metodo === "GET" || (metodo === "POST" && url.includes("/oauth/token")), `${metodo} ${url}`);
  }
  assert.equal(comMetodo.filter(([, , m]) => m !== "GET").length, 1);
});

for (const r of raizes) fs.rmSync(r, { recursive: true, force: true });
console.log(falhas ? `\n${falhas} teste(s) falharam.` : "\nTodos os testes passaram.");
process.exitCode = falhas ? 1 : 0;
