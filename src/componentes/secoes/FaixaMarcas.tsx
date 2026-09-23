import { Faixa } from "@/componentes/ui/Faixa";
import { marcasVitrine } from "@/dados/catalogo";

/**
 * São marcas que realmente aparecem no acervo, curadas para a vitrine
 * (ver `marcasVitrine`), nada de logotipo genérico de banco de imagem.
 */
export function FaixaMarcas() {
  return (
    <section
      aria-label="Marcas presentes no acervo"
      className="relative border-y border-marinho-500/10 bg-areia/45 py-9"
    >
      <Faixa duracao={58}>
        {marcasVitrine.map((marca) => (
          <span key={marca} className="flex items-center">
            <span className="whitespace-nowrap px-9 font-display text-2xl font-light text-marinho-800/70 transition-colors duration-500 hover:text-marinho-900 md:text-3xl">
              {marca}
            </span>
            <span className="size-1 rotate-45 bg-carmim-500/50" />
          </span>
        ))}
      </Faixa>
    </section>
  );
}
