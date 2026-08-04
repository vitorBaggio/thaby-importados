"use client";

import { useSyncExternalStore } from "react";

/**
 * Store externa da lista de orçamento.
 *
 * O localStorage é uma fonte de dados fora do React, então quem lê é
 * `useSyncExternalStore` — e não um efeito que hidrata via setState. De quebra,
 * o evento `storage` mantém abas diferentes em sincronia: quem monta a lista no
 * celular e continua no desktop não perde a seleção.
 */

export type ItemOrcamento = {
  id: number;
  nome: string;
  slug: string;
  quantidade: number;
};

const CHAVE = "thaby:orcamento";

/** Referência estável: `getSnapshot` não pode devolver array novo a cada chamada. */
const VAZIO: ItemOrcamento[] = [];

let cache: ItemOrcamento[] = VAZIO;
let cacheBruto: string | null = null;

const ouvintes = new Set<() => void>();

function avisar() {
  for (const ouvinte of ouvintes) ouvinte();
}

function aoMudarNoutraAba(evento: StorageEvent) {
  if (evento.key === null || evento.key === CHAVE) avisar();
}

function assinar(ouvinte: () => void) {
  if (ouvintes.size === 0) {
    window.addEventListener("storage", aoMudarNoutraAba);
  }
  ouvintes.add(ouvinte);

  return () => {
    ouvintes.delete(ouvinte);
    if (ouvintes.size === 0) {
      window.removeEventListener("storage", aoMudarNoutraAba);
    }
  };
}

function lerNoCliente(): ItemOrcamento[] {
  let bruto: string | null;
  try {
    bruto = window.localStorage.getItem(CHAVE);
  } catch {
    // Modo privado ou cota estourada: a lista funciona, só não persiste.
    return cache;
  }

  if (bruto === cacheBruto) return cache;
  cacheBruto = bruto;

  if (!bruto) {
    cache = VAZIO;
    return cache;
  }

  try {
    const salvo: unknown = JSON.parse(bruto);
    cache = Array.isArray(salvo) ? (salvo as ItemOrcamento[]) : VAZIO;
  } catch {
    cache = VAZIO;
  }

  return cache;
}

/** No servidor não existe seleção — a lista começa vazia e hidrata depois. */
function lerNoServidor(): ItemOrcamento[] {
  return VAZIO;
}

export function gravarItens(proximos: ItemOrcamento[]) {
  cache = proximos;
  cacheBruto = JSON.stringify(proximos);

  try {
    window.localStorage.setItem(CHAVE, cacheBruto);
  } catch {
    // idem
  }

  avisar();
}

/** O prefixo `use` é exigência do React (regras de hooks), não escolha de idioma. */
export function useItensOrcamento() {
  return useSyncExternalStore(assinar, lerNoCliente, lerNoServidor);
}
