import type { Metadata } from "next";
import { CabecalhoPagina } from "@/componentes/layout/CabecalhoPagina";
import { VitrineCatalogo } from "@/componentes/catalogo/VitrineCatalogo";
import { Migalhas } from "@/componentes/seo/DadosEstruturados";
import {
  vitrineResumo,
  categoriasResumo,
  mapaSubParaSuper,
  totais,
} from "@/dados/catalogo";

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
        apoio="Tudo o que temos disponível para você escolher e se apaixonar. Nosso estoque gira rápido, então confirme sempre pelo WhatsApp."
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
