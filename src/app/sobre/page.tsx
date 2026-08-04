import type { Metadata } from "next";
import Image from "next/image";
import { CabecalhoPagina } from "@/componentes/layout/CabecalhoPagina";
import { Migalhas } from "@/componentes/seo/DadosEstruturados";
import { Revelar } from "@/componentes/ui/Revelar";
import { RevelarImagem } from "@/componentes/ui/RevelarImagem";
import { Convite } from "@/componentes/secoes/Convite";
import { RotaDeVoo } from "@/componentes/marca/RotaDeVoo";
import { Logo } from "@/componentes/marca/Logo";
import { empresa } from "@/dados/empresa";
import { totais } from "@/dados/catalogo";

export const metadata: Metadata = {
  title: "A casa",
  description:
    "A história da Thaby Importados: uma operação de curadoria nascida em Sorriso, no Mato Grosso, que traz para o Brasil o que ainda não chegou aqui.",
  alternates: { canonical: "/sobre" },
};

const trilha = [
  { nome: "Início", caminho: "/" },
  { nome: "A casa", caminho: "/sobre" },
];

const valores = [
  {
    numero: "01",
    titulo: "Procedência antes de preço",
    texto:
      "Toda peça vem de canal oficial ou de fornecedor com histórico. Se a origem não é clara, não entra — por mais tentadora que seja a margem.",
  },
  {
    numero: "02",
    titulo: "Lote pequeno, escolha grande",
    texto:
      "Preferimos trazer poucas unidades de muitas coisas boas a encher o estoque com uma só. É mais trabalho e é o que mantém o acervo interessante.",
  },
  {
    numero: "03",
    titulo: "A conversa não termina na venda",
    texto:
      "Quem compra aqui volta a falar com a mesma pessoa. É o tipo de relação que só existe quando a operação é pequena de propósito.",
  },
];

const numeros = [
  { valor: String(empresa.fundacao), rotulo: "Primeira encomenda" },
  { valor: `${totais.marcas}+`, rotulo: "Marcas internacionais" },
  { valor: String(totais.categorias), rotulo: "Frentes de curadoria" },
  { valor: "BR", rotulo: "Envio para todo o país" },
];

export default function PaginaSobre() {
  return (
    <>
      <Migalhas trilha={trilha} />

      <CabecalhoPagina
        trilha={trilha}
        sobrescrita={`${empresa.cidade} · ${empresa.estado}`}
        titulo="Uma vitrine internacional no meio do Mato Grosso."
        apoio="A Thaby Importados existe porque alguém em Sorriso cansou de esperar. O que era um favor para amigas virou uma operação de curadoria com nome, CNPJ e uma régua própria de qualidade."
      />

      <section className="py-24 md:py-32">
        <div className="area grid gap-16 lg:grid-cols-12 lg:gap-20">
          <div className="lg:col-span-7">
            <Revelar>
              <p className="text-fluid-lg font-light leading-relaxed legivel text-marinho-900/85">
                Sorriso fica a mais de dois mil quilômetros do litoral. Aqui, o
                que é lançamento no exterior costuma levar temporadas para
                aparecer — e quando aparece, chega com outro nome, outra
                formulação, outro preço.
              </p>
            </Revelar>

            <Revelar atraso={0.1}>
              <div className="mt-9 flex flex-col gap-6 text-fluid-base font-light leading-relaxed legivel text-marinho-800/65">
                <p>
                  A Thaby começou resolvendo isso para um círculo pequeno: uma
                  encomenda aqui, um pedido ali, sempre com a mesma pergunta por
                  trás — dá para trazer o original, inteiro, sem enrolação?
                </p>
                <p>
                  Deu. E o que era favor virou método. Hoje o acervo cobre{" "}
                  {totais.categorias} frentes, de skincare coreano a perfumaria
                  fina, de bolsa de grife a brinquedo de licença oficial. O que
                  não mudou foi o critério: cada peça passa pela mão de alguém
                  antes de ser oferecida.
                </p>
                <p>
                  Não temos loja física de shopping nem catálogo infinito.
                  Temos curadoria, quantidade contada e um WhatsApp que
                  responde.
                </p>
              </div>
            </Revelar>

            <Revelar atraso={0.16}>
              <figure className="mt-14 border-l-2 border-carmim-500/60 pl-7">
                <blockquote className="font-display text-2xl font-light italic leading-snug text-marinho-900/85 md:text-3xl">
                  “Se eu não daria de presente, não vendo.”
                </blockquote>
                <figcaption className="mt-4 font-sans text-[0.625rem] uppercase tracking-[0.2em] text-marinho-700/75">
                  A régua da casa
                </figcaption>
              </figure>
            </Revelar>
          </div>

          <div className="lg:col-span-5">
            <Revelar deslocamento={40} className="lg:sticky lg:top-32">
              <div className="relative aspect-[4/5] overflow-hidden border border-marinho-500/10 bg-ladrilho">
                <RevelarImagem>
                  <Image
                    src="/categorias/beleza.webp"
                    alt="Seleção de itens de beleza importados da Thaby"
                    fill
                    sizes="(min-width: 1024px) 40vw, 92vw"
                    className="object-contain p-10"
                  />
                </RevelarImagem>
              </div>

              <div className="mt-10 grid grid-cols-2 gap-x-6 gap-y-8 border-t border-marinho-500/12 pt-9">
                {numeros.map((item) => (
                  <div key={item.rotulo}>
                    <p className="font-display text-3xl font-light leading-none text-marinho-900">
                      {item.valor}
                    </p>
                    <p className="mt-2.5 font-sans text-[0.5625rem] uppercase leading-relaxed tracking-[0.18em] text-marinho-700/75">
                      {item.rotulo}
                    </p>
                  </div>
                ))}
              </div>
            </Revelar>
          </div>
        </div>
      </section>

      <RotaDeVoo className="opacity-60" />

      <section className="py-24 md:py-32">
        <div className="area">
          <Revelar className="flex items-center gap-4">
            <span className="h-px w-8 bg-marinho-500/40" />
            <span className="sobrescrita text-marinho-700/80">
              O que sustenta a operação
            </span>
          </Revelar>

          <div className="mt-14 grid gap-x-10 gap-y-12 md:grid-cols-3">
            {valores.map((valor, indice) => (
              <Revelar key={valor.numero} atraso={indice * 0.08}>
                <span className="font-sans text-micro tabular-nums text-carmim-500">
                  {valor.numero}
                </span>
                <h2 className="mt-5 font-display text-2xl font-light leading-tight text-marinho-900">
                  {valor.titulo}
                </h2>
                <p className="mt-4 text-[0.9375rem] font-light leading-relaxed legivel text-marinho-800/75">
                  {valor.texto}
                </p>
              </Revelar>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-marinho-500/10 bg-areia/35 py-20">
        <div className="area flex flex-col items-center gap-8 text-center">
          <Logo variante="cor" tamanho={96} className="rounded-full bg-marfim-puro p-3" />
          <p className="max-w-xl text-[0.9375rem] font-light leading-relaxed legivel text-marinho-800/75">
            {empresa.nome} · CNPJ {empresa.cnpj} · {empresa.regiao}
          </p>
        </div>
      </section>

      <Convite />
    </>
  );
}
