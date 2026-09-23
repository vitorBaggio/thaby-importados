import { ArrowRight } from "lucide-react";
import { CabecalhoSecao, Secao } from "@/componentes/ui/Secao";
import { BotaoLink } from "@/componentes/ui/Botao";
import { CartaoProduto } from "@/componentes/catalogo/CartaoProduto";
import { destaques } from "@/dados/catalogo";

export function ProdutosDestaque() {
  // Peças com foto primeiro — a vitrine da home não pode abrir com marcador.
  const selecao = [...destaques]
    .sort((a, b) => Number(!!b.imagem) - Number(!!a.imagem))
    .slice(0, 8);

  return (
    <Secao id="destaques">
      <div className="area">
        <CabecalhoSecao
          numero="03"
          sobrescrita="Selecionados"
          titulo="O que está saindo agora."
          apoio="Peças em destaque no acervo desta temporada. Disponibilidade e valores por WhatsApp. O estoque muda toda semana."
          acao={
            <BotaoLink href="/catalogo" variante="contorno">
              Catálogo completo
              <ArrowRight
                size={15}
                strokeWidth={1.5}
                className="transition-transform duration-500 group-hover/botao:translate-x-1"
              />
            </BotaoLink>
          }
        />

        <div className="mt-16 grid grid-cols-2 gap-x-6 gap-y-14 md:mt-20 md:gap-x-8 lg:grid-cols-4">
          {selecao.map((produto, indice) => (
            <CartaoProduto
              key={produto.id}
              produto={produto}
              atraso={(indice % 4) * 0.07}
            />
          ))}
        </div>
      </div>
    </Secao>
  );
}
