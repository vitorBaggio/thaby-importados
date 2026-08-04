import { ArrowRight } from "lucide-react";
import { CabecalhoSecao, Secao } from "@/componentes/ui/Secao";
import { BotaoLink } from "@/componentes/ui/Botao";
import { CartaoCategoria } from "@/componentes/catalogo/CartaoCategoria";
import { RotaDeVoo } from "@/componentes/marca/RotaDeVoo";
import { categorias } from "@/dados/catalogo";

export function CategoriasDestaque() {
  const [primeira, segunda, ...demais] = categorias;
  const grade = demais.slice(0, 3);

  return (
    <Secao id="categorias" className="border-t border-marinho-200/8">
      <div className="area">
        <CabecalhoSecao
          numero="02"
          sobrescrita="O acervo"
          titulo="Dez frentes de curadoria."
          apoio="Cada categoria segue o mesmo critério: o que já é referência lá fora e ainda não chegou aqui direito."
          acao={
            <BotaoLink href="/categorias" variante="contorno">
              Ver todas
              <ArrowRight
                size={15}
                strokeWidth={1.5}
                className="transition-transform duration-500 group-hover/botao:translate-x-1"
              />
            </BotaoLink>
          }
        />

        <div className="mt-16 grid gap-x-8 gap-y-14 md:mt-20 md:grid-cols-2">
          <CartaoCategoria categoria={primeira} destaque />
          <CartaoCategoria categoria={segunda} destaque atraso={0.08} />
        </div>

        <div className="mt-14 grid gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
          {grade.map((categoria, indice) => (
            <CartaoCategoria
              key={categoria.id}
              categoria={categoria}
              atraso={indice * 0.07}
            />
          ))}
        </div>
      </div>

      <RotaDeVoo className="mt-24 opacity-70 md:mt-32" />
    </Secao>
  );
}
