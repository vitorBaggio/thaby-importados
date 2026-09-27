import { iniciais } from "@/lib/texto";
import { LacoTracejado } from "@/componentes/marca/RotaDeVoo";

/**
 * Nem todo item do acervo tem foto liberada. Em vez de um cinza vazio,
 * o espaço vira uma peça de marca e mantém a vitrine coerente.
 *
 * Recebe só texto (sem consultar o catálogo) para servir também ao pedido,
 * que não deve carregar o acervo inteiro no navegador.
 */
export function PlaceholderProduto({
  nome,
  marca,
  categoria,
  compacto = false,
}: {
  nome: string;
  marca?: string | null;
  categoria?: string;
  /** Miniatura (pedido): só as iniciais e o aviso, em corpo menor. */
  compacto?: boolean;
}) {
  if (compacto) {
    return (
      <span className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 overflow-hidden bg-gradient-to-br from-marfim to-areia px-1 text-center">
        <span className="font-display text-2xl font-light leading-none text-marinho-500/70">
          {iniciais(marca ?? nome)}
        </span>
        <span className="font-sans text-[0.5rem] uppercase leading-tight tracking-[0.14em] text-marinho-700">
          Foto sob consulta
        </span>
      </span>
    );
  }

  return (
    <span className="absolute inset-0 grid place-items-center overflow-hidden bg-gradient-to-br from-marfim to-areia">
      <LacoTracejado className="absolute -right-16 -top-16 h-64 w-64 text-marinho-500/10" />

      <span className="relative flex flex-col items-center gap-4 px-6 text-center">
        <span className="font-display text-5xl font-light leading-none text-marinho-500/70">
          {iniciais(marca ?? nome)}
        </span>
        <span className="sobrescrita text-[0.5rem] text-marinho-600/80">
          {categoria ?? "Acervo"}
        </span>
      </span>

      <span className="absolute bottom-4 left-1/2 -translate-x-1/2 font-sans text-[0.5625rem] uppercase tracking-[0.22em] text-marinho-600/75">
        Foto sob consulta
      </span>
    </span>
  );
}
