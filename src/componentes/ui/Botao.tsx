import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";

type Variante = "solido" | "contorno" | "fantasma" | "carmim";
type Porte = "md" | "lg";

const variantes: Record<Variante, string> = {
  solido:
    "bg-marfim text-marinho-900 hover:bg-marfim-puro border border-marfim",
  contorno:
    "border border-marinho-200/25 text-marfim hover:border-marinho-200/60 hover:bg-marinho-200/[0.06]",
  fantasma: "text-marfim/70 hover:text-marfim border border-transparent",
  carmim:
    "bg-carmim-500 text-marfim-puro hover:bg-carmim-600 border border-carmim-500 hover:border-carmim-600",
};

const portes: Record<Porte, string> = {
  md: "h-11 px-6 text-[0.8125rem]",
  lg: "h-14 px-9 text-[0.875rem]",
};

const base =
  "group/botao relative inline-flex items-center justify-center gap-2.5 " +
  "font-sans font-normal uppercase tracking-[0.16em] whitespace-nowrap " +
  "transition-colors duration-500 ease-[var(--ease-suave)] " +
  "disabled:pointer-events-none disabled:opacity-40";

type EstiloProps = {
  variante?: Variante;
  porte?: Porte;
  className?: string;
  children: ReactNode;
};

function classes({ variante = "solido", porte = "md", className }: Omit<EstiloProps, "children">) {
  return cn(base, variantes[variante], portes[porte], className);
}

export function Botao({
  variante,
  porte,
  className,
  children,
  ...resto
}: EstiloProps & Omit<ComponentProps<"button">, "children" | "className">) {
  return (
    <button className={classes({ variante, porte, className })} {...resto}>
      {children}
    </button>
  );
}

export function BotaoLink({
  variante,
  porte,
  className,
  children,
  href,
  externo,
  ...resto
}: EstiloProps & { href: string; externo?: boolean } & Omit<
    ComponentProps<typeof Link>,
    "href" | "children" | "className"
  >) {
  const props = externo
    ? { target: "_blank" as const, rel: "noopener noreferrer" }
    : {};

  return (
    <Link
      href={href}
      className={classes({ variante, porte, className })}
      {...props}
      {...resto}
    >
      {children}
    </Link>
  );
}

/**
 * Link de texto com sublinhado que cresce a partir da esquerda.
 * É o padrão de "ler mais" do site inteiro.
 */
export function LinkSublinhado({
  href,
  children,
  className,
  externo,
}: {
  href: string;
  children: ReactNode;
  className?: string;
  externo?: boolean;
}) {
  const props = externo ? { target: "_blank", rel: "noopener noreferrer" } : {};

  return (
    <Link
      href={href}
      className={cn(
        "group/link relative inline-flex items-center gap-2 text-[0.8125rem] uppercase tracking-[0.16em] text-marfim/75 transition-colors duration-400 hover:text-marfim",
        className,
      )}
      {...props}
    >
      <span className="relative">
        {children}
        <span className="absolute -bottom-1.5 left-0 h-px w-full origin-left scale-x-0 bg-carmim-500 transition-transform duration-500 ease-[var(--ease-suave)] group-hover/link:scale-x-100" />
      </span>
    </Link>
  );
}
