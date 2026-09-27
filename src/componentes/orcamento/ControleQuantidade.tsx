"use client";

import type { ReactNode } from "react";
import { Minus, Plus, Trash2 } from "lucide-react";
import { useOrcamento, type ItemOrcamento } from "./ContextoOrcamento";

/** Menos, quantidade, mais e remover. O mesmo na gaveta e no checkout. */
export function ControleQuantidade({ item }: { item: ItemOrcamento }) {
  const { definirQuantidade, remover } = useOrcamento();

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center border border-marinho-500/18">
        <BotaoQuantidade
          rotulo={`Diminuir quantidade de ${item.nome}`}
          onClick={() => definirQuantidade(item.id, item.quantidade - 1)}
        >
          <Minus size={12} strokeWidth={1.75} />
        </BotaoQuantidade>

        <span
          aria-live="polite"
          aria-label={`Quantidade: ${item.quantidade}`}
          className="w-8 text-center font-sans text-[0.75rem] tabular-nums text-marinho-900"
        >
          {item.quantidade}
        </span>

        <BotaoQuantidade
          rotulo={`Aumentar quantidade de ${item.nome}`}
          onClick={() => definirQuantidade(item.id, item.quantidade + 1)}
        >
          <Plus size={12} strokeWidth={1.75} />
        </BotaoQuantidade>
      </div>

      <button
        type="button"
        onClick={() => remover(item.id)}
        aria-label={`Remover ${item.nome}`}
        className="grid size-8 place-items-center text-marinho-700/75 transition-colors duration-400 hover:text-carmim-500"
      >
        <Trash2 size={14} strokeWidth={1.25} />
      </button>
    </div>
  );
}

function BotaoQuantidade({
  children,
  onClick,
  rotulo,
}: {
  children: ReactNode;
  onClick: () => void;
  rotulo: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={rotulo}
      className="grid size-8 place-items-center text-marinho-800/75 transition-colors duration-400 hover:bg-marinho-500/8 hover:text-marinho-900"
    >
      {children}
    </button>
  );
}
