import type { Metadata } from "next";
import { CabecalhoPagina } from "@/componentes/layout/CabecalhoPagina";
import { Checkout } from "@/componentes/orcamento/Checkout";

/*
  O pedido vive no localStorage de quem está navegando, então a página é uma
  casca estática e todo o conteúdo monta no cliente. Não entra no sitemap nem
  no menu: só faz sentido a partir da gaveta.
*/
export const metadata: Metadata = {
  title: "Finalizar pedido",
  description: "Confira sua seleção e envie o pedido para a consultora que vai te atender.",
  alternates: { canonical: "/checkout" },
  robots: { index: false, follow: true },
};

const trilha = [
  { nome: "Início", caminho: "/" },
  { nome: "Finalizar pedido", caminho: "/checkout" },
];

export default function PaginaCheckout() {
  return (
    <>
      <CabecalhoPagina
        trilha={trilha}
        sobrescrita="Seu pedido"
        titulo="Finalizar pedido"
        apoio="Confira as peças e as quantidades, escolha quem vai te atender e o pedido segue pronto para o WhatsApp dela."
      />

      <div className="area pb-28 pt-12 md:pb-36 md:pt-16">
        <Checkout />
      </div>
    </>
  );
}
