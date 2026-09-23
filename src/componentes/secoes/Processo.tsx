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
 * Quebra de ritmo: única seção escura da página.
 *
 * Numa página clara do começo ao fim, o olho perde a noção de progresso. Este
 * bloco em marinho profundo é a pausa que separa a vitrine da conversa — e
 * carrega o azul da marca de volta ao centro da tela.
 */
export function Processo() {
  return (
    <section
      id="processo"
      className="grao grao-inverso relative overflow-hidden bg-marinho-950 py-24 text-marfim md:py-32 lg:py-40"
    >
      <div className="area relative">
        <div className="max-w-2xl">
          <Revelar className="flex items-center gap-4">
            <span className="font-sans text-micro tabular-nums text-carmim-400">
              04
            </span>
            <span className="h-px w-8 bg-marinho-400/40" />
            <span className="sobrescrita text-marinho-200/70">
              Encomenda personalizada
            </span>
          </Revelar>

          <h2 className="mt-7 text-fluid-2xl font-light leading-[1.06] equilibrio texto-metal-claro">
            <RevelarTexto texto="Não achou no catálogo? Então a gente busca." atraso={0.06} />
          </h2>

          <Revelar atraso={0.18}>
            <p className="mt-6 max-w-xl text-fluid-base font-light leading-relaxed legivel text-marinho-100/60">
              Metade do que sai daqui nunca esteve numa vitrine: foi pedido por
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
            <div className="relative mx-[12.5%] h-px border-t border-dashed border-marinho-400/35">
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
                <span className="relative grid size-11 place-items-center rounded-full border border-marinho-200/25 bg-marinho-950 font-sans text-[0.75rem] tabular-nums text-marinho-200">
                  {etapa.numero}
                </span>

                <h3 className="mt-6 font-display text-2xl font-normal leading-tight text-marfim">
                  {etapa.titulo}
                </h3>

                <p className="mt-3 max-w-xs text-[0.9375rem] font-light leading-relaxed legivel text-marinho-100/55">
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
            className="border-marfim bg-marfim text-marinho-900 hover:border-marfim-puro hover:bg-marfim-puro"
          >
            Pedir uma encomenda
          </BotaoLink>
        </Revelar>
      </div>
    </section>
  );
}
