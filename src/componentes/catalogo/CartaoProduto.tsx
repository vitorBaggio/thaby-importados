"use client";

import { ViewTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { Check, Plus } from "lucide-react";
import { motion } from "motion/react";
import { cn } from "@/lib/cn";
import { iniciais } from "@/lib/texto";
import { nomeTransicaoProduto } from "@/lib/transicoes";
import { categoriaPorId, precoFormatado, type ProdutoResumo } from "@/dados/catalogo";
import { useOrcamento } from "@/componentes/orcamento/ContextoOrcamento";
import { RevelarImagem } from "@/componentes/ui/RevelarImagem";
import { LacoTracejado } from "@/componentes/marca/RotaDeVoo";

export function CartaoProduto({
  produto,
  atraso = 0,
  prioridade = false,
}: {
  produto: ProdutoResumo;
  atraso?: number;
  prioridade?: boolean;
}) {
  const { contem, alternar } = useOrcamento();
  const categoria = categoriaPorId(produto.categoriaId);
  const selecionado = contem(produto.id);

  return (
    <motion.article
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-8% 0px" }}
      transition={{ duration: 0.9, delay: atraso, ease: [0.16, 1, 0.3, 1] }}
      className="group/cartao relative flex flex-col"
    >
      <Link href={`/produtos/${produto.slug}`} className="block">
        {/*
          O ladrilho é o participante da View Transition: ao abrir o produto,
          esta moldura voa e cresce até a posição do detalhe em vez de a página
          simplesmente trocar.
        */}
        <ViewTransition
          name={nomeTransicaoProduto(produto.id)}
          share="morph"
          default="none"
        >
          {/*
            O filete é obrigatório no tema claro: o packshot tem fundo branco e,
            sem moldura, a foto sangraria direto na página.
          */}
          <div className="relative aspect-[4/5] overflow-hidden border border-marinho-500/10 bg-ladrilho">
            {produto.imagem ? (
              <RevelarImagem atraso={atraso}>
                <Image
                  src={produto.imagem}
                  alt={produto.nome}
                  fill
                  sizes="(min-width: 1280px) 22vw, (min-width: 768px) 33vw, 50vw"
                  priority={prioridade}
                  className="object-contain p-6 transition-transform duration-[900ms] ease-[var(--ease-suave)] group-hover/cartao:scale-[1.045] md:p-10"
                />
              </RevelarImagem>
            ) : (
              <PlaceholderProduto produto={produto} />
            )}

            {/* Véu que escurece de leve no hover, para o botão ganhar contraste */}
            <span className="pointer-events-none absolute inset-0 bg-marinho-900/0 transition-colors duration-700 group-hover/cartao:bg-marinho-900/[0.06]" />
          </div>
        </ViewTransition>
      </Link>

      <button
        type="button"
        onClick={() => alternar(produto)}
        aria-pressed={selecionado}
        aria-label={
          selecionado
            ? `Remover ${produto.nome} do orçamento`
            : `Adicionar ${produto.nome} ao orçamento`
        }
        className={cn(
          "absolute right-3 top-3 z-10 grid size-10 place-items-center border backdrop-blur-sm",
          "transition-all duration-500 ease-[var(--ease-suave)]",
          "md:translate-y-1 md:opacity-0 md:group-hover/cartao:translate-y-0 md:group-hover/cartao:opacity-100",
          "focus-visible:translate-y-0 focus-visible:opacity-100",
          selecionado
            ? "border-carmim-500 bg-carmim-500 text-marfim-puro md:translate-y-0 md:opacity-100"
            : "border-marinho-900/12 bg-fundo/90 text-marinho-800 hover:border-marinho-900/30",
        )}
      >
        {selecionado ? <Check size={15} strokeWidth={1.75} /> : <Plus size={15} strokeWidth={1.5} />}
      </button>

      <div className="flex flex-1 flex-col pt-5">
        <span className="sobrescrita text-[0.5625rem] text-carmim-500">
          {produto.marca ?? categoria?.nome ?? "Importado"}
        </span>

        <h3 className="mt-2.5 text-[1.0625rem] font-normal leading-snug legivel">
          <Link
            href={`/produtos/${produto.slug}`}
            className="bg-[linear-gradient(currentColor,currentColor)] bg-[length:0%_1px] bg-left-bottom bg-no-repeat text-marinho-900/90 transition-[background-size,color] duration-600 ease-[var(--ease-suave)] hover:text-marinho-900 group-hover/cartao:bg-[length:100%_1px]"
          >
            {produto.nome}
          </Link>
        </h3>

        <p className="mt-auto pt-4 font-sans text-[0.8125rem] tabular-nums text-marinho-900">
          {precoFormatado(produto.preco) ?? (
            <span className="text-[0.6875rem] uppercase tracking-[0.18em] text-marinho-700/75">
              Sob consulta
            </span>
          )}
        </p>
      </div>
    </motion.article>
  );
}

/**
 * Nem todo item do acervo tem foto liberada. Em vez de um cinza vazio,
 * o espaço vira uma peça de marca — mantém a vitrine coerente.
 */
function PlaceholderProduto({ produto }: { produto: ProdutoResumo }) {
  const categoria = categoriaPorId(produto.categoriaId);

  return (
    <span className="absolute inset-0 grid place-items-center overflow-hidden bg-gradient-to-br from-marfim to-areia">
      <LacoTracejado className="absolute -right-16 -top-16 h-64 w-64 text-marinho-500/10" />

      <span className="relative flex flex-col items-center gap-4 px-6 text-center">
        <span className="font-display text-5xl font-light leading-none text-marinho-500/70">
          {iniciais(produto.marca ?? produto.nome)}
        </span>
        <span className="sobrescrita text-[0.5rem] text-marinho-600/80">
          {categoria?.nome ?? "Acervo"}
        </span>
      </span>

      <span className="absolute bottom-4 left-1/2 -translate-x-1/2 font-sans text-[0.5625rem] uppercase tracking-[0.22em] text-marinho-600/75">
        Foto sob consulta
      </span>
    </span>
  );
}
