/**
 * Processa o dump bruto da API no catálogo que o site consome.
 *
 * Regras:
 * - Só produtos ativos entram.
 * - Cada produto é ancorado na primeira categoria que a API devolve (a principal).
 * - Categorias sem produto ativo são descartadas; supercategorias que ficam
 *   vazias somem junto.
 * - Fotos ficam como URL S3 (servidas via next/image, não baixadas).
 */
import fs from 'node:fs';

const SP = process.cwd();
const supersRaw = JSON.parse(fs.readFileSync(`${SP}/cat-super.json`, 'utf8'));
const todasRaw = JSON.parse(fs.readFileSync(`${SP}/cat-todas.json`, 'utf8'));
const produtosRaw = JSON.parse(fs.readFileSync(`${SP}/produtos-todos.json`, 'utf8'));

// As fotos vivem todas no mesmo bucket S3; guardar só o caminho corta ~40 chars
// por foto e deixa o índice do cliente bem mais leve.
const PREFIXO_FOTO = 'https://catalogo-mobile.s3.sa-east-1.amazonaws.com/';
const encurtarFoto = (url) =>
  typeof url === 'string' && url.startsWith(PREFIXO_FOTO) ? url.slice(PREFIXO_FOTO.length) : url;

const slugify = (s) =>
  String(s)
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/&/g, ' e ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

// Renomeações: o ERP tem rótulos genéricos que ficam feios na vitrine, mas os
// produtos dentro deles são reais e precisam aparecer. Renomear, não ocultar.
const RENOMEAR = {
  'SuperCategoria Padrão': 'Outros Importados',
  'Padrão': 'Variados',
  'Geral': 'Variados',
  'DIVERSOS': 'Diversos',
};
const nomeCategoria = (n) => RENOMEAR[n] ?? n;

// Normaliza marca: tira espaço sobrando e unifica grafias da mesma marca.
const MARCA_CANON = {
  'bath and body works': 'Bath & Body Works',
  'bath & body works': 'Bath & Body Works',
  'bbw': 'Bath & Body Works',
  'e.l.f.': 'e.l.f.',
  'elf': 'e.l.f.',
  'kiko milano': 'Kiko Milano',
  'skin1004': 'SKIN1004',
  'tirtir': 'TIRTIR',
};
function normalizarMarca(bruta) {
  if (!bruta) return null;
  const limpa = String(bruta).replace(/\s+/g, ' ').trim();
  if (!limpa) return null;
  const canon = MARCA_CANON[limpa.toLowerCase()];
  if (canon) return canon;
  return capitalizar(limpa);
}

const capitalizar = (nome) => {
  const minusc = new Set(['de', 'da', 'do', 'das', 'dos', 'e', 'para', 'com', 'em', 'a', 'o']);
  return String(nome)
    .toLowerCase()
    .split(/\s+/)
    .map((p, i) => {
      if (/\d/.test(p)) return p;
      if (i > 0 && minusc.has(p)) return p;
      return p.charAt(0).toUpperCase() + p.slice(1);
    })
    .join(' ');
};

// As descrições da API vêm em HTML (parágrafos, negritos, listas). Guardar HTML
// de terceiro e injetar seria risco de XSS; então extraímos texto limpo.
function limparHtml(bruto) {
  if (!bruto) return null;
  const texto = String(bruto)
    .replace(/<\s*br\s*\/?\s*>/gi, "\n")
    .replace(/<\/\s*(p|div|li)\s*>/gi, "\n")
    // Remove tags completas e também as truncadas (sem `>` de fechamento).
    .replace(/<[^>]*>/g, "")
    .replace(/<[a-z/][^]*$/i, "")
    // Links de fornecedor que sobram como texto puro não interessam ao cliente.
    .replace(/https?:\/\/\S+/gi, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&[a-z]+;/gi, " ")
    // Segunda passada: pega tags que a remoção de URL deixou desmontadas
    // (ex.: `<a href=" title="...">` depois de tirar a URL).
    .replace(/<\/?[a-z][^>]*>?/gi, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{2,}/g, "\n")
    .replace(/^\s+|\s+$/g, "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .join("\n");
  return texto.length > 2 ? texto : null;
}

const preco = (bruto) => {
  if (!bruto) return null;
  const n = Number(String(bruto).replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) : null; // centavos
};

// --- produtos ativos ----------------------------------------------------
const ativos = produtosRaw.filter((p) => p.ativo);

// slug único por produto (nome pode repetir → sufixo do id)
const slugsUsados = new Map();
function slugProduto(p) {
  let base = slugify(p.nome) || 'produto';
  if (base.length > 60) base = base.slice(0, 60).replace(/-+$/, '');
  const chave = base;
  const n = slugsUsados.get(chave) ?? 0;
  slugsUsados.set(chave, n + 1);
  return n === 0 ? base : `${base}-${p.id}`;
}

// Conta produtos por categoria (para descartar as vazias).
const contagem = new Map();
for (const p of ativos) {
  const cat = p.categorias?.[0];
  if (cat) contagem.set(cat.id, (contagem.get(cat.id) ?? 0) + 1);
}

// --- categorias ---------------------------------------------------------
const porId = new Map(todasRaw.map((c) => [c.id, c]));
const supersId = new Set(supersRaw.map((s) => s.id));

const slugCat = new Map();
function slugCategoria(c) {
  let base = slugify(c.name);
  if (slugCat.has(base) && slugCat.get(base) !== c.id) base = `${base}-${c.id}`;
  slugCat.set(base, c.id);
  return base;
}

// Subcategorias órfãs: sem parent e não-master. Vão para "Outros Importados",
// senão os produtos presos nelas somem da vitrine.
const idsMaster = new Set(supersRaw.map((s) => s.id));
const idsConhecidos = new Set(todasRaw.map((c) => c.id));
const orfas = todasRaw.filter(
  (c) => !c.is_master_category && (!c.parent_id || !idsConhecidos.has(c.parent_id)) && !idsMaster.has(c.id),
);
const SUPER_OUTROS = 801247;

const categorias = [];
for (const s of supersRaw) {
  const filhasBrutas = todasRaw.filter((c) => c.parent_id === s.id);
  if (s.id === SUPER_OUTROS) filhasBrutas.push(...orfas);
  const filhas = filhasBrutas
    .map((c) => ({
      id: c.id,
      nome: capitalizar(nomeCategoria(c.name)),
      nomeErp: c.name,
      slug: slugCategoria(c),
      imagem: encurtarFoto(c.image) || null,
      superId: s.id,
      total: contagem.get(c.id) ?? 0,
    }))
    .filter((c) => c.total > 0)
    // Nomes iguais depois da renomeação ("Variados", "Diversos") são fundidos
    // pelo nome para não repetir subcategoria na mesma super.
    .reduce((acc, c) => {
      const existente = acc.find((x) => x.nome === c.nome);
      if (existente) {
        existente.total += c.total;
        existente.idsFundidos = [...(existente.idsFundidos ?? [existente.id]), c.id];
      } else acc.push(c);
      return acc;
    }, [])
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));

  if (filhas.length === 0) continue;

  categorias.push({
    id: s.id,
    nome: capitalizar(nomeCategoria(s.name)),
    nomeErp: s.name,
    slug: slugCategoria(s),
    imagem: encurtarFoto(s.image) || null,
    super: true,
    subcategorias: filhas,
    total: filhas.reduce((t, f) => t + f.total, 0),
  });
}

// mapa id-categoria → slug/super para vincular produtos
const infoCat = new Map();
for (const s of categorias) {
  for (const f of s.subcategorias) {
    const info = { id: f.id, slug: f.slug, nome: f.nome, superId: s.id, superSlug: s.slug, superNome: s.nome };
    for (const id of f.idsFundidos ?? [f.id]) infoCat.set(id, info);
  }
  // limpa o campo auxiliar antes de serializar
  for (const f of s.subcategorias) delete f.idsFundidos;
}

// --- produtos finais ----------------------------------------------------
const produtos = [];
for (const p of ativos) {
  const cat = p.categorias?.find((c) => infoCat.has(c.id));
  const info = cat ? infoCat.get(cat.id) : null;
  if (!info) continue; // produto sem categoria exibível → fora

  produtos.push({
    id: p.id,
    nome: capitalizar(p.nome),
    slug: slugProduto(p),
    marca: normalizarMarca(p.marca),
    preco: preco(p.preco),
    categoriaId: info.id,
    fotos: p.fotos.slice(0, 4).map(encurtarFoto),
    descricao: limparHtml(p.descricao),
    codigo: p.codigo || null,
    ean: p.ean || null,
  });
}

// marcas com contagem, só as relevantes
const marcaCont = new Map();
for (const p of produtos) if (p.marca) marcaCont.set(p.marca, (marcaCont.get(p.marca) ?? 0) + 1);
const marcas = [...marcaCont.entries()]
  .filter(([, n]) => n >= 3)
  .sort((a, b) => b[1] - a[1])
  .map(([m]) => m);

const saida = {
  geradoEm: '2026-08-04',
  categorias,
  produtos,
  marcas,
  totais: {
    produtos: produtos.length,
    comFoto: produtos.filter((p) => p.fotos.length).length,
    supercategorias: categorias.length,
    subcategorias: categorias.reduce((t, s) => t + s.subcategorias.length, 0),
    marcas: marcas.length,
  },
};

fs.writeFileSync(`${SP}/catalogo-final.json`, JSON.stringify(saida));
console.log(JSON.stringify(saida.totais, null, 1));
console.log('\nsupercategorias:');
for (const s of categorias) console.log(`  ${s.nome} — ${s.subcategorias.length} sub, ${s.total} produtos`);
console.log('\nmarcas top:', marcas.slice(0, 20).join(', '));
