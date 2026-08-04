import { empresa } from "@/dados/empresa";
import { categorias, type Produto } from "@/dados/catalogo";
import { url, urlBase } from "@/lib/site";

/**
 * JSON-LD. Para negócio local, é o que faz o Google mostrar telefone,
 * endereço e horário direto no resultado de busca.
 */

function Script({ dados }: { dados: object }) {
  return (
    <script
      type="application/ld+json"
      // O conteúdo é estático e construído aqui — não vem de entrada de usuário.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(dados) }}
    />
  );
}

const negocio = {
  "@type": "Store",
  "@id": `${urlBase}/#loja`,
  name: empresa.nome,
  description:
    "Importados selecionados de beleza, perfumaria, moda e acessórios, com curadoria própria e atendimento por WhatsApp.",
  url: urlBase,
  telephone: `+${empresa.whatsapp.numero}`,
  email: empresa.email,
  image: url("/marca/logo.png"),
  logo: url("/marca/logo.png"),
  priceRange: "$$",
  currenciesAccepted: "BRL",
  address: {
    "@type": "PostalAddress",
    addressLocality: empresa.cidade,
    addressRegion: empresa.estado,
    addressCountry: "BR",
  },
  areaServed: { "@type": "Country", name: "Brasil" },
  sameAs: [empresa.redes.instagram.url, empresa.redes.tiktok.url],
};

export function DadosEstruturados() {
  return (
    <Script
      dados={{
        "@context": "https://schema.org",
        "@graph": [
          negocio,
          {
            "@type": "WebSite",
            "@id": `${urlBase}/#site`,
            url: urlBase,
            name: empresa.nome,
            inLanguage: "pt-BR",
            publisher: { "@id": `${urlBase}/#loja` },
          },
          {
            "@type": "ItemList",
            name: "Categorias do acervo",
            itemListElement: categorias.map((categoria, indice) => ({
              "@type": "ListItem",
              position: indice + 1,
              name: categoria.nome,
              url: url(`/categorias/${categoria.slug}`),
            })),
          },
        ],
      }}
    />
  );
}

export function DadosProduto({ produto }: { produto: Produto }) {
  return (
    <Script
      dados={{
        "@context": "https://schema.org",
        "@type": "Product",
        name: produto.nome,
        description: produto.resumo,
        ...(produto.marca ? { brand: { "@type": "Brand", name: produto.marca } } : {}),
        ...(produto.imagem ? { image: url(produto.imagem) } : {}),
        url: url(`/produtos/${produto.slug}`),
        countryOfOrigin: produto.origem,
        offers: {
          "@type": "Offer",
          availability: "https://schema.org/InStock",
          priceCurrency: "BRL",
          // A loja não publica preço: negocia caso a caso pelo WhatsApp.
          priceSpecification: {
            "@type": "PriceSpecification",
            priceCurrency: "BRL",
          },
          seller: { "@id": `${urlBase}/#loja` },
          url: url(`/produtos/${produto.slug}`),
        },
      }}
    />
  );
}

export function Migalhas({
  trilha,
}: {
  trilha: { nome: string; caminho: string }[];
}) {
  return (
    <Script
      dados={{
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: trilha.map((item, indice) => ({
          "@type": "ListItem",
          position: indice + 1,
          name: item.nome,
          item: url(item.caminho),
        })),
      }}
    />
  );
}
