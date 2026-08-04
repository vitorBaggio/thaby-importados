import Image from "next/image";
import { cn } from "@/lib/cn";
import { empresa } from "@/dados/empresa";

type Props = {
  /** `cor` usa a arte original; `marfim` é a redução monocromática para fundo escuro. */
  variante?: "cor" | "marfim";
  tamanho?: number;
  className?: string;
  prioridade?: boolean;
};

/*
  Com o site em fundo claro, o padrão passa a ser a arte original em cores — o
  azul em degradê e o avião carmim aparecem como a marca foi desenhada. A
  redução monocromática fica reservada aos blocos escuros (rodapé, cortina).
*/
export function Logo({
  variante = "cor",
  tamanho = 56,
  className,
  prioridade = false,
}: Props) {
  return (
    <Image
      src={variante === "cor" ? "/marca/logo.png" : "/marca/logo-ivory.png"}
      alt={empresa.nome}
      width={tamanho}
      height={tamanho}
      priority={prioridade}
      className={cn("h-auto w-auto select-none", className)}
      style={{ height: tamanho, width: tamanho }}
    />
  );
}

/**
 * Assinatura tipográfica — usada onde o emblema circular ficaria pequeno demais
 * para ser legível (rodapé em coluna, listas, menu mobile).
 */
export function Assinatura({ className }: { className?: string }) {
  return (
    <span className={cn("flex flex-col leading-none", className)}>
      <span className="font-display text-2xl font-normal tracking-tight text-marinho-900">
        {empresa.nomeCurto}
      </span>
      <span className="sobrescrita mt-1 text-[0.5rem] text-carmim-500">
        Importados
      </span>
    </span>
  );
}
