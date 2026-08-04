"use client";

import type { ElementType, ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/cn";

type Props = {
  children: ReactNode;
  className?: string;
  /** Atraso em segundos — usado para escalonar itens de uma mesma linha. */
  atraso?: number;
  /** Distância inicial em pixels. Valores menores para textos, maiores para blocos. */
  deslocamento?: number;
  como?: ElementType;
};

/**
 * Entrada padrão do site: sobe alguns pixels com fade, uma única vez.
 * Curva longa e amplitude curta — a sensação é de peso, não de "pulo".
 */
export function Revelar({
  children,
  className,
  atraso = 0,
  deslocamento = 22,
  como = "div",
}: Props) {
  const semMovimento = useReducedMotion();
  const Componente = motion[como as "div"] ?? motion.div;

  if (semMovimento) {
    const Estatico = como;
    return <Estatico className={className}>{children}</Estatico>;
  }

  return (
    <Componente
      className={className}
      initial={{ opacity: 0, y: deslocamento }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-12% 0px -8% 0px" }}
      transition={{
        duration: 1.1,
        delay: atraso,
        ease: [0.16, 1, 0.3, 1],
      }}
    >
      {children}
    </Componente>
  );
}

/**
 * Revela palavra a palavra. Reservado para os títulos de abertura de seção —
 * usar em texto corrido deixa a leitura irritante.
 */
export function RevelarTexto({
  texto,
  className,
  atraso = 0,
}: {
  texto: string;
  className?: string;
  atraso?: number;
}) {
  const semMovimento = useReducedMotion();
  const palavras = texto.split(" ");

  if (semMovimento) return <span className={className}>{texto}</span>;

  return (
    <span className={cn("inline", className)}>
      {palavras.map((palavra, indice) => (
        <span key={`${palavra}-${indice}`} className="inline-block overflow-hidden align-bottom">
          <motion.span
            className="inline-block"
            initial={{ y: "108%" }}
            whileInView={{ y: 0 }}
            viewport={{ once: true, margin: "-10% 0px" }}
            transition={{
              duration: 1,
              delay: atraso + indice * 0.055,
              ease: [0.16, 1, 0.3, 1],
            }}
          >
            {palavra}
            {indice < palavras.length - 1 ? " " : ""}
          </motion.span>
        </span>
      ))}
    </span>
  );
}
