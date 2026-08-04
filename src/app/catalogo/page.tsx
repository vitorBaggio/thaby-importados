import type { Metadata } from "next";
import { CabecalhoPagina } from "@/componentes/layout/CabecalhoPagina";
import { VitrineCatalogo } from "@/componentes/catalogo/VitrineCatalogo";
import { Migalhas } from "@/componentes/seo/DadosEstruturados";
import { BotaoLink } from "@/componentes/ui/Botao";
import { vitrine, totais } from "@/dados/catalogo";
import { linkWhatsApp, mensagensPadrao } from "@/dados/empresa";

export const metadata: Metadata = {
  title: "Catálogo",
  description:
    "O acervo de importados da Thaby: beleza, perfumaria, moda, acessórios, alimentação e brinquedos. Busque por peça, marca ou origem e monte sua lista de orçamento.",
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
        sobrescrita={`${totais.produtos} peças publicadas`}
        titulo="O acervo, peça por peça."
        apoio="Esta é a seleção publicada do que a Thaby tem em mãos. O estoque gira rápido e boa parte do acervo é montada sob encomenda — se não achar, pergunte."
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
        <VitrineCatalogo produtos={vitrine} />
      </div>
    </>
  );
}
