"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { X } from "lucide-react";
import { useOrcamento } from "./ContextoOrcamento";
import { ControleQuantidade } from "./ControleQuantidade";
import {
  NOTA_SOB_CONSULTA,
  NOTA_TOTAL,
  formatarBRL,
  subtotal,
  temPreco,
} from "./pedido";
import { AviaoDePapel, LacoTracejado } from "@/componentes/marca/RotaDeVoo";

/**
 * Gaveta lateral com a seleção do cliente e a soma ao vivo.
 * Finalizar leva ao /checkout, onde a pessoa escolhe quem vai atender.
 */
export function GavetaOrcamento() {
  const { itens, aberto, fechar, limpar, quantidadeTotal, totalEstimado, sobConsulta } =
    useOrcamento();

  return (
    <AnimatePresence>
      {aberto && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.45 }}
            onClick={fechar}
            className="fixed inset-0 z-[70] bg-marinho-900/45 backdrop-blur-sm"
          />

          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-label="Seu pedido"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-y-0 right-0 z-[80] flex w-full max-w-md flex-col border-l border-marinho-500/12 bg-fundo"
          >
            <LacoTracejado
              className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 text-marinho-500/12"
            />

            <header className="relative flex items-start justify-between gap-6 border-b border-marinho-500/12 px-7 py-7">
              <div>
                <p className="sobrescrita text-marinho-700/80">Sua seleção</p>
                <h2 className="mt-3 font-display text-3xl font-light text-marinho-900">
                  Seu pedido
                </h2>
                <p className="mt-2 font-sans text-[0.8125rem] font-light text-marinho-700/78">
                  {quantidadeTotal === 0
                    ? "Nenhum item ainda"
                    : `${quantidadeTotal} ${quantidadeTotal === 1 ? "item" : "itens"}`}
                </p>
              </div>

              <button
                type="button"
                onClick={fechar}
                aria-label="Fechar pedido"
                className="-mr-2 -mt-1 grid size-10 shrink-0 place-items-center text-marinho-800/75 transition-colors duration-400 hover:text-marinho-900"
              >
                <X size={20} strokeWidth={1.25} />
              </button>
            </header>

            {itens.length === 0 ? (
              <ListaVazia aoFechar={fechar} />
            ) : (
              <>
                <ul className="flex-1 divide-y divide-marinho-500/10 overflow-y-auto px-7">
                  {itens.map((item) => (
                    <li key={item.id} className="py-5">
                      <Link
                        href={`/produtos/${item.slug}`}
                        onClick={fechar}
                        className="block text-[0.9375rem] font-light leading-snug text-marinho-900/85 transition-colors duration-400 hover:text-marinho-900"
                      >
                        {item.nome}
                      </Link>

                      <p className="mt-1.5 font-sans text-[0.75rem] tabular-nums text-marinho-700">
                        {temPreco(item)
                          ? `${formatarBRL(item.preco)} cada`
                          : "Valor sob consulta"}
                      </p>

                      <div className="mt-3 flex items-center justify-between gap-3">
                        <ControleQuantidade item={item} />

                        {temPreco(item) && (
                          <p className="font-sans text-[0.875rem] tabular-nums text-marinho-900">
                            <span className="sr-only">Subtotal: </span>
                            {formatarBRL(subtotal(item))}
                          </p>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>

                <footer className="border-t border-marinho-500/12 px-7 py-7">
                  <div className="flex items-baseline justify-between gap-4">
                    <p className="sobrescrita text-marinho-700">Total estimado</p>
                    <p
                      aria-live="polite"
                      className="font-display text-3xl font-light tabular-nums text-marinho-900"
                    >
                      {formatarBRL(totalEstimado)}
                    </p>
                  </div>

                  <p className="mt-3 text-[0.8125rem] font-light leading-relaxed legivel text-marinho-700">
                    {NOTA_TOTAL}
                    {sobConsulta && ` ${NOTA_SOB_CONSULTA}`}
                  </p>

                  <Link
                    href="/checkout"
                    onClick={fechar}
                    className="mt-5 flex h-14 w-full items-center justify-center gap-3 bg-carmim-500 font-sans text-[0.8125rem] uppercase tracking-[0.18em] text-marfim-puro transition-colors duration-500 hover:bg-carmim-600"
                  >
                    <AviaoDePapel className="h-4 w-4 [&_path]:fill-current" />
                    Finalizar pedido
                  </Link>

                  <button
                    type="button"
                    onClick={limpar}
                    className="mt-4 w-full font-sans text-[0.6875rem] uppercase tracking-[0.18em] text-marinho-700/72 transition-colors duration-400 hover:text-marinho-700/85"
                  >
                    Esvaziar lista
                  </button>
                </footer>
              </>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

function ListaVazia({ aoFechar }: { aoFechar: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 px-10 text-center">
      <AviaoDePapel className="h-9 w-9 opacity-40" />
      <p className="text-[0.9375rem] font-light leading-relaxed legivel text-marinho-700/78">
        Navegue pelo catálogo e toque no <span className="text-marinho-900">+</span>{" "}
        de cada peça para montar sua seleção.
      </p>
      <Link
        href="/catalogo"
        onClick={aoFechar}
        className="inline-flex h-12 items-center border border-marinho-500/28 px-8 font-sans text-[0.75rem] uppercase tracking-[0.18em] text-marinho-900 transition-colors duration-500 hover:border-marinho-900"
      >
        Ver catálogo
      </Link>
    </div>
  );
}
