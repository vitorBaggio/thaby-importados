"use client";

import { ReactLenis } from "lenis/react";
import type { ReactNode } from "react";

/**
 * Scroll suave global.
 *
 * O peso do lerp é proposital: um catálogo de luxo pede inércia, não um scroll
 * elástico de landing page. Em `prefers-reduced-motion` o Lenis é desligado e o
 * navegador volta a mandar no scroll.
 */
export function ScrollSuave({ children }: { children: ReactNode }) {
  const semMovimento =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (semMovimento) return <>{children}</>;

  return (
    <ReactLenis
      root
      options={{
        lerp: 0.085,
        wheelMultiplier: 0.9,
        touchMultiplier: 1.6,
        smoothWheel: true,
      }}
    >
      {children}
    </ReactLenis>
  );
}
