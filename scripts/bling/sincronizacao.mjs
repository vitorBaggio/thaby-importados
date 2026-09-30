/**
 * Sincronizacao do catalogo do site a partir do Bling (SOMENTE LEITURA).
 *
 * Toda leitura passa pelo `blingGet` recebido (o de `cliente.mjs` na vida real,
 * um falso nos testes). Nada aqui chama a rede diretamente.
 *
 * Regras (definidas pelo dono): entra no site so produto ativo, do tipo produto,
 * com estoque > 0 e com pelo menos 1 imagem. O resto sai. Nada e gravado se
 * qualquer leitura do Bling falhar.
 *
 * Politica de variacoes: o site publica o PAI (produto unico, sem seletor de
 * variacao) quando ao menos uma variacao ativa, do tipo produto, com estoque > 0
 * e com imagem (propria ou do pai) cumpre as regras. O estoque publicado e a soma
 * dessas variacoes; o estoque do proprio pai e ignorado. Pai inativo nao publica,
 * mesmo com variacao elegivel. Variacao nunca vira produto separado.
 *
 * Imagens: `midia.imagens.internas[]` (link assinado, com `validade`) sao
 * baixadas para public/produtos; `externas[]` sao usadas direto, exceto as http,
 * que tambem sao baixadas (o site so serve https). A origem vem sempre dos
 * metadados de midia do detalhe, nunca de adivinhar pela URL.
 */
import fs from "node:fs";
import path from "node:path";
import { matchRemotePattern } from "next/dist/shared/lib/match-remote-pattern.js";
import { slugify, normalizarNome, capitalizar, normalizarMarca, limparHtml, centavos } from "./texto.mjs";

/**
 * Deposito considerado no estoque. null = soma de todos os depositos (saldo da
 * lista /produtos); numero = so aquele deposito, via /estoques/saldos/{id}.
 * Pendente: o dono confirma com a cliente.
 */
export const DEPOSITO_ESTOQUE = null;

/** No maximo 3 fotos por produto. */
export const MAX_FOTOS = 3;
/** --aplicar recusa se o total publicado cair mais que isso (sem --forcar). */
export const QUEDA_MAXIMA = 0.3;
/** Destino de categoria sem mapa: Outros Importados / Variados (slugs reais do site). */
export const DESTINO_SEM_MAPA = { super: "supercategoria-padrao", sub: "padrao" };

const LIMITE = 100;
const MAX_PAGINAS = 1000;
const PREFIXO_S3 = "https://catalogo-mobile.s3.sa-east-1.amazonaws.com/";
/** Unico formato de arquivo que a sincronizacao le, grava ou apaga em public/produtos. */
const ARQUIVO_FOTO = /^\d+-\d+\.(jpg|png|webp|gif)$/;
const EXT_TIPO = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif" };
const ASSINATURA = {
  jpg: (b) => b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  png: (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  gif: (b) => /^GIF8[79]a$/.test(b.subarray(0, 6).toString("latin1")),
  webp: (b) => b.subarray(0, 4).toString("latin1") === "RIFF" && b.subarray(8, 12).toString("latin1") === "WEBP",
};

const SEM_IMAGEM = "sem imagem";
const SEM_ORIGEM = "sem imagem (imagemURL sem origem nos metadados de midia do Bling)";
const FOTO_INVALIDA = "sem imagem (nenhuma foto valida no download)";

export function caminhos(raiz) {
  return {
    catalogo: path.join(raiz, "src/dados/catalogo-completo.json"),
    categoriasSite: path.join(raiz, "scripts/bling/categorias-site.json"),
    mapa: path.join(raiz, "scripts/bling/mapa-categorias.json"),
    manifestoFotos: path.join(raiz, "scripts/bling/fotos-baixadas.json"),
    pastaFotos: path.join(raiz, "public/produtos"),
    saida: path.join(raiz, "scripts/bling/saida"),
    nextConfig: path.join(raiz, "next.config.ts"),
  };
}

const lerJson = (arq) => JSON.parse(fs.readFileSync(arq, "utf8"));
const lerJsonOpcional = (arq, padrao) => (fs.existsSync(arq) ? lerJson(arq) : padrao);
const gravarJson = (arq, dados, espacos) => {
  fs.mkdirSync(path.dirname(arq), { recursive: true });
  fs.writeFileSync(arq, JSON.stringify(dados, null, espacos) + (espacos ? "\n" : ""));
};
const numero = (v) => (v == null || v === "" || !Number.isFinite(Number(v)) ? null : Number(v));
const temTexto = (v) => typeof v === "string" && v.trim() !== "";
const semQuery = (url) => url.split("?")[0];
const gtinValido = (g) => (temTexto(g) && /^\d{8,14}$/.test(g.trim()) ? g.trim() : null);
const idValido = (id) => Number.isSafeInteger(id) && id > 0;

/**
 * Caminho de uma foto dentro de `pasta`. Nome fora do padrao `id-ordem.ext` ou
 * que resolva para fora da pasta aborta: nunca le, grava, reusa ou apaga fora dela.
 */
function caminhoFoto(pasta, arquivo) {
  const destino = path.resolve(pasta, String(arquivo));
  if (typeof arquivo !== "string" || !ARQUIVO_FOTO.test(arquivo) || path.dirname(destino) !== path.resolve(pasta)) {
    throw new Error(`Nome de foto invalido: ${JSON.stringify(arquivo)}. Abortado, nada foi gravado.`);
  }
  return destino;
}

/* ------------------------------------------------------------------ */
/* Leitura do Bling                                                   */
/* ------------------------------------------------------------------ */

/**
 * Pagina ate acabar. Pagina com menos de LIMITE itens termina. Pagina VAZIA
 * depois de pagina cheia so termina se a seguinte tambem vier vazia; se a
 * seguinte tiver itens, a lista veio furada e aborta. Qualquer pagina que falhe
 * de vez propaga o erro.
 */
async function paginar(get, caminho, params) {
  const pedir = async (pagina) => {
    const r = await get(caminho, { ...params, pagina, limite: LIMITE });
    if (!Array.isArray(r?.data)) throw new Error(`Resposta inesperada do Bling em ${caminho} (pagina ${pagina}, sem "data").`);
    return r.data;
  };
  const todos = [];
  for (let pagina = 1; pagina <= MAX_PAGINAS; pagina++) {
    const dados = await pedir(pagina);
    if (!dados.length && pagina > 1) {
      if ((await pedir(pagina + 1)).length) {
        throw new Error(`${caminho}: pagina ${pagina} veio vazia, mas a pagina ${pagina + 1} tem itens (lista incompleta). Abortado, nada foi gravado.`);
      }
      return todos;
    }
    todos.push(...dados);
    if (dados.length < LIMITE) return todos;
  }
  throw new Error(`${caminho}: passou de ${MAX_PAGINAS} paginas; abortado por seguranca.`);
}

/**
 * Lista ativos e inativos. O filtro de saldo da API tem valor padrao (positivo),
 * entao varremos as tres faixas (zerado, positivo, negativo) para ver TUDO e
 * poder dizer por que cada produto ficou de fora.
 */
async function listarProdutos(get, deposito) {
  const porId = new Map();
  for (const criterio of [2, 3]) {
    for (const filtroSaldoEstoque of [0, 1, 2]) {
      const params = { criterio, tipo: "T", filtroSaldoEstoque };
      if (deposito != null) params.filtroSaldoEstoqueDeposito = deposito;
      for (const p of await paginar(get, "/produtos", params)) {
        if (!idValido(p?.id)) throw new Error(`Produto com id invalido na lista do Bling: ${JSON.stringify(p?.id)}. Abortado, nada foi gravado.`);
        porId.set(p.id, p);
      }
    }
  }
  return porId;
}

/** Completa `saldos` para os ids sem saldo conhecido, em lotes de 100. Ausente na resposta = 0. */
async function completarSaldos(get, ids, saldos, deposito) {
  const caminho = deposito == null ? "/estoques/saldos" : `/estoques/saldos/${deposito}`;
  for (let i = 0; i < ids.length; i += LIMITE) {
    const lote = ids.slice(i, i + LIMITE);
    const r = await get(caminho, { "idsProdutos[]": lote });
    if (!Array.isArray(r?.data)) throw new Error(`Resposta inesperada do Bling em ${caminho} (sem "data").`);
    for (const s of r.data) {
      if (s?.produto?.id != null) saldos.set(s.produto.id, numero(s.saldoVirtualTotal) ?? 0);
    }
    for (const id of lote) if (!saldos.has(id)) saldos.set(id, 0);
  }
}

/* ------------------------------------------------------------------ */
/* Imagens                                                            */
/* ------------------------------------------------------------------ */

/**
 * Externas (permanentes) primeiro, depois internas (temporarias, tem `validade`)
 * pela ordem do Bling. `baixar` = vai para public/produtos (interna ou externa
 * http). Sem midia no detalhe, o `imagemURL` sozinho nao diz a origem: a foto
 * nao e usada e `ambigua` explica por que o produto saiu.
 */
function imagensDe(d, imagemURLReserva) {
  const img = d?.midia?.imagens ?? {};
  const externas = (img.externas ?? [])
    .filter((i) => temTexto(i?.link) && /^https?:\/\//i.test(i.link.trim()))
    .map((i) => {
      const link = i.link.trim();
      return /^http:/i.test(link) ? { tipo: "externa", baixar: true, link, chave: `url:${link}` } : { tipo: "externa", baixar: false, link };
    });
  const internas = (img.internas ?? [])
    .filter((i) => temTexto(i?.link))
    .sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0))
    .map((i) => ({
      tipo: "interna",
      baixar: true,
      link: i.link.trim(),
      chave: i.anexo?.id != null ? `anexo:${i.anexo.id}` : semQuery(i.link.trim()),
    }));
  const imagens = [...externas, ...internas];
  const reserva = [d?.imagemURL, imagemURLReserva].find(temTexto);
  return { imagens, ambigua: !imagens.length && reserva ? reserva.trim() : null };
}

/** So para a previa: o nome final sai do Content-Type validado no download. */
function extensaoDaUrl(url) {
  const m = /\.(jpe?g|png|webp|gif)$/i.exec(semQuery(url));
  return m ? m[1].toLowerCase().replace("jpeg", "jpg") : null;
}

/** Extensao pelo Content-Type aceito, conferida pela assinatura dos primeiros bytes. */
function extensaoValidada(dados, tipo) {
  const mime = String(tipo ?? "").split(";")[0].trim().toLowerCase();
  const ext = EXT_TIPO[mime];
  if (!ext) return { erro: `tipo "${mime || "vazio"}" nao e imagem aceita (jpeg, png, webp, gif)` };
  if (!ASSINATURA[ext](Buffer.from(dados ?? []))) return { erro: `conteudo nao confere com ${mime}` };
  return { ext };
}

/** `images.remotePatterns` reais do next.config.ts (objetos literais com strings). */
function padroesRemotos(arquivo) {
  if (!fs.existsSync(arquivo)) return [];
  const txt = fs.readFileSync(arquivo, "utf8");
  const m = /remotePatterns\s*:\s*\[/.exec(txt);
  if (!m) return [];
  const inicio = m.index + m[0].length;
  let fim = inicio;
  for (let prof = 1; fim < txt.length && prof > 0; fim++) {
    if (txt[fim] === "[") prof++;
    else if (txt[fim] === "]") prof--;
  }
  return [...txt.slice(inicio, fim).matchAll(/\{([^{}]*)\}/g)]
    .map(([, corpo]) => {
      const padrao = {};
      for (const [, k, v] of corpo.matchAll(/\b(protocol|hostname|port|pathname|search)\s*:\s*["'`]([^"'`]*)["'`]/g)) padrao[k] = v;
      return padrao;
    })
    .filter((padrao) => padrao.hostname);
}

/* ------------------------------------------------------------------ */
/* Categorias                                                         */
/* ------------------------------------------------------------------ */

function indexarSite(arvore) {
  const subPorSlug = new Map();
  const superPorSlug = new Map();
  const subsPorNome = new Map();
  const superPorNome = new Map();
  for (const s of arvore) {
    superPorSlug.set(s.slug, s);
    for (const n of new Set([normalizarNome(s.nome), normalizarNome(s.nomeErp)])) superPorNome.set(n, s);
    for (const f of s.subcategorias) {
      subPorSlug.set(f.slug, f);
      for (const n of new Set([normalizarNome(f.nome), normalizarNome(f.nomeErp)])) {
        subsPorNome.set(n, [...(subsPorNome.get(n) ?? []), f]);
      }
    }
  }
  return { subPorSlug, superPorSlug, subsPorNome, superPorNome };
}

/**
 * Casamento automatico por nome normalizado. O ancestral do Bling que casar com
 * uma supercategoria do site desempata nomes repetidos ("Cuidados Pessoais"
 * existe em Beleza e em Infantil). Ambiguo ou sem par: null.
 */
function casarCategoria(idCat, catBling, site) {
  const c = catBling.get(idCat);
  if (!c) return null;
  let candidatas = site.subsPorNome.get(normalizarNome(c.descricao)) ?? [];
  if (!candidatas.length) return null;
  for (let pai = c.categoriaPai?.id, n = 0; pai && n < 20; n++) {
    const cp = catBling.get(pai);
    if (!cp) break;
    const sup = site.superPorNome.get(normalizarNome(cp.descricao));
    if (sup) {
      candidatas = candidatas.filter((f) => f.superId === sup.id);
      break;
    }
    pai = cp.categoriaPai?.id;
  }
  return candidatas.length === 1 ? candidatas[0] : null;
}

function caminhoCategoria(idCat, catBling) {
  const nomes = [];
  for (let id = idCat, n = 0; id && n < 20; n++) {
    const c = catBling.get(id);
    if (!c) break;
    nomes.unshift(c.descricao);
    id = c.categoriaPai?.id;
  }
  return nomes.join(" > ") || `id ${idCat}`;
}

/* ------------------------------------------------------------------ */
/* Sincronizacao                                                      */
/* ------------------------------------------------------------------ */

/**
 * @param {object} o
 * @param {(caminho: string, params?: object) => Promise<any>} o.blingGet  leitura do Bling
 * @param {(url: string) => Promise<{dados: Buffer, tipo: string}>} o.baixarImagem  so usado com aplicar;
 *   erro com `imagemRecusada: true` pula a foto, qualquer outro aborta
 * @param {string} o.raiz  raiz do projeto
 */
export async function sincronizar({
  blingGet,
  baixarImagem,
  raiz,
  aplicar = false,
  forcar = false,
  deposito = DEPOSITO_ESTOQUE,
  hoje = new Date().toISOString().slice(0, 10),
  log = () => {},
}) {
  const inicio = Date.now();
  const arq = caminhos(raiz);
  const chamadas = new Map();
  const get = (caminho, params = {}) => {
    const rota = caminho.replace(/\/\d+(?=\/|$)/g, "/{id}");
    chamadas.set(rota, (chamadas.get(rota) ?? 0) + 1);
    return blingGet(caminho, params);
  };

  // Arquivos locais primeiro: erro aqui aborta antes de gastar chamada no Bling.
  const atual = lerJson(arq.catalogo);
  const arvore = lerJson(arq.categoriasSite);
  const mapaArquivo = lerJsonOpcional(arq.mapa, {});
  const manifesto = lerJsonOpcional(arq.manifestoFotos, {});
  for (const [k, m] of Object.entries(manifesto)) {
    if (!/^\d+-\d+$/.test(k)) throw new Error(`Manifesto de fotos com chave invalida: ${JSON.stringify(k)}. Abortado, nada foi gravado.`);
    caminhoFoto(arq.pastaFotos, m?.arquivo);
  }
  const padroes = padroesRemotos(arq.nextConfig);
  const liberada = (url) => padroes.some((padrao) => matchRemotePattern(padrao, url));
  const site = indexarSite(arvore);

  /* 1. Leitura completa do Bling (nada e gravado ate o fim) ---------- */
  log("Lendo categorias do Bling...");
  const categoriasBling = await paginar(get, "/categorias/produtos", {});
  const catBling = new Map(categoriasBling.map((c) => [c.id, c]));

  log("Lendo produtos do Bling...");
  const lista = await listarProdutos(get, deposito);
  const linhas = [...lista.values()].sort((a, b) => a.id - b.id);
  const topo = linhas.filter((p) => !p.idProdutoPai);
  const linhasVariacao = new Map(linhas.filter((p) => p.idProdutoPai).map((p) => [p.id, p]));
  const ativosP = topo.filter((p) => p.situacao === "A" && p.tipo === "P");
  const pais = ativosP.filter((p) => p.formato === "V");
  const simples = ativosP.filter((p) => p.formato !== "V");

  // Com deposito definido, o saldo da lista (soma de todos) nao serve.
  const saldoDaLista = (p) => (deposito == null ? numero(p?.estoque?.saldoVirtualTotal) : null);
  const saldos = new Map();
  for (const p of simples) {
    const s = saldoDaLista(p);
    if (s != null) saldos.set(p.id, s);
  }
  log("Conferindo estoque...");
  await completarSaldos(get, simples.map((p) => p.id).filter((id) => !saldos.has(id)), saldos, deposito);

  // Detalhe (marca, gtin, categoria, midia) so de quem ainda pode entrar.
  const precisamDetalhe = [...simples.filter((p) => saldos.get(p.id) > 0), ...pais];
  log(`Lendo detalhe de ${precisamDetalhe.length} produtos...`);
  const detalhes = new Map();
  for (const p of precisamDetalhe) {
    const r = await get(`/produtos/${p.id}`);
    if (!r?.data) throw new Error(`Resposta inesperada do Bling em /produtos/${p.id} (sem "data").`);
    detalhes.set(p.id, r.data);
  }

  const variacoesSemSaldo = [];
  for (const pai of pais) {
    for (const v of detalhes.get(pai.id).variacoes ?? []) {
      if (!idValido(v?.id)) throw new Error(`Variacao com id invalido no produto ${pai.id}: ${JSON.stringify(v?.id)}. Abortado, nada foi gravado.`);
      if (v.situacao !== "A" || (v.tipo ?? "P") !== "P") continue;
      const s = deposito == null ? (numero(v?.estoque?.saldoVirtualTotal) ?? saldoDaLista(linhasVariacao.get(v.id))) : null;
      if (s != null) saldos.set(v.id, s);
      else variacoesSemSaldo.push(v.id);
    }
  }
  await completarSaldos(get, variacoesSemSaldo, saldos, deposito);

  /* 2. Regras ------------------------------------------------------- */
  const avaliados = topo.map((p) => {
    if (p.situacao !== "A") return { p, motivo: "inativo" };
    if (p.tipo !== "P") return { p, motivo: "servico" };
    if (p.formato === "V") return avaliarPai(p);
    const estoque = saldos.get(p.id);
    if (!(estoque > 0)) return { p, motivo: "sem estoque", estoque };
    const d = detalhes.get(p.id);
    const { imagens, ambigua } = imagensDe(d, p.imagemURL);
    if (!imagens.length) return { p, d, motivo: ambigua ? SEM_ORIGEM : SEM_IMAGEM, estoque };
    return { p, d, motivo: null, estoque, imagens, preco: p.preco ?? d.preco };
  });

  function avaliarPai(pai) {
    const d = detalhes.get(pai.id);
    const fotosPai = imagensDe(d, pai.imagemURL);
    const vs = d.variacoes ?? [];
    const elegiveis = [];
    let algumaComEstoque = false;
    let ambigua = fotosPai.ambigua;
    for (const v of vs) {
      if (v.situacao !== "A" || (v.tipo ?? "P") !== "P") continue;
      const estoque = saldos.get(v.id) ?? 0;
      if (!(estoque > 0)) continue;
      algumaComEstoque = true;
      // A variacao herda a foto do pai: no Bling ela costuma ficar so no pai.
      const fotosVar = imagensDe(v, linhasVariacao.get(v.id)?.imagemURL);
      ambigua ||= fotosVar.ambigua;
      if (!fotosVar.imagens.length && !fotosPai.imagens.length) continue;
      elegiveis.push({ v, estoque, imagens: fotosVar.imagens });
    }
    const variacoes = { total: vs.length, elegiveis: elegiveis.length };
    if (!elegiveis.length) {
      const motivo = !algumaComEstoque ? "sem estoque" : ambigua ? SEM_ORIGEM : SEM_IMAGEM;
      return { p: pai, d, motivo, variacoes };
    }
    const precosVar = elegiveis.map((e) => numero(e.v.preco)).filter((x) => x > 0);
    return {
      p: pai,
      d,
      motivo: null,
      variacoes,
      estoque: elegiveis.reduce((t, e) => t + e.estoque, 0),
      imagens: fotosPai.imagens.length ? fotosPai.imagens : elegiveis[0].imagens,
      preco: numero(pai.preco) > 0 ? pai.preco : precosVar.length ? Math.min(...precosVar) : null,
    };
  }

  const publicaveis = avaliados.filter((a) => !a.motivo);
  const avaliadoPorId = new Map(avaliados.map((a) => [a.p.id, a]));

  /* 3. Categorias --------------------------------------------------- */
  const novasEntradasMapa = {};
  const semMapa = new Map(); // chave -> { idCat, caminho, motivo, produtos: [] }
  const subSemMapa = site.subPorSlug.get(DESTINO_SEM_MAPA.sub);
  if (!subSemMapa) throw new Error(`Destino padrao "${DESTINO_SEM_MAPA.sub}" nao existe em categorias-site.json.`);

  function destino(a) {
    const idCat = numero(a.d?.categoria?.id);
    const registrarSemMapa = (motivo) => {
      const chave = idCat ? String(idCat) : "sem-categoria";
      const item = semMapa.get(chave) ?? {
        idCat,
        caminho: idCat ? caminhoCategoria(idCat, catBling) : "(produto sem categoria no Bling)",
        motivo,
        produtos: [],
      };
      item.produtos.push(a.p);
      semMapa.set(chave, item);
      return subSemMapa;
    };
    if (!idCat) return registrarSemMapa("produto sem categoria");
    const entrada = mapaArquivo[idCat] ?? novasEntradasMapa[idCat];
    if (entrada) {
      const sub = site.subPorSlug.get(entrada.sub);
      const sup = site.superPorSlug.get(entrada.super);
      if (sub && sup && sub.superId === sup.id) return sub;
      return registrarSemMapa(`mapa aponta para ${entrada.super}/${entrada.sub}, que nao existe no site`);
    }
    const sub = casarCategoria(idCat, catBling, site);
    if (sub) {
      const sup = arvore.find((s) => s.id === sub.superId);
      novasEntradasMapa[idCat] = { super: sup.slug, sub: sub.slug, nomeBling: catBling.get(idCat)?.descricao };
      return sub;
    }
    return registrarSemMapa(catBling.has(idCat) ? "sem casamento por nome" : "categoria nao encontrada no Bling");
  }

  /* 4. Casamento com o site atual (preserva slug) ------------------- */
  const agrupar = (chave) => {
    const m = new Map();
    for (const s of atual.produtos) {
      const k = chave(s);
      if (k) m.set(k, [...(m.get(k) ?? []), s]);
    }
    return m;
  };
  const criterios = [
    ["codigo", (a) => a.p.codigo?.trim() || null, agrupar((s) => s.codigo?.trim() || null)],
    ["gtin", (a) => gtinValido(a.d?.gtin), agrupar((s) => gtinValido(s.ean))],
    ["nome", (a) => normalizarNome(a.p.nome) || null, agrupar((s) => normalizarNome(s.nome) || null)],
  ];
  // Quem vai publicar escolhe primeiro; os de fora so explicam por que sairam.
  const ordemCasamento = [...publicaveis, ...avaliados.filter((a) => a.motivo)];
  const casamento = new Map();
  const reivindicados = new Set();
  for (const [criterio, chaveBling, indice] of criterios) {
    for (const a of ordemCasamento) {
      if (casamento.has(a.p.id)) continue;
      const k = chaveBling(a);
      const alvo = k && (indice.get(k) ?? []).find((s) => !reivindicados.has(s.id));
      if (!alvo) continue;
      reivindicados.add(alvo.id);
      casamento.set(a.p.id, { site: alvo, criterio });
    }
  }

  /* 5. Monta o catalogo -------------------------------------------- */
  const slugsUsados = new Set();
  for (const a of publicaveis) {
    const c = casamento.get(a.p.id);
    if (c) slugsUsados.add(c.site.slug);
  }
  const hostsExternos = new Map();
  const fotosBaixar = []; // { produtoId, ordem, link, chave, arquivo, origem }
  const usoFotos = { externa: 0, interna: 0, mista: 0 }; // externa = usada direto; interna = baixada
  let externasHttp = 0;

  let produtos = publicaveis.map((a) => {
    const { p, d } = a;
    const c = casamento.get(p.id);
    let slug = c?.site.slug;
    if (!slug) {
      let base = slugify(p.nome) || "produto";
      if (base.length > 60) base = base.slice(0, 60).replace(/-+$/, "");
      slug = base;
      for (let n = 0; slugsUsados.has(slug); n++) slug = n === 0 ? `${base}-${p.id}` : `${base}-${p.id}-${n}`;
      slugsUsados.add(slug);
    }

    const tipos = new Set();
    const fotos = a.imagens.slice(0, MAX_FOTOS).map((img, i) => {
      tipos.add(img.baixar ? "interna" : "externa");
      if (!img.baixar) {
        const u = new URL(img.link);
        const h = hostsExternos.get(u.host) ?? { produtos: 0, fora: 0 };
        h.produtos++;
        if (!liberada(u)) h.fora++;
        hostsExternos.set(u.host, h);
        return img.link.startsWith(PREFIXO_S3) ? img.link.slice(PREFIXO_S3.length) : img.link;
      }
      if (img.tipo === "externa") externasHttp++;
      const ordem = i + 1;
      const anterior = manifesto[`${p.id}-${ordem}`];
      const arquivo =
        anterior?.chave === img.chave ? anterior.arquivo : `${p.id}-${ordem}.${extensaoDaUrl(img.link) ?? "jpg"}`;
      caminhoFoto(arq.pastaFotos, arquivo);
      const item = { produtoId: p.id, ordem, link: img.link, chave: img.chave, arquivo, origem: img.tipo };
      fotosBaixar.push(item);
      return item; // trocado pelo caminho local no fim
    });
    usoFotos[tipos.size > 1 ? "mista" : [...tipos][0]]++;

    return {
      id: p.id,
      nome: capitalizar(p.nome),
      slug,
      marca: normalizarMarca(d.marca),
      preco: centavos(a.preco),
      categoriaId: destino(a).id,
      fotos,
      descricao: limparHtml(d.descricaoCurta ?? p.descricaoCurta),
      codigo: p.codigo?.trim() || null,
      ean: gtinValido(d.gtin),
    };
  });

  // Slugs herdados + novos: qualquer repeticao aborta antes de gravar.
  const donoSlug = new Map();
  for (const p of produtos) {
    if (donoSlug.has(p.slug)) {
      throw new Error(`Slug duplicado "${p.slug}" (produtos ${donoSlug.get(p.slug)} e ${p.id}). Abortado, nada foi gravado.`);
    }
    donoSlug.set(p.slug, p.id);
  }

  const caminhoLocal = (f) => `/produtos/${f.arquivo}`;
  const finalizar = () =>
    produtos.map((p) => ({ ...p, fotos: p.fotos.map((f) => (typeof f === "string" ? f : caminhoLocal(f))) }));

  function montarCatalogo(lista) {
    const porSub = new Map();
    for (const p of lista) porSub.set(p.categoriaId, (porSub.get(p.categoriaId) ?? 0) + 1);
    const categorias = arvore
      .map((s) => {
        const subcategorias = s.subcategorias
          .map((f) => ({ ...f, total: porSub.get(f.id) ?? 0 }))
          .filter((f) => f.total > 0);
        return { ...s, subcategorias, total: subcategorias.reduce((t, f) => t + f.total, 0) };
      })
      .filter((s) => s.subcategorias.length > 0);
    const marcaCont = new Map();
    for (const p of lista) if (p.marca) marcaCont.set(p.marca, (marcaCont.get(p.marca) ?? 0) + 1);
    const marcas = [...marcaCont]
      .filter(([, n]) => n >= 3)
      .sort((a, b) => b[1] - a[1])
      .map(([m]) => m);
    return {
      geradoEm: hoje,
      categorias,
      produtos: lista,
      marcas,
      totais: {
        produtos: lista.length,
        comFoto: lista.filter((p) => p.fotos.length).length,
        supercategorias: categorias.length,
        subcategorias: categorias.reduce((t, s) => t + s.subcategorias.length, 0),
        marcas: marcas.length,
      },
    };
  }

  /* 6. Diferencas com o site atual --------------------------------- */
  const casadoPorSite = new Map([...casamento].map(([idBling, c]) => [c.site.id, { idBling, ...c }]));
  const totalAtual = atual.produtos.length;
  const hostsFora = [...hostsExternos].filter(([, h]) => h.fora > 0).map(([host]) => host);

  // Recalculado se o download tirar produtos do catalogo.
  function diferencas() {
    const entraram = produtos.filter((p) => !casamento.has(p.id));
    const sairam = atual.produtos
      .map((s) => {
        const c = casadoPorSite.get(s.id);
        const a = c && avaliadoPorId.get(c.idBling);
        if (a && !a.motivo) return null;
        return { nome: s.nome, codigo: s.codigo, motivo: a ? a.motivo : "nao existe mais" };
      })
      .filter(Boolean);
    const precoMudou = produtos
      .map((p) => ({ p, antes: casamento.get(p.id)?.site.preco ?? null }))
      .filter(({ p, antes }) => casamento.has(p.id) && antes !== p.preco)
      .map(({ p, antes }) => ({ nome: p.nome, codigo: p.codigo, antes, depois: p.preco, dif: Math.abs((p.preco ?? 0) - (antes ?? 0)) }))
      .sort((a, b) => b.dif - a.dif);
    const porCriterio = { codigo: 0, gtin: 0, nome: 0 };
    for (const p of produtos) {
      const c = casamento.get(p.id);
      if (c) porCriterio[c.criterio]++;
    }
    const queda = totalAtual ? (totalAtual - produtos.length) / totalAtual : 0;
    let recusa = null;
    if (aplicar && !forcar) {
      if (queda > QUEDA_MAXIMA) {
        recusa =
          `O site cairia de ${totalAtual} para ${produtos.length} produtos (queda de ${pct(queda)}, limite ${pct(QUEDA_MAXIMA)}). ` +
          "Nada foi gravado. Esta primeira sincronizacao pode passar de 30% ao retirar produtos antigos sem imagem. " +
          "Revise os motivos em SAIRAM no relatorio antes de usar --forcar. Se estiver certo, rode de novo com --aplicar --forcar.";
      } else if (hostsFora.length) {
        recusa =
          `Fotos externas https fora de images.remotePatterns do next.config.ts (protocolo, host e caminho): ${hostsFora.join(", ")}. ` +
          "Adicione o padrao em remotePatterns ou rode com --forcar. Nada foi gravado.";
      }
    }
    return { entraram, sairam, precoMudou, porCriterio, queda, recusa };
  }
  let dif = diferencas();

  /* 7. Gravacao (so depois de TODA a leitura dar certo) ------------- */
  const fotos = { baixadas: 0, reaproveitadas: 0, removidas: 0 };
  const avisosFotos = []; // { produtoId, ordem, motivo }
  const novasIds = Object.keys(novasEntradasMapa);
  const arqMapaProposto = path.join(arq.saida, "mapa-categorias-proposto.json");
  const mapaCompleto = () => ({ ...mapaArquivo, ...novasEntradasMapa });
  let gravou = false;

  if (aplicar && !dif.recusa) {
    // Downloads vao para uma pasta de preparo; public/produtos so muda se tudo der certo.
    const preparo = path.join(arq.saida, ".fotos-novas");
    fs.rmSync(preparo, { recursive: true, force: true });
    fs.mkdirSync(preparo, { recursive: true });
    try {
      const invalidas = new Set();
      for (const f of fotosBaixar) {
        const anterior = manifesto[`${f.produtoId}-${f.ordem}`];
        if (anterior?.chave === f.chave && fs.existsSync(caminhoFoto(arq.pastaFotos, anterior.arquivo))) {
          f.arquivo = anterior.arquivo;
          f.reaproveitada = true;
          fotos.reaproveitadas++;
          continue;
        }
        let baixada;
        try {
          baixada = await baixarImagem(f.link);
        } catch (e) {
          if (!e?.imagemRecusada) throw e;
          avisosFotos.push({ produtoId: f.produtoId, ordem: f.ordem, motivo: e.message });
          invalidas.add(f);
          continue;
        }
        const v = extensaoValidada(baixada?.dados, baixada?.tipo);
        if (v.erro) {
          avisosFotos.push({ produtoId: f.produtoId, ordem: f.ordem, motivo: v.erro });
          invalidas.add(f);
          continue;
        }
        f.arquivo = `${f.produtoId}-${f.ordem}.${v.ext}`;
        fs.writeFileSync(caminhoFoto(preparo, f.arquivo), baixada.dados);
        fotos.baixadas++;
      }

      if (invalidas.size) {
        produtos = produtos
          .map((p) => ({ ...p, fotos: p.fotos.filter((f) => !invalidas.has(f)) }))
          .filter((p) => {
            if (p.fotos.length) return true;
            avaliadoPorId.get(p.id).motivo = FOTO_INVALIDA;
            return false;
          });
        dif = diferencas();
      }

      if (!dif.recusa) {
        const validas = fotosBaixar.filter((f) => !invalidas.has(f));
        fs.mkdirSync(arq.pastaFotos, { recursive: true });
        for (const f of validas) {
          if (!f.reaproveitada) fs.renameSync(caminhoFoto(preparo, f.arquivo), caminhoFoto(arq.pastaFotos, f.arquivo));
        }
        const novoManifesto = Object.fromEntries(validas.map((f) => [`${f.produtoId}-${f.ordem}`, { chave: f.chave, arquivo: f.arquivo }]));
        gravarJson(arq.catalogo, montarCatalogo(finalizar()));
        gravarJson(arq.manifestoFotos, novoManifesto, 1);
        if (novasIds.length) gravarJson(arq.mapa, mapaCompleto(), 1);
        fs.rmSync(arqMapaProposto, { force: true });
        const emUso = new Set(validas.map((f) => f.arquivo));
        for (const nome of fs.readdirSync(arq.pastaFotos)) {
          if (ARQUIVO_FOTO.test(nome) && !emUso.has(nome)) {
            fs.unlinkSync(caminhoFoto(arq.pastaFotos, nome));
            fotos.removidas++;
          }
        }
        gravou = true;
      }
    } finally {
      fs.rmSync(preparo, { recursive: true, force: true });
    }
  }
  const catalogoFinal = montarCatalogo(finalizar());
  const { entraram, sairam, precoMudou, porCriterio, queda, recusa } = dif;

  // Sem gravacao (simulacao ou recusa), o mapa real nao muda: a proposta fica em saida/.
  if (!gravou && novasIds.length) gravarJson(arqMapaProposto, mapaCompleto(), 1);

  const modo = !aplicar ? "simulacao" : recusa ? "recusada" : "aplicada";
  const idsPublicados = new Set(produtos.map((p) => p.id));
  const relatorio = montarRelatorio({
    modo,
    hoje,
    deposito,
    recusa,
    forcar,
    funil: {
      noBling: topo.length,
      ativos: topo.filter((p) => p.situacao === "A").length,
      inativos: topo.filter((p) => p.situacao !== "A").length,
      ativosProduto: ativosP.length,
      comEstoque: avaliados.filter((a) => !a.motivo || a.motivo.startsWith(SEM_IMAGEM)).length,
      publicados: produtos.length,
      atual: totalAtual,
      queda,
    },
    variacoes: {
      linhasNaLista: linhasVariacao.size,
      pais: pais.length,
      paisPublicados: publicaveis.filter((a) => a.variacoes && idsPublicados.has(a.p.id)).length,
      total: pais.reduce((t, p) => t + (detalhes.get(p.id).variacoes?.length ?? 0), 0),
      elegiveis: avaliados.reduce((t, a) => t + (a.variacoes?.elegiveis ?? 0), 0),
    },
    porCriterio,
    usoFotos,
    externasHttp,
    fotosBaixar: fotosBaixar.length,
    fotos,
    avisosFotos,
    hostsExternos,
    entraram,
    sairam,
    semMapa: [...semMapa.values()],
    novasEntradasMapa: novasIds.length,
    mapaGravado: gravou,
    precoMudou,
    chamadas,
    segundos: (Date.now() - inicio) / 1000,
  });

  fs.mkdirSync(arq.saida, { recursive: true });
  gravarJson(path.join(arq.saida, "previa.json"), catalogoFinal, 1);
  fs.writeFileSync(path.join(arq.saida, "relatorio.md"), relatorio);

  return {
    modo,
    recusa,
    catalogo: catalogoFinal,
    relatorio,
    entraram,
    sairam,
    porCriterio,
    usoFotos,
    fotos,
    avisosFotos,
    chamadas,
    semMapa: [...semMapa.values()],
  };
}

/* ------------------------------------------------------------------ */
/* Relatorio (PT-BR, sem travessao)                                   */
/* ------------------------------------------------------------------ */

const pct = (x) => `${(x * 100).toFixed(1).replace(".", ",")}%`;
const reais = (c) => (c == null ? "sem preco" : `R$ ${(c / 100).toFixed(2).replace(".", ",")}`);
const semTravessao = (s) => String(s ?? "").replace(/[–—]/g, "-");
const item = (p) => `- ${semTravessao(p.nome)} (codigo ${p.codigo || "sem codigo"})`;

function montarRelatorio(r) {
  const f = r.funil;
  const titulo = { simulacao: "SIMULACAO (nada foi gravado no site)", aplicada: "APLICADA", recusada: "RECUSADA" }[r.modo];
  const linhas = [
    `# Sincronizacao Bling: ${titulo}`,
    "",
    `Data: ${r.hoje}. Estoque: ${r.deposito == null ? "soma de todos os depositos" : `somente deposito ${r.deposito}`}.`,
  ];
  if (r.recusa) linhas.push("", `**Recusado:** ${r.recusa}`);
  if (r.modo === "aplicada" && r.forcar) linhas.push("", "Aplicado com --forcar.");

  linhas.push(
    "",
    "## Totais",
    "",
    `- Produtos no Bling (sem contar variacoes): ${f.noBling}`,
    `- Ativos: ${f.ativos} (inativos: ${f.inativos})`,
    `- Ativos do tipo produto: ${f.ativosProduto}`,
    `- Com estoque > 0: ${f.comEstoque}`,
    `- Com estoque e imagem: ${f.publicados}`,
    `- Publicados: ${f.publicados} (site atual: ${f.atual}; ${f.queda === 0 ? "sem variacao" : `${f.queda > 0 ? "queda" : "alta"} de ${pct(Math.abs(f.queda))}`})`,
    "",
    "## Variacoes",
    "",
    "- Politica: o pai e publicado quando ao menos uma variacao ativa, com estoque > 0 e com imagem (propria ou do pai) cumpre as regras. Pai inativo nao publica. Variacao nao vira produto separado; o estoque do pai e ignorado.",
    `- Produtos pai com variacoes (ativos): ${r.variacoes.pais}; publicados: ${r.variacoes.paisPublicados}`,
    `- Variacoes: ${r.variacoes.total}; elegiveis: ${r.variacoes.elegiveis}; linhas de variacao na lista: ${r.variacoes.linhasNaLista}`,
    "- Divida: o site ainda nao tem seletor de variacao. O pai aparece como produto unico, com estoque somado das variacoes elegiveis.",
    "",
    "## Slugs",
    "",
    `- Mantidos por codigo (SKU): ${r.porCriterio.codigo}`,
    `- Mantidos por GTIN: ${r.porCriterio.gtin}`,
    `- Mantidos por nome: ${r.porCriterio.nome}`,
    `- Novos: ${r.entraram.length}`,
    "",
    "## Fotos",
    "",
    `- Produtos so com imagem externa https (usada direto): ${r.usoFotos.externa}`,
    `- Produtos so com imagem baixada para public/produtos (interna do Bling ou externa http): ${r.usoFotos.interna}`,
    `- Produtos com as duas: ${r.usoFotos.mista}`,
    `- Imagens a baixar: ${r.fotosBaixar} (das quais externas http: ${r.externasHttp})` +
      (r.modo === "aplicada"
        ? ` (baixadas: ${r.fotos.baixadas}; reaproveitadas: ${r.fotos.reaproveitadas}; arquivos antigos removidos: ${r.fotos.removidas})`
        : r.modo === "simulacao"
          ? " (serao baixadas no --aplicar)"
          : ""),
    "- Dominios de imagem externa https:",
    ...([...r.hostsExternos].map(
      ([host, h]) => `  - ${host}: ${h.produtos} fotos${h.fora ? `, ${h.fora} FORA de remotePatterns do next.config.ts` : ", liberado"}`,
    ).concat(r.hostsExternos.size ? [] : ["  - nenhum"])),
    ...(r.avisosFotos.length
      ? [
          "",
          `### Fotos puladas no download (${r.avisosFotos.length})`,
          "",
          "Produto sem nenhuma foto valida sai como \"sem imagem\".",
          "",
          ...r.avisosFotos.map((a) => `- AVISO: produto ${a.produtoId}, foto ${a.ordem}: ${semTravessao(a.motivo)}`),
        ]
      : []),
    "",
    `## ENTRARAM (${r.entraram.length})`,
    "",
    ...(r.entraram.length ? r.entraram.map(item) : ["- nenhum"]),
    "",
    `## SAIRAM (${r.sairam.length})`,
    "",
    ...(r.sairam.length ? r.sairam.map((s) => `${item(s)}: ${s.motivo}`) : ["- nenhum"]),
    "",
    `## Categorias SEM MAPA (${r.semMapa.length})`,
    "",
    "Produtos daqui foram para Outros Importados / Variados. Para decidir, adicione o id em scripts/bling/mapa-categorias.json.",
    "",
    ...(r.semMapa.length
      ? r.semMapa.map((c) => `- SEM MAPA: ${semTravessao(c.caminho)}${c.idCat ? ` (id ${c.idCat})` : ""}: ${c.motivo}; ${c.produtos.length} produto(s)`)
      : ["- nenhuma"]),
    ...(r.novasEntradasMapa
      ? [
          "",
          r.mapaGravado
            ? `Casamentos automaticos novos gravados no mapa: ${r.novasEntradasMapa}.`
            : `Casamentos automaticos novos propostos (NAO gravados no mapa): ${r.novasEntradasMapa}. Veja scripts/bling/saida/mapa-categorias-proposto.json; entram no mapa no proximo --aplicar.`,
        ]
      : []),
    "",
    `## Precos que mudaram (top 20 de ${r.precoMudou.length})`,
    "",
    ...(r.precoMudou.length
      ? r.precoMudou.slice(0, 20).map((x) => `${item(x)}: ${reais(x.antes)} para ${reais(x.depois)}`)
      : ["- nenhum"]),
    "",
    "## Chamadas ao Bling",
    "",
    `- Total: ${[...r.chamadas.values()].reduce((t, n) => t + n, 0)} em ${r.segundos.toFixed(1).replace(".", ",")} s`,
    ...[...r.chamadas].map(([rota, n]) => `- GET ${rota}: ${n}`),
    "",
  );
  return linhas.join("\n");
}
