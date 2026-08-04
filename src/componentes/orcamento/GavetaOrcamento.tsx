"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { Minus, Plus, Trash2, X } from "lucide-react";
import { useOrcamento } from "./ContextoOrcamento";
import { AviaoDePapel, LacoTracejado } from "@/componentes/marca/RotaDeVoo";
import { empresa } from "@/dados/empresa";

/**
 * Gaveta lateral com a seleção do cliente.
 * O botão final não envia formulário: abre o WhatsApp com a lista já escrita,
 * que é como a loja realmente atende.
 */
export function GavetaOrcamento() {
  const {
    itens,
    aberto,
    fechar,
    remover,
    limpar,
    definirQuantidade,
    mensagem,
    quantidadeTotal,
  } = useOrcamento();

  const href = `https://wa.me/${empresa.whatsapp.numero}?text=${encodeURIComponent(mensagem)}`;

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
            className="fixed inset-0 z-[70] bg-marinho-950/70 backdrop-blur-sm"
          />

          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-label="Lista de orçamento"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-y-0 right-0 z-[80] flex w-full max-w-md flex-col border-l border-marinho-200/10 bg-marinho-900"
          >
            <LacoTracejado
              className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 text-marinho-400/8"
            />

            <header className="relative flex items-start justify-between gap-6 border-b border-marinho-200/10 px-7 py-7">
              <div>
                <p className="sobrescrita text-marinho-200/60">Sua seleção</p>
                <h2 className="mt-3 font-display text-3xl font-light text-marfim">
                  Lista de orçamento
                </h2>
                <p className="mt-2 font-sans text-[0.8125rem] font-light text-marinho-200/50">
                  {quantidadeTotal === 0
                    ? "Nenhum item ainda"
                    : `${quantidadeTotal} ${quantidadeTotal === 1 ? "item" : "itens"}`}
                </p>
              </div>

              <button
                type="button"
                onClick={fechar}
                aria-label="Fechar lista"
                className="-mr-2 -mt-1 grid size-10 shrink-0 place-items-center text-marfim/60 transition-colors duration-400 hover:text-marfim"
              >
                <X size={20} strokeWidth={1.25} />
              </button>
            </header>

            {itens.length === 0 ? (
              <ListaVazia aoFechar={fechar} />
            ) : (
              <>
                <ul className="flex-1 divide-y divide-marinho-200/8 overflow-y-auto px-7">
                  {itens.map((item) => (
                    <li key={item.id} className="flex items-start gap-4 py-5">
                      <div className="min-w-0 flex-1">
                        <Link
                          href={`/produtos/${item.slug}`}
                          onClick={fechar}
                          className="block text-[0.9375rem] font-light leading-snug text-marfim/85 transition-colors duration-400 hover:text-marfim"
                        >
                          {item.nome}
                        </Link>

                        <div className="mt-3 flex items-center gap-3">
                          <div className="flex items-center border border-marinho-200/15">
                            <BotaoQuantidade
                              rotulo="Diminuir quantidade"
                              onClick={() =>
                                definirQuantidade(item.id, item.quantidade - 1)
                              }
                            >
                              <Minus size={12} strokeWidth={1.75} />
                            </BotaoQuantidade>

                            <span className="w-8 text-center font-sans text-[0.75rem] tabular-nums text-marfim">
                              {item.quantidade}
                            </span>

                            <BotaoQuantidade
                              rotulo="Aumentar quantidade"
                              onClick={() =>
                                definirQuantidade(item.id, item.quantidade + 1)
                              }
                            >
                              <Plus size={12} strokeWidth={1.75} />
                            </BotaoQuantidade>
                          </div>

                          <button
                            type="button"
                            onClick={() => remover(item.id)}
                            aria-label={`Remover ${item.nome}`}
                            className="grid size-8 place-items-center text-marinho-200/40 transition-colors duration-400 hover:text-carmim-400"
                          >
                            <Trash2 size={14} strokeWidth={1.25} />
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>

                <footer className="border-t border-marinho-200/10 px-7 py-7">
                  <p className="text-[0.8125rem] font-light leading-relaxed legivel text-marinho-200/50">
                    A lista vira uma mensagem pronta no WhatsApp. Você confere
                    tudo antes de enviar.
                  </p>

                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-5 flex h-14 w-full items-center justify-center gap-3 bg-carmim-500 font-sans text-[0.8125rem] uppercase tracking-[0.18em] text-marfim-puro transition-colors duration-500 hover:bg-carmim-600"
                  >
                    <AviaoDePapel className="h-4 w-4 [&_path]:fill-current" />
                    Enviar para a Thaby
                  </a>

                  <button
                    type="button"
                    onClick={limpar}
                    className="mt-4 w-full font-sans text-[0.6875rem] uppercase tracking-[0.18em] text-marinho-200/35 transition-colors duration-400 hover:text-marinho-200/70"
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

function BotaoQuantidade({
  children,
  onClick,
  rotulo,
}: {
  children: React.ReactNode;
  onClick: () => void;
  rotulo: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={rotulo}
      className="grid size-8 place-items-center text-marfim/60 transition-colors duration-400 hover:bg-marinho-200/8 hover:text-marfim"
    >
      {children}
    </button>
  );
}

function ListaVazia({ aoFechar }: { aoFechar: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 px-10 text-center">
      <AviaoDePapel className="h-9 w-9 opacity-40" />
      <p className="text-[0.9375rem] font-light leading-relaxed legivel text-marinho-200/50">
        Navegue pelo catálogo e toque no <span className="text-marfim">+</span>{" "}
        de cada peça para montar sua seleção.
      </p>
      <Link
        href="/catalogo"
        onClick={aoFechar}
        className="inline-flex h-12 items-center border border-marinho-200/25 px-8 font-sans text-[0.75rem] uppercase tracking-[0.18em] text-marfim transition-colors duration-500 hover:border-marfim"
      >
        Ver catálogo
      </Link>
    </div>
  );
}
