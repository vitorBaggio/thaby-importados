import { ViewTransition } from "react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { iniciais } from "@/lib/texto";
import { nomeTransicaoProduto } from "@/lib/transicoes";
import { Revelar } from "@/componentes/ui/Revelar";
import { CartaoProduto } from "@/componentes/catalogo/CartaoProduto";
import { AcoesProduto } from "@/componentes/catalogo/AcoesProduto";
import { DadosProduto, Migalhas } from "@/componentes/seo/DadosEstruturados";
import { LacoTracejado } from "@/componentes/marca/RotaDeVoo";
import {
  categoriaPorId,
  precoFormatado,
  produtoPorSlug,
  produtos,
  relacionados,
  resumoProduto,
  superDaSubcategoria,
} from "@/dados/catalogo";

/*
  Todos os produtos são pré-renderizados no build. É o que a exportação estática
  do GitHub Pages exige (não há servidor para renderizar sob demanda), e no
  servidor/Vercel isso só melhora — tudo vira HTML pronto, sem primeira-visita
  lenta. `dynamicParams = false`: slug inexistente é 404 estático.
*/
export function generateStaticParams() {
  return produtos.map((produto) => ({ slug: produto.slug }));
}

export const dynamicParams = false;

export async function generateMetadata({
  params,
}: PageProps<"/produtos/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const produto = produtoPorSlug(slug);
  if (!produto) return {};
  const resumo = resumoProduto(produto);

  return {
    title: produto.nome,
    description: resumo,
    alternates: { canonical: `/produtos/${produto.slug}` },
    openGraph: {
      type: "website",
      title: `${produto.nome} · Thaby Importados`,
      description: resumo,
      images: produto.imagem ? [{ url: produto.imagem }] : undefined,
    },
  };
}

export default async function PaginaProduto({
  params,
}: PageProps<"/produtos/[slug]">) {
  const { slug } = await params;
  const produto = produtoPorSlug(slug);
  if (!produto) notFound();

  const categoria = categoriaPorId(produto.categoriaId);
  const superCat = superDaSubcategoria(produto.categoriaId);
  const sugestoes = relacionados(produto);
  const preco = precoFormatado(produto.preco);

  const trilha = [
    { nome: "Início", caminho: "/" },
    { nome: "Catálogo", caminho: "/catalogo" },
    ...(superCat
      ? [{ nome: superCat.nome, caminho: `/categorias/${superCat.slug}` }]
      : []),
    ...(categoria
      ? [{ nome: categoria.nome, caminho: `/categorias/${categoria.slug}` }]
      : []),
    { nome: produto.nome, caminho: `/produtos/${produto.slug}` },
  ];

  const ficha = [
    ...(categoria ? [{ rotulo: "Categoria", valor: categoria.nome }] : []),
    { rotulo: "Marca", valor: produto.marca ?? "Sem marca declarada" },
    ...(produto.codigo ? [{ rotulo: "Código", valor: produto.codigo }] : []),
    { rotulo: "Referência", valor: `#${produto.id}` },
  ];

  return (
    <>
      <DadosProduto produto={produto} />
      <Migalhas trilha={trilha} />

      <div className="area pb-24 pt-28 md:pt-36">
        <nav aria-label="Trilha de navegação">
          <ol className="flex flex-wrap items-center gap-2 font-sans text-[0.625rem] uppercase tracking-[0.18em] text-marinho-700/75">
            {trilha.map((item, indice) => {
              const ultimo = indice === trilha.length - 1;
              return (
                <li key={item.caminho} className="flex items-center gap-2">
                  {ultimo ? (
                    <span className="line-clamp-1 max-w-[16rem] text-marinho-700/85">
                      {item.nome}
                    </span>
                  ) : (
                    <>
                      <Link
                        href={item.caminho}
                        className="transition-colors duration-400 hover:text-marinho-900"
                      >
                        {item.nome}
                      </Link>
                      <ChevronRight size={11} strokeWidth={1.5} className="opacity-50" />
                    </>
                  )}
                </li>
              );
            })}
          </ol>
        </nav>

        <div className="mt-10 grid gap-12 lg:grid-cols-2 lg:gap-20">
          {/*
            Mesmo `name` do ladrilho na grade: o navegador pareia os dois e a
            foto morfa de lá para cá. Sem Revelar por fora — a entrada dela é a
            própria transição.
          */}
          <ViewTransition
            name={nomeTransicaoProduto(produto.id)}
            share="morph"
            default="none"
          >
            <figure className="relative aspect-square overflow-hidden border border-marinho-500/10 bg-ladrilho lg:sticky lg:top-28">
              {produto.imagem ? (
                <Image
                  src={produto.imagem}
                  alt={produto.nome}
                  fill
                  sizes="(min-width: 1024px) 46vw, 92vw"
                  priority
                  className="object-contain p-10 md:p-16"
                />
              ) : (
                <span className="absolute inset-0 grid place-items-center bg-gradient-to-br from-marfim to-areia">
                  <LacoTracejado className="absolute -right-20 -top-20 h-80 w-80 text-marinho-500/10" />
                  <span className="relative flex flex-col items-center gap-5">
                    <span className="font-display text-7xl font-light text-marinho-500/30">
                      {iniciais(produto.marca ?? produto.nome)}
                    </span>
                    <span className="sobrescrita text-[0.5625rem] text-marinho-600/80">
                      Foto sob consulta
                    </span>
                  </span>
                </span>
              )}
            </figure>
          </ViewTransition>

          <div className="lg:py-4">
            <Revelar>
              <div className="flex items-center gap-3">
                <span className="sobrescrita text-carmim-600">
                  {produto.marca ?? categoria?.nome ?? "Importado"}
                </span>
                {produto.destaque && (
                  <>
                    <span className="size-1 rotate-45 bg-marinho-500/40" />
                    <span className="sobrescrita text-marinho-700/75">
                      Destaque
                    </span>
                  </>
                )}
              </div>
            </Revelar>

            <Revelar atraso={0.06}>
              <h1 className="mt-6 text-fluid-xl font-light leading-[1.12] equilibrio text-marinho-900">
                {produto.nome}
              </h1>
            </Revelar>

            <Revelar atraso={0.12}>
              <p className="mt-7 max-w-lg text-fluid-base font-light leading-relaxed legivel text-marinho-800/70">
                {resumoProduto(produto)}
              </p>
            </Revelar>

            <Revelar atraso={0.18}>
              <div className="mt-10 border-y border-marinho-500/12 py-7">
                {produto.precoAnterior != null && (
                  <p className="mb-2 flex items-center gap-3 font-sans text-[0.8125rem] tabular-nums text-marinho-700/70">
                    <span className="sobrescrita text-[0.5625rem] text-carmim-600">Sale</span>
                    <s>
                      <span className="sr-only">De </span>
                      {precoFormatado(produto.precoAnterior)}
                    </s>
                  </p>
                )}
                <p className="font-display text-4xl font-light text-marinho-900">
                  {produto.precoAnterior != null && <span className="sr-only">Por </span>}
                  {preco ?? "Sob consulta"}
                </p>
                <p className="mt-2.5 max-w-sm text-[0.8125rem] font-light leading-relaxed text-marinho-700/75">
                  {preco
                    ? "Valor de referência do acervo. Confirme disponibilidade e condições no WhatsApp antes de fechar."
                    : "O valor depende do câmbio e do lote em que a peça entra. A Thaby fecha o preço com você antes de comprar."}
                </p>
              </div>
            </Revelar>

            <Revelar atraso={0.24}>
              <div className="mt-9">
                <AcoesProduto produto={produto} />
              </div>
            </Revelar>

            <Revelar atraso={0.3}>
              <dl className="mt-12 grid grid-cols-2 gap-x-8 gap-y-7">
                {ficha.map((linha) => (
                  <div key={linha.rotulo}>
                    <dt className="font-sans text-[0.5625rem] uppercase tracking-[0.22em] text-marinho-700/72">
                      {linha.rotulo}
                    </dt>
                    <dd className="mt-2 text-[0.9375rem] font-light text-marinho-900/80">
                      {linha.valor}
                    </dd>
                  </div>
                ))}
              </dl>
            </Revelar>
          </div>
        </div>
      </div>

      {sugestoes.length > 0 && (
        <section className="border-t border-marinho-500/10 py-20 md:py-28">
          <div className="area">
            <h2 className="font-display text-2xl font-light text-marinho-900/85 md:text-3xl">
              Também no acervo
            </h2>

            <div className="mt-12 grid grid-cols-2 gap-x-6 gap-y-14 md:gap-x-8 lg:grid-cols-4">
              {sugestoes.map((sugestao, indice) => (
                <CartaoProduto
                  key={sugestao.id}
                  produto={sugestao}
                  atraso={indice * 0.06}
                />
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
