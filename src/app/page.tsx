import { Hero } from "@/componentes/secoes/Hero";
import { FaixaMarcas } from "@/componentes/secoes/FaixaMarcas";
import { Manifesto } from "@/componentes/secoes/Manifesto";
import { CategoriasDestaque } from "@/componentes/secoes/CategoriasDestaque";
import { ProdutosDestaque } from "@/componentes/secoes/ProdutosDestaque";
import { Processo } from "@/componentes/secoes/Processo";
import { Convite } from "@/componentes/secoes/Convite";
import { DadosEstruturados } from "@/componentes/seo/DadosEstruturados";

export default function PaginaInicial() {
  return (
    <>
      <DadosEstruturados />
      <Hero />
      <FaixaMarcas />
      <Manifesto />
      <CategoriasDestaque />
      <ProdutosDestaque />
      <Processo />
      <Convite />
    </>
  );
}
