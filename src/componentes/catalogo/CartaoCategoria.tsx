import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/cn";
import { Revelar } from "@/componentes/ui/Revelar";
import { RevelarImagem } from "@/componentes/ui/RevelarImagem";
import { LacoTracejado } from "@/componentes/marca/RotaDeVoo";
import { produtosDaCategoria, type Categoria } from "@/dados/catalogo";

export function CartaoCategoria({
  categoria,
  atraso = 0,
  destaque = false,
}: {
  categoria: Categoria;
  atraso?: number;
  destaque?: boolean;
}) {
  const quantidade = produtosDaCategoria(categoria.id).length;

  return (
    <Revelar atraso={atraso} deslocamento={28}>
      <Link
        href={`/categorias/${categoria.slug}`}
        className="group/categoria block h-full"
      >
        <div
          className={cn(
            "relative overflow-hidden border border-marinho-500/10 bg-ladrilho",
            destaque ? "aspect-[4/3] md:aspect-[16/11]" : "aspect-[4/5]",
          )}
        >
          {categoria.imagem ? (
            <RevelarImagem atraso={atraso}>
              <Image
                src={categoria.imagem}
                alt={categoria.nome}
                fill
                sizes={destaque ? "(min-width: 1024px) 50vw, 92vw" : "(min-width: 1024px) 30vw, 45vw"}
                className="object-contain p-8 transition-transform duration-[1100ms] ease-[var(--ease-suave)] group-hover/categoria:scale-[1.05] md:p-12"
              />
            </RevelarImagem>
          ) : (
            <span className="absolute inset-0 grid place-items-center bg-gradient-to-br from-marfim to-areia">
              <LacoTracejado className="h-40 w-40 text-marinho-500/15" />
            </span>
          )}

          <span className="pointer-events-none absolute inset-0 bg-marinho-900/0 transition-colors duration-700 group-hover/categoria:bg-marinho-900/[0.05]" />

          <span className="absolute right-4 top-4 grid size-9 translate-y-1 place-items-center border border-marinho-900/10 bg-fundo/85 text-marinho-800 opacity-0 backdrop-blur-sm transition-all duration-500 ease-[var(--ease-suave)] group-hover/categoria:translate-y-0 group-hover/categoria:opacity-100">
            <ArrowUpRight size={15} strokeWidth={1.5} />
          </span>
        </div>

        <div className="flex items-baseline justify-between gap-4 pt-5">
          <h3
            className={cn(
              "font-display font-light leading-tight text-marinho-900/90 transition-colors duration-500 group-hover/categoria:text-marinho-900",
              destaque ? "text-2xl md:text-3xl" : "text-xl md:text-2xl",
            )}
          >
            {categoria.nome}
          </h3>

          <span className="shrink-0 font-sans text-[0.625rem] uppercase tabular-nums tracking-[0.18em] text-marinho-700/75">
            {quantidade > 0 ? `${quantidade} ${quantidade === 1 ? "peça" : "peças"}` : "Sob consulta"}
          </span>
        </div>

        <p className="mt-2.5 max-w-md text-[0.875rem] font-light leading-relaxed legivel text-marinho-800/70">
          {categoria.resumo}
        </p>
      </Link>
    </Revelar>
  );
}
