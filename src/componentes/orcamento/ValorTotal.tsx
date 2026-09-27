"use client";

import { useOrcamento } from "./ContextoOrcamento";
import { formatarBRL } from "./pedido";

/**
 * Total do pedido, ou o estado da recuperação de preços de uma lista antiga.
 * Enquanto os preços não chegam, mostrar a soma seria mostrar um valor errado.
 */
export function ValorTotal({ className }: { className: string }) {
  const { totalEstimado, recuperandoPrecos, erroRecuperacao, tentarRecuperarDeNovo } =
    useOrcamento();

  if (erroRecuperacao) {
    return (
      <div role="alert" className="text-right">
        <p className="text-[0.8125rem] font-light leading-relaxed text-marinho-800">
          Não conseguimos carregar os preços agora.
        </p>
        <button
          type="button"
          onClick={tentarRecuperarDeNovo}
          className="mt-2 font-sans text-[0.6875rem] uppercase tracking-[0.18em] text-carmim-600 underline underline-offset-4 transition-colors duration-400 hover:text-carmim-500"
        >
          Tentar de novo
        </button>
      </div>
    );
  }

  return (
    <p aria-live="polite" className={className}>
      {recuperandoPrecos ? (
        <span className="font-sans text-[0.8125rem] font-light text-marinho-700">
          Carregando preços do pedido...
        </span>
      ) : (
        formatarBRL(totalEstimado)
      )}
    </p>
  );
}
