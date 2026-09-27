"use client";

import { useState, useSyncExternalStore } from "react";
import Image from "next/image";
import Link from "next/link";
import { Check } from "lucide-react";
import { cn } from "@/lib/cn";
import { empresa, equipe, linkWhatsAppPara } from "@/dados/empresa";
import { AviaoDePapel, LacoTracejado } from "@/componentes/marca/RotaDeVoo";
import { PlaceholderProduto } from "@/componentes/catalogo/PlaceholderProduto";
import { useOrcamento, type ItemOrcamento } from "./ContextoOrcamento";
import { ControleQuantidade } from "./ControleQuantidade";
import {
  NOTA_SOB_CONSULTA,
  NOTA_TOTAL,
  formatarBRL,
  montarMensagemPedido,
  subtotal,
  temPreco,
} from "./pedido";

type Consultora = (typeof equipe)[number];

const assinarNada = () => () => {};

/**
 * O servidor não conhece o localStorage: sem esta guarda, a página abriria
 * sempre em "pedido vazio" e piscaria para a lista depois da hidratação.
 */
function useNoCliente() {
  return useSyncExternalStore(assinarNada, () => true, () => false);
}

export function Checkout() {
  const noCliente = useNoCliente();
  const { itens, totalEstimado, sobConsulta, limpar } = useOrcamento();
  const [consultora, setConsultora] = useState<Consultora | null>(null);
  const [nomeCliente, setNomeCliente] = useState("");
  const [enviadoPara, setEnviadoPara] = useState<{ nome: string; href: string } | null>(
    null,
  );

  if (!noCliente) {
    return <div aria-busy="true" className="min-h-[40vh]" />;
  }

  if (itens.length === 0) return <PedidoVazio />;

  const enviar = () => {
    if (!consultora) return;
    const href = linkWhatsAppPara(
      consultora.numero,
      montarMensagemPedido({
        consultora: consultora.nome,
        loja: empresa.nomeCurto,
        linhas: itens,
        nomeCliente,
      }),
    );
    window.open(href, "_blank", "noopener,noreferrer");
    // O carrinho fica: a pessoa pode voltar, ajustar e reenviar.
    setEnviadoPara({ nome: consultora.nome, href });
  };

  return (
    <div className="grid gap-16 lg:grid-cols-12 lg:gap-20">
      <section aria-labelledby="titulo-itens" className="lg:col-span-7">
        <h2
          id="titulo-itens"
          className="font-display text-3xl font-light leading-tight text-marinho-900 md:text-4xl"
        >
          Suas peças
        </h2>

        <ul className="mt-8 divide-y divide-marinho-500/12 border-y border-marinho-500/12">
          {itens.map((item) => (
            <LinhaItem key={item.id} item={item} />
          ))}
        </ul>

        <div className="mt-8 flex items-baseline justify-between gap-6">
          <p className="sobrescrita text-marinho-700">Total estimado</p>
          <p
            aria-live="polite"
            className="font-display text-4xl font-light tabular-nums text-marinho-900 md:text-5xl"
          >
            {formatarBRL(totalEstimado)}
          </p>
        </div>
        <p className="mt-3 text-right text-[0.8125rem] font-light leading-relaxed text-marinho-700">
          {NOTA_TOTAL}
          {sobConsulta && ` ${NOTA_SOB_CONSULTA}`}
        </p>
      </section>

      <section aria-labelledby="titulo-envio" className="lg:col-span-5">
        <div className="relative overflow-hidden border border-marinho-500/12 bg-areia/45 p-6 sm:p-8 lg:sticky lg:top-32">
          <LacoTracejado className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 text-marinho-500/12" />

          <div className="relative">
            <h2
              id="titulo-envio"
              className="font-display text-3xl font-light leading-tight text-marinho-900"
            >
              Escolha quem vai te atender
            </h2>

            <fieldset className="mt-6">
              <legend className="sr-only">Consultora</legend>
              <div className="grid grid-cols-2 gap-3">
                {equipe.map((pessoa) => {
                  const marcada = consultora?.numero === pessoa.numero;
                  return (
                    <label
                      key={pessoa.numero}
                      className={cn(
                        "relative flex min-h-16 cursor-pointer items-center justify-between gap-3 border px-4 py-4 transition-colors duration-400",
                        "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-marinho-800",
                        marcada
                          ? "border-carmim-600 bg-marfim-puro"
                          : "border-marinho-500/25 bg-fundo/70 hover:border-marinho-500/60",
                      )}
                    >
                      <input
                        type="radio"
                        name="consultora"
                        value={pessoa.numero}
                        checked={marcada}
                        onChange={() => {
                          setConsultora(pessoa);
                          setEnviadoPara(null);
                        }}
                        className="sr-only"
                      />
                      <span className="font-sans text-[1rem] text-marinho-900">
                        {pessoa.nome}
                      </span>
                      <span
                        aria-hidden="true"
                        className={cn(
                          "grid size-5 shrink-0 place-items-center rounded-full border transition-colors duration-400",
                          marcada
                            ? "border-carmim-600 bg-carmim-600 text-marfim-puro"
                            : "border-marinho-500/40",
                        )}
                      >
                        {marcada && <Check size={11} strokeWidth={2.25} />}
                      </span>
                    </label>
                  );
                })}
              </div>
            </fieldset>

            <div className="mt-8 flex flex-col gap-2.5">
              <label
                htmlFor="nome-cliente"
                className="font-sans text-[0.625rem] uppercase tracking-[0.22em] text-marinho-700"
              >
                Seu nome (opcional)
              </label>
              <input
                id="nome-cliente"
                type="text"
                value={nomeCliente}
                onChange={(evento) => setNomeCliente(evento.target.value)}
                placeholder="Como podemos te chamar"
                autoComplete="given-name"
                className="border-0 border-b border-marinho-500/25 bg-transparent py-3 font-sans text-[0.9375rem] font-light text-marinho-900 placeholder:text-marinho-700/68 focus:border-marinho-500/60 focus:outline-none"
              />
            </div>

            <button
              type="button"
              onClick={enviar}
              disabled={!consultora}
              aria-describedby="ajuda-envio"
              className="mt-8 flex min-h-14 w-full items-center justify-center gap-3 bg-carmim-500 px-6 py-4 text-center font-sans text-[0.8125rem] uppercase tracking-[0.16em] text-marfim-puro transition-colors duration-500 hover:bg-carmim-600 disabled:cursor-not-allowed disabled:bg-marinho-500/15 disabled:text-marinho-800"
            >
              <AviaoDePapel className="h-4 w-4 shrink-0 [&_path]:fill-current" />
              {consultora ? `Enviar pedido para ${consultora.nome}` : "Enviar pedido"}
            </button>

            <p
              id="ajuda-envio"
              className="mt-3 text-[0.8125rem] font-light leading-relaxed text-marinho-700"
            >
              {consultora
                ? `A mensagem abre no WhatsApp de ${consultora.nome}, com as peças e o total. Você confere tudo antes de enviar.`
                : "Escolha uma consultora para liberar o envio."}
            </p>

            <div role="status" aria-live="polite">
              {enviadoPara && (
                <div className="mt-6 border-t border-marinho-500/15 pt-5 text-[0.8125rem] font-light leading-relaxed text-marinho-800">
                  <p>
                    Pedido aberto no WhatsApp de {enviadoPara.nome}. Sua seleção continua
                    salva aqui, caso queira ajustar.
                  </p>
                  <p className="mt-2">
                    A conversa não abriu?{" "}
                    <a
                      href={enviadoPara.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-carmim-600 underline underline-offset-4 hover:text-carmim-500"
                    >
                      Abrir de novo
                    </a>
                  </p>
                  <button
                    type="button"
                    onClick={limpar}
                    className="mt-4 font-sans text-[0.6875rem] uppercase tracking-[0.18em] text-marinho-700 transition-colors duration-400 hover:text-marinho-900"
                  >
                    Esvaziar lista
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function LinhaItem({ item }: { item: ItemOrcamento }) {
  const href = `/produtos/${item.slug}`;

  return (
    <li className="grid grid-cols-[5rem_1fr] gap-4 py-6 sm:grid-cols-[6.5rem_1fr] sm:gap-6">
      <Link
        href={href}
        tabIndex={-1}
        aria-hidden="true"
        className="relative block aspect-[4/5] overflow-hidden border border-marinho-500/10 bg-ladrilho"
      >
        {item.imagem ? (
          <Image
            src={item.imagem}
            alt=""
            fill
            sizes="104px"
            className="object-contain p-2"
          />
        ) : (
          <PlaceholderProduto nome={item.nome} compacto />
        )}
      </Link>

      <div className="min-w-0">
        <Link
          href={href}
          className="block text-[1rem] font-light leading-snug text-marinho-900 transition-colors duration-400 hover:text-carmim-600"
        >
          {item.nome}
        </Link>

        <p className="mt-1.5 font-sans text-[0.75rem] tabular-nums text-marinho-700">
          {item.codigo && <>Cód. {item.codigo} · </>}
          {temPreco(item) ? `${formatarBRL(item.preco)} cada` : "Valor sob consulta"}
        </p>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <ControleQuantidade item={item} />
          {temPreco(item) && (
            <p className="font-sans text-[0.9375rem] tabular-nums text-marinho-900">
              <span className="sr-only">Subtotal: </span>
              {formatarBRL(subtotal(item))}
            </p>
          )}
        </div>
      </div>
    </li>
  );
}

function PedidoVazio() {
  return (
    <div className="relative mx-auto flex max-w-xl flex-col items-center overflow-hidden py-16 text-center">
      <LacoTracejado className="pointer-events-none absolute left-1/2 top-1/2 h-80 w-80 -translate-x-1/2 -translate-y-1/2 text-marinho-500/10" />

      <AviaoDePapel className="relative h-9 w-9 opacity-60" />
      <h2 className="relative mt-8 font-display text-3xl font-light leading-tight text-marinho-900 md:text-4xl">
        Seu pedido ainda está vazio.
      </h2>
      <p className="relative mt-5 text-[0.9375rem] font-light leading-relaxed legivel text-marinho-800">
        Toque no + das peças que te interessam e elas aparecem aqui, com a soma
        pronta para enviar à consultora.
      </p>
      <div className="relative mt-10 flex flex-wrap justify-center gap-4">
        <Link
          href="/novidades"
          className="inline-flex h-12 items-center bg-marinho-900 px-8 font-sans text-[0.75rem] uppercase tracking-[0.18em] text-marfim-puro transition-colors duration-500 hover:bg-marinho-800"
        >
          Ver novidades
        </Link>
        <Link
          href="/catalogo"
          className="inline-flex h-12 items-center border border-marinho-500/30 px-8 font-sans text-[0.75rem] uppercase tracking-[0.18em] text-marinho-900 transition-colors duration-500 hover:border-marinho-900"
        >
          Ver catálogo
        </Link>
      </div>
    </div>
  );
}
