import Link from "next/link";
import { Mail, MapPin, MessageCircle } from "lucide-react";
import { IconeInstagram, IconeTikTok } from "@/componentes/marca/IconesSociais";
import { Logo } from "@/componentes/marca/Logo";
import { LacoTracejado } from "@/componentes/marca/RotaDeVoo";
import { categorias } from "@/dados/catalogo";
import { empresa, linkWhatsApp, mensagensPadrao } from "@/dados/empresa";

const navegacao = [
  { rotulo: "Novidades", href: "/novidades" },
  { rotulo: "Catálogo completo", href: "/catalogo" },
  { rotulo: "Curadoria", href: "/categorias" },
  { rotulo: "A casa", href: "/sobre" },
  { rotulo: "Contato", href: "/contato" },
];

export function Rodape() {
  const ano = new Date().getFullYear();

  return (
    <footer className="grao grao-inverso relative overflow-hidden bg-marinho-950">
      <LacoTracejado className="pointer-events-none absolute -left-32 top-1/4 h-[30rem] w-[30rem] text-marinho-500/5" />

      <div className="area relative py-20 md:py-24">
        <div className="grid gap-14 lg:grid-cols-[1.4fr_1fr_1fr_1.2fr] lg:gap-10">
          <div className="max-w-sm">
            <Logo variante="marfim" tamanho={72} />

            <p className="mt-7 text-[0.9375rem] font-light leading-relaxed legivel text-marinho-100/70">
              Importados selecionados peça a peça, de Sorriso para o Brasil
              inteiro. O que não está no catálogo, a gente busca.
            </p>

            <div className="mt-8 flex items-center gap-3">
              <IconeSocial
                href={empresa.redes.instagram.url}
                rotulo="Instagram da Thaby Importados"
              >
                <IconeInstagram />
              </IconeSocial>

              <IconeSocial
                href={empresa.redes.tiktok.url}
                rotulo="TikTok da Thaby Importados"
              >
                <IconeTikTok />
              </IconeSocial>

              <IconeSocial
                href={linkWhatsApp(mensagensPadrao.geral)}
                rotulo="WhatsApp da Thaby Importados"
              >
                <MessageCircle size={16} strokeWidth={1.4} />
              </IconeSocial>
            </div>
          </div>

          <ColunaRodape titulo="Navegação">
            {navegacao.map((item) => (
              <li key={item.href}>
                <LinkRodape href={item.href}>{item.rotulo}</LinkRodape>
              </li>
            ))}
          </ColunaRodape>

          <ColunaRodape titulo="Curadoria">
            {categorias.slice(0, 6).map((categoria) => (
              <li key={categoria.id}>
                <LinkRodape href={`/categorias/${categoria.slug}`}>
                  {categoria.nome}
                </LinkRodape>
              </li>
            ))}
            <li>
              <LinkRodape href="/categorias" className="text-carmim-400/80">
                Ver todas
              </LinkRodape>
            </li>
          </ColunaRodape>

          <ColunaRodape titulo="Contato">
            <li>
              <a
                href={linkWhatsApp(mensagensPadrao.geral)}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-start gap-3 text-[0.875rem] font-light text-marinho-100/70 transition-colors duration-400 hover:text-marfim"
              >
                <MessageCircle
                  size={15}
                  strokeWidth={1.4}
                  className="mt-0.5 shrink-0 text-carmim-400/70"
                />
                {empresa.whatsapp.exibicao}
              </a>
            </li>

            <li>
              <a
                href={`mailto:${empresa.email}`}
                className="group flex items-start gap-3 break-all text-[0.875rem] font-light text-marinho-100/70 transition-colors duration-400 hover:text-marfim"
              >
                <Mail
                  size={15}
                  strokeWidth={1.4}
                  className="mt-0.5 shrink-0 text-carmim-400/70"
                />
                {empresa.email}
              </a>
            </li>

            <li className="flex items-start gap-3 text-[0.875rem] font-light text-marinho-100/70">
              <MapPin
                size={15}
                strokeWidth={1.4}
                className="mt-0.5 shrink-0 text-carmim-400/70"
              />
              {empresa.regiao}
              <br />
            </li>
          </ColunaRodape>
        </div>

        <div className="mt-16 flex flex-col gap-4 border-t border-marinho-200/8 pt-8 font-sans text-[0.6875rem] uppercase tracking-[0.16em] text-marinho-200/72 md:flex-row md:items-center md:justify-between">
          <p>
            © {ano} {empresa.nome} · CNPJ {empresa.cnpj}
          </p>

          {/* TODO(cliente): substituir pelo nome/link do estúdio antes de publicar. */}
          <p className="flex items-center gap-2">
            <span className="hidden h-px w-6 bg-marinho-400/30 md:inline-block" />
            Projeto e desenvolvimento sob medida
          </p>
        </div>
      </div>
    </footer>
  );
}

function ColunaRodape({
  titulo,
  children,
}: {
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h3 className="sobrescrita font-sans text-marinho-200/65">{titulo}</h3>
      <ul className="mt-6 flex flex-col gap-3.5">{children}</ul>
    </div>
  );
}

function LinkRodape({
  href,
  children,
  className,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={`text-[0.875rem] font-light text-marinho-100/70 transition-colors duration-400 hover:text-marfim ${className ?? ""}`}
    >
      {children}
    </Link>
  );
}

function IconeSocial({
  href,
  rotulo,
  children,
}: {
  href: string;
  rotulo: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={rotulo}
      className="grid size-10 place-items-center border border-marinho-200/15 text-marinho-100/60 transition-colors duration-500 hover:border-carmim-500 hover:bg-carmim-500 hover:text-marfim-puro"
    >
      {children}
    </a>
  );
}

