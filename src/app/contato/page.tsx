import type { Metadata } from "next";
import { Mail, MapPin, MessageCircle } from "lucide-react";
import { CabecalhoPagina } from "@/componentes/layout/CabecalhoPagina";
import { Migalhas } from "@/componentes/seo/DadosEstruturados";
import { Revelar } from "@/componentes/ui/Revelar";
import { FormularioWhatsApp } from "@/componentes/contato/FormularioWhatsApp";
import { IconeInstagram, IconeTikTok } from "@/componentes/marca/IconesSociais";
import { LacoTracejado } from "@/componentes/marca/RotaDeVoo";
import { empresa, equipe, linkWhatsAppPara } from "@/dados/empresa";

export const metadata: Metadata = {
  title: "Contato",
  description: `Fale com a Thaby Importados: WhatsApp ${empresa.whatsapp.exibicao}, e-mail e redes. Atendimento direto, de ${empresa.cidade}/${empresa.estado} para todo o Brasil.`,
  alternates: { canonical: "/contato" },
};

const trilha = [
  { nome: "Início", caminho: "/" },
  { nome: "Contato", caminho: "/contato" },
];

const gruposEquipe = [...new Set(equipe.map((pessoa) => pessoa.grupo))];

const canais = [
  {
    rotulo: "E-mail",
    valor: empresa.email,
    detalhe: "Para orçamentos maiores e assuntos que pedem histórico.",
    href: `mailto:${empresa.email}`,
    icone: <Mail size={17} strokeWidth={1.4} />,
  },
  {
    rotulo: "Instagram",
    valor: `@${empresa.redes.instagram.usuario}`,
    detalhe: "Novidades do lote, bastidores e o que acabou de chegar.",
    href: empresa.redes.instagram.url,
    icone: <IconeInstagram className="size-[1.05rem]" />,
  },
  {
    rotulo: "TikTok",
    valor: `@${empresa.redes.tiktok.usuario}`,
    detalhe: "Abertura de encomenda e achados da semana.",
    href: empresa.redes.tiktok.url,
    icone: <IconeTikTok className="size-[1.05rem]" />,
  },
];

export default function PaginaContato() {
  return (
    <>
      <Migalhas trilha={trilha} />

      <CabecalhoPagina
        trilha={trilha}
        sobrescrita="Atendimento direto"
        titulo="Fale com quem escolhe as peças."
        apoio="Fale com a gente, tire suas dúvidas e conte com nosso atendimento personalizado. Sem central, sem robô, sem fila. Do outro lado tem uma pessoa que conhece o acervo."
      />

      <section aria-label="Equipe de atendimento" className="pt-24 md:pt-32">
        <div className="area grid gap-12 lg:grid-cols-2 lg:gap-20">
          {gruposEquipe.map((grupo) => (
            <div key={grupo}>
              <h2 className="font-display text-3xl font-light leading-tight text-marinho-900 md:text-4xl">
                {grupo}
              </h2>
              <ul className="mt-8 flex flex-col divide-y divide-marinho-500/12 border-y border-marinho-500/12">
                {equipe.filter((pessoa) => pessoa.grupo === grupo).map((pessoa) => (
                  <li key={pessoa.numero} className="flex flex-col gap-5 py-6 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <h3 className="font-sans text-[1.0625rem] font-light text-marinho-900">
                        {pessoa.nome}
                      </h3>
                      <p className="mt-1.5 text-[0.8125rem] font-light leading-relaxed text-marinho-700">
                        {pessoa.papel}
                      </p>
                      <p className="mt-1.5 text-[1.0625rem] font-light text-marinho-900">
                        {pessoa.exibicao}
                      </p>
                    </div>
                    <a
                      href={linkWhatsAppPara(pessoa.numero, `Olá, ${pessoa.nome}! Vim pelo site da Thaby e gostaria de atendimento.`)}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Chamar no WhatsApp: ${pessoa.nome}`}
                      className="inline-flex min-h-11 items-center justify-center gap-3 border border-marinho-500/18 px-4 py-3 text-[0.8125rem] text-marinho-800 transition-colors duration-500 hover:border-carmim-600 hover:bg-carmim-600 hover:text-marfim-puro focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-marinho-800"
                    >
                      <MessageCircle aria-hidden="true" size={17} strokeWidth={1.4} className="shrink-0" />
                      Chamar no WhatsApp
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section className="py-24 md:py-32">
        <div className="area grid gap-16 lg:grid-cols-12 lg:gap-20">
          <div className="lg:col-span-7">
            <Revelar>
              <h2 className="font-display text-3xl font-light leading-tight text-marinho-900 md:text-4xl">
                Monte sua mensagem
              </h2>
              <p className="mt-4 max-w-lg text-[0.9375rem] font-light leading-relaxed legivel text-marinho-800/75">
                Preencha o que souber. O site escreve a mensagem, abre o
                WhatsApp e deixa o envio com você.
              </p>
            </Revelar>

            <Revelar atraso={0.12} className="mt-12">
              <FormularioWhatsApp />
            </Revelar>
          </div>

          <div className="lg:col-span-5">
            <Revelar deslocamento={30} className="lg:sticky lg:top-32">
              <ul className="flex flex-col divide-y divide-marinho-500/12 border-y border-marinho-500/12">
                {canais.map((canal) => (
                  <li key={canal.rotulo}>
                    <a
                      href={canal.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex items-start gap-5 py-6 transition-colors duration-500"
                    >
                      <span className="mt-0.5 grid size-10 shrink-0 place-items-center border border-marinho-500/18 text-marinho-800/65 transition-colors duration-500 group-hover:border-carmim-500 group-hover:bg-carmim-500 group-hover:text-marfim-puro">
                        {canal.icone}
                      </span>

                      <span className="min-w-0">
                        <span className="block font-sans text-[0.5625rem] uppercase tracking-[0.22em] text-marinho-700/72">
                          {canal.rotulo}
                        </span>
                        <span className="mt-1.5 block break-all text-[1.0625rem] font-light text-marinho-900/85 transition-colors duration-500 group-hover:text-marinho-900">
                          {canal.valor}
                        </span>
                        <span className="mt-1.5 block text-[0.8125rem] font-light leading-relaxed text-marinho-700/75">
                          {canal.detalhe}
                        </span>
                      </span>
                    </a>
                  </li>
                ))}
              </ul>

              <div className="relative mt-10 overflow-hidden border border-marinho-500/12 bg-areia/45 p-8">
                <LacoTracejado className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 text-marinho-500/12" />

                <div className="relative flex items-start gap-4">
                  <MapPin
                    size={17}
                    strokeWidth={1.4}
                    className="mt-1 shrink-0 text-carmim-600/85"
                  />
                  <div>
                    <p className="font-sans text-[0.5625rem] uppercase tracking-[0.22em] text-marinho-700/72">
                      Base
                    </p>
                    <p className="mt-2 text-[1.0625rem] font-light text-marinho-900/85">
                      {empresa.regiao}
                    </p>
                    <p className="mt-2.5 text-[0.8125rem] font-light leading-relaxed text-marinho-700/75">
                      Retirada combinada na cidade. Envio com rastreio para
                      qualquer endereço do Brasil.
                    </p>
                  </div>
                </div>
              </div>
            </Revelar>
          </div>
        </div>
      </section>
    </>
  );
}
