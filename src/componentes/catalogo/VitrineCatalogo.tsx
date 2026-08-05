"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { motion } from "motion/react";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { slugify } from "@/lib/texto";
import { CartaoProduto } from "./CartaoProduto";
import { BotaoLink } from "@/componentes/ui/Botao";
import { linkWhatsApp } from "@/dados/empresa";
import type { ProdutoResumo, SuperResumo } from "@/dados/catalogo";

type Ordenacao = "curadoria" | "az" | "za" | "preco-asc" | "preco-desc";

const ordenacoes: { valor: Ordenacao; rotulo: string }[] = [
  { valor: "curadoria", rotulo: "Curadoria" },
  { valor: "az", rotulo: "A–Z" },
  { valor: "preco-asc", rotulo: "Menor preço" },
  { valor: "preco-desc", rotulo: "Maior preço" },
];

const LOTE = 48;

export function VitrineCatalogo({
  produtos,
  supercategorias,
  mapaSuper,
}: {
  produtos: ProdutoResumo[];
  supercategorias: SuperResumo[];
  /** subcategoriaId → supercategoriaId */
  mapaSuper: Record<number, number>;
}) {
  const [termo, setTermo] = useState("");
  const [superAtiva, setSuperAtiva] = useState<number | null>(null);
  const [ordenacao, setOrdenacao] = useState<Ordenacao>("curadoria");
  const [visiveis, setVisiveis] = useState(LOTE);

  // Assinatura do filtro atual. Se mudar entre renders, a paginação volta ao
  // início durante o próprio render — sem efeito, sem cascata (padrão React 19).
  const [assinatura, setAssinatura] = useState("");

  const termoAdiado = useDeferredValue(termo);
  const assinaturaAtual = `${superAtiva}|${termoAdiado}|${ordenacao}`;
  if (assinaturaAtual !== assinatura) {
    setAssinatura(assinaturaAtual);
    setVisiveis(LOTE);
  }

  const resultado = useMemo(() => {
    let lista = produtos;

    if (superAtiva !== null) {
      lista = lista.filter((p) => mapaSuper[p.categoriaId] === superAtiva);
    }

    const alvo = slugify(termoAdiado);
    if (alvo) {
      const partes = alvo.split("-").filter(Boolean);
      lista = lista.filter((p) => {
        const indice = slugify(`${p.nome} ${p.marca ?? ""}`);
        return partes.every((parte) => indice.includes(parte));
      });
    }

    if (ordenacao === "curadoria") return lista;

    const ordenada = [...lista];
    switch (ordenacao) {
      case "az":
        ordenada.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
        break;
      case "za":
        ordenada.sort((a, b) => b.nome.localeCompare(a.nome, "pt-BR"));
        break;
      case "preco-asc":
        ordenada.sort((a, b) => (a.preco ?? Infinity) - (b.preco ?? Infinity));
        break;
      case "preco-desc":
        ordenada.sort((a, b) => (b.preco ?? -1) - (a.preco ?? -1));
        break;
    }
    return ordenada;
  }, [produtos, superAtiva, termoAdiado, ordenacao, mapaSuper]);

  const mostrados = resultado.slice(0, visiveis);
  const restam = resultado.length - mostrados.length;
  const comFiltro = Boolean(termo) || superAtiva !== null;

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
              onChange={(e) => setTermo(e.target.value)}
              placeholder="Buscar por peça ou marca"
              aria-label="Buscar no catálogo"
              className="w-full border-0 border-b border-marinho-500/18 bg-transparent py-2.5 pl-7 pr-8 font-sans text-[0.875rem] font-light text-marinho-900 placeholder:text-marinho-700/70 focus:border-marinho-500/50 focus:outline-none [&::-webkit-search-cancel-button]:hidden"
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

          <div className="flex flex-wrap items-center gap-1">
            {ordenacoes.map((opcao) => (
              <button
                key={opcao.valor}
                type="button"
                onClick={() => setOrdenacao(opcao.valor)}
                aria-pressed={ordenacao === opcao.valor}
                className={cn(
                  "px-3 py-1.5 font-sans text-[0.6875rem] uppercase tracking-[0.12em] transition-colors duration-400",
                  ordenacao === opcao.valor
                    ? "text-marinho-900"
                    : "text-marinho-700/72 hover:text-marinho-700/90",
                )}
              >
                {opcao.rotulo}
              </button>
            ))}
          </div>
        </div>

        <div className="-mx-6 mt-5 flex gap-2 overflow-x-auto px-6 pb-1 [scrollbar-width:none] md:-mx-10 md:px-10 [&::-webkit-scrollbar]:hidden">
          <Chip ativo={superAtiva === null} onClick={() => setSuperAtiva(null)}>
            Tudo
          </Chip>
          {supercategorias.map((s) => (
            <Chip
              key={s.id}
              ativo={superAtiva === s.id}
              onClick={() => setSuperAtiva(s.id)}
            >
              {s.nome}
            </Chip>
          ))}
        </div>
      </div>

      <div className="mt-10 flex items-center justify-between gap-6">
        <p className="font-sans text-[0.6875rem] uppercase tracking-[0.18em] text-marinho-700/75">
          {resultado.length === 0
            ? "Nenhuma peça encontrada"
            : `${resultado.length.toLocaleString("pt-BR")} ${resultado.length === 1 ? "peça" : "peças"}`}
        </p>

        {comFiltro && (
          <button
            type="button"
            onClick={() => {
              setTermo("");
              setSuperAtiva(null);
            }}
            className="font-sans text-[0.6875rem] uppercase tracking-[0.18em] text-carmim-600 transition-colors duration-400 hover:text-carmim-500"
          >
            Limpar filtros
          </button>
        )}
      </div>

      {resultado.length > 0 ? (
        <>
          <div className="mt-10 grid grid-cols-2 gap-x-6 gap-y-14 md:gap-x-8 lg:grid-cols-3 xl:grid-cols-4">
            {mostrados.map((produto, indice) => (
              <CartaoProduto
                key={produto.id}
                produto={produto}
                atraso={(indice % 8) * 0.04}
                prioridade={indice < 4}
              />
            ))}
          </div>

          {restam > 0 && (
            <div className="mt-16 flex flex-col items-center gap-4">
              <p className="font-sans text-[0.6875rem] uppercase tracking-[0.18em] text-marinho-700/70">
                Mostrando {mostrados.length.toLocaleString("pt-BR")} de{" "}
                {resultado.length.toLocaleString("pt-BR")}
              </p>
              <button
                type="button"
                onClick={() => setVisiveis((v) => v + LOTE * 2)}
                className="inline-flex items-center border border-marinho-500/28 px-9 py-3.5 font-sans text-[0.8125rem] uppercase tracking-[0.16em] text-marinho-900 transition-colors duration-500 hover:border-marinho-900 hover:bg-marinho-900 hover:text-marfim-puro"
              >
                Ver mais
              </button>
            </div>
          )}
        </>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="mt-16 flex flex-col items-center gap-7 border border-dashed border-marinho-500/18 px-8 py-20 text-center"
        >
          <p className="max-w-md text-fluid-lg font-light leading-snug equilibrio text-marinho-900/80">
            Nada por aqui com esse filtro.
          </p>
          <p className="max-w-md text-[0.9375rem] font-light leading-relaxed legivel text-marinho-800/75">
            O acervo é grande e gira rápido. Se você já sabe o que procura, é
            mais rápido perguntar direto.
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
          : "border-marinho-500/18 text-marinho-800/65 hover:border-marinho-500/40 hover:text-marinho-900",
      )}
    >
      {children}
    </button>
  );
}
