"use client";

import { useRef } from "react";
import Image from "next/image";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { ArrowDown } from "lucide-react";
import { BotaoLink } from "@/componentes/ui/Botao";
import { RevelarImagem } from "@/componentes/ui/RevelarImagem";
import { AviaoDePapel, LacoTracejado } from "@/componentes/marca/RotaDeVoo";
import { empresa, linkWhatsApp, mensagensPadrao } from "@/dados/empresa";
import { totais } from "@/dados/catalogo";

const indicadores = [
  { valor: `${totais.marcas}+`, rotulo: "marcas internacionais" },
  { valor: `${totais.produtos}+`, rotulo: "peças no acervo" },
  { valor: "BR", rotulo: "envio para todo o país" },
];

export function Hero() {
  const referencia = useRef<HTMLElement>(null);
  const semMovimento = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: referencia,
    offset: ["start start", "end start"],
  });

  const subirTexto = useTransform(scrollYProgress, [0, 1], [0, -90]);
  const desvanecer = useTransform(scrollYProgress, [0, 0.75], [1, 0]);
  const molduraA = useTransform(scrollYProgress, [0, 1], [0, -160]);
  const molduraB = useTransform(scrollYProgress, [0, 1], [0, -60]);

  return (
    <section
      ref={referencia}
      className="grao relative flex min-h-[100svh] items-center overflow-hidden pb-20 pt-32 md:pb-28 md:pt-36"
    >
      <Atmosfera />

      <div className="area relative z-10 grid w-full items-center gap-16 lg:grid-cols-12 lg:gap-12">
        <motion.div
          style={semMovimento ? undefined : { y: subirTexto, opacity: desvanecer }}
          className="lg:col-span-7 xl:col-span-6"
        >
          <motion.p
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
            className="flex items-center gap-3.5 text-marinho-700/85"
          >
            <AviaoDePapel className="h-3.5 w-3.5" />
            <span className="sobrescrita">
              {empresa.cidade} · {empresa.estado} · desde {empresa.fundacao}
            </span>
          </motion.p>

          <h1 className="mt-8 text-fluid-3xl font-light leading-[0.98] equilibrio">
            {/* O espaço final é literal: sem ele o texto extraído do DOM
                cola as linhas ("BrasilAinda"), o que atrapalha leitor de tela
                e indexação. */}
            <LinhaTitulo atraso={0.12}>
              <span className="texto-metal">O que o Brasil </span>
            </LinhaTitulo>
            <LinhaTitulo atraso={0.22}>
              <span className="texto-metal">ainda não tem, </span>
            </LinhaTitulo>
            <LinhaTitulo atraso={0.32}>
              <em className="font-normal not-italic text-carmim-500">
                a gente traz
              </em>{" "}
              <span className="font-display italic text-marinho-700">
                primeiro.
              </span>
            </LinhaTitulo>
          </h1>

          <motion.p
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="mt-9 max-w-lg text-fluid-base font-light leading-relaxed legivel text-marinho-800/70"
          >
            Beleza, perfumaria, moda e acessórios garimpados peça a peça lá fora.
            Procedência conferida, quantidade contada e um atendimento que
            continua depois da venda.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.62, ease: [0.16, 1, 0.3, 1] }}
            className="mt-11 flex flex-wrap items-center gap-4"
          >
            <BotaoLink href="/catalogo" porte="lg">
              Ver o catálogo
            </BotaoLink>
            <BotaoLink
              href={linkWhatsApp(mensagensPadrao.geral)}
              variante="contorno"
              porte="lg"
              externo
            >
              Falar com a Thaby
            </BotaoLink>
          </motion.div>

          <motion.dl
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1.2, delay: 0.8 }}
            className="mt-16 grid max-w-lg grid-cols-3 gap-6 border-t border-marinho-500/12 pt-8"
          >
            {indicadores.map((item) => (
              <div key={item.rotulo}>
                <dt className="font-display text-3xl font-light leading-none text-marinho-900 md:text-4xl">
                  {item.valor}
                </dt>
                <dd className="mt-2.5 font-sans text-[0.625rem] uppercase leading-relaxed tracking-[0.16em] text-marinho-700/75">
                  {item.rotulo}
                </dd>
              </div>
            ))}
          </motion.dl>
        </motion.div>

        <div className="relative lg:col-span-5 xl:col-span-6">
          <div className="relative mx-auto flex max-w-md justify-center lg:ml-auto lg:mr-0 lg:max-w-none">
            <Moldura
              src="/categorias/bolsas-femininas.webp"
              alt="Bolsa de grife importada disponível no acervo da Thaby Importados"
              legenda="Bolsas femininas"
              atraso={0.35}
              y={semMovimento ? undefined : molduraA}
              className="w-[62%] max-w-[19rem] lg:w-[58%]"
              prioridade
            />

            <Moldura
              src="/categorias/beleza.webp"
              alt="Seleção de itens de beleza importados"
              legenda="Beleza"
              atraso={0.5}
              y={semMovimento ? undefined : molduraB}
              className="absolute -bottom-10 left-0 w-[52%] max-w-[15rem] lg:-bottom-16 lg:left-2"
            />
          </div>
        </div>
      </div>

      <IndicadorRolagem />
    </section>
  );
}

function LinhaTitulo({
  children,
  atraso,
}: {
  children: React.ReactNode;
  atraso: number;
}) {
  return (
    <span className="block overflow-hidden pb-[0.08em]">
      <motion.span
        initial={{ y: "105%" }}
        animate={{ y: 0 }}
        transition={{ duration: 1.15, delay: atraso, ease: [0.16, 1, 0.3, 1] }}
        className="block"
      >
        {children}
      </motion.span>
    </span>
  );
}

function Moldura({
  src,
  alt,
  legenda,
  atraso,
  y,
  className,
  prioridade = false,
}: {
  src: string;
  alt: string;
  legenda: string;
  atraso: number;
  y?: ReturnType<typeof useTransform<number, number>>;
  className?: string;
  prioridade?: boolean;
}) {
  return (
    <motion.figure
      initial={{ opacity: 0, y: 34 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 1.3, delay: atraso, ease: [0.16, 1, 0.3, 1] }}
      className={className}
    >
      <motion.div style={y ? { y } : undefined}>
        {/* Sombra bem mais leve: a de fundo escuro viraria um borrão cinza aqui. */}
        <div className="relative aspect-[4/5] overflow-hidden border border-marinho-500/10 bg-ladrilho shadow-[0_30px_70px_-45px_rgba(22,36,74,0.45)]">
          <RevelarImagem atraso={atraso + 0.15}>
            <Image
              src={src}
              alt={alt}
              fill
              sizes="(min-width: 1024px) 28vw, 55vw"
              priority={prioridade}
              className="object-contain p-7"
            />
          </RevelarImagem>
        </div>

        <figcaption className="mt-3.5 flex items-center gap-2.5">
          <span className="h-px w-5 bg-carmim-500/60" />
          <span className="sobrescrita text-[0.5625rem] text-marinho-700/78">
            {legenda}
          </span>
        </figcaption>
      </motion.div>
    </motion.figure>
  );
}

/**
 * Camadas de fundo.
 *
 * No tema escuro eram brilhos que iluminavam o fundo. Aqui a lógica se inverte:
 * são veladuras que TINGEM o papel — um sopro de azul no alto e um de carmim no
 * canto, em opacidade baixíssima. Manter os mesmos valores do tema escuro
 * deixaria manchas sujas sobre o branco.
 */
function Atmosfera() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      <div className="absolute left-1/2 top-0 h-[46rem] w-[58rem] -translate-x-1/2 -translate-y-1/3 rounded-full bg-[radial-gradient(circle,var(--color-marinho-300)_0%,transparent_62%)] opacity-25 blur-3xl" />
      <div className="absolute -bottom-40 right-0 h-[34rem] w-[34rem] rounded-full bg-[radial-gradient(circle,var(--color-carmim-300)_0%,transparent_65%)] opacity-[0.16] blur-3xl" />

      <LacoTracejado className="absolute -left-24 top-1/2 h-[36rem] w-[36rem] -translate-y-1/2 text-marinho-500/12 md:left-[-6rem]" />

      <div className="absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-fundo to-transparent" />
    </div>
  );
}

function IndicadorRolagem() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1, delay: 1.4 }}
      className="absolute bottom-8 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-3 lg:flex"
    >
      <span className="font-sans text-[0.5625rem] uppercase tracking-[0.3em] text-marinho-700/72">
        Role
      </span>
      <motion.span
        animate={{ y: [0, 7, 0] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
        className="text-marinho-700/75"
      >
        <ArrowDown size={15} strokeWidth={1.25} />
      </motion.span>
    </motion.div>
  );
}
