"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, Search, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { asset } from "@/lib/asset";
import {
  casaBusca,
  hrefBusca,
  indiceDeBusca,
  partesDaBusca,
  type ItemIndice,
} from "@/lib/busca";
import { precoFormatado } from "@/lib/preco";

const MAX_SUGESTOES = 8;
const MIN_LETRAS = 2;

type Sugestao = {
  id: number;
  nome: string;
  slug: string;
  marca: string | null;
  preco: number | null;
  foto: string | null;
  indice: string;
};

/*
  O índice sai do build como arquivo estático e só é baixado na primeira vez
  que a lupa abre. Uma promessa por aba: abrir e fechar não baixa de novo.
*/
let promessaIndice: Promise<Sugestao[]> | null = null;

function carregarIndice(): Promise<Sugestao[]> {
  promessaIndice ??= fetch(asset("/busca-indice.json"))
    .then((resposta) => {
      if (!resposta.ok) throw new Error(`busca-indice.json: ${resposta.status}`);
      return resposta.json() as Promise<ItemIndice[]>;
    })
    .then((itens) =>
      itens.map(([id, nome, slug, marca, codigo, preco, foto]) => ({
        id,
        nome,
        slug,
        marca,
        preco,
        foto,
        indice: indiceDeBusca({ nome, marca, codigo }),
      })),
    )
    .catch((erro) => {
      // Falhou: a próxima abertura tenta de novo.
      promessaIndice = null;
      throw erro;
    });
  return promessaIndice;
}

/** Lupa do cabeçalho: botão + painel de busca. Atalhos: `/` e Ctrl+K (Cmd+K no Mac). */
export function BuscaCabecalho() {
  const [aberta, setAberta] = useState(false);
  const botaoRef = useRef<HTMLButtonElement>(null);
  const caminho = usePathname();

  // Mesmo padrão do menu: trocar de página fecha o painel sem efeito.
  const [caminhoDaBusca, setCaminhoDaBusca] = useState(caminho);
  if (caminho !== caminhoDaBusca) {
    setCaminhoDaBusca(caminho);
    setAberta(false);
  }

  useEffect(() => {
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "k" && (e.ctrlKey || e.metaKey) && !e.altKey) {
        e.preventDefault();
        setAberta(true);
        return;
      }
      if (e.key !== "/" || e.ctrlKey || e.metaKey || e.altKey) return;
      const alvo = e.target as HTMLElement | null;
      const digitando =
        alvo?.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(alvo?.tagName ?? "");
      if (digitando) return;
      e.preventDefault();
      setAberta(true);
    };
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, []);

  useEffect(() => {
    if (!aberta) return;
    const anterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = anterior;
    };
  }, [aberta]);

  const fechar = () => {
    setAberta(false);
    botaoRef.current?.focus();
  };

  return (
    <>
      <button
        ref={botaoRef}
        type="button"
        onClick={() => setAberta(true)}
        aria-label="Buscar produtos"
        aria-haspopup="dialog"
        aria-expanded={aberta}
        aria-keyshortcuts="/ Control+K"
        className="grid size-10 place-items-center text-marinho-900 transition-opacity duration-400 hover:opacity-70"
      >
        <Search size={19} strokeWidth={1.25} />
      </button>

      <AnimatePresence>{aberta && <PainelBusca aoFechar={fechar} />}</AnimatePresence>
    </>
  );
}

function PainelBusca({ aoFechar }: { aoFechar: () => void }) {
  const router = useRouter();
  const [termo, setTermo] = useState("");
  const [itens, setItens] = useState<Sugestao[] | null>(null);
  const [erro, setErro] = useState(false);
  const [ativo, setAtivo] = useState(-1);
  const [tentativa, setTentativa] = useState(0);
  const painelRef = useRef<HTMLDivElement>(null);
  const campoRef = useRef<HTMLInputElement>(null);
  const idLista = useId();

  useEffect(() => {
    campoRef.current?.focus();
  }, []);

  useEffect(() => {
    let vivo = true;
    carregarIndice().then(
      (lista) => vivo && setItens(lista),
      () => vivo && setErro(true),
    );
    return () => {
      vivo = false;
    };
  }, [tentativa]);

  const termoLimpo = termo.trim();
  const buscando = termoLimpo.length >= MIN_LETRAS;

  const { sugestoes, total } = useMemo(() => {
    if (!buscando || !itens) return { sugestoes: [], total: 0 };
    const partes = partesDaBusca(termoLimpo);
    if (!partes.length) return { sugestoes: [], total: 0 };
    const achados = itens.filter((p) => casaBusca(p.indice, partes));
    return { sugestoes: achados.slice(0, MAX_SUGESTOES), total: achados.length };
  }, [buscando, itens, termoLimpo]);

  // Nova lista de sugestões: nenhuma opção destacada (ajuste durante o render).
  const [assinatura, setAssinatura] = useState(termoLimpo);
  if (assinatura !== termoLimpo) {
    setAssinatura(termoLimpo);
    setAtivo(-1);
  }

  const irPara = (href: string) => {
    aoFechar();
    router.push(href);
  };

  const aoTeclarPainel = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Escape") {
      e.preventDefault();
      aoFechar();
      return;
    }
    if (e.key !== "Tab" || !painelRef.current) return;
    // Foco preso no painel: Tab no último volta ao primeiro, e vice-versa.
    const focaveis = [
      ...painelRef.current.querySelectorAll<HTMLElement>(
        'a[href]:not([tabindex="-1"]), button:not([disabled]), input:not([disabled])',
      ),
    ];
    if (!focaveis.length) return;
    const primeiro = focaveis[0];
    const ultimo = focaveis[focaveis.length - 1];
    if (e.shiftKey && document.activeElement === primeiro) {
      e.preventDefault();
      ultimo.focus();
    } else if (!e.shiftKey && document.activeElement === ultimo) {
      e.preventDefault();
      primeiro.focus();
    }
  };

  const aoTeclarCampo = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!sugestoes.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setAtivo((i) => (i + 1) % sugestoes.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setAtivo((i) => (i <= 0 ? sugestoes.length - 1 : i - 1));
    }
  };

  const aoEnviar = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (ativo >= 0 && sugestoes[ativo]) irPara(`/produtos/${sugestoes[ativo].slug}`);
    else if (termoLimpo) irPara(hrefBusca(termoLimpo));
  };

  const idOpcao = (i: number) => `${idLista}-${i}`;

  let aviso: string | null = null;
  if (erro) aviso = "Não foi possível carregar a busca agora.";
  else if (!buscando) aviso = termoLimpo ? "Digite ao menos 2 letras." : null;
  else if (!itens) aviso = "Carregando o acervo...";
  else if (!total) aviso = `Nenhuma peça encontrada para “${termoLimpo}”.`;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 z-[70]"
    >
      {/* Clique fora do painel (desktop) fecha. No mobile o painel ocupa a tela. */}
      <div
        aria-hidden="true"
        onClick={aoFechar}
        className="absolute inset-0 bg-marinho-950/35 backdrop-blur-[2px]"
      />

      <motion.div
        ref={painelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Buscar produtos"
        onKeyDown={aoTeclarPainel}
        initial={{ y: -16 }}
        animate={{ y: 0 }}
        exit={{ y: -16 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        className="grao relative flex h-full flex-col bg-fundo md:h-auto md:max-h-[85vh] md:border-b md:border-marinho-500/12 md:shadow-[0_24px_60px_-30px_rgba(10,18,38,0.45)]"
      >
        <form
          role="search"
          onSubmit={aoEnviar}
          className="area flex items-center gap-4 border-b border-marinho-500/12 py-5 md:py-7"
        >
          <Search
            size={20}
            strokeWidth={1.25}
            aria-hidden="true"
            className="shrink-0 text-marinho-700"
          />
          <input
            ref={campoRef}
            type="search"
            value={termo}
            onChange={(e) => setTermo(e.target.value)}
            onKeyDown={aoTeclarCampo}
            placeholder="Buscar por peça, marca ou código"
            aria-label="Buscar produtos"
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={sugestoes.length > 0}
            aria-controls={idLista}
            aria-activedescendant={ativo >= 0 ? idOpcao(ativo) : undefined}
            autoComplete="off"
            enterKeyHint="search"
            className="min-w-0 flex-1 border-0 bg-transparent font-display text-2xl font-light text-marinho-900 placeholder:text-marinho-700/70 focus:outline-none md:text-3xl [&::-webkit-search-cancel-button]:hidden"
          />
          <button
            type="button"
            onClick={aoFechar}
            aria-label="Fechar busca"
            className="grid size-10 shrink-0 place-items-center text-marinho-900 transition-opacity duration-400 hover:opacity-70"
          >
            <X size={22} strokeWidth={1.25} />
          </button>
        </form>

        <div className="area flex-1 overflow-y-auto overscroll-contain pb-8 pt-4 md:flex-none">
          <p aria-live="polite" className={cn(aviso ? "py-4 font-sans text-[0.875rem] font-light text-marinho-800/80" : "sr-only")}>
            {aviso ??
              (buscando && total
                ? `${total.toLocaleString("pt-BR")} ${total === 1 ? "peça encontrada" : "peças encontradas"}.`
                : "")}
          </p>
          {erro && (
            <button
              type="button"
              onClick={() => {
                setErro(false);
                setTentativa((n) => n + 1);
              }}
              className="font-sans text-[0.75rem] uppercase tracking-[0.16em] text-carmim-600 transition-colors duration-400 hover:text-carmim-700"
            >
              Tentar de novo
            </button>
          )}

          <ul id={idLista} role="listbox" aria-label="Sugestões" className="grid gap-1 md:grid-cols-2 md:gap-x-8">
            {sugestoes.map((p, i) => (
              <li
                key={p.id}
                id={idOpcao(i)}
                role="option"
                aria-selected={i === ativo}
              >
                <Link
                  href={`/produtos/${p.slug}`}
                  tabIndex={-1}
                  onClick={aoFechar}
                  onMouseEnter={() => setAtivo(i)}
                  className={cn(
                    "flex items-center gap-4 border-b border-marinho-500/10 py-3 transition-colors duration-300",
                    i === ativo && "bg-marinho-500/[0.06]",
                  )}
                >
                  <span className="relative block h-[3.75rem] w-12 shrink-0 overflow-hidden border border-marinho-500/10 bg-ladrilho">
                    {p.foto && (
                      <Image src={p.foto} alt="" fill sizes="48px" className="object-contain p-1" />
                    )}
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="truncate text-[0.9375rem] leading-snug text-marinho-900">{p.nome}</span>
                    {p.marca && (
                      <span className="sobrescrita truncate text-[0.5625rem] text-carmim-600">{p.marca}</span>
                    )}
                  </span>
                  <span className="shrink-0 font-sans text-[0.8125rem] tabular-nums text-marinho-900">
                    {precoFormatado(p.preco) ?? "Sob consulta"}
                  </span>
                </Link>
              </li>
            ))}
          </ul>

          {buscando && itens && (
            <Link
              href={hrefBusca(termoLimpo)}
              onClick={aoFechar}
              className="group mt-6 inline-flex items-center gap-3 font-sans text-[0.75rem] uppercase tracking-[0.16em] text-marinho-900 transition-colors duration-400 hover:text-carmim-600"
            >
              Ver todos os resultados para “{termoLimpo}”
              <ArrowRight
                size={14}
                strokeWidth={1.5}
                aria-hidden="true"
                className="transition-transform duration-400 group-hover:translate-x-1"
              />
            </Link>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
