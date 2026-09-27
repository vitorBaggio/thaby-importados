import type { Metadata } from "next";
import { CabecalhoPagina } from "@/componentes/layout/CabecalhoPagina";
import { GradeProdutos } from "@/componentes/catalogo/GradeProdutos";
import { Migalhas } from "@/componentes/seo/DadosEstruturados";
import { BotaoLink } from "@/componentes/ui/Botao";
import { QTD_NOVIDADES, novidadesResumo } from "@/dados/catalogo";

export const metadata: Metadata = {
  title: "Novidades",
  description:
    "Os lançamentos que acabaram de chegar à Thaby Importados: beleza, perfumaria, moda e achados garimpados pelo mundo. Monte sua lista e confirme pelo WhatsApp.",
  alternates: { canonical: "/novidades" },
};

const trilha = [
  { nome: "Início", caminho: "/" },
  { nome: "Novidades", caminho: "/novidades" },
];

export default function PaginaNovidades() {
  return (
    <>
      <Migalhas trilha={trilha} />

      <CabecalhoPagina
        trilha={trilha}
        sobrescrita={`Recém-chegados · ${QTD_NOVIDADES} peças`}
        titulo="Novidades da casa."
        apoio="O que acabou de chegar por aqui. Uma seleção de lançamentos, tendências e achados que encontramos pelo mundo e trouxemos para a Thaby. Novidades para você descobrir antes de todo mundo."
        extra={
          <BotaoLink href="/catalogo" variante="contorno">
            Ver o catálogo completo
          </BotaoLink>
        }
      />

      <div className="area pb-28 pt-14 md:pb-36 md:pt-20">
        <GradeProdutos produtos={novidadesResumo} />
      </div>
    </>
  );
}
