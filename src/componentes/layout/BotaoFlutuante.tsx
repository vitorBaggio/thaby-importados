"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { MessageCircle } from "lucide-react";
import { linkWhatsApp, mensagensPadrao } from "@/dados/empresa";

/**
 * Atalho fixo para o WhatsApp.
 * Só aparece depois da primeira dobra — na abertura ele competiria com o hero.
 */
export function BotaoFlutuante() {
  const [visivel, setVisivel] = useState(false);

  useEffect(() => {
    const aoRolar = () => setVisivel(window.scrollY > window.innerHeight * 0.6);
    aoRolar();
    window.addEventListener("scroll", aoRolar, { passive: true });
    return () => window.removeEventListener("scroll", aoRolar);
  }, []);

  return (
    <AnimatePresence>
      {visivel && (
        <motion.a
          href={linkWhatsApp(mensagensPadrao.geral)}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Falar no WhatsApp"
          initial={{ opacity: 0, scale: 0.8, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: 12 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="group fixed bottom-6 right-6 z-40 grid size-14 place-items-center rounded-full bg-carmim-500 text-marfim-puro shadow-[0_10px_40px_-8px_rgba(187,60,69,0.55)] transition-colors duration-500 hover:bg-carmim-600 md:bottom-8 md:right-8"
        >
          <span className="absolute inset-0 rounded-full border border-carmim-500/50 opacity-0 transition-all duration-700 group-hover:scale-125 group-hover:opacity-100" />
          <MessageCircle size={22} strokeWidth={1.5} />
        </motion.a>
      )}
    </AnimatePresence>
  );
}
