import type { Metadata } from "next";
import { CabecalhoPagina } from "@/componentes/layout/CabecalhoPagina";
import { VitrineCatalogo } from "@/componentes/catalogo/VitrineCatalogo";
import { Migalhas } from "@/componentes/seo/DadosEstruturados";
import { BotaoLink } from "@/componentes/ui/Botao";
import {
  vitrineResumo,
  categoriasResumo,
  mapaSubParaSuper,
  totais,
} from "@/dados/catalogo";
import { linkWhatsApp, mensagensPadrao } from "@/dados/empresa";

export const metadata: Metadata = {
  title: "Catálogo",
  description:
    "O acervo completo de importados da Thaby: beleza, perfumaria, moda, acessórios, alimentação, infantil e mais. Busque por peça ou marca e monte sua lista de orçamento.",
  alternates: { canonical: "/catalogo" },
};

const trilha = [
  { nome: "Início", caminho: "/" },
  { nome: "Catálogo", caminho: "/catalogo" },
];

export default function PaginaCatalogo() {
  return (
    <>
      <Migalhas trilha={trilha} />

      <CabecalhoPagina
        trilha={trilha}
        sobrescrita={`${totais.produtos.toLocaleString("pt-BR")} peças · ${totais.marcas} marcas`}
        titulo="O acervo, peça por peça."
        apoio="O catálogo inteiro da Thaby, direto da fonte. Filtre por frente, busque por marca e monte sua lista de orçamento — o estoque gira rápido, então confirme sempre no WhatsApp."
        extra={
          <BotaoLink
            href={linkWhatsApp(mensagensPadrao.catalogo)}
            variante="contorno"
            externo
          >
            Pedir catálogo completo
          </BotaoLink>
        }
      />

      <div className="area pb-28 pt-10 md:pb-36">
        <VitrineCatalogo
          produtos={vitrineResumo}
          supercategorias={categoriasResumo}
          mapaSuper={mapaSubParaSuper}
        />
      </div>
    </>
  );
}
