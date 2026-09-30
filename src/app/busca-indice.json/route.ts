import { vitrine } from "@/dados/catalogo";
import type { ItemIndice } from "@/lib/busca";

// Exigido pela exportação estática: vira o arquivo `busca-indice.json` no build.
// A lupa do cabeçalho baixa este índice só quando é aberta pela primeira vez,
// então o catálogo não pesa no bundle das páginas.
export const dynamic = "force-static";

export function GET() {
  // Mesma ordem da vitrine do catálogo (curadoria), para as sugestões baterem.
  const itens: ItemIndice[] = vitrine.map((p) => [
    p.id,
    p.nome,
    p.slug,
    p.marca,
    p.codigo,
    p.preco,
    p.imagem,
  ]);
  return Response.json(itens);
}
