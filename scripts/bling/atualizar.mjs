/**
 * Atualiza o catalogo do site a partir do Bling (SOMENTE LEITURA).
 *
 *   node scripts/bling/atualizar.mjs              simulacao: grava so scripts/bling/saida/
 *   node scripts/bling/atualizar.mjs --aplicar    grava src/dados/catalogo-completo.json e baixa fotos internas
 *   node scripts/bling/atualizar.mjs --aplicar --forcar   ignora a trava de queda > 30%
 *   node scripts/bling/atualizar.mjs --aplicar --da-previa   aplica saida/previa.json da ultima
 *       simulacao (menos de 24 h) sem reler o Bling; so baixa as fotos listadas nela
 *
 * Regras e detalhes em sincronizacao.mjs. Relatorio em scripts/bling/saida/relatorio.md.
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { blingGet, baixarImagem } from "./cliente.mjs";
import { sincronizar } from "./sincronizacao.mjs";

const FLAGS = new Set(["--aplicar", "--forcar", "--da-previa"]);
const args = process.argv.slice(2);
const desconhecidas = args.filter((a) => !FLAGS.has(a));
if (desconhecidas.length) {
  console.error(`Opcao desconhecida: ${desconhecidas.join(" ")}. Use --aplicar, --forcar e/ou --da-previa.`);
  process.exit(2);
}
if (args.includes("--da-previa") && !args.includes("--aplicar")) {
  console.error("--da-previa so funciona junto com --aplicar.");
  process.exit(2);
}

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

try {
  const r = await sincronizar({
    blingGet,
    baixarImagem,
    raiz,
    aplicar: args.includes("--aplicar"),
    forcar: args.includes("--forcar"),
    daPrevia: args.includes("--da-previa"),
    log: (m) => console.log(m),
  });
  const total = [...r.chamadas.values()].reduce((t, n) => t + n, 0);
  console.log(`\nModo: ${r.modo}. Publicados: ${r.catalogo.produtos.length}. Entraram: ${r.entraram.length}. Sairam: ${r.sairam.length}. Chamadas: ${total}.`);
  console.log("Relatorio: scripts/bling/saida/relatorio.md");
  if (r.recusa) {
    console.error(`\nRECUSADO: ${r.recusa}`);
    process.exitCode = 1;
  }
} catch (e) {
  console.error(`\nABORTADO, nada foi gravado: ${e.message}`);
  process.exitCode = 1;
}
