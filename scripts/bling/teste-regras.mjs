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
import { blingEscrever } from "./cliente.mjs";
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

function blingFalso({ extras = [], falharEm } = {}) {
  const categorias = fixture("categorias.json");
  const lista = [...fixture("produtos-lista.json"), ...extras];
  const detalhes = fixture("produtos-detalhe.json");
  const saldos = fixture("estoques-saldos.json");
  const saldoReal = (p) => p.estoque?.saldoVirtualTotal ?? saldos.find((s) => s.produto.id === p.id)?.saldoVirtualTotal ?? 0;
  const faixa = (s) => (s === 0 ? 0 : s > 0 ? 1 : 2);
  const pagina = (itens, { pagina = 1, limite = 100 }) => itens.slice((pagina - 1) * limite, pagina * limite);
  const chamadas = [];

  async function blingGet(caminho, params = {}) {
    chamadas.push({ caminho, params });
    if (falharEm?.(caminho, params)) throw new Error(`Bling GET ${caminho} falhou (500): erro simulado`);
    if (caminho === "/categorias/produtos") return { data: pagina(categorias, params) };
    if (caminho === "/produtos") {
      const situacao = { 2: "A", 3: "I" }[params.criterio];
      const itens = lista.filter((p) => p.situacao === situacao && faixa(saldoReal(p)) === params.filtroSaldoEstoque);
      return { data: pagina(itens, params) };
    }
    const m = /^\/produtos\/(\d+)$/.exec(caminho);
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

function baixadorFalso() {
  const pedidos = [];
  return {
    pedidos,
    baixarImagem: async (url) => {
      pedidos.push(url);
      return { dados: Buffer.from("PNG-FALSO"), tipo: "image/png" };
    },
  };
}

/** Pasta que imita a raiz do projeto, com o catalogo "atual" de teste. */
function montarRaiz({ produtosExtras = [] } = {}) {
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
  return raiz;
}

const ler = (raiz, rel) => fs.readFileSync(path.join(raiz, rel), "utf8");
const existe = (raiz, rel) => fs.existsSync(path.join(raiz, rel));

/* ------------------------------------------------------------------ */
/* Cenario principal                                                  */
/* ------------------------------------------------------------------ */

const raiz = montarRaiz();
const catalogoAntes = ler(raiz, "src/dados/catalogo-completo.json");
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
});

await teste("categoria sem mapa e produto sem categoria: Outros Importados / Variados + aviso", () => {
  assert.equal(porCodigo(sim, "SKU-109").categoriaId, 801248);
  assert.equal(porCodigo(sim, "SKU-110").categoriaId, 801248);
  assert.equal(sim.semMapa.length, 2);
  assert.match(sim.relatorio, /SEM MAPA: Lembrancinhas de Viagem \(id 30\)/);
  assert.match(sim.relatorio, /SEM MAPA: \(produto sem categoria no Bling\)/);
});

await teste("mapa de categorias ganha os casamentos automaticos", () => {
  const mapa = JSON.parse(ler(raiz, "scripts/bling/mapa-categorias.json"));
  assert.deepEqual(mapa["11"], { super: "beleza", sub: "skincare", nomeBling: "SKINCARE" });
  assert.deepEqual(mapa["21"], { super: "infantil", sub: "cuidados-pessoais-278552", nomeBling: "CUIDADOS PESSOAIS" });
  assert.equal(mapa["30"], undefined);
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

await teste("--aplicar baixa a imagem interna (mock) e usa o caminho local", () => {
  assert.equal(baixador.pedidos.length, 1);
  assert.match(baixador.pedidos[0], /orgbling/);
  assert.equal(ler(raiz, "public/produtos/107-1.png"), "PNG-FALSO");
  assert.deepEqual(JSON.parse(ler(raiz, "scripts/bling/fotos-baixadas.json")), { "107-1": { chave: "anexo:555", arquivo: "107-1.png" } });
  assert.ok(!existe(raiz, "public/produtos/555-1.jpg"), "foto orfa deveria sair");
  assert.ok(existe(raiz, "public/produtos/2426870.webp"), "arquivo legado nao pode ser apagado");
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
const raizTrava = montarRaiz({ produtosExtras: extrasSite });
const antesTrava = ler(raizTrava, "src/dados/catalogo-completo.json");
const recusada = await sincronizar({ blingGet: blingFalso().blingGet, baixarImagem: baixadorFalso().baixarImagem, raiz: raizTrava, aplicar: true });

await teste("trava de 30%: --aplicar recusa e nao grava o catalogo", () => {
  assert.equal(recusada.modo, "recusada");
  assert.match(recusada.recusa, /de 17 para 7 produtos/);
  assert.match(recusada.recusa, /--forcar/);
  assert.equal(ler(raizTrava, "src/dados/catalogo-completo.json"), antesTrava);
  assert.ok(!existe(raizTrava, "public/produtos"));
});

const forcada = await sincronizar({ blingGet: blingFalso().blingGet, baixarImagem: baixadorFalso().baixarImagem, raiz: raizTrava, aplicar: true, forcar: true });
await teste("trava de 30%: com --forcar grava", () => {
  assert.equal(forcada.modo, "aplicada");
  assert.equal(JSON.parse(ler(raizTrava, "src/dados/catalogo-completo.json")).produtos.length, 7);
});

/* ------------------------------------------------------------------ */
/* Pagina que falha                                                   */
/* ------------------------------------------------------------------ */

const enchimento = Array.from({ length: 100 }, (_, i) => ({
  id: 5000 + i, nome: `Enchimento ${i}`, codigo: `ENC-${i}`, preco: 1, estoque: { saldoVirtualTotal: 1 },
  tipo: "P", situacao: "A", formato: "S", descricaoCurta: "", imagemURL: "",
}));
const raizFalha = montarRaiz();
const antesFalha = fs.readdirSync(raizFalha, { recursive: true }).sort();
const mapaAntes = ler(raizFalha, "scripts/bling/mapa-categorias.json");
const blingQuebrado = blingFalso({
  extras: enchimento,
  falharEm: (c, p) => c === "/produtos" && p.criterio === 2 && p.filtroSaldoEstoque === 1 && p.pagina === 2,
});
let erro = null;
try {
  await sincronizar({ blingGet: blingQuebrado.blingGet, baixarImagem: baixadorFalso().baixarImagem, raiz: raizFalha, aplicar: true, forcar: true });
} catch (e) {
  erro = e;
}

await teste("pagina que falha: aborta e nada e gravado", () => {
  assert.ok(erro, "deveria ter abortado");
  assert.match(erro.message, /falhou \(500\)/);
  assert.ok(blingQuebrado.chamadas.some((c) => c.caminho === "/produtos" && c.params.pagina === 2), "deveria ter pedido a pagina 2");
  assert.deepEqual(fs.readdirSync(raizFalha, { recursive: true }).sort(), antesFalha);
  assert.equal(ler(raizFalha, "scripts/bling/mapa-categorias.json"), mapaAntes);
});

/* ------------------------------------------------------------------ */
/* Somente leitura                                                    */
/* ------------------------------------------------------------------ */

await teste("somente leitura: blingEscrever() lanca", () => {
  assert.throws(() => blingEscrever(), /somente leitura/);
});

// Os padroes sao montados em pedacos para este arquivo nao casar consigo mesmo.
const PROIBIDOS = [
  ["chamada direta a fetch", new RegExp("\\bfe" + "tch\\s*\\(")],
  ["method diferente de GET", new RegExp("\\bmet" + "hod\\s*:\\s*[\"'`](?!GET[\"'`])", "i")],
  ["http(s).request", new RegExp("\\.req" + "uest\\s*\\(")],
  ["XHR do navegador", new RegExp("XMLHttp" + "Request")],
  ["axios/undici/got", new RegExp("[\"'](ax" + "ios|und" + "ici|go" + "t)[\"']")],
  ["import de node:https", new RegExp("[\"']node:htt" + "ps[\"']")],
];

await teste("somente leitura: nenhum arquivo de scripts/bling alem do cliente chama a rede ou usa metodo != GET", () => {
  const arquivos = fs
    .readdirSync(AQUI, { recursive: true })
    .filter((f) => /\.(mjs|js|cjs|ts)$/.test(f) && path.basename(f) !== "cliente.mjs");
  assert.ok(arquivos.includes("sincronizacao.mjs") && arquivos.includes("atualizar.mjs") && arquivos.includes("teste-regras.mjs"));
  const achados = [];
  for (const f of arquivos) {
    const txt = fs.readFileSync(path.join(AQUI, f), "utf8");
    for (const [nome, re] of PROIBIDOS) if (re.test(txt)) achados.push(`${f}: ${nome}`);
  }
  assert.deepEqual(achados, []);
});

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

for (const r of [raiz, raizTrava, raizFalha]) fs.rmSync(r, { recursive: true, force: true });
console.log(falhas ? `\n${falhas} teste(s) falharam.` : "\nTodos os testes passaram.");
process.exitCode = falhas ? 1 : 0;
