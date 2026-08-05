"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "motion/react";
import { TRAJETO_LACO } from "./RotaDeVoo";
import { asset } from "@/lib/asset";
import { empresa } from "@/dados/empresa";

/**
 * Abertura da marca.
 *
 * O laço tracejado do logo se desenha, o avião de papel percorre a volta e o
 * logo assenta no centro antes da cortina subir. Usa o motivo que já existe na
 * identidade — não é um carregador genérico.
 *
 * Vive no layout de propósito: monta uma vez por carregamento de página e
 * sobrevive à navegação client-side, então nunca repete durante a sessão.
 *
 * `prefers-reduced-motion` é tratado em CSS (`.abertura` some), o que evita o
 * flash que existiria se a decisão dependesse de JavaScript.
 */

/**
 * Quando a cortina começa a subir.
 *
 * O valor é curto de propósito: a entrada do hero roda por baixo, com os mesmos
 * ~1,1s de duração, então o conteúdo já aparece em movimento conforme a cortina
 * sobe. Uma cortina mais longa esconderia essa entrada inteira e o usuário
 * receberia uma página estática — que é justamente o oposto do efeito.
 */
const DURACAO_TOTAL = 1150;

const curva = [0.16, 1, 0.3, 1] as const;

export function AberturaMarca() {
  const [ativo, setAtivo] = useState(true);

  useEffect(() => {
    const reduzido = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const anterior = document.body.style.overflow;

    /*
      A trava do scroll é desfeita aqui dentro, e não só na limpeza do efeito:
      este componente mora no layout e nunca desmonta, então uma limpeza no
      retorno jamais rodaria e o site ficaria sem scroll para sempre.
    */
    const destravar = () => {
      document.body.style.overflow = anterior;
    };

    const encerrar = () => {
      setAtivo(false);
      destravar();
    };

    // Com movimento reduzido a cortina já está escondida por CSS; só desmonta.
    const relogio = window.setTimeout(encerrar, reduzido ? 0 : DURACAO_TOTAL);
    if (reduzido) return () => window.clearTimeout(relogio);

    document.body.style.overflow = "hidden";

    // Quem já conhece o site não deve ser obrigado a assistir de novo.
    window.addEventListener("pointerdown", encerrar, { once: true });
    window.addEventListener("keydown", encerrar, { once: true });
    window.addEventListener("wheel", encerrar, { once: true, passive: true });

    return () => {
      window.clearTimeout(relogio);
      window.removeEventListener("pointerdown", encerrar);
      window.removeEventListener("keydown", encerrar);
      window.removeEventListener("wheel", encerrar);
      destravar();
    };
  }, []);

  return (
    <AnimatePresence>
      {ativo && (
        <motion.div
          aria-hidden
          // `pointer-events-none`: a cortina não precisa receber clique (pular é
          // via listener no window) e assim jamais bloqueia a página, mesmo que
          // a animação de saída falhe.
          className="abertura grao grao-inverso pointer-events-none fixed inset-0 z-[100] grid place-items-center bg-marinho-950"
          // Cortina de teatro: a borda de baixo sobe e o palco aparece por baixo.
          initial={{ clipPath: "inset(0% 0% 0% 0%)" }}
          animate={{ clipPath: "inset(0% 0% 0% 0%)" }}
          exit={{ clipPath: "inset(0% 0% 100% 0%)" }}
          transition={{ duration: 0.75, ease: curva }}
        >
          <div className="relative size-[min(60vw,20rem)]">
            <svg viewBox="0 0 400 400" fill="none" className="h-full w-full">
              <motion.path
                d={TRAJETO_LACO}
                stroke="var(--color-marinho-400)"
                strokeWidth={3}
                strokeLinecap="round"
                strokeDasharray="9 15"
                initial={{ pathLength: 0, opacity: 0.2 }}
                animate={{ pathLength: 1, opacity: 0.75 }}
                transition={{ duration: 0.7, ease: "easeInOut" }}
              />

              <motion.g
                style={{ offsetPath: `path("${TRAJETO_LACO}")`, offsetRotate: "auto" }}
                initial={{ offsetDistance: "0%", opacity: 0 }}
                animate={{ offsetDistance: "100%", opacity: [0, 1, 1, 0] }}
                transition={{ duration: 0.74, delay: 0.03, ease: "easeInOut" }}
              >
                <g transform="translate(-13 -13)">
                  <path d="M26 3 2 13.4l9.1 2.6L26 3Z" fill="var(--color-carmim-400)" />
                  <path d="M26 3 11.1 16v9l4.4-5.3L26 3Z" fill="var(--color-carmim-600)" />
                  <path d="M11.1 16 26 3l-10.5 16.7L11.1 16Z" fill="var(--color-carmim-500)" />
                </g>
              </motion.g>
            </svg>

            <motion.div
              className="absolute inset-[18%] grid place-items-center"
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.45, delay: 0.5, ease: curva }}
            >
              <Image
                src={asset("/marca/logo-ivory.png")}
                alt={empresa.nome}
                width={260}
                height={260}
                priority
                className="h-full w-full object-contain"
              />
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
