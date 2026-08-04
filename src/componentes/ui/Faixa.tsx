import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * Faixa horizontal em rolagem contínua.
 * O conteúdo é duplicado e a animação anda exatamente -50%, então o loop é
 * imperceptível sem precisar medir largura em JS.
 */
export function Faixa({
  children,
  className,
  duracao = 42,
  invertido = false,
}: {
  children: ReactNode;
  className?: string;
  duracao?: number;
  invertido?: boolean;
}) {
  return (
    <div
      className={cn(
        "group/faixa relative flex overflow-hidden",
        "[mask-image:linear-gradient(90deg,transparent,black_8%,black_92%,transparent)]",
        className,
      )}
    >
      {[0, 1].map((copia) => (
        <div
          key={copia}
          aria-hidden={copia === 1}
          className="flex shrink-0 animate-[marquee_var(--duracao)_linear_infinite] items-center group-hover/faixa:[animation-play-state:paused] motion-reduce:animate-none"
          style={
            {
              "--duracao": `${duracao}s`,
              animationDirection: invertido ? "reverse" : "normal",
            } as React.CSSProperties
          }
        >
          {children}
        </div>
      ))}
    </div>
  );
}
