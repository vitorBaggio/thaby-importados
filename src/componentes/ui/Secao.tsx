import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Revelar, RevelarTexto } from "./Revelar";

/**
 * Cabeçalho de seção padrão: numeração, sobrescrita, título serifado e
 * um parágrafo curto de apoio. A repetição é o que dá ritmo à página.
 */
export function CabecalhoSecao({
  numero,
  sobrescrita,
  titulo,
  apoio,
  alinhamento = "esquerda",
  acao,
  className,
}: {
  numero?: string;
  sobrescrita: string;
  titulo: string;
  apoio?: ReactNode;
  alinhamento?: "esquerda" | "centro";
  acao?: ReactNode;
  className?: string;
}) {
  const centralizado = alinhamento === "centro";

  return (
    <div
      className={cn(
        "flex flex-col gap-8",
        centralizado && "items-center text-center",
        acao && "lg:flex-row lg:items-end lg:justify-between lg:gap-16",
        className,
      )}
    >
      <div className={cn("max-w-2xl", centralizado && "mx-auto")}>
        <Revelar
          className={cn(
            "flex items-center gap-4",
            centralizado && "justify-center",
          )}
        >
          {numero && (
            <span className="font-sans text-micro tabular-nums text-carmim-400">
              {numero}
            </span>
          )}
          <span className="h-px w-8 bg-marinho-400/40" />
          <span className="sobrescrita text-marinho-200/70">{sobrescrita}</span>
        </Revelar>

        <h2 className="mt-7 text-fluid-2xl leading-[1.06] equilibrio texto-metal">
          <RevelarTexto texto={titulo} atraso={0.06} />
        </h2>

        {apoio && (
          <Revelar atraso={0.18}>
            <p className="mt-6 max-w-xl text-fluid-base font-light leading-relaxed legivel text-marinho-100/60">
              {apoio}
            </p>
          </Revelar>
        )}
      </div>

      {acao && (
        <Revelar atraso={0.24} className="shrink-0">
          {acao}
        </Revelar>
      )}
    </div>
  );
}

/** Espaçamento vertical consistente entre as seções da página. */
export function Secao({
  children,
  className,
  id,
  compacta = false,
}: {
  children: ReactNode;
  className?: string;
  id?: string;
  compacta?: boolean;
}) {
  return (
    <section
      id={id}
      className={cn(
        "relative",
        compacta ? "py-20 md:py-24" : "py-24 md:py-36 lg:py-44",
        className,
      )}
    >
      {children}
    </section>
  );
}
