import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { CabecalhoPagina } from "@/componentes/layout/CabecalhoPagina";
import { CartaoProduto } from "@/componentes/catalogo/CartaoProduto";
import { Migalhas } from "@/componentes/seo/DadosEstruturados";
import { BotaoLink } from "@/componentes/ui/Botao";
import { Revelar } from "@/componentes/ui/Revelar";
import { RevelarImagem } from "@/componentes/ui/RevelarImagem";
import { LacoTracejado } from "@/componentes/marca/RotaDeVoo";
import {
  categoriaPorSlug,
  categorias,
  produtosDaCategoria,
} from "@/dados/catalogo";
import { linkWhatsApp } from "@/dados/empresa";

export function generateStaticParams() {
  return categorias.map((categoria) => ({ slug: categoria.slug }));
}

export const dynamicParams = false;

export async function generateMetadata({
  params,
}: PageProps<"/categorias/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const categoria = categoriaPorSlug(slug);
  if (!categoria) return {};

  return {
    title: categoria.nome,
    description: categoria.resumo,
    alternates: { canonical: `/categorias/${categoria.slug}` },
    openGraph: {
      title: `${categoria.nome} · Thaby Importados`,
      description: categoria.resumo,
      images: categoria.imagem ? [{ url: categoria.imagem }] : undefined,
    },
  };
}

export default async function PaginaCategoria({
  params,
}: PageProps<"/categorias/[slug]">) {
  const { slug } = await params;
  const categoria = categoriaPorSlug(slug);
  if (!categoria) notFound();

  const produtos = produtosDaCategoria(categoria.id);
  const outras = categorias.filter((c) => c.id !== categoria.id).slice(0, 4);

  const trilha = [
    { nome: "Início", caminho: "/" },
    { nome: "Categorias", caminho: "/categorias" },
    { nome: categoria.nome, caminho: `/categorias/${categoria.slug}` },
  ];

  return (
    <>
      <Migalhas trilha={trilha} />

      <CabecalhoPagina
        trilha={trilha}
        sobrescrita={
          produtos.length > 0
            ? `${produtos.length} ${produtos.length === 1 ? "peça publicada" : "peças publicadas"}`
            : "Acervo sob consulta"
        }
        titulo={categoria.nome}
        apoio={categoria.resumo}
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

      <div className="area pb-24 pt-20 md:pt-24">
        {produtos.length > 0 ? (
          <div className="grid grid-cols-2 gap-x-6 gap-y-14 md:gap-x-8 lg:grid-cols-3 xl:grid-cols-4">
            {produtos.map((produto, indice) => (
              <CartaoProduto
                key={produto.id}
                produto={produto}
                atraso={(indice % 4) * 0.06}
                prioridade={indice < 4}
              />
            ))}
          </div>
        ) : (
          <AcervoSobConsulta
            nome={categoria.nome}
            imagem={categoria.imagem}
          />
        )}
      </div>

      <section className="border-t border-marinho-500/10 py-20 md:py-24">
        <div className="area">
          <div className="flex flex-wrap items-baseline justify-between gap-6">
            <h2 className="font-display text-2xl font-light text-marinho-900/85 md:text-3xl">
              Continue explorando
            </h2>
            <Link
              href="/catalogo"
              className="group inline-flex items-center gap-2 font-sans text-[0.75rem] uppercase tracking-[0.16em] text-marinho-700/78 transition-colors duration-400 hover:text-marinho-900"
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
            {outras.map((outra) => (
              <li key={outra.id}>
                <Link
                  href={`/categorias/${outra.slug}`}
                  className="inline-flex border border-marinho-500/18 px-5 py-2.5 font-sans text-[0.6875rem] uppercase tracking-[0.14em] text-marinho-800/65 transition-colors duration-400 hover:border-marinho-500/50 hover:text-marinho-900"
                >
                  {outra.nome}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}

/**
 * Nem toda categoria tem peça publicada no site — parte do acervo só existe
 * no catálogo interno da loja. Aqui isso vira convite, não beco sem saída.
 */
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
            <RevelarImagem>
              <Image
                src={imagem}
                alt={nome}
                fill
                sizes="(min-width: 1024px) 42vw, 88vw"
                priority
                className="object-contain p-10 md:p-14"
              />
            </RevelarImagem>
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
