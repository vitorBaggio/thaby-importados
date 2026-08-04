import Image from "next/image";
import { Revelar } from "@/componentes/ui/Revelar";
import { RevelarImagem } from "@/componentes/ui/RevelarImagem";
import { CabecalhoSecao, Secao } from "@/componentes/ui/Secao";
import { LinkSublinhado } from "@/componentes/ui/Botao";
import { LacoTracejado } from "@/componentes/marca/RotaDeVoo";

const pilares = [
  {
    titulo: "Curadoria, não estoque",
    texto:
      "Nada entra no acervo por acaso. Cada peça é escolhida por procedência, acabamento e por fazer sentido para quem já compra aqui.",
  },
  {
    titulo: "Quantidade contada",
    texto:
      "Trabalhamos com lotes pequenos. É o que garante exclusividade — e é também por isso que o que sai raramente volta.",
  },
  {
    titulo: "Atendimento com nome",
    texto:
      "Você fala com a Thaby, não com um formulário. Antes da compra, durante o envio e depois que a encomenda chega.",
  },
];

export function Manifesto() {
  return (
    <Secao className="overflow-hidden">
      <LacoTracejado className="pointer-events-none absolute -right-40 top-10 h-[34rem] w-[34rem] text-marinho-400/6" />

      <div className="area relative">
        <div className="grid gap-16 lg:grid-cols-12 lg:gap-20">
          <div className="lg:col-span-6 xl:col-span-5">
            <CabecalhoSecao
              numero="01"
              sobrescrita="A casa"
              titulo="Importar é escolher. E escolher bem leva tempo."
              apoio={
                <>
                  A Thaby nasceu em Sorriso, no meio do Mato Grosso, de uma
                  inconformidade simples: por que o que há de melhor lá fora
                  demora tanto para chegar aqui — e quando chega, chega
                  descaracterizado?
                </>
              }
            />

            <Revelar atraso={0.1} className="mt-12">
              <div className="flex flex-col divide-y divide-marinho-200/10 border-y border-marinho-200/10">
                {pilares.map((pilar) => (
                  <div key={pilar.titulo} className="py-7">
                    <h3 className="font-sans text-[0.8125rem] uppercase tracking-[0.16em] text-marfim/85">
                      {pilar.titulo}
                    </h3>
                    <p className="mt-3 max-w-md text-[0.9375rem] font-light leading-relaxed legivel text-marinho-100/50">
                      {pilar.texto}
                    </p>
                  </div>
                ))}
              </div>
            </Revelar>

            <Revelar atraso={0.16} className="mt-10">
              <LinkSublinhado href="/sobre">Conhecer a história</LinkSublinhado>
            </Revelar>
          </div>

          <div className="lg:col-span-6 lg:col-start-8 xl:col-span-6 xl:col-start-7">
            <Revelar deslocamento={40} className="lg:sticky lg:top-32">
              <figure className="relative">
                <div className="relative aspect-[3/4] overflow-hidden bg-marfim">
                  <RevelarImagem>
                    <Image
                      src="/categorias/acessorios-e-moda.webp"
                      alt="Composição de acessórios e peças de moda importadas"
                      fill
                      sizes="(min-width: 1024px) 45vw, 90vw"
                      className="object-contain p-10"
                    />
                  </RevelarImagem>
                </div>

                <div className="absolute -bottom-6 -left-6 hidden max-w-[15rem] border border-marinho-200/12 bg-marinho-900/90 p-6 backdrop-blur-sm md:block">
                  <p className="font-display text-4xl font-light leading-none text-marfim">
                    2021
                  </p>
                  <p className="mt-3 font-sans text-[0.625rem] uppercase leading-relaxed tracking-[0.18em] text-marinho-200/45">
                    Ano em que a primeira encomenda saiu de Sorriso
                  </p>
                </div>
              </figure>
            </Revelar>
          </div>
        </div>
      </div>
    </Secao>
  );
}
