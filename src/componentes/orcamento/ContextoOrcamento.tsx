"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Produto } from "@/dados/catalogo";
import { empresa } from "@/dados/empresa";
import {
  gravarItens,
  useItensOrcamento,
  type ItemOrcamento,
} from "./armazenamento";

/**
 * Lista de orçamento.
 *
 * A loja vende por WhatsApp, então não existe checkout: o cliente monta uma
 * seleção e o site transforma isso numa mensagem pronta. A persistência vive
 * em `armazenamento.ts` — a decisão de compra raramente cabe numa sessão só.
 */

export type { ItemOrcamento };

type Contexto = {
  itens: ItemOrcamento[];
  quantidadeTotal: number;
  contem: (id: number) => boolean;
  alternar: (produto: Produto) => void;
  definirQuantidade: (id: number, quantidade: number) => void;
  remover: (id: number) => void;
  limpar: () => void;
  mensagem: string;
  aberto: boolean;
  abrir: () => void;
  fechar: () => void;
};

const ContextoOrcamento = createContext<Contexto | null>(null);

export function ProvedorOrcamento({ children }: { children: ReactNode }) {
  const itens = useItensOrcamento();
  const [aberto, setAberto] = useState(false);

  // Trava o scroll do body enquanto a gaveta está aberta.
  useEffect(() => {
    if (!aberto) return;
    const anterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = anterior;
    };
  }, [aberto]);

  useEffect(() => {
    if (!aberto) return;
    const aoTeclar = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") setAberto(false);
    };
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, [aberto]);

  const alternar = useCallback(
    (produto: Produto) => {
      const existe = itens.some((i) => i.id === produto.id);
      gravarItens(
        existe
          ? itens.filter((i) => i.id !== produto.id)
          : [
              ...itens,
              {
                id: produto.id,
                nome: produto.nome,
                slug: produto.slug,
                quantidade: 1,
              },
            ],
      );
    },
    [itens],
  );

  const definirQuantidade = useCallback(
    (id: number, quantidade: number) => {
      gravarItens(
        quantidade < 1
          ? itens.filter((i) => i.id !== id)
          : itens.map((i) => (i.id === id ? { ...i, quantidade } : i)),
      );
    },
    [itens],
  );

  const remover = useCallback(
    (id: number) => gravarItens(itens.filter((i) => i.id !== id)),
    [itens],
  );

  const limpar = useCallback(() => gravarItens([]), []);

  const mensagem = useMemo(() => {
    if (itens.length === 0) return "";

    const linhas = itens.map(
      (item, indice) =>
        `${indice + 1}. ${item.nome}${item.quantidade > 1 ? ` — ${item.quantidade} un.` : ""}`,
    );

    return [
      `Olá! Vim pelo site da ${empresa.nome} e gostaria de um orçamento para:`,
      "",
      ...linhas,
      "",
      "Pode me passar disponibilidade e valores?",
    ].join("\n");
  }, [itens]);

  const valor = useMemo<Contexto>(
    () => ({
      itens,
      quantidadeTotal: itens.reduce((total, i) => total + i.quantidade, 0),
      contem: (id) => itens.some((i) => i.id === id),
      alternar,
      definirQuantidade,
      remover,
      limpar,
      mensagem,
      aberto,
      abrir: () => setAberto(true),
      fechar: () => setAberto(false),
    }),
    [itens, alternar, definirQuantidade, remover, limpar, mensagem, aberto],
  );

  return (
    <ContextoOrcamento.Provider value={valor}>
      {children}
    </ContextoOrcamento.Provider>
  );
}

export function useOrcamento() {
  const contexto = useContext(ContextoOrcamento);
  if (!contexto) {
    throw new Error("useOrcamento precisa estar dentro de <ProvedorOrcamento>.");
  }
  return contexto;
}
