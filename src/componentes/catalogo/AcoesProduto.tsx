"use client";

import { Check, Plus } from "lucide-react";
import { cn } from "@/lib/cn";
import { useOrcamento } from "@/componentes/orcamento/ContextoOrcamento";
import { AviaoDePapel } from "@/componentes/marca/RotaDeVoo";
import type { Produto } from "@/dados/catalogo";
import { empresa } from "@/dados/empresa";

export function AcoesProduto({ produto }: { produto: Produto }) {
  const { contem, alternar, abrir } = useOrcamento();
  const selecionado = contem(produto.id);

  const mensagem = `Olá! Vim pelo site e tenho interesse em: ${produto.nome}. Pode me passar disponibilidade e valor?`;
  const href = `https://wa.me/${empresa.whatsapp.numero}?text=${encodeURIComponent(mensagem)}`;

  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex h-14 flex-1 items-center justify-center gap-3 bg-carmim-500 px-8 font-sans text-[0.8125rem] uppercase tracking-[0.16em] text-marfim-puro transition-colors duration-500 hover:bg-carmim-600"
      >
        <AviaoDePapel className="h-4 w-4 [&_path]:fill-current" />
        Consultar no WhatsApp
      </a>

      <button
        type="button"
        onClick={() => {
          if (selecionado) {
            abrir();
            return;
          }
          alternar(produto);
        }}
        className={cn(
          "inline-flex h-14 items-center justify-center gap-2.5 border px-8 font-sans text-[0.8125rem] uppercase tracking-[0.16em] transition-colors duration-500",
          selecionado
            ? "border-marinho-900/70 text-marinho-900"
            : "border-marinho-500/28 text-marinho-900 hover:border-marinho-600/60",
        )}
      >
        {selecionado ? (
          <>
            <Check size={15} strokeWidth={1.75} />
            Na lista
          </>
        ) : (
          <>
            <Plus size={15} strokeWidth={1.5} />
            Adicionar à lista
          </>
        )}
      </button>
    </div>
  );
}
