import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Jost } from "next/font/google";

import "./globals.css";

import { Cabecalho } from "@/componentes/layout/Cabecalho";
import { Rodape } from "@/componentes/layout/Rodape";
import { BotaoFlutuante } from "@/componentes/layout/BotaoFlutuante";
import { ScrollSuave } from "@/componentes/ui/ScrollSuave";
import { AberturaMarca } from "@/componentes/marca/AberturaMarca";
import { ProvedorOrcamento } from "@/componentes/orcamento/ContextoOrcamento";
import { GavetaOrcamento } from "@/componentes/orcamento/GavetaOrcamento";
import { empresa } from "@/dados/empresa";
import { urlBase } from "@/lib/site";

/** Serifada de alto contraste para títulos — o par natural do logo manuscrito. */
const display = Cormorant_Garamond({
  variable: "--fonte-display",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  style: ["normal", "italic"],
  display: "swap",
});

/** Geométrica para interface: caixa alta com tracking largo fica impecável. */
const sans = Jost({
  variable: "--fonte-sans",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(urlBase),
  title: {
    default: `${empresa.nome} — Importados selecionados em ${empresa.cidade}/${empresa.estado}`,
    template: `%s · ${empresa.nome}`,
  },
  description:
    "Beleza, perfumaria, moda e acessórios importados, garimpados peça a peça. Curadoria própria, procedência conferida e atendimento direto no WhatsApp, de Sorriso/MT para todo o Brasil.",
  applicationName: empresa.nome,
  keywords: [
    "importados Sorriso MT",
    "produtos importados",
    "skincare coreano",
    "perfume importado",
    "Bath and Body Works Brasil",
    "Medicube",
    "importados Mato Grosso",
    empresa.nome,
  ],
  authors: [{ name: empresa.nome }],
  creator: empresa.nome,
  publisher: empresa.nome,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: urlBase,
    siteName: empresa.nome,
    title: `${empresa.nome} — Importados selecionados`,
    description:
      "Curadoria de importados de beleza, perfumaria, moda e acessórios. De Sorriso/MT para todo o Brasil.",
  },
  twitter: {
    card: "summary_large_image",
    title: `${empresa.nome} — Importados selecionados`,
    description:
      "Curadoria de importados de beleza, perfumaria, moda e acessórios.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#fbf9f5",
  colorScheme: "light",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      className={`${display.variable} ${sans.variable} h-full antialiased`}
    >
      <head>
        {/*
          As entradas de scroll começam em opacity 0 no HTML servido. Sem JS
          elas nunca animariam e o site ficaria em branco — inclusive para
          rastreadores que não executam script. Este bloco devolve tudo.
        */}
        <noscript>
          <style>{`[style*="opacity:0"],[style*="opacity: 0"]{opacity:1!important;transform:none!important}`}</style>
        </noscript>
      </head>

      <body className="flex min-h-full flex-col bg-fundo">
        {/* Fora do ScrollSuave: a cortina não deve participar do scroll. */}
        <AberturaMarca />

        <ProvedorOrcamento>
          <ScrollSuave>
            <Cabecalho />
            <main className="flex-1">{children}</main>
            <Rodape />
          </ScrollSuave>

          <GavetaOrcamento />
          <BotaoFlutuante />
        </ProvedorOrcamento>
      </body>
    </html>
  );
}
