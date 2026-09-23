import { empresa, equipe } from "@/dados/empresa";
import { categorias, resumoProduto, type Produto } from "@/dados/catalogo";
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
  contactPoint: equipe.map((pessoa) => ({
    "@type": "ContactPoint",
    name: pessoa.nome,
    telephone: `+${pessoa.numero}`,
    contactType: "customer service",
    areaServed: "BR",
    availableLanguage: "Portuguese",
  })),
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
  const oferta = produto.preco
    ? {
        "@type": "Offer",
        availability: "https://schema.org/InStock",
        priceCurrency: "BRL",
        price: (produto.preco / 100).toFixed(2),
        seller: { "@id": `${urlBase}/#loja` },
        url: url(`/produtos/${produto.slug}`),
      }
    : {
        "@type": "Offer",
        availability: "https://schema.org/InStock",
        priceCurrency: "BRL",
        priceSpecification: { "@type": "PriceSpecification", priceCurrency: "BRL" },
        seller: { "@id": `${urlBase}/#loja` },
        url: url(`/produtos/${produto.slug}`),
      };

  return (
    <Script
      dados={{
        "@context": "https://schema.org",
        "@type": "Product",
        name: produto.nome,
        description: resumoProduto(produto),
        ...(produto.marca ? { brand: { "@type": "Brand", name: produto.marca } } : {}),
        ...(produto.imagem ? { image: produto.imagem } : {}),
        ...(produto.ean ? { gtin13: produto.ean } : {}),
        ...(produto.codigo ? { sku: produto.codigo } : {}),
        url: url(`/produtos/${produto.slug}`),
        offers: oferta,
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
