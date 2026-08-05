import type { Metadata } from "next";
import { CabecalhoPagina } from "@/componentes/layout/CabecalhoPagina";
import { CartaoCategoria } from "@/componentes/catalogo/CartaoCategoria";
import { Migalhas } from "@/componentes/seo/DadosEstruturados";
import { RotaDeVoo } from "@/componentes/marca/RotaDeVoo";
import { categorias, totais } from "@/dados/catalogo";

export const metadata: Metadata = {
  title: "Categorias",
  description:
    "As frentes de curadoria da Thaby Importados: beleza, moda, acessórios, alimentação, infantil, papelaria, tecnologia e mais.",
  alternates: { canonical: "/categorias" },
};

const trilha = [
  { nome: "Início", caminho: "/" },
  { nome: "Categorias", caminho: "/categorias" },
];

export default function PaginaCategorias() {
  return (
    <>
      <Migalhas trilha={trilha} />

      <CabecalhoPagina
        trilha={trilha}
        sobrescrita={`${totais.supercategorias} frentes · ${totais.subcategorias} categorias`}
        titulo="Por onde começar."
        apoio="Cada frente tem seu próprio critério de escolha, mas todas seguem a mesma régua: procedência conferida e quantidade contada."
      />

      <div className="area pb-28 pt-20 md:pb-36 md:pt-24">
        <div className="grid gap-x-8 gap-y-16 sm:grid-cols-2 lg:grid-cols-3">
          {categorias.map((categoria, indice) => (
            <CartaoCategoria
              key={categoria.id}
              categoria={categoria}
              atraso={(indice % 3) * 0.07}
            />
          ))}
        </div>
      </div>

      <RotaDeVoo className="pb-20 opacity-60" />
    </>
  );
}
