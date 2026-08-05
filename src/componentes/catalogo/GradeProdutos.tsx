"use client";

import { useState } from "react";
import { CartaoProduto } from "./CartaoProduto";
import type { ProdutoResumo } from "@/dados/catalogo";

/**
 * Grade paginada no cliente. Subcategorias podem ter centenas de peças, então
 * renderizamos em lotes com "carregar mais" — sem estourar o DOM de uma vez.
 */
export function GradeProdutos({
  produtos,
  passo = 24,
}: {
  produtos: ProdutoResumo[];
  passo?: number;
}) {
  const [visiveis, setVisiveis] = useState(passo);
  const mostrados = produtos.slice(0, visiveis);
  const restam = produtos.length - mostrados.length;

  return (
    <div>
      <div className="grid grid-cols-2 gap-x-6 gap-y-14 md:gap-x-8 lg:grid-cols-3 xl:grid-cols-4">
        {mostrados.map((produto, indice) => (
          <CartaoProduto
            key={produto.id}
            produto={produto}
            atraso={(indice % 8) * 0.04}
            prioridade={indice < 4}
          />
        ))}
      </div>

      {restam > 0 && (
        <div className="mt-16 flex flex-col items-center gap-4">
          <p className="font-sans text-[0.6875rem] uppercase tracking-[0.18em] text-marinho-700/70">
            Mostrando {mostrados.length} de {produtos.length}
          </p>
          <button
            type="button"
            onClick={() => setVisiveis((v) => v + passo * 2)}
            className="inline-flex h-13 items-center border border-marinho-500/28 px-9 py-3.5 font-sans text-[0.8125rem] uppercase tracking-[0.16em] text-marinho-900 transition-colors duration-500 hover:border-marinho-900 hover:bg-marinho-900 hover:text-marfim-puro"
          >
            Ver mais {Math.min(restam, passo * 2)}
          </button>
        </div>
      )}
    </div>
  );
}
