"use client";

import type { ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/cn";

/**
 * Revelação de imagem por máscara.
 *
 * Em vez de aparecer com fade, a foto é descoberta de baixo para cima por um
 * `clip-path` enquanto a própria imagem alivia de 1.08 para 1.0. São dois
 * movimentos em direções diferentes — é isso que dá a sensação de peso, e é o
 * gesto que separa fotografia editorial de imagem de catálogo.
 *
 * O filho deve usar `fill`: este componente já é o pai posicionado.
 */
export function RevelarImagem({
  children,
  className,
  atraso = 0,
  duracao = 1.25,
}: {
  children: ReactNode;
  className?: string;
  atraso?: number;
  duracao?: number;
}) {
  const semMovimento = useReducedMotion();

  if (semMovimento) {
    return <div className={cn("absolute inset-0", className)}>{children}</div>;
  }

  const visor = { once: true, margin: "-8% 0px -4% 0px" } as const;
  const curva = [0.16, 1, 0.3, 1] as const;

  return (
    <motion.div
      className={cn("absolute inset-0", className)}
      initial={{ clipPath: "inset(0% 0% 100% 0%)" }}
      whileInView={{ clipPath: "inset(0% 0% 0% 0%)" }}
      viewport={visor}
      transition={{ duration: duracao, delay: atraso, ease: curva }}
    >
      <motion.div
        className="absolute inset-0"
        initial={{ scale: 1.08 }}
        whileInView={{ scale: 1 }}
        viewport={visor}
        transition={{ duration: duracao + 0.35, delay: atraso, ease: curva }}
      >
        {children}
      </motion.div>
    </motion.div>
  );
}
