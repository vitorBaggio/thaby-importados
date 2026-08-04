import Link from "next/link";
import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { Revelar, RevelarTexto } from "@/componentes/ui/Revelar";
import { LacoTracejado } from "@/componentes/marca/RotaDeVoo";

export type Trilha = { nome: string; caminho: string }[];

/**
 * Abertura padrão das páginas internas: migalhas, sobrescrita, título e apoio.
 * Mantém o cabeçalho fixo legível reservando o espaço do topo.
 */
export function CabecalhoPagina({
  trilha,
  sobrescrita,
  titulo,
  apoio,
  extra,
}: {
  trilha: Trilha;
  sobrescrita: string;
  titulo: string;
  apoio?: ReactNode;
  extra?: ReactNode;
}) {
  return (
    <header className="grao relative overflow-hidden border-b border-marinho-500/10 pb-16 pt-36 md:pb-20 md:pt-44">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-0 h-[30rem] w-[46rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,var(--color-marinho-700)_0%,transparent_65%)] opacity-30 blur-3xl" />
        <LacoTracejado className="absolute -right-32 top-0 h-[28rem] w-[28rem] text-marinho-500/10" />
      </div>

      <div className="area relative">
        <Revelar>
          <nav aria-label="Trilha de navegação">
            <ol className="flex flex-wrap items-center gap-2 font-sans text-[0.625rem] uppercase tracking-[0.18em] text-marinho-700/75">
              {trilha.map((item, indice) => {
                const ultimo = indice === trilha.length - 1;
                return (
                  <li key={item.caminho} className="flex items-center gap-2">
                    {ultimo ? (
                      <span className="text-marinho-700/85">{item.nome}</span>
                    ) : (
                      <>
                        <Link
                          href={item.caminho}
                          className="transition-colors duration-400 hover:text-marinho-900"
                        >
                          {item.nome}
                        </Link>
                        <ChevronRight size={11} strokeWidth={1.5} className="opacity-50" />
                      </>
                    )}
                  </li>
                );
              })}
            </ol>
          </nav>
        </Revelar>

        <div className="mt-10 flex flex-col gap-10 lg:flex-row lg:items-end lg:justify-between lg:gap-16">
          <div className="max-w-3xl">
            <Revelar atraso={0.06}>
              <span className="sobrescrita text-carmim-600">{sobrescrita}</span>
            </Revelar>

            <h1 className="mt-6 text-fluid-2xl font-light leading-[1.04] equilibrio texto-metal">
              <RevelarTexto texto={titulo} atraso={0.1} />
            </h1>

            {apoio && (
              <Revelar atraso={0.2}>
                <p className="mt-7 max-w-2xl text-fluid-base font-light leading-relaxed legivel text-marinho-800/65">
                  {apoio}
                </p>
              </Revelar>
            )}
          </div>

          {extra && (
            <Revelar atraso={0.26} className="shrink-0">
              {extra}
            </Revelar>
          )}
        </div>
      </div>
    </header>
  );
}
