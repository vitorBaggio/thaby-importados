"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { Menu, ShoppingBag, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { NOME_CABECALHO } from "@/lib/transicoes";
import { Logo } from "@/componentes/marca/Logo";
import { useOrcamento } from "@/componentes/orcamento/ContextoOrcamento";
import { empresa, linkWhatsApp, mensagensPadrao } from "@/dados/empresa";

const navegacao = [
  // As páginas de produto pertencem ao catálogo, então acendem o mesmo item.
  { rotulo: "Catálogo", href: "/catalogo", prefixos: ["/catalogo", "/produtos"] },
  { rotulo: "Curadoria", href: "/categorias", prefixos: ["/categorias"] },
  { rotulo: "A casa", href: "/sobre", prefixos: ["/sobre"] },
  { rotulo: "Contato", href: "/contato", prefixos: ["/contato"] },
] as const;

export function Cabecalho() {
  const [rolou, setRolou] = useState(false);
  const [menuAberto, setMenuAberto] = useState(false);
  const caminho = usePathname();
  const { quantidadeTotal, abrir } = useOrcamento();

  // Ajuste durante a renderização: navegar fecha o menu sem passar por efeito.
  const [caminhoDoMenu, setCaminhoDoMenu] = useState(caminho);
  if (caminho !== caminhoDoMenu) {
    setCaminhoDoMenu(caminho);
    setMenuAberto(false);
  }

  useEffect(() => {
    const aoRolar = () => setRolou(window.scrollY > 24);
    aoRolar();
    window.addEventListener("scroll", aoRolar, { passive: true });
    return () => window.removeEventListener("scroll", aoRolar);
  }, []);

  useEffect(() => {
    if (!menuAberto) return;
    const anterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = anterior;
    };
  }, [menuAberto]);

  return (
    <>
      <header
        // Âncora espacial da transição: sem isso o cabeçalho desliza junto com
        // o conteúdo e o usuário perde a única referência fixa da tela.
        style={{ viewTransitionName: NOME_CABECALHO }}
        className={cn(
          "fixed inset-x-0 top-0 z-50 transition-all duration-700 ease-[var(--ease-suave)]",
          rolou
            ? "border-b border-marinho-500/12 bg-fundo/80 backdrop-blur-xl"
            : "border-b border-transparent bg-transparent",
        )}
      >
        <div className="area flex items-center justify-between gap-8 py-4">
          <Link
            href="/"
            aria-label={`${empresa.nome}, página inicial`}
            className="relative -my-2 flex items-center transition-opacity duration-500 hover:opacity-75"
          >
            <Logo
              tamanho={rolou ? 46 : 58}
              prioridade
              className="transition-[height,width] duration-700 ease-[var(--ease-suave)]"
            />
          </Link>

          <nav className="hidden items-center gap-10 lg:flex">
            {navegacao.map((item) => {
              const ativo = item.prefixos.some((prefixo) =>
                caminho.startsWith(prefixo),
              );

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "group relative py-2 font-sans text-[0.75rem] uppercase tracking-[0.2em] transition-colors duration-500",
                    ativo ? "text-marinho-900" : "text-marinho-800/70 hover:text-marinho-900",
                  )}
                >
                  {item.rotulo}
                  <span
                    className={cn(
                      "absolute -bottom-0.5 left-0 h-px w-full origin-left bg-carmim-500 transition-transform duration-500 ease-[var(--ease-suave)]",
                      ativo ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100",
                    )}
                  />
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2 md:gap-4">
            <BotaoOrcamento quantidade={quantidadeTotal} aoClicar={abrir} />

            <a
              href={linkWhatsApp(mensagensPadrao.geral)}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden h-10 items-center border border-marinho-500/28 px-6 font-sans text-[0.75rem] uppercase tracking-[0.18em] text-marinho-900 transition-colors duration-500 hover:border-carmim-500 hover:bg-carmim-500 md:inline-flex"
            >
              Falar agora
            </a>

            <button
              type="button"
              onClick={() => setMenuAberto(true)}
              aria-label="Abrir menu"
              className="grid size-10 place-items-center text-marinho-900 transition-opacity duration-400 hover:opacity-70 lg:hidden"
            >
              <Menu size={20} strokeWidth={1.25} />
            </button>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {menuAberto && (
          <MenuMobile caminho={caminho} aoFechar={() => setMenuAberto(false)} />
        )}
      </AnimatePresence>
    </>
  );
}

function BotaoOrcamento({
  quantidade,
  aoClicar,
}: {
  quantidade: number;
  aoClicar: () => void;
}) {
  return (
    <button
      type="button"
      onClick={aoClicar}
      aria-label={`Abrir lista de orçamento${
        quantidade > 0
          ? ` (${quantidade} ${quantidade === 1 ? "item" : "itens"})`
          : ""
      }`}
      className="group relative grid size-10 place-items-center text-marinho-900 transition-opacity duration-400 hover:opacity-70"
    >
      <ShoppingBag size={19} strokeWidth={1.25} />
      <AnimatePresence>
        {quantidade > 0 && (
          <motion.span
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="absolute -right-0.5 -top-0.5 grid min-w-4 place-items-center rounded-full bg-carmim-500 px-1 font-sans text-[0.5625rem] font-medium tabular-nums leading-4 text-marfim-puro"
          >
            {quantidade}
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  );
}

function MenuMobile({
  caminho,
  aoFechar,
}: {
  caminho: string;
  aoFechar: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className="fixed inset-0 z-[60] bg-fundo lg:hidden"
    >
      <div className="grao relative flex h-full flex-col">
        <div className="area flex items-center justify-between py-4">
          <Logo tamanho={46} />
          <button
            type="button"
            onClick={aoFechar}
            aria-label="Fechar menu"
            className="grid size-10 place-items-center text-marinho-900"
          >
            <X size={22} strokeWidth={1.25} />
          </button>
        </div>

        <nav className="area flex flex-1 flex-col justify-center gap-2 pb-24">
          {navegacao.map((item, indice) => {
            const ativo = item.prefixos.some((prefixo) =>
              caminho.startsWith(prefixo),
            );
            return (
              <motion.div
                key={item.href}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.7,
                  delay: 0.08 + indice * 0.07,
                  ease: [0.16, 1, 0.3, 1],
                }}
              >
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-baseline gap-5 border-b border-marinho-500/10 py-5 font-display text-4xl font-light transition-colors duration-400",
                    ativo ? "text-marinho-900" : "text-marinho-800/75",
                  )}
                >
                  <span className="font-sans text-micro tabular-nums text-carmim-500">
                    0{indice + 1}
                  </span>
                  {item.rotulo}
                </Link>
              </motion.div>
            );
          })}

          <motion.a
            href={linkWhatsApp(mensagensPadrao.geral)}
            target="_blank"
            rel="noopener noreferrer"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="mt-10 inline-flex h-14 items-center justify-center bg-carmim-500 px-8 font-sans text-[0.8125rem] uppercase tracking-[0.18em] text-marfim-puro"
          >
            Falar no WhatsApp
          </motion.a>
        </nav>
      </div>
    </motion.div>
  );
}
