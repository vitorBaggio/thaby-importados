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
import {
  gravarItens,
  itemLegado,
  lerNoCliente,
  useItensOrcamento,
  type ItemOrcamento,
} from "./armazenamento";
import { algumSobConsulta, totalPedido } from "./pedido";

/**
 * Lista de orçamento.
 *
 * A loja vende por WhatsApp: o cliente monta uma seleção, confere a soma e, no
 * /checkout, escolhe a consultora que recebe a mensagem pronta. A persistência
 * vive em `armazenamento.ts`; a decisão de compra raramente cabe numa sessão só.
 */

export type { ItemOrcamento };

/** O mínimo para entrar na lista: qualquer produto (completo ou resumo) serve. */
type ProdutoSelecionavel = Pick<
  ItemOrcamento,
  "id" | "nome" | "slug" | "preco" | "codigo" | "imagem"
>;

type Contexto = {
  itens: ItemOrcamento[];
  quantidadeTotal: number;
  /** Soma em centavos dos itens com preço. */
  totalEstimado: number;
  /** Há item sem preço (fica fora do total). */
  sobConsulta: boolean;
  contem: (id: number) => boolean;
  alternar: (produto: ProdutoSelecionavel) => void;
  definirQuantidade: (id: number, quantidade: number) => void;
  remover: (id: number) => void;
  limpar: () => void;
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

  // Itens salvos antes da soma existir: completa preço, código e foto pelo id.
  // O catálogo só é baixado quando há o que completar.
  const temLegado = itens.some(itemLegado);
  useEffect(() => {
    if (!temLegado) return;
    let cancelado = false;
    import("@/dados/catalogo").then(({ produtos }) => {
      if (cancelado) return;
      const porId = new Map(produtos.map((p) => [p.id, p]));
      gravarItens(
        lerNoCliente().map((item) => {
          if (!itemLegado(item)) return item;
          const produto = porId.get(item.id);
          return {
            ...item,
            preco: produto?.preco ?? null,
            codigo: produto?.codigo ?? null,
            imagem: produto?.imagem ?? null,
          };
        }),
      );
    });
    return () => {
      cancelado = true;
    };
  }, [temLegado]);

  const alternar = useCallback(
    (produto: ProdutoSelecionavel) => {
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
                preco: produto.preco,
                codigo: produto.codigo,
                imagem: produto.imagem,
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

  const valor = useMemo<Contexto>(
    () => ({
      itens,
      quantidadeTotal: itens.reduce((total, i) => total + i.quantidade, 0),
      totalEstimado: totalPedido(itens),
      sobConsulta: algumSobConsulta(itens),
      contem: (id) => itens.some((i) => i.id === id),
      alternar,
      definirQuantidade,
      remover,
      limpar,
      aberto,
      abrir: () => setAberto(true),
      fechar: () => setAberto(false),
    }),
    [itens, alternar, definirQuantidade, remover, limpar, aberto],
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
