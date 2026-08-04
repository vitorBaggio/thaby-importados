import { Faixa } from "@/componentes/ui/Faixa";
import { marcas } from "@/dados/catalogo";

/**
 * Prova de procedência. São as marcas que realmente aparecem no acervo —
 * nada de logotipo genérico de banco de imagem.
 */
export function FaixaMarcas() {
  return (
    <section
      aria-label="Marcas presentes no acervo"
      className="relative border-y border-marinho-200/8 bg-marinho-900/40 py-9"
    >
      <Faixa duracao={58}>
        {marcas.map((marca) => (
          <span key={marca} className="flex items-center">
            <span className="whitespace-nowrap px-9 font-display text-2xl font-light text-marinho-100/45 transition-colors duration-500 hover:text-marfim md:text-3xl">
              {marca}
            </span>
            <span className="size-1 rotate-45 bg-carmim-500/50" />
          </span>
        ))}
      </Faixa>
    </section>
  );
}
