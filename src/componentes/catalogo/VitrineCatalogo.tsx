"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { motion } from "motion/react";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { buscar, categorias, type Produto } from "@/dados/catalogo";
import { CartaoProduto } from "./CartaoProduto";
import { BotaoLink } from "@/componentes/ui/Botao";
import { linkWhatsApp } from "@/dados/empresa";

type Ordenacao = "curadoria" | "az" | "za";

const ordenacoes: { valor: Ordenacao; rotulo: string }[] = [
  { valor: "curadoria", rotulo: "Curadoria" },
  { valor: "az", rotulo: "A – Z" },
  { valor: "za", rotulo: "Z – A" },
];

export function VitrineCatalogo({ produtos }: { produtos: Produto[] }) {
  const [termo, setTermo] = useState("");
  const [categoriaAtiva, setCategoriaAtiva] = useState<number | null>(null);
  const [ordenacao, setOrdenacao] = useState<Ordenacao>("curadoria");

  // A busca roda a cada tecla; adiar mantém o campo fluido em listas grandes.
  const termoAdiado = useDeferredValue(termo);

  const resultado = useMemo(() => {
    const porCategoria = categoriaAtiva
      ? produtos.filter((p) => p.categoriaId === categoriaAtiva)
      : produtos;

    const encontrados = buscar(termoAdiado, porCategoria);

    if (ordenacao === "curadoria") return encontrados;

    const ordenados = [...encontrados].sort((a, b) =>
      a.nome.localeCompare(b.nome, "pt-BR"),
    );
    return ordenacao === "az" ? ordenados : ordenados.reverse();
  }, [produtos, categoriaAtiva, termoAdiado, ordenacao]);

  const comFiltro = Boolean(termo) || categoriaAtiva !== null;

  return (
    <div>
      <div className="sticky top-[4.5rem] z-30 -mx-6 border-b border-marinho-500/10 bg-fundo/85 px-6 py-5 backdrop-blur-xl md:-mx-10 md:px-10 lg:top-[5rem]">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <label className="group relative flex w-full max-w-md items-center">
            <Search
              size={16}
              strokeWidth={1.4}
              className="pointer-events-none absolute left-0 text-marinho-700/75 transition-colors duration-400 group-focus-within:text-carmim-500"
            />
            <input
              type="search"
              value={termo}
              onChange={(evento) => setTermo(evento.target.value)}
              placeholder="Buscar por peça, marca ou origem"
              aria-label="Buscar no catálogo"
              className="w-full border-0 border-b border-marinho-500/18 bg-transparent py-2.5 pl-7 pr-8 font-sans text-[0.875rem] font-light text-marinho-900 placeholder:text-marinho-700/70 focus:border-marinho-500/50 focus:outline-none focus-visible:outline-none [&::-webkit-search-cancel-button]:hidden"
            />
            {termo && (
              <button
                type="button"
                onClick={() => setTermo("")}
                aria-label="Limpar busca"
                className="absolute right-0 text-marinho-700/75 transition-colors duration-400 hover:text-marinho-900"
              >
                <X size={15} strokeWidth={1.5} />
              </button>
            )}
          </label>

          <div className="flex items-center gap-1">
            <span className="mr-2 hidden font-sans text-[0.625rem] uppercase tracking-[0.18em] text-marinho-700/70 sm:inline">
              Ordenar
            </span>
            {ordenacoes.map((opcao) => (
              <button
                key={opcao.valor}
                type="button"
                onClick={() => setOrdenacao(opcao.valor)}
                aria-pressed={ordenacao === opcao.valor}
                className={cn(
                  "px-3 py-1.5 font-sans text-[0.6875rem] uppercase tracking-[0.14em] transition-colors duration-400",
                  ordenacao === opcao.valor
                    ? "text-marinho-900"
                    : "text-marinho-700/72 hover:text-marinho-700/85",
                )}
              >
                {opcao.rotulo}
              </button>
            ))}
          </div>
        </div>

        <div className="-mx-6 mt-5 flex gap-2 overflow-x-auto px-6 pb-1 [scrollbar-width:none] md:-mx-10 md:px-10 [&::-webkit-scrollbar]:hidden">
          <Chip
            ativo={categoriaAtiva === null}
            onClick={() => setCategoriaAtiva(null)}
          >
            Tudo
          </Chip>

          {categorias.map((categoria) => (
            <Chip
              key={categoria.id}
              ativo={categoriaAtiva === categoria.id}
              onClick={() => setCategoriaAtiva(categoria.id)}
            >
              {categoria.nome}
            </Chip>
          ))}
        </div>
      </div>

      <div className="mt-10 flex items-center justify-between gap-6">
        <p className="font-sans text-[0.6875rem] uppercase tracking-[0.18em] text-marinho-700/75">
          {resultado.length === 0
            ? "Nenhuma peça encontrada"
            : `${resultado.length} ${resultado.length === 1 ? "peça encontrada" : "peças encontradas"}`}
        </p>

        {comFiltro && (
          <button
            type="button"
            onClick={() => {
              setTermo("");
              setCategoriaAtiva(null);
            }}
            className="font-sans text-[0.6875rem] uppercase tracking-[0.18em] text-carmim-600 transition-colors duration-400 hover:text-carmim-500"
          >
            Limpar filtros
          </button>
        )}
      </div>

      {/*
        Troca direta entre grade e estado vazio. Um AnimatePresence com
        `mode="wait"` aqui trava: os cartões filhos não sinalizam fim de saída,
        a grade nunca desmonta e o estado vazio não chega a aparecer.
      */}
      {resultado.length > 0 ? (
        <div className="mt-10 grid grid-cols-2 gap-x-6 gap-y-14 md:gap-x-8 lg:grid-cols-3 xl:grid-cols-4">
          {resultado.map((produto, indice) => (
            <CartaoProduto
              key={produto.id}
              produto={produto}
              atraso={Math.min(indice, 7) * 0.05}
              prioridade={indice < 4}
            />
          ))}
        </div>
      ) : (
        <motion.div
          key="vazio"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="mt-16 flex flex-col items-center gap-7 border border-dashed border-marinho-500/18 px-8 py-20 text-center"
        >
            <p className="max-w-md text-fluid-lg font-light leading-snug equilibrio text-marinho-900/80">
            Nada por aqui com esse filtro.
          </p>
          <p className="max-w-md text-[0.9375rem] font-light leading-relaxed legivel text-marinho-800/75">
            O acervo publicado é só uma parte do que a Thaby tem. Se você já
            sabe o que procura, é mais rápido perguntar direto.
          </p>
          <BotaoLink
            href={linkWhatsApp(
              termo
                ? `Olá! Vim pelo site e estou procurando por "${termo}". Vocês têm?`
                : "Olá! Vim pelo site e gostaria de ver o catálogo completo.",
            )}
            variante="carmim"
            externo
          >
            Perguntar no WhatsApp
          </BotaoLink>
        </motion.div>
      )}
    </div>
  );
}

function Chip({
  children,
  ativo,
  onClick,
}: {
  children: React.ReactNode;
  ativo: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={ativo}
      className={cn(
        "shrink-0 whitespace-nowrap border px-4 py-2 font-sans text-[0.6875rem] uppercase tracking-[0.14em] transition-colors duration-400",
        ativo
          ? "border-marinho-900 bg-marinho-900 text-marfim-puro"
          : "border-marinho-500/18 text-marinho-800/65 hover:border-marinho-500/45 hover:text-marinho-900",
      )}
    >
      {children}
    </button>
  );
}
