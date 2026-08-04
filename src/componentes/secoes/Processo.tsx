import { Revelar, RevelarTexto } from "@/componentes/ui/Revelar";
import { AviaoDePapel } from "@/componentes/marca/RotaDeVoo";
import { BotaoLink } from "@/componentes/ui/Botao";
import { linkWhatsApp, mensagensPadrao } from "@/dados/empresa";

const etapas = [
  {
    numero: "01",
    titulo: "Você pede",
    texto:
      "Manda o print, o link ou só o nome do que procura. Se existe lá fora, a gente encontra.",
  },
  {
    numero: "02",
    titulo: "A gente cota",
    texto:
      "Preço fechado, com frete e taxas já calculados. Você aprova antes de qualquer compra.",
  },
  {
    numero: "03",
    titulo: "A peça voa",
    texto:
      "Sua encomenda entra no próximo lote e você acompanha cada etapa direto no WhatsApp.",
  },
  {
    numero: "04",
    titulo: "Chega até você",
    texto:
      "Retirada em Sorriso ou envio com rastreio para qualquer endereço do Brasil.",
  },
];

/**
 * Quebra de ritmo: única seção clara da página.
 * O contraste depois de tanto azul-escuro é o que faz a página respirar.
 */
export function Processo() {
  return (
    <section
      id="processo"
      className="grao relative overflow-hidden bg-marfim py-24 text-marinho-900 md:py-32 lg:py-40"
    >
      <div className="area relative">
        <div className="max-w-2xl">
          <Revelar className="flex items-center gap-4">
            <span className="font-sans text-micro tabular-nums text-carmim-500">
              04
            </span>
            <span className="h-px w-8 bg-marinho-500/30" />
            <span className="sobrescrita text-marinho-600/70">
              Encomenda personalizada
            </span>
          </Revelar>

          <h2 className="mt-7 text-fluid-2xl font-light leading-[1.06] equilibrio text-marinho-900">
            <RevelarTexto texto="Não achou no catálogo? Então a gente busca." atraso={0.06} />
          </h2>

          <Revelar atraso={0.18}>
            <p className="mt-6 max-w-xl text-fluid-base font-light leading-relaxed legivel text-marinho-800/65">
              Metade do que sai daqui nunca esteve numa vitrine — foi pedido por
              alguém. O processo é curto e você acompanha do começo ao fim.
            </p>
          </Revelar>
        </div>

        <div className="relative mt-20 md:mt-24">
          {/* Rota tracejada ligando as etapas no desktop */}
          <div
            aria-hidden
            className="absolute inset-x-0 top-[1.35rem] hidden lg:block"
          >
            <div className="relative mx-[12.5%] h-px border-t border-dashed border-marinho-500/25">
              <span className="absolute -top-[0.6rem] right-0 translate-x-1/2">
                <AviaoDePapel className="h-5 w-5 animate-[flutuar_7s_ease-in-out_infinite]" />
              </span>
            </div>
          </div>

          <ol className="relative grid gap-12 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
            {etapas.map((etapa, indice) => (
              <Revelar
                key={etapa.numero}
                atraso={indice * 0.08}
                como="li"
                className="relative"
              >
                <span className="relative grid size-11 place-items-center rounded-full border border-marinho-500/25 bg-marfim font-sans text-[0.75rem] tabular-nums text-marinho-600">
                  {etapa.numero}
                </span>

                <h3 className="mt-6 font-display text-2xl font-normal leading-tight text-marinho-900">
                  {etapa.titulo}
                </h3>

                <p className="mt-3 max-w-xs text-[0.9375rem] font-light leading-relaxed legivel text-marinho-800/60">
                  {etapa.texto}
                </p>
              </Revelar>
            ))}
          </ol>
        </div>

        <Revelar atraso={0.2} className="mt-16 md:mt-20">
          <BotaoLink
            href={linkWhatsApp(mensagensPadrao.encomenda)}
            porte="lg"
            externo
            className="border-marinho-900 bg-marinho-900 text-marfim hover:border-marinho-800 hover:bg-marinho-800"
          >
            Pedir uma encomenda
          </BotaoLink>
        </Revelar>
      </div>
    </section>
  );
}
