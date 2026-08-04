import { Revelar, RevelarTexto } from "@/componentes/ui/Revelar";
import { BotaoLink } from "@/componentes/ui/Botao";
import { Secao } from "@/componentes/ui/Secao";
import { LacoTracejado } from "@/componentes/marca/RotaDeVoo";
import { IconeInstagram, IconeTikTok } from "@/componentes/marca/IconesSociais";
import { empresa, linkWhatsApp, mensagensPadrao } from "@/dados/empresa";

export function Convite() {
  return (
    <Secao className="grao relative overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-1/2 h-[36rem] w-[52rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,var(--color-marinho-700)_0%,transparent_65%)] opacity-35 blur-3xl" />
        <LacoTracejado className="absolute left-1/2 top-1/2 h-[30rem] w-[30rem] -translate-x-1/2 -translate-y-1/2 text-marinho-500/12" />
      </div>

      <div className="area relative flex flex-col items-center text-center">
        <Revelar className="fio w-full max-w-xs">
          <span className="size-1.5 rotate-45 bg-carmim-500" />
        </Revelar>

        <h2 className="mt-10 max-w-3xl text-fluid-2xl font-light leading-[1.06] equilibrio texto-metal">
          <RevelarTexto texto="O próximo lote já está sendo montado." />
        </h2>

        <Revelar atraso={0.16}>
          <p className="mx-auto mt-7 max-w-xl text-fluid-base font-light leading-relaxed legivel text-marinho-800/65">
            Chame no WhatsApp para receber o catálogo completo, conferir
            disponibilidade ou encomendar aquilo que você ainda não achou no
            Brasil.
          </p>
        </Revelar>

        <Revelar atraso={0.24} className="mt-11">
          <div className="flex flex-wrap items-center justify-center gap-4">
            <BotaoLink
              href={linkWhatsApp(mensagensPadrao.catalogo)}
              variante="carmim"
              porte="lg"
              externo
            >
              Pedir o catálogo
            </BotaoLink>
            <BotaoLink href="/catalogo" variante="contorno" porte="lg">
              Explorar o acervo
            </BotaoLink>
          </div>
        </Revelar>

        <Revelar atraso={0.32} className="mt-14">
          <div className="flex items-center gap-8">
            <PerfilSocial
              href={empresa.redes.instagram.url}
              rede="Instagram"
              usuario={`@${empresa.redes.instagram.usuario}`}
            >
              <IconeInstagram className="size-[1.05rem]" />
            </PerfilSocial>

            <span className="h-8 w-px bg-marinho-500/20" />

            <PerfilSocial
              href={empresa.redes.tiktok.url}
              rede="TikTok"
              usuario={`@${empresa.redes.tiktok.usuario}`}
            >
              <IconeTikTok className="size-[1.05rem]" />
            </PerfilSocial>
          </div>
        </Revelar>
      </div>
    </Secao>
  );
}

function PerfilSocial({
  href,
  rede,
  usuario,
  children,
}: {
  href: string;
  rede: string;
  usuario: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex items-center gap-3 text-left"
    >
      <span className="text-marinho-700/78 transition-colors duration-500 group-hover:text-carmim-500">
        {children}
      </span>

      <span className="flex flex-col leading-tight">
        <span className="font-sans text-[0.5625rem] uppercase tracking-[0.22em] text-marinho-700/72">
          {rede}
        </span>
        <span className="mt-1 text-[0.875rem] font-light text-marinho-800/80 transition-colors duration-500 group-hover:text-marinho-900">
          {usuario}
        </span>
      </span>
    </a>
  );
}
