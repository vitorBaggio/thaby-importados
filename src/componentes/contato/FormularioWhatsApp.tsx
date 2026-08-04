"use client";

import { useMemo, useState } from "react";
import { AviaoDePapel } from "@/componentes/marca/RotaDeVoo";
import { empresa } from "@/dados/empresa";

/**
 * Não há backend nem caixa de entrada para vigiar: o formulário monta a
 * mensagem e entrega no WhatsApp, que é onde a loja de fato atende.
 * Nada é enviado sem o cliente ver e confirmar.
 */
export function FormularioWhatsApp() {
  const [nome, setNome] = useState("");
  const [cidade, setCidade] = useState("");
  const [procura, setProcura] = useState("");

  const mensagem = useMemo(() => {
    const partes = [
      "Olá! Vim pelo site da Thaby Importados.",
      "",
      nome.trim() && `Meu nome é ${nome.trim()}.`,
      cidade.trim() && `Sou de ${cidade.trim()}.`,
      procura.trim() && `Estou procurando: ${procura.trim()}`,
      "",
      "Pode me ajudar?",
    ].filter(Boolean);

    return partes.join("\n");
  }, [nome, cidade, procura]);

  const href = `https://wa.me/${empresa.whatsapp.numero}?text=${encodeURIComponent(mensagem)}`;

  return (
    <form
      onSubmit={(evento) => evento.preventDefault()}
      className="flex flex-col gap-7"
    >
      <div className="grid gap-7 sm:grid-cols-2">
        <Campo
          rotulo="Seu nome"
          id="nome"
          valor={nome}
          aoMudar={setNome}
          placeholder="Como podemos te chamar"
          autoComplete="given-name"
        />
        <Campo
          rotulo="Sua cidade"
          id="cidade"
          valor={cidade}
          aoMudar={setCidade}
          placeholder="Para calcular o envio"
          autoComplete="address-level2"
        />
      </div>

      <div className="flex flex-col gap-2.5">
        <label
          htmlFor="procura"
          className="font-sans text-[0.5625rem] uppercase tracking-[0.22em] text-marinho-700/75"
        >
          O que você procura
        </label>
        <textarea
          id="procura"
          rows={4}
          value={procura}
          onChange={(evento) => setProcura(evento.target.value)}
          placeholder="Nome da peça, marca, link ou só uma descrição — a gente decifra"
          className="resize-none border-0 border-b border-marinho-500/18 bg-transparent py-3 font-sans text-[0.9375rem] font-light leading-relaxed text-marinho-900 placeholder:text-marinho-700/68 focus:border-marinho-500/50 focus:outline-none"
        />
      </div>

      <div className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-center">
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-14 items-center justify-center gap-3 bg-carmim-500 px-9 font-sans text-[0.8125rem] uppercase tracking-[0.16em] text-marfim-puro transition-colors duration-500 hover:bg-carmim-600"
        >
          <AviaoDePapel className="h-4 w-4 [&_path]:fill-current" />
          Abrir no WhatsApp
        </a>

        <p className="max-w-xs text-[0.75rem] font-light leading-relaxed text-marinho-700/75">
          Abre a conversa com o texto já escrito. Você revisa e envia.
        </p>
      </div>
    </form>
  );
}

function Campo({
  rotulo,
  id,
  valor,
  aoMudar,
  placeholder,
  autoComplete,
}: {
  rotulo: string;
  id: string;
  valor: string;
  aoMudar: (valor: string) => void;
  placeholder: string;
  autoComplete?: string;
}) {
  return (
    <div className="flex flex-col gap-2.5">
      <label
        htmlFor={id}
        className="font-sans text-[0.5625rem] uppercase tracking-[0.22em] text-marinho-700/75"
      >
        {rotulo}
      </label>
      <input
        id={id}
        type="text"
        value={valor}
        autoComplete={autoComplete}
        onChange={(evento) => aoMudar(evento.target.value)}
        placeholder={placeholder}
        className="border-0 border-b border-marinho-500/18 bg-transparent py-3 font-sans text-[0.9375rem] font-light text-marinho-900 placeholder:text-marinho-700/68 focus:border-marinho-500/50 focus:outline-none"
      />
    </div>
  );
}
