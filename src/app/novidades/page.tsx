import type { Metadata } from "next";
import { CabecalhoPagina } from "@/componentes/layout/CabecalhoPagina";
import { GradeProdutos } from "@/componentes/catalogo/GradeProdutos";
import { Migalhas } from "@/componentes/seo/DadosEstruturados";
import { LacoTracejado } from "@/componentes/marca/RotaDeVoo";
import { Revelar } from "@/componentes/ui/Revelar";
import { BotaoLink } from "@/componentes/ui/Botao";
import { DIAS_NOVIDADE, novidadesPorData, novidadesResumo } from "@/dados/catalogo";

export const metadata: Metadata = {
  title: "Novidades",
  description:
    "Os lançamentos que acabaram de chegar à Thaby Importados: beleza, perfumaria, moda e achados selecionados pelo mundo. Monte sua lista e confirme pelo WhatsApp.",
  alternates: { canonical: "/novidades" },
};

const trilha = [
  { nome: "Início", caminho: "/" },
  { nome: "Novidades", caminho: "/novidades" },
];

export default function PaginaNovidades() {
  const pecas = novidadesResumo.length;
  const contagem = `${pecas} ${pecas === 1 ? "peça" : "peças"}`;
  const sobrescrita = novidadesPorData
    ? pecas > 0
      ? `Últimos ${DIAS_NOVIDADE} dias · ${contagem}`
      : `Últimos ${DIAS_NOVIDADE} dias`
    : `Recém-chegados · ${contagem}`;

  return (
    <>
      <Migalhas trilha={trilha} />

      <CabecalhoPagina
        trilha={trilha}
        sobrescrita={sobrescrita}
        titulo="Novidades da casa."
        apoio="O que acabou de chegar por aqui. Uma seleção de lançamentos, tendências e achados que encontramos pelo mundo e trouxemos para a Thaby. Novidades para você descobrir antes de todo mundo."
        extra={
          <BotaoLink href="/catalogo" variante="contorno">
            Ver o catálogo completo
          </BotaoLink>
        }
      />

      <div className="area pb-28 pt-14 md:pb-36 md:pt-20">
        {pecas > 0 ? (
          <GradeProdutos produtos={novidadesResumo} />
        ) : (
          <Revelar>
            <div className="relative overflow-hidden border border-marinho-500/12 bg-areia/45 px-8 py-16 text-center md:py-24">
              <LacoTracejado className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 text-marinho-500/12" />

              <div className="relative mx-auto flex max-w-xl flex-col items-center">
                <span className="sobrescrita text-carmim-600">Novidades</span>
                <p className="mt-6 font-display text-3xl font-light leading-tight equilibrio text-marinho-900 md:text-4xl">
                  Novidades chegando em breve.
                </p>
                <p className="mt-5 text-marinho-700">
                  Enquanto isso, o acervo completo segue à sua espera.
                </p>

                <div className="mt-10">
                  <BotaoLink href="/catalogo" variante="carmim" porte="lg">
                    Explorar o catálogo
                  </BotaoLink>
                </div>
              </div>
            </div>
          </Revelar>
        )}
      </div>
    </>
  );
}
