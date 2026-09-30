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
import * as cliente from "./cliente.mjs";
import { sincronizar } from "./sincronizacao.mjs";

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

function blingFalso({ extras = [], detalhesExtras = {}, falharEm, paginaVazia } = {}) {
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
function produtoExtra(id, nome, { imagens = { externas: [{ link: `${S3}${id}.jpg` }], internas: [] }, imagemURL = "", codigo } = {}) {
  const lista = {
    id, nome, codigo: codigo ?? `X-${id}`, preco: 10, estoque: { saldoVirtualTotal: 1 },
    tipo: "P", situacao: "A", formato: "S", descricaoCurta: "", imagemURL,
  };
  const detalhe = { ...lista, gtin: "", marca: "", categoria: { id: 0 }, ...(imagens ? { midia: { imagens } } : {}) };
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

await teste("imagem so interna: caminho local planejado, sem link temporario na previa", () => {
  const p = porCodigo(sim, "SKU-NOVO-107");
  assert.deepEqual(p.fotos, ["/produtos/107-1.png"]);
  assert.ok(!ler(raiz, "scripts/bling/saida/previa.json").includes("orgbling"));
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

await teste("so imagemURL sem midia no detalhe: nao baixa nem adivinha a origem; sai com motivo", () => {
  assert.ok(!baixadorFotos.pedidos.some((u) => u.includes("cdn.example.test")));
  assert.equal(fotosDe(fotosApl, 941), undefined);
  assert.equal(fotosApl.sairam.find((s) => s.codigo === "X-941")?.motivo, "sem imagem (imagemURL sem origem nos metadados de midia do Bling)");
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
        if (no.computed && no.object.type === "Identifier" && GLOBAIS.has(no.object.name) && literal(no.property) == null) {
          achados.push(`${no.object.name}[...] dinamico`);
        }
        break;
      case "Property":
        if (!no.computed && (no.key.name ?? no.key.value) === "method" && literal(no.value) != null && literal(no.value).toUpperCase() !== "GET") {
          achados.push(`method ${literal(no.value)}`);
        }
        break;
      case "Identifier":
        if (["fetch", "XMLHttpRequest", "WebSocket", "EventSource"].includes(no.name)) achados.push(no.name);
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
