"use client";

import { useId, useRef } from "react";
import { motion, useReducedMotion, useScroll, useSpring, useTransform } from "motion/react";
import { cn } from "@/lib/cn";

/**
 * Motivo de assinatura da marca.
 *
 * O logo tem uma rota tracejada terminando num avião de papel. Aqui essa rota
 * atravessa a página: o tracejado é revelado por uma máscara conforme a seção
 * entra em cena e o avião percorre o caminho no ritmo do scroll.
 *
 * O avião fica dentro do SVG de propósito — `offset-path` num elemento SVG usa
 * o espaço de coordenadas do viewBox, então acompanha o traço em qualquer largura.
 */

const TRAJETO =
  "M 4 122 C 180 44, 340 10, 520 44 C 700 78, 780 168, 700 208 C 620 248, 470 214, 520 150 C 570 86, 800 68, 996 118";

type Props = {
  className?: string;
  comAviao?: boolean;
};

export function RotaDeVoo({ className, comAviao = true }: Props) {
  const referencia = useRef<HTMLDivElement>(null);
  const semMovimento = useReducedMotion();
  const identificador = useId().replace(/:/g, "");

  const { scrollYProgress } = useScroll({
    target: referencia,
    offset: ["start end", "end start"],
  });

  const progresso = useSpring(scrollYProgress, {
    stiffness: 55,
    damping: 22,
    restDelta: 0.001,
  });

  const revelacao = useTransform(progresso, [0.05, 0.7], [0, 1]);
  const distancia = useTransform(progresso, [0.05, 0.95], ["0%", "100%"]);
  const opacidadeAviao = useTransform(progresso, [0.04, 0.12, 0.9, 0.98], [0, 1, 1, 0]);

  const mascara = `mascara-rota-${identificador}`;
  const degrade = `degrade-rota-${identificador}`;

  return (
    <div
      ref={referencia}
      aria-hidden
      className={cn("pointer-events-none w-full", className)}
    >
      <svg viewBox="0 0 1000 260" fill="none" className="h-auto w-full">
        <defs>
          <linearGradient id={degrade} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="var(--color-marinho-800)" />
            <stop offset="40%" stopColor="var(--color-marinho-400)" />
            <stop offset="100%" stopColor="var(--color-marinho-700)" />
          </linearGradient>

          {/* Traço grosso e opaco revelando o tracejado fino que fica por baixo. */}
          <mask id={mascara}>
            <motion.path
              d={TRAJETO}
              stroke="#fff"
              strokeWidth={36}
              strokeLinecap="round"
              fill="none"
              style={{ pathLength: semMovimento ? 1 : revelacao }}
            />
          </mask>
        </defs>

        <path
          d={TRAJETO}
          stroke={`url(#${degrade})`}
          strokeWidth={2}
          strokeLinecap="round"
          strokeDasharray="10 14"
          mask={`url(#${mascara})`}
        />

        {comAviao && (
          <motion.g
            style={{
              offsetPath: `path("${TRAJETO}")`,
              offsetRotate: "auto",
              offsetDistance: semMovimento ? "100%" : distancia,
              opacity: semMovimento ? 1 : opacidadeAviao,
            }}
          >
            <g transform="translate(-13 -13)">
              <AviaoPaths />
            </g>
          </motion.g>
        )}
      </svg>
    </div>
  );
}

/** Redesenho vetorial do avião do logo — mesmas dobras, mesmo carmim. */
function AviaoPaths() {
  return (
    <>
      <path d="M26 3 2 13.4l9.1 2.6L26 3Z" fill="var(--color-carmim-400)" />
      <path d="M26 3 11.1 16v9l4.4-5.3L26 3Z" fill="var(--color-carmim-600)" />
      <path d="M11.1 16 26 3l-10.5 16.7L11.1 16Z" fill="var(--color-carmim-500)" />
    </>
  );
}

export function AviaoDePapel({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 28 28" fill="none" className={cn("h-7 w-7", className)} aria-hidden>
      <AviaoPaths />
    </svg>
  );
}

/**
 * Laço tracejado do logo em versão fechada e estática, para marca d'água
 * atrás de blocos de conteúdo.
 */
/** Traçado do laço do logo, compartilhado com a abertura da marca. */
export const TRAJETO_LACO =
  "M200 24c-92 0-166 68-166 158 0 84 66 152 158 152 78 0 142-52 142-118 0-56-46-100-104-100-48 0-86 34-86 76 0 34 28 60 62 60 26 0 48-20 48-44 0-18-14-32-32-32";

export function LacoTracejado({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 400 400"
      fill="none"
      className={cn("h-full w-full", className)}
    >
      <path
        d={TRAJETO_LACO}
        stroke="currentColor"
        strokeWidth={3}
        strokeLinecap="round"
        strokeDasharray="9 15"
      />
    </svg>
  );
}
