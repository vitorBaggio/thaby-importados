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
 * que tambem sao baixadas (o site so serve https). Sem midia no detalhe, o
 * `imagemURL` http(s) tem origem desconhecida: e baixado e validado como as
 * internas (pode ser link temporario), nunca usado direto.
 *
 * Gravacao: catalogo, manifesto de fotos, mapa e fotos sao publicados numa
 * transacao com diario (ver `promover`). Qualquer falha no meio desfaz tudo.
 */
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { matchRemotePattern } from "next/dist/shared/lib/match-remote-pattern.js";
import { slugify, normalizarNome, capitalizar, normalizarMarca, limparHtml, centavos } from "./texto.mjs";
import { DIAS_NOVIDADE, dataNaLoja, somarDias } from "../../src/dados/novidades.mjs";

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
/** --da-previa so aceita previa mais nova que isso. */
export const VALIDADE_PREVIA_MS = 24 * 60 * 60 * 1000;
/** Variacao de preco que vira ALERTA no topo do relatorio (acima de 5x ou abaixo de 1/5). */
export const FATOR_ALERTA_PRECO = 5;

const LIMITE = 100;
const MAX_PAGINAS = 1000;
const PREFIXO_S3 = "https://catalogo-mobile.s3.sa-east-1.amazonaws.com/";
/** Unico formato de arquivo que a sincronizacao le, grava ou apaga em public/produtos. */
const ARQUIVO_FOTO = /^\d+-\d+\.(jpg|png|webp|gif|avif)$/;
const EXT_TIPO = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif", "image/avif": "avif" };
const ASSINATURA = {
  jpg: (b) => b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  png: (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  gif: (b) => /^GIF8[79]a$/.test(b.subarray(0, 6).toString("latin1")),
  webp: (b) => b.subarray(0, 4).toString("latin1") === "RIFF" && b.subarray(8, 12).toString("latin1") === "WEBP",
  avif: avifValido,
};

const SEM_IMAGEM = "sem imagem";
const URL_INVALIDA = "sem imagem (imagemURL invalida, nao e http/https)";
const FOTO_INVALIDA = "sem imagem (nenhuma foto valida no download)";
const RODE_DE_NOVO = "rode a simulacao de novo (node scripts/bling/atualizar.mjs) e depois --aplicar --da-previa";

export function caminhos(raiz) {
  const saida = path.join(raiz, "scripts/bling/saida");
  const transacao = path.join(saida, ".transacao");
  return {
    raiz,
    catalogo: path.join(raiz, "src/dados/catalogo-completo.json"),
    categoriasSite: path.join(raiz, "scripts/bling/categorias-site.json"),
    mapa: path.join(raiz, "scripts/bling/mapa-categorias.json"),
    manifestoFotos: path.join(raiz, "scripts/bling/fotos-baixadas.json"),
    pastaFotos: path.join(raiz, "public/produtos"),
    saida,
    previa: path.join(saida, "previa.json"),
    relatorio: path.join(saida, "relatorio.md"),
    mapaProposto: path.join(saida, "mapa-categorias-proposto.json"),
    transacao,
    diario: path.join(transacao, "diario.json"),
    nextConfig: path.join(raiz, "next.config.ts"),
  };
}

const lerJson = (arq) => JSON.parse(fs.readFileSync(arq, "utf8"));
const lerJsonOpcional = (arq, padrao) => (fs.existsSync(arq) ? lerJson(arq) : padrao);
const textoJson = (dados, espacos) => JSON.stringify(dados, null, espacos) + (espacos ? "\n" : "");

/** Grava e forca o disco (fsync) antes de devolver. */
function gravarDuravel(arq, conteudo) {
  fs.mkdirSync(path.dirname(arq), { recursive: true });
  const fd = fs.openSync(arq, "w");
  try {
    fs.writeSync(fd, conteudo);
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
}
function copiarDuravel(de, para) {
  fs.copyFileSync(de, para);
  const fd = fs.openSync(para, "r+");
  try {
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
}
/** JSON fora da transacao (saida/): temporario + rename, nunca trunca o destino. */
function gravarJson(arq, dados, espacos) {
  const tmp = `${arq}.${process.pid}.tmp`;
  gravarDuravel(tmp, textoJson(dados, espacos));
  fs.renameSync(tmp, arq);
}

const numero = (v) => (v == null || v === "" || !Number.isFinite(Number(v)) ? null : Number(v));
const temTexto = (v) => typeof v === "string" && v.trim() !== "";
const semQuery = (url) => url.split("?")[0];
const gtinValido = (g) => (temTexto(g) && /^\d{8,14}$/.test(g.trim()) ? g.trim() : null);
const idValido = (id) => Number.isSafeInteger(id) && id > 0;
const urlHttp = (s) => {
  try {
    return /^https?:$/.test(new URL(s).protocol);
  } catch {
    return false;
  }
};

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

function lerManifesto(arq) {
  const manifesto = lerJsonOpcional(arq.manifestoFotos, {});
  for (const [k, m] of Object.entries(manifesto)) {
    if (!/^\d+-\d+$/.test(k)) throw new Error(`Manifesto de fotos com chave invalida: ${JSON.stringify(k)}. Abortado, nada foi gravado.`);
    caminhoFoto(arq.pastaFotos, m?.arquivo);
  }
  return manifesto;
}

/** Impressao digital do que a aplicacao substitui: --da-previa recusa se mudou desde a simulacao. */
function impressao(arq) {
  const h = createHash("sha256");
  for (const a of [arq.catalogo, arq.manifestoFotos, arq.mapa]) {
    h.update(fs.existsSync(a) ? fs.readFileSync(a) : Buffer.from("(ausente)")).update("\0");
  }
  return h.digest("hex");
}

/* ------------------------------------------------------------------ */
/* Transacao de gravacao                                              */
/* ------------------------------------------------------------------ */

/**
 * Publica `itens` ({ origem, destino }; origem ja preparada e gravada) de uma
 * vez. Antes de mexer em qualquer destino: copia de seguranca de cada destino
 * existente e diario gravado com fsync. Erro no meio: desfaz tudo e relanca.
 * Se o proprio desfazer falhar (ou o processo morrer), o diario fica e a
 * proxima execucao desfaz antes de qualquer outra coisa. O commit e a remocao
 * do diario.
 */
function promover(arq, itens) {
  fs.rmSync(arq.transacao, { recursive: true, force: true });
  fs.mkdirSync(arq.transacao, { recursive: true });
  const rel = (a) => path.relative(arq.raiz, a);
  const entradas = itens.map(({ destino }, i) => {
    if (!fs.existsSync(destino)) return { destino: rel(destino), copia: null };
    const copia = path.join(arq.transacao, `${i}.orig`);
    copiarDuravel(destino, copia);
    return { destino: rel(destino), copia: rel(copia) };
  });
  gravarDuravel(arq.diario, JSON.stringify({ entradas }));
  try {
    for (const { origem, destino } of itens) {
      fs.mkdirSync(path.dirname(destino), { recursive: true });
      fs.renameSync(origem, destino);
    }
  } catch (e) {
    try {
      desfazer(arq, entradas);
    } catch (e2) {
      e.message += ` Falhou ao desfazer (${e2.message}); a proxima execucao desfaz pelo diario ${rel(arq.diario)}.`;
    }
    throw e;
  }
  fs.rmSync(arq.diario);
  fs.rmSync(arq.transacao, { recursive: true, force: true });
}

/** Volta cada destino ao estado anterior (copia) ou remove o que foi criado. */
function desfazer(arq, entradas) {
  const dentro = (r) => {
    const a = path.resolve(arq.raiz, r);
    const volta = path.relative(arq.raiz, a);
    if (!volta || volta.startsWith("..") || path.isAbsolute(volta)) throw new Error(`Diario com caminho fora do projeto: ${r}`);
    return a;
  };
  const erros = [];
  for (const { destino, copia } of [...entradas].reverse()) {
    try {
      if (!copia) fs.rmSync(dentro(destino), { force: true });
      else if (fs.existsSync(dentro(copia))) fs.renameSync(dentro(copia), dentro(destino));
    } catch (e) {
      erros.push(`${destino}: ${e.message}`);
    }
  }
  if (erros.length) throw new Error(erros.join("; "));
  fs.rmSync(arq.diario, { force: true });
  fs.rmSync(arq.transacao, { recursive: true, force: true });
}

/** Diario de uma gravacao interrompida: desfaz antes de ler ou gravar qualquer coisa. */
export function recuperarTransacao(arq, log = () => {}) {
  if (!fs.existsSync(arq.diario)) {
    fs.rmSync(arq.transacao, { recursive: true, force: true });
    return false;
  }
  desfazer(arq, lerJson(arq.diario).entradas);
  log("Gravacao anterior interrompida: catalogo, manifesto, mapa e fotos voltaram ao estado anterior.");
  return true;
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

/** Formatos de data aceitos no filtro de inclusao: o da especificacao e, se o Bling recusar (400), so a data. */
const FORMATOS_DATA_INCLUSAO = {
  "AAAA-MM-DD HH:MM:SS": (dia) => [`${dia} 00:00:00`, `${dia} 23:59:59`],
  "AAAA-MM-DD": (dia) => [dia, dia],
};

/**
 * Data de inclusao exata dos ativos incluidos nos ultimos DIAS_NOVIDADE dias:
 * uma listagem por dia (hoje ate hoje - DIAS_NOVIDADE, fuso da loja), com
 * dataInclusaoInicial e dataInclusaoFinal cobrindo so aquele dia. O dia da
 * janela em que o produto aparece e a data de inclusao. Variacao conta para o
 * pai (a inclusao mais recente). Janela com mais da metade dos ativos = filtro
 * ignorado pelo Bling: para e ninguem recebe data.
 */
async function listarIncluidos(get, hoje, ativos, log) {
  let formato = "AAAA-MM-DD HH:MM:SS";
  const porId = new Map();
  let listados = 0;
  for (let i = 0; i <= DIAS_NOVIDADE; i++) {
    const dia = somarDias(hoje, -i);
    const pedir = () => {
      const [dataInclusaoInicial, dataInclusaoFinal] = FORMATOS_DATA_INCLUSAO[formato](dia);
      return paginar(get, "/produtos", { criterio: 2, dataInclusaoInicial, dataInclusaoFinal });
    };
    let lista;
    try {
      lista = await pedir();
    } catch (e) {
      // Uma unica troca de formato, e so na primeira janela.
      if (i > 0 || !/\(400\)/.test(e.message)) throw e;
      formato = "AAAA-MM-DD";
      log(`Bling recusou a data com hora (400); tentando ${formato}.`);
      lista = await pedir();
    }
    listados += lista.length;
    if (ativos > 0 && lista.length > ativos / 2) {
      return { porId: new Map(), listados, janelas: i + 1, formato, filtroIgnorado: dia };
    }
    for (const p of lista) {
      if (!idValido(p?.id)) throw new Error(`Produto com id invalido na lista de inclusao recente: ${JSON.stringify(p?.id)}. Abortado, nada foi gravado.`);
      const id = idValido(p.idProdutoPai) ? p.idProdutoPai : p.id;
      if (!porId.has(id)) porId.set(id, dia);
    }
  }
  return { porId, listados, janelas: DIAS_NOVIDADE + 1, formato, filtroIgnorado: null };
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
 * http). Sem midia no detalhe, o `imagemURL` http(s) entra com origem
 * "desconhecida" e e baixado; se nao for http(s), `invalida` guarda o valor
 * para o diagnostico.
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
  if (imagens.length) return { imagens, invalida: null };
  const reserva = [d?.imagemURL, imagemURLReserva].find(temTexto)?.trim();
  if (!reserva) return { imagens, invalida: null };
  if (!urlHttp(reserva)) return { imagens, invalida: reserva };
  return { imagens: [{ tipo: "desconhecida", baixar: true, link: reserva, chave: `url:${semQuery(reserva)}` }], invalida: null };
}

/** So para a previa: o nome final sai do Content-Type validado no download. */
function extensaoDaUrl(url) {
  const m = /\.(jpe?g|png|webp|gif|avif)$/i.exec(semQuery(url));
  return m ? m[1].toLowerCase().replace("jpeg", "jpg") : null;
}

/**
 * AVIF = contêiner ISO-BMFF: caixas encadeadas que cobrem o arquivo inteiro,
 * a primeira `ftyp` com marca `avif` ou `avis` (principal ou compativel), e
 * uma caixa `meta` (imagem) ou `moov` (sequencia).
 */
function avifValido(b) {
  let pos = 0;
  let marcas = null;
  let conteudo = false;
  while (pos + 8 <= b.length) {
    let tam = b.readUInt32BE(pos);
    const tipo = b.toString("latin1", pos + 4, pos + 8);
    let cab = 8;
    if (tam === 1) {
      if (pos + 16 > b.length) return false;
      tam = Number(b.readBigUInt64BE(pos + 8));
      cab = 16;
    } else if (tam === 0) {
      tam = b.length - pos;
    }
    if (tam < cab || pos + tam > b.length) return false;
    if (pos === 0) {
      if (tipo !== "ftyp" || tam < 16 || (tam - cab) % 4) return false;
      marcas = [b.toString("latin1", 8, 12)];
      for (let i = 16; i + 4 <= tam; i += 4) marcas.push(b.toString("latin1", i, i + 4));
    }
    if (tipo === "meta" || tipo === "moov") conteudo = true;
    pos += tam;
  }
  return pos === b.length && conteudo && !!marcas?.some((m) => m === "avif" || m === "avis");
}

/** Extensao pelo Content-Type aceito, conferida pela assinatura/contêiner dos bytes. */
function extensaoValidada(dados, tipo) {
  const mime = String(tipo ?? "").split(";")[0].trim().toLowerCase();
  const ext = EXT_TIPO[mime];
  if (!ext) return { erro: `tipo "${mime || "vazio"}" nao e imagem aceita (jpeg, png, webp, gif, avif)` };
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
/* Catalogo, trava e gravacao (compartilhados com --da-previa)        */
/* ------------------------------------------------------------------ */

/** Fotos a baixar sao objetos ate o fim; no catalogo viram o caminho local. */
const finalizar = (lista) =>
  lista.map((p) => ({ ...p, fotos: p.fotos.map((f) => (typeof f === "string" ? f : `/produtos/${f.arquivo}`)) }));

function montarCatalogo(arvore, lista, hoje) {
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

/** Trava do --aplicar (sem --forcar): queda > 30%, host externo fora do next.config, imagemURL invalida. */
function avaliarTrava({ aplicar, forcar, totalAtual, publicados, hostsFora, urlsInvalidas }) {
  const queda = totalAtual ? (totalAtual - publicados) / totalAtual : 0;
  let recusa = null;
  if (aplicar && !forcar) {
    if (queda > QUEDA_MAXIMA) {
      recusa =
        `O site cairia de ${totalAtual} para ${publicados} produtos (queda de ${pct(queda)}, limite ${pct(QUEDA_MAXIMA)}). ` +
        "Nada foi gravado. Esta primeira sincronizacao pode passar de 30% ao retirar produtos antigos sem imagem. " +
        "Revise os motivos em SAIRAM no relatorio antes de usar --forcar. Se estiver certo, rode de novo com --aplicar --forcar.";
    } else if (hostsFora.length) {
      recusa =
        `Fotos externas https fora de images.remotePatterns do next.config.ts (protocolo, host e caminho): ${hostsFora.join(", ")}. ` +
        "Adicione o padrao em remotePatterns ou rode com --forcar. Nada foi gravado.";
    } else if (urlsInvalidas.length) {
      const exemplos = urlsInvalidas.slice(0, 10).map((u) => `${u.id} (${JSON.stringify(u.url.slice(0, 60))})`);
      recusa =
        `imagemURL invalida (nao e http/https) em ${urlsInvalidas.length} produto(s) sem midia no Bling: ${exemplos.join(", ")}` +
        `${urlsInvalidas.length > 10 ? ", ..." : ""}. Corrija no Bling ou rode com --forcar (eles saem como sem imagem). Nada foi gravado.`;
    }
  }
  return { queda, recusa };
}

/**
 * Baixa as fotos que faltam para uma pasta de preparo, tira do catalogo o
 * produto que ficou sem foto valida, reavalia a trava e, se nada recusar,
 * publica fotos + catalogo + manifesto + mapa numa unica transacao. Fotos
 * orfas so saem depois do commit. Com `abortarEmFalha` (--da-previa), qualquer
 * falha de download ou validacao aborta antes da promocao, sem gravar nada.
 */
async function baixarEGravar({ arq, produtos, fotosBaixar, manifesto, baixarImagem, reavaliar, montar, mapa, aoRemover, abortarEmFalha = false }) {
  const fotos = { baixadas: 0, reaproveitadas: 0, removidas: 0 };
  const avisosFotos = []; // { produtoId, ordem, motivo }
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
      let baixada, motivo;
      try {
        baixada = await baixarImagem(f.link);
      } catch (e) {
        if (!e?.imagemRecusada && !abortarEmFalha) throw e;
        motivo = e?.message ?? String(e);
      }
      const v = motivo ? {} : extensaoValidada(baixada?.dados, baixada?.tipo);
      motivo ??= v.erro;
      if (motivo) {
        if (abortarEmFalha) {
          throw new Error(`Uma foto da previa falhou (${f.produtoId}: ${semTravessao(motivo)}). Nada foi gravado. Rode a simulacao de novo.`);
        }
        avisosFotos.push({ produtoId: f.produtoId, ordem: f.ordem, motivo });
        invalidas.add(f);
        continue;
      }
      f.arquivo = `${f.produtoId}-${f.ordem}.${v.ext}`;
      gravarDuravel(caminhoFoto(preparo, f.arquivo), baixada.dados);
      fotos.baixadas++;
    }

    if (invalidas.size) {
      produtos = produtos
        .map((p) => ({ ...p, fotos: p.fotos.filter((f) => !invalidas.has(f)) }))
        .filter((p) => {
          if (p.fotos.length) return true;
          aoRemover(p);
          return false;
        });
    }
    const dif = reavaliar(produtos);
    if (dif.recusa) return { produtos, dif, fotos, avisosFotos, gravou: false, avisosLimpeza: [] };

    const validas = fotosBaixar.filter((f) => !invalidas.has(f));
    const itens = validas
      .filter((f) => !f.reaproveitada)
      .map((f) => ({ origem: caminhoFoto(preparo, f.arquivo), destino: caminhoFoto(arq.pastaFotos, f.arquivo) }));
    const jsons = [
      [arq.catalogo, montar(produtos), 0],
      [arq.manifestoFotos, Object.fromEntries(validas.map((f) => [`${f.produtoId}-${f.ordem}`, { chave: f.chave, arquivo: f.arquivo }])), 1],
      ...(mapa ? [[arq.mapa, mapa, 1]] : []),
    ];
    for (const [destino, dados, espacos] of jsons) {
      const origem = path.join(preparo, "json", path.basename(destino));
      gravarDuravel(origem, textoJson(dados, espacos));
      itens.push({ origem, destino });
    }
    promover(arq, itens);

    // Depois do commit: falha na limpeza nao desfaz a publicacao, vira aviso.
    const avisosLimpeza = [];
    try {
      fs.rmSync(arq.mapaProposto, { force: true });
      const emUso = new Set(validas.map((f) => f.arquivo));
      for (const nome of fs.existsSync(arq.pastaFotos) ? fs.readdirSync(arq.pastaFotos) : []) {
        if (ARQUIVO_FOTO.test(nome) && !emUso.has(nome)) {
          fs.unlinkSync(caminhoFoto(arq.pastaFotos, nome));
          fotos.removidas++;
        }
      }
    } catch (e) {
      avisosLimpeza.push(`limpeza de fotos antigas incompleta: ${e.message}`);
    }
    return { produtos, dif, fotos, avisosFotos, gravou: true, avisosLimpeza };
  } finally {
    fs.rmSync(preparo, { recursive: true, force: true });
  }
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
 * @param {boolean} [o.daPrevia]  com aplicar: aplica saida/previa.json da ultima simulacao, sem ler o Bling
 */
export async function sincronizar({
  blingGet,
  baixarImagem,
  raiz,
  aplicar = false,
  forcar = false,
  daPrevia = false,
  deposito = DEPOSITO_ESTOQUE,
  hoje = dataNaLoja(),
  agora = Date.now,
  log = () => {},
}) {
  const arq = caminhos(raiz);
  if (daPrevia && !aplicar) throw new Error("--da-previa so funciona junto com --aplicar.");
  recuperarTransacao(arq, log);
  if (daPrevia) return aplicarDaPrevia({ arq, baixarImagem, forcar, agora, log });

  const inicio = Date.now();
  const chamadas = new Map();
  const get = (caminho, params = {}) => {
    const rota = caminho.replace(/\/\d+(?=\/|$)/g, "/{id}");
    chamadas.set(rota, (chamadas.get(rota) ?? 0) + 1);
    return blingGet(caminho, params);
  };

  // Arquivos locais primeiro: erro aqui aborta antes de gastar chamada no Bling.
  const base = impressao(arq);
  const atual = lerJson(arq.catalogo);
  const arvore = lerJson(arq.categoriasSite);
  const mapaArquivo = lerJsonOpcional(arq.mapa, {});
  const manifesto = lerManifesto(arq);
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

  const desdeNovidade = somarDias(hoje, -DIAS_NOVIDADE);
  log(`Lendo produtos incluidos desde ${desdeNovidade}, dia a dia...`);
  const incluidos = await listarIncluidos(get, hoje, topo.filter((p) => p.situacao === "A").length, log);

  // Com deposito definido, o saldo da lista (soma de todos) nao serve.
  const saldoDaLista = (p) => (deposito == null ? numero(p?.estoque?.saldoVirtualTotal) : null);
  const saldos = new Map();
  for (const p of simples) {
    const s = saldoDaLista(p);
    if (s != null) saldos.set(p.id, s);
  }
  log("Conferindo estoque...");
  await completarSaldos(get, simples.map((p) => p.id).filter((id) => !saldos.has(id)), saldos, deposito);

  // Detalhe (marca, gtin, categoria, midia, descricoes) so de quem ainda pode entrar.
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
    const { imagens, invalida } = imagensDe(d, p.imagemURL);
    if (!imagens.length) return { p, d, motivo: invalida ? URL_INVALIDA : SEM_IMAGEM, urlInvalida: invalida, estoque };
    return { p, d, motivo: null, estoque, imagens, preco: p.preco ?? d.preco };
  });

  function avaliarPai(pai) {
    const d = detalhes.get(pai.id);
    const fotosPai = imagensDe(d, pai.imagemURL);
    const vs = d.variacoes ?? [];
    const elegiveis = [];
    let algumaComEstoque = false;
    let invalida = fotosPai.invalida;
    for (const v of vs) {
      if (v.situacao !== "A" || (v.tipo ?? "P") !== "P") continue;
      const estoque = saldos.get(v.id) ?? 0;
      if (!(estoque > 0)) continue;
      algumaComEstoque = true;
      // A variacao herda a foto do pai: no Bling ela costuma ficar so no pai.
      const fotosVar = imagensDe(v, linhasVariacao.get(v.id)?.imagemURL);
      invalida ||= fotosVar.invalida;
      if (!fotosVar.imagens.length && !fotosPai.imagens.length) continue;
      elegiveis.push({ v, estoque, imagens: fotosVar.imagens });
    }
    const variacoes = { total: vs.length, elegiveis: elegiveis.length };
    if (!elegiveis.length) {
      const motivo = !algumaComEstoque ? "sem estoque" : invalida ? URL_INVALIDA : SEM_IMAGEM;
      return { p: pai, d, motivo, urlInvalida: motivo === URL_INVALIDA ? invalida : null, variacoes };
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
  const urlsInvalidas = avaliados.filter((a) => a.motivo === URL_INVALIDA).map((a) => ({ id: a.p.id, url: a.urlInvalida }));

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

  /* 4. Casamento com o site atual (preserva slug, descricao e marca) - */
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
  const origens = new Map(); // id -> { descricao, marca, imagemDesconhecida, semDataInclusao }
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

    // Descricao: curta > complementar > a que o site ja tem > null (texto automatico do site).
    const curta = limparHtml(d.descricaoCurta ?? p.descricaoCurta);
    const complementar = curta ? null : limparHtml(d.descricaoComplementar);
    const doSite = temTexto(c?.site.descricao) ? c.site.descricao : null;
    const [descricao, origemDescricao] = curta
      ? [curta, "curta"]
      : complementar
        ? [complementar, "complementar"]
        : doSite
          ? [doSite, "site"]
          : [null, "nenhuma"];
    // Marca: a do Bling; sem ela, a que o site ja tem.
    const marcaBling = normalizarMarca(d.marca);
    const [marca, origemMarca] = marcaBling ? [marcaBling, "bling"] : temTexto(c?.site.marca) ? [c.site.marca, "site"] : [null, "nenhuma"];
    // Novidade: so com data de inclusao descoberta; novidadeAte = inclusao + DIAS_NOVIDADE.
    const inclusao = incluidos.porId.get(p.id);
    const novidadeAte = inclusao ? somarDias(inclusao, DIAS_NOVIDADE) : null;
    origens.set(p.id, {
      descricao: origemDescricao,
      marca: origemMarca,
      imagemDesconhecida: a.imagens.some((img) => img.tipo === "desconhecida"),
      inclusao,
    });

    return {
      id: p.id,
      nome: capitalizar(p.nome),
      slug,
      marca,
      preco: centavos(a.preco),
      categoriaId: destino(a).id,
      fotos,
      descricao,
      codigo: p.codigo?.trim() || null,
      ean: gtinValido(d.gtin),
      ...(novidadeAte ? { novidadeAte } : {}),
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

  /* 6. Diferencas com o site atual --------------------------------- */
  const casadoPorSite = new Map([...casamento].map(([idBling, c]) => [c.site.id, { idBling, ...c }]));
  const totalAtual = atual.produtos.length;
  const hostsFora = [...hostsExternos].filter(([, h]) => h.fora > 0).map(([host]) => host);

  // Recalculado se o download tirar produtos do catalogo.
  function diferencas(lista) {
    const entraram = lista.filter((p) => !casamento.has(p.id));
    const sairam = atual.produtos
      .map((s) => {
        const c = casadoPorSite.get(s.id);
        const a = c && avaliadoPorId.get(c.idBling);
        if (a && !a.motivo) return null;
        return { nome: s.nome, codigo: s.codigo, motivo: a ? a.motivo : "nao existe mais" };
      })
      .filter(Boolean);
    const precoMudou = lista
      .map((p) => ({ p, antes: casamento.get(p.id)?.site.preco ?? null }))
      .filter(({ p, antes }) => casamento.has(p.id) && antes !== p.preco)
      .map(({ p, antes }) => ({ nome: p.nome, codigo: p.codigo, antes, depois: p.preco, dif: Math.abs((p.preco ?? 0) - (antes ?? 0)) }))
      .sort((a, b) => b.dif - a.dif);
    const porCriterio = { codigo: 0, gtin: 0, nome: 0 };
    for (const p of lista) {
      const c = casamento.get(p.id);
      if (c) porCriterio[c.criterio]++;
    }
    const trava = avaliarTrava({ aplicar, forcar, totalAtual, publicados: lista.length, hostsFora, urlsInvalidas });
    return { entraram, sairam, precoMudou, porCriterio, ...trava };
  }
  let dif = diferencas(produtos);

  /* 7. Gravacao (so depois de TODA a leitura dar certo) ------------- */
  let fotos = { baixadas: 0, reaproveitadas: 0, removidas: 0 };
  let avisosFotos = [];
  let avisosLimpeza = [];
  const novasIds = Object.keys(novasEntradasMapa);
  const mapaCompleto = () => ({ ...mapaArquivo, ...novasEntradasMapa });
  let gravou = false;

  if (aplicar && !dif.recusa) {
    const r = await baixarEGravar({
      arq,
      produtos,
      fotosBaixar,
      manifesto,
      baixarImagem,
      reavaliar: diferencas,
      montar: (lista) => montarCatalogo(arvore, finalizar(lista), hoje),
      mapa: novasIds.length ? mapaCompleto() : null,
      aoRemover: (p) => {
        avaliadoPorId.get(p.id).motivo = FOTO_INVALIDA;
      },
    });
    ({ produtos, dif, fotos, avisosFotos, gravou, avisosLimpeza } = r);
  }
  const catalogoFinal = montarCatalogo(arvore, finalizar(produtos), hoje);
  const { entraram, sairam, precoMudou, porCriterio, queda, recusa } = dif;

  // Sem gravacao (simulacao ou recusa), o mapa real nao muda: a proposta fica em saida/.
  if (!gravou && novasIds.length) gravarJson(arq.mapaProposto, mapaCompleto(), 1);

  const modo = !aplicar ? "simulacao" : recusa ? "recusada" : "aplicada";
  const idsPublicados = new Set(produtos.map((p) => p.id));
  const contar = (campo) => {
    const n = {};
    for (const p of produtos) {
      const v = origens.get(p.id)[campo];
      n[v] = (n[v] ?? 0) + 1;
    }
    return n;
  };
  const relatorio = montarRelatorio({
    modo,
    hoje,
    deposito,
    recusa,
    forcar,
    alertasPreco: precoMudou.filter(alertaDePreco),
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
    novidades: {
      desde: desdeNovidade,
      listados: incluidos.listados,
      janelas: incluidos.janelas,
      formato: incluidos.formato,
      filtroIgnorado: incluidos.filtroIgnorado,
      publicados: produtos.filter((p) => p.novidadeAte).length,
      porDia: produtos
        .filter((p) => p.novidadeAte)
        .reduce((t, p) => ((t[origens.get(p.id).inclusao] = (t[origens.get(p.id).inclusao] ?? 0) + 1), t), {}),
    },
    origemDescricao: contar("descricao"),
    origemMarca: contar("marca"),
    imagemDesconhecida: produtos.filter((p) => origens.get(p.id).imagemDesconhecida).length,
    urlsInvalidas,
    porCriterio,
    usoFotos,
    externasHttp,
    fotosBaixar: fotosBaixar.length,
    fotos,
    avisosFotos,
    avisosLimpeza,
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

  // A previa leva, em `aplicacao`, o que --aplicar --da-previa precisa para
  // aplicar sem reler o Bling (inclusive os links das fotos a baixar).
  const aplicacao = {
    modo,
    geradoEmIso: new Date(agora()).toISOString(),
    hoje,
    base,
    fotos: fotosBaixar.map(({ produtoId, ordem, link, chave, arquivo, origem }) => ({ produtoId, ordem, link, chave, arquivo, origem })),
    novasEntradasMapa,
    hostsFora,
    urlsInvalidas,
    entraram: entraram.map(({ nome, codigo }) => ({ nome, codigo })),
    sairam,
    porCriterio,
    usoFotos,
    relatorio,
  };
  gravarJson(arq.previa, { ...catalogoFinal, aplicacao }, 1);
  fs.writeFileSync(arq.relatorio, relatorio);

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
/* --aplicar --da-previa                                              */
/* ------------------------------------------------------------------ */

/**
 * Aplica exatamente o saida/previa.json da ultima simulacao, sem ler o Bling:
 * baixa as fotos listadas nela e grava pela mesma transacao. Recusa previa de
 * 24 h ou mais, ou se catalogo/manifesto/mapa mudaram desde a simulacao. Link
 * que nao baixa (403, expirado...) ou foto recusada (teto, MIME) aborta
 * pedindo nova simulacao, sem tirar produto da previa.
 */
async function aplicarDaPrevia({ arq, baixarImagem, forcar, agora, log }) {
  if (!fs.existsSync(arq.previa)) throw new Error(`Nao ha scripts/bling/saida/previa.json: ${RODE_DE_NOVO}.`);
  const { aplicacao: ap, ...catalogoPrevia } = lerJson(arq.previa);
  if (ap?.modo !== "simulacao") throw new Error(`A previa atual nao veio de uma simulacao: ${RODE_DE_NOVO}.`);
  const idade = agora() - Date.parse(ap.geradoEmIso);
  if (!(idade >= 0 && idade < VALIDADE_PREVIA_MS)) {
    const horas = Number.isFinite(idade) ? `${(idade / 3_600_000).toFixed(1).replace(".", ",")} h` : "data invalida";
    throw new Error(`A previa tem ${horas} (limite 24 h): ${RODE_DE_NOVO}.`);
  }
  if (ap.base !== impressao(arq)) {
    throw new Error(`O catalogo, o manifesto de fotos ou o mapa mudaram depois da simulacao: ${RODE_DE_NOVO}.`);
  }

  const arvore = lerJson(arq.categoriasSite);
  const manifesto = lerManifesto(arq);
  const mapaArquivo = lerJsonOpcional(arq.mapa, {});
  const totalAtual = lerJson(arq.catalogo).produtos.length;

  const itemPor = new Map();
  for (const f of ap.fotos) {
    if (!idValido(f?.produtoId) || !Number.isSafeInteger(f.ordem) || !urlHttp(f.link)) {
      throw new Error(`Foto invalida na previa: ${JSON.stringify(f).slice(0, 120)}. Abortado, nada foi gravado.`);
    }
    caminhoFoto(arq.pastaFotos, f.arquivo);
    const { produtoId, ordem, link, chave, arquivo, origem } = f;
    itemPor.set(`${produtoId}-${ordem}`, { produtoId, ordem, link, chave, arquivo, origem });
  }
  const produtos = catalogoPrevia.produtos.map((p) => ({
    ...p,
    fotos: p.fotos.map((f, i) => {
      if (!f.startsWith("/produtos/")) return f;
      const item = itemPor.get(`${p.id}-${i + 1}`);
      if (!item || `/produtos/${item.arquivo}` !== f) throw new Error(`Previa inconsistente (foto ${f} do produto ${p.id} sem link): ${RODE_DE_NOVO}.`);
      return item;
    }),
  }));

  const reavaliar = (lista) =>
    avaliarTrava({ aplicar: true, forcar, totalAtual, publicados: lista.length, hostsFora: ap.hostsFora, urlsInvalidas: ap.urlsInvalidas });
  const removidos = [];
  let r = { produtos, dif: reavaliar(produtos), fotos: { baixadas: 0, reaproveitadas: 0, removidas: 0 }, avisosFotos: [], avisosLimpeza: [] };
  if (!r.dif.recusa) {
    log(`Aplicando a previa de ${ap.geradoEmIso}, sem ler o Bling...`);
    r = await baixarEGravar({
      arq,
      produtos,
      fotosBaixar: [...itemPor.values()],
      manifesto,
      baixarImagem,
      abortarEmFalha: true,
      reavaliar,
      montar: (lista) => montarCatalogo(arvore, finalizar(lista), catalogoPrevia.geradoEm),
      mapa: Object.keys(ap.novasEntradasMapa).length ? { ...mapaArquivo, ...ap.novasEntradasMapa } : null,
      aoRemover: (p) => removidos.push({ nome: p.nome, codigo: p.codigo, motivo: FOTO_INVALIDA }),
    });
  }

  const modo = r.dif.recusa ? "recusada" : "aplicada";
  const catalogo = montarCatalogo(arvore, finalizar(r.produtos), catalogoPrevia.geradoEm);
  const relatorio = [
    `# Sincronizacao Bling: ${modo === "aplicada" ? "APLICADA DA PREVIA" : "RECUSADA (da previa)"} (sem nova leitura do Bling)`,
    "",
    `Previa da simulacao de ${ap.geradoEmIso} (data ${ap.hoje}). Publicados: ${r.produtos.length} (site atual: ${totalAtual}).`,
    ...(r.dif.recusa ? ["", `**Recusado:** ${r.dif.recusa}`] : []),
    ...(modo === "aplicada"
      ? ["", `Fotos: baixadas ${r.fotos.baixadas}; reaproveitadas ${r.fotos.reaproveitadas}; arquivos antigos removidos ${r.fotos.removidas}.`]
      : []),
    ...r.avisosFotos.map((a) => `- AVISO: produto ${a.produtoId}, foto ${a.ordem}: ${semTravessao(a.motivo)}`),
    ...removidos.map((p) => `- SAIU no download: ${item(p).slice(2)}: ${p.motivo}`),
    ...r.avisosLimpeza.map((a) => `- AVISO: ${semTravessao(a)}`),
    "",
    "---",
    "",
    "Relatorio da simulacao aplicada:",
    "",
    ap.relatorio,
  ].join("\n");
  fs.mkdirSync(arq.saida, { recursive: true });
  fs.writeFileSync(arq.relatorio, relatorio);

  return {
    modo,
    recusa: r.dif.recusa,
    catalogo,
    relatorio,
    entraram: ap.entraram,
    sairam: [...ap.sairam, ...removidos],
    porCriterio: ap.porCriterio,
    usoFotos: ap.usoFotos,
    fotos: r.fotos,
    avisosFotos: r.avisosFotos,
    chamadas: new Map(),
    semMapa: [],
  };
}

/* ------------------------------------------------------------------ */
/* Relatorio (PT-BR, sem travessao)                                   */
/* ------------------------------------------------------------------ */

const pct = (x) => `${(x * 100).toFixed(1).replace(".", ",")}%`;
const reais = (c) => (c == null ? "sem preco" : `R$ ${(c / 100).toFixed(2).replace(".", ",")}`);
const semTravessao = (s) => String(s ?? "").replace(/[–—]/g, "-");
const item = (p) => `- ${semTravessao(p.nome)} (codigo ${p.codigo || "sem codigo"})`;
const alertaDePreco = ({ antes, depois }) =>
  antes > 0 && depois > 0 && (depois > antes * FATOR_ALERTA_PRECO || depois * FATOR_ALERTA_PRECO < antes);

function montarRelatorio(r) {
  const f = r.funil;
  const n = r.novidades;
  const titulo = { simulacao: "SIMULACAO (nada foi gravado no site)", aplicada: "APLICADA", recusada: "RECUSADA" }[r.modo];
  const linhas = [
    `# Sincronizacao Bling: ${titulo}`,
    "",
    `Data: ${r.hoje}. Estoque: ${r.deposito == null ? "soma de todos os depositos" : `somente deposito ${r.deposito}`}.`,
  ];
  if (r.recusa) linhas.push("", `**Recusado:** ${r.recusa}`);
  if (r.modo === "aplicada" && r.forcar) linhas.push("", "Aplicado com --forcar.");
  if (r.alertasPreco.length) {
    linhas.push(
      "",
      `## ALERTA DE PRECO (${r.alertasPreco.length})`,
      "",
      `Preco novo acima de ${FATOR_ALERTA_PRECO}x ou abaixo de 1/${FATOR_ALERTA_PRECO} do preco atual do site. Nao bloqueia: confira no Bling.`,
      "",
      ...r.alertasPreco.map((x) => `${item(x)}: ${reais(x.antes)} para ${reais(x.depois)}`),
    );
  }

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
    "## Novidades",
    "",
    `- Regra: incluidos no Bling nos ultimos ${DIAS_NOVIDADE} dias (desde ${n.desde}). Ficam em /novidades ate a data novidadeAte e continuam na categoria.`,
    `- Data de inclusao: ${n.janelas} listagem(ns) diaria(s) com dataInclusaoInicial/dataInclusaoFinal; formato aceito pelo Bling: ${n.formato}.`,
    `- Incluidos (listagens do Bling): ${n.listados}`,
    ...(n.filtroIgnorado
      ? [
          `- ATENCAO: filtro de data de inclusao ignorado pelo Bling; Novidades mantida pelo criterio antigo (a janela de ${n.filtroIgnorado} trouxe mais da metade dos ativos).`,
        ]
      : []),
    `- Entraram em Novidades: ${n.publicados}`,
    ...Object.keys(n.porDia)
      .sort()
      .reverse()
      .map((dia) => `  - incluidos em ${dia} (novidade ate ${somarDias(dia, DIAS_NOVIDADE)}): ${n.porDia[dia]}`),
    "",
    "## Descricao e marca",
    "",
    `- Descricao curta do Bling: ${r.origemDescricao.curta ?? 0}`,
    `- Descricao complementar do Bling: ${r.origemDescricao.complementar ?? 0}`,
    `- Descricao mantida do site: ${r.origemDescricao.site ?? 0}`,
    `- Sem descricao (o site usa o texto automatico): ${r.origemDescricao.nenhuma ?? 0}`,
    `- Marca do Bling: ${r.origemMarca.bling ?? 0}`,
    `- Marca mantida do site: ${r.origemMarca.site ?? 0}`,
    `- Sem marca: ${r.origemMarca.nenhuma ?? 0}`,
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
    `- Produtos so com imagem baixada para public/produtos (interna do Bling, externa http ou imagemURL): ${r.usoFotos.interna}`,
    `- Produtos com as duas: ${r.usoFotos.mista}`,
    `- Produtos com foto so pelo imagemURL (origem desconhecida, baixada e validada): ${r.imagemDesconhecida}`,
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
    ...r.avisosLimpeza.map((a) => `- AVISO: ${semTravessao(a)}`),
    ...(r.urlsInvalidas.length
      ? [
          "",
          `### imagemURL invalida (${r.urlsInvalidas.length})`,
          "",
          "Sem midia no Bling e com imagemURL que nao e http/https. Recusa o --aplicar (sem --forcar).",
          "",
          ...r.urlsInvalidas.map((u) => `- produto ${u.id}: ${semTravessao(JSON.stringify(u.url))}`),
        ]
      : []),
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
