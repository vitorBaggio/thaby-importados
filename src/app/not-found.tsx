import { BotaoLink } from "@/componentes/ui/Botao";
import { AviaoDePapel, LacoTracejado } from "@/componentes/marca/RotaDeVoo";

export default function NaoEncontrado() {
  return (
    <section className="grao relative flex min-h-[70svh] items-center overflow-hidden py-32">
      <LacoTracejado className="pointer-events-none absolute left-1/2 top-1/2 h-[28rem] w-[28rem] -translate-x-1/2 -translate-y-1/2 text-marinho-500/12" />

      <div className="area relative flex flex-col items-center text-center">
        <AviaoDePapel className="h-8 w-8 opacity-70" />

        <p className="mt-8 font-display text-6xl font-light leading-none text-marinho-600/75 md:text-7xl">
          404
        </p>

        <h1 className="mt-6 max-w-lg text-fluid-xl font-light leading-tight equilibrio texto-metal">
          Essa encomenda não chegou.
        </h1>

        <p className="mt-6 max-w-md text-[0.9375rem] font-light leading-relaxed legivel text-marinho-800/75">
          A página que você procurou não existe ou saiu do ar. O acervo
          continua inteiro — é só voltar por aqui.
        </p>

        <div className="mt-10 flex flex-wrap justify-center gap-4">
          <BotaoLink href="/catalogo">Ver o catálogo</BotaoLink>
          <BotaoLink href="/" variante="contorno">
            Voltar ao início
          </BotaoLink>
        </div>
      </div>
    </section>
  );
}
