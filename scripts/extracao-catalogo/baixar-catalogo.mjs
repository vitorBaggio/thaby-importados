/**
 * Extração do catálogo completo da Thaby via API autenticada (sessão pública).
 * Baixa a árvore de categorias e todos os produtos paginados.
 */
import fs from 'node:fs';

const BASE = 'https://thabyimportados.catalogomobile.com.br';
const TOKEN = fs.readFileSync('token.txt', 'utf8').trim();
const H = { Accept: 'application/json', Authorization: 'Bearer ' + TOKEN };

async function json(caminho) {
  const r = await fetch(BASE + caminho, { headers: H });
  if (!r.ok) throw new Error(`${r.status} em ${caminho}`);
  return r.json();
}

const arr = (x) => (Array.isArray(x) ? x : (x.data ?? x.categories ?? x.products ?? []));

// 1. Categorias -----------------------------------------------------------
const supers = arr(await json('/api/v1/categories?onlysuper=true'));
const todas = arr(await json('/api/v1/categories?company_id=7827'));
fs.writeFileSync('cat-super.json', JSON.stringify(supers, null, 1));
fs.writeFileSync('cat-todas.json', JSON.stringify(todas, null, 1));
console.log(`categorias: ${supers.length} super, ${todas.length} no total`);

// 2. Produtos (paginado) --------------------------------------------------
const LIMITE = 100;
const primeira = await json(`/api/v1/products?limit=${LIMITE}&page=1`);
const totalPaginas = Math.ceil((primeira.paginator?.total_count ?? 0) / LIMITE);
let produtos = arr(primeira);
console.log(`produtos: ${primeira.paginator?.total_count} itens em ${totalPaginas} páginas`);

for (let p = 2; p <= totalPaginas; p++) {
  let tentativa = 0;
  while (true) {
    try {
      const j = await json(`/api/v1/products?limit=${LIMITE}&page=${p}`);
      produtos.push(...arr(j));
      break;
    } catch (e) {
      if (++tentativa >= 4) { console.log(`  FALHA página ${p}: ${e.message}`); break; }
      await new Promise((r) => setTimeout(r, 800 * tentativa));
    }
  }
  if (p % 10 === 0 || p === totalPaginas) console.log(`  ${produtos.length} produtos…`);
}

// Enxuga o payload: só o que o site usa, para o arquivo não explodir.
const enxuto = produtos.map((p) => ({
  id: p.product_id,
  nome: p.name,
  codigo: p.code,
  ean: p.ean,
  marca: p.brand,
  preco: p.price,
  descricao: p.description,
  fornecedor: p.supplier_name,
  ativo: p.active,
  estoque: p.stock,
  fotos: [p.foto1, p.foto2, p.foto3, p.foto4].filter(Boolean),
  categorias: (p.categories ?? []).map((c) => ({ id: c.id, nome: c.name, parent_id: c.parent_id })),
  variacao: p.is_variation,
  variacaoPrincipal: p.is_main_variation,
  idVariacaoPrincipal: p.main_variation_id,
}));

fs.writeFileSync('produtos-todos.json', JSON.stringify(enxuto));
console.log(`\nSALVO: ${enxuto.length} produtos`);
console.log(`com foto: ${enxuto.filter((p) => p.fotos.length).length}`);
console.log(`ativos: ${enxuto.filter((p) => p.ativo).length}`);
