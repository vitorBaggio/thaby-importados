import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { CabecalhoPagina } from "@/componentes/layout/CabecalhoPagina";
import { CartaoCategoria } from "@/componentes/catalogo/CartaoCategoria";
import { GradeProdutos } from "@/componentes/catalogo/GradeProdutos";
import { Migalhas } from "@/componentes/seo/DadosEstruturados";
import { BotaoLink } from "@/componentes/ui/Botao";
import { Revelar } from "@/componentes/ui/Revelar";
import { LacoTracejado } from "@/componentes/marca/RotaDeVoo";
import {
  categoriaPorSlug,
  categorias,
  produtosDaSubcategoria,
  resumoCategoria,
  superDaSubcategoria,
  urlFoto,
  type Categoria,
  type Subcategoria,
} from "@/dados/catalogo";
import { linkWhatsApp } from "@/dados/empresa";

export function generateStaticParams() {
  const supers = categorias.map((c) => ({ slug: c.slug }));
  const subs = categorias.flatMap((c) =>
    c.subcategorias.map((s) => ({ slug: s.slug })),
  );
  return [...supers, ...subs];
}

export const dynamicParams = false;

export async function generateMetadata({
  params,
}: PageProps<"/categorias/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const achado = categoriaPorSlug(slug);
  if (!achado) return {};
  const c = achado.dado;
  const resumo = resumoCategoria(c);

  return {
    title: c.nome,
    description: resumo,
    alternates: { canonical: `/categorias/${c.slug}` },
    openGraph: {
      title: `${c.nome} · Thaby Importados`,
      description: resumo,
      images: urlFoto(c.imagem) ? [{ url: urlFoto(c.imagem)! }] : undefined,
    },
  };
}

export default async function PaginaCategoria({
  params,
}: PageProps<"/categorias/[slug]">) {
  const { slug } = await params;
  const achado = categoriaPorSlug(slug);
  if (!achado) notFound();

  return achado.tipo === "super" ? (
    <PaginaSuper categoria={achado.dado} />
  ) : (
    <PaginaSub subcategoria={achado.dado} />
  );
}

/* --- Supercategoria: mostra as subcategorias como frentes ---------------- */

function PaginaSuper({ categoria }: { categoria: Categoria }) {
  const trilha = [
    { nome: "Início", caminho: "/" },
    { nome: "Curadoria", caminho: "/categorias" },
    { nome: categoria.nome, caminho: `/categorias/${categoria.slug}` },
  ];

  return (
    <>
      <Migalhas trilha={trilha} />

      <CabecalhoPagina
        trilha={trilha}
        sobrescrita={`${categoria.subcategorias.length} frentes · ${categoria.total} peças`}
        titulo={categoria.nome}
        apoio={resumoCategoria(categoria)}
        extra={
          <BotaoLink
            href={linkWhatsApp(
              `Olá! Vim pelo site e quero ver as opções de ${categoria.nome} da Thaby Importados.`,
            )}
            variante="contorno"
            externo
          >
            Consultar disponibilidade
          </BotaoLink>
        }
      />

      <div className="area pb-28 pt-20 md:pt-24">
        <div className="grid gap-x-8 gap-y-16 sm:grid-cols-2 lg:grid-cols-3">
          {categoria.subcategorias.map((sub, indice) => (
            <CartaoCategoria
              key={sub.id}
              categoria={sub}
              atraso={(indice % 3) * 0.07}
            />
          ))}
        </div>
      </div>
    </>
  );
}

/* --- Subcategoria: mostra os produtos ------------------------------------ */

function PaginaSub({ subcategoria }: { subcategoria: Subcategoria }) {
  const sup = superDaSubcategoria(subcategoria.id);
  const produtos = produtosDaSubcategoria(subcategoria.id);
  const irmas = sup
    ? sup.subcategorias.filter((s) => s.id !== subcategoria.id)
    : [];

  const trilha = [
    { nome: "Início", caminho: "/" },
    { nome: "Curadoria", caminho: "/categorias" },
    ...(sup ? [{ nome: sup.nome, caminho: `/categorias/${sup.slug}` }] : []),
    { nome: subcategoria.nome, caminho: `/categorias/${subcategoria.slug}` },
  ];

  return (
    <>
      <Migalhas trilha={trilha} />

      <CabecalhoPagina
        trilha={trilha}
        sobrescrita={`${produtos.length} ${produtos.length === 1 ? "peça" : "peças"}`}
        titulo={subcategoria.nome}
        apoio={resumoCategoria(subcategoria)}
        extra={
          <BotaoLink
            href={linkWhatsApp(
              `Olá! Vim pelo site e quero ver as opções de ${subcategoria.nome} da Thaby Importados.`,
            )}
            variante="contorno"
            externo
          >
            Consultar disponibilidade
          </BotaoLink>
        }
      />

      <div className="area pb-24 pt-20 md:pt-24">
        {produtos.length > 0 ? (
          <GradeProdutos produtos={produtos} />
        ) : (
          <AcervoSobConsulta nome={subcategoria.nome} imagem={urlFoto(subcategoria.imagem)} />
        )}
      </div>

      {irmas.length > 0 && (
        <section className="border-t border-marinho-500/10 py-20 md:py-24">
          <div className="area">
            <div className="flex flex-wrap items-baseline justify-between gap-6">
              <h2 className="font-display text-2xl font-light text-marinho-900/85 md:text-3xl">
                Mais em {sup?.nome}
              </h2>
              <Link
                href="/catalogo"
                className="group inline-flex items-center gap-2 font-sans text-[0.75rem] uppercase tracking-[0.16em] text-marinho-700/60 transition-colors duration-400 hover:text-marinho-900"
              >
                Catálogo completo
                <ArrowRight
                  size={14}
                  strokeWidth={1.5}
                  className="transition-transform duration-500 group-hover:translate-x-1"
                />
              </Link>
            </div>

            <ul className="mt-9 flex flex-wrap gap-3">
              {irmas.map((irma) => (
                <li key={irma.id}>
                  <Link
                    href={`/categorias/${irma.slug}`}
                    className="inline-flex border border-marinho-500/18 px-5 py-2.5 font-sans text-[0.6875rem] uppercase tracking-[0.14em] text-marinho-800/65 transition-colors duration-400 hover:border-marinho-500/50 hover:text-marinho-900"
                  >
                    {irma.nome}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}
    </>
  );
}

function AcervoSobConsulta({
  nome,
  imagem,
}: {
  nome: string;
  imagem: string | null;
}) {
  return (
    <Revelar>
      <div className="relative grid items-center gap-12 overflow-hidden border border-dashed border-marinho-500/18 p-8 md:p-14 lg:grid-cols-2 lg:gap-20">
        <LacoTracejado className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 text-marinho-500/12" />

        {imagem && (
          <div className="relative aspect-[4/5] overflow-hidden border border-marinho-500/10 bg-ladrilho">
            <Image
              src={imagem}
              alt={nome}
              fill
              sizes="(min-width: 1024px) 42vw, 88vw"
              priority
              className="object-contain p-10 md:p-14"
            />
          </div>
        )}

        <div className="relative flex max-w-lg flex-col items-start gap-7">
          <span className="sobrescrita text-carmim-600">{nome}</span>
          <p className="text-fluid-xl font-light leading-tight equilibrio text-marinho-900/90">
            Esta linha é montada sob encomenda.
          </p>
          <p className="text-fluid-sm font-light leading-relaxed legivel text-marinho-800/75">
            As peças de {nome.toLowerCase()} giram rápido demais para ficarem
            publicadas no site. Chame no WhatsApp e a Thaby manda as opções
            disponíveis no lote atual, com foto e valor.
          </p>
          <BotaoLink
            href={linkWhatsApp(
              `Olá! Vim pelo site e queria ver as opções de ${nome} disponíveis agora.`,
            )}
            variante="carmim"
            porte="lg"
            externo
          >
            Ver o que tem agora
          </BotaoLink>
        </div>
      </div>
    </Revelar>
  );
}
