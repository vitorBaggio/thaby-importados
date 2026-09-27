import type { Metadata } from "next";
import { CabecalhoPagina } from "@/componentes/layout/CabecalhoPagina";
import { GradeProdutos } from "@/componentes/catalogo/GradeProdutos";
import { Migalhas } from "@/componentes/seo/DadosEstruturados";
import { LacoTracejado } from "@/componentes/marca/RotaDeVoo";
import { Revelar } from "@/componentes/ui/Revelar";
import { BotaoLink, LinkSublinhado } from "@/componentes/ui/Botao";
import { saleResumo } from "@/dados/catalogo";
import { linkWhatsApp } from "@/dados/empresa";

export const metadata: Metadata = {
  title: "Sale",
  description:
    "Oportunidades especiais da Thaby Importados: produtos selecionados, últimas unidades e achados com preços irresistíveis. Monte sua lista e confirme pelo WhatsApp.",
  alternates: { canonical: "/sale" },
};

const trilha = [
  { nome: "Início", caminho: "/" },
  { nome: "Sale", caminho: "/sale" },
];

const MENSAGEM_AVISO =
  "Olá! Quero ser avisada quando tiver novidades no Sale da Thaby.";

export default function PaginaSale() {
  const pecas = saleResumo.length;

  return (
    <>
      <Migalhas trilha={trilha} />

      <CabecalhoPagina
        trilha={trilha}
        sobrescrita={
          pecas > 0
            ? `Oportunidades · ${pecas} ${pecas === 1 ? "peça" : "peças"}`
            : "Oportunidades"
        }
        titulo="Sale da casa."
        apoio="Oportunidades especiais para encontrar seus favoritos por condições ainda mais especiais. Produtos selecionados, últimas unidades e achados com preços irresistíveis. Porque uma boa curadoria também sabe quando é hora de aproveitar."
      />

      <div className="area pb-28 pt-14 md:pb-36 md:pt-20">
        {pecas > 0 ? (
          <GradeProdutos produtos={saleResumo} />
        ) : (
          <Revelar>
            <div className="relative overflow-hidden border border-marinho-500/12 bg-areia/45 px-8 py-16 text-center md:py-24">
              <LacoTracejado className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 text-marinho-500/12" />

              <div className="relative mx-auto flex max-w-xl flex-col items-center">
                <span className="sobrescrita text-carmim-600">Sale</span>
                <p className="mt-6 font-display text-3xl font-light leading-tight equilibrio text-marinho-900 md:text-4xl">
                  Em breve, novas oportunidades por aqui.
                </p>

                <div className="mt-10 flex flex-col items-center gap-7">
                  <BotaoLink
                    href={linkWhatsApp(MENSAGEM_AVISO)}
                    externo
                    variante="carmim"
                    porte="lg"
                  >
                    Avise-me pelo WhatsApp
                  </BotaoLink>
                  <LinkSublinhado href="/novidades">Ver as novidades</LinkSublinhado>
                </div>
              </div>
            </div>
          </Revelar>
        )}
      </div>
    </>
  );
}
