/**
 * Dados institucionais da Thaby Importados.
 * Extraídos do cadastro oficial da loja no catálogo atual — não inventar valores aqui.
 */

export const empresa = {
  nome: "Thaby Importados",
  nomeCurto: "Thaby",
  descritor: "Importados selecionados",
  cnpj: "41.639.143/0001-25",
  fundacao: 2021,

  cidade: "Sorriso",
  estado: "MT",
  pais: "Brasil",
  regiao: "Sorriso, Mato Grosso",

  email: "thabyimportados@hotmail.com",

  whatsapp: {
    numero: "5566999952450",
    exibicao: "(66) 99995-2450",
  },

  redes: {
    instagram: {
      usuario: "thabyimportados",
      url: "https://instagram.com/thabyimportados",
    },
    tiktok: {
      usuario: "thabyimportados2",
      url: "https://www.tiktok.com/@thabyimportados2",
    },
  },

  /** Catálogo operacional que a loja já usa para vender. */
  catalogoOperacional: "https://thabyimportados.catalogomobile.com.br/",

  cores: {
    primaria: "#3b548f",
    secundaria: "#bb3c45",
  },
} as const;

/** Monta um link de WhatsApp com mensagem pré-preenchida. */
export function linkWhatsAppPara(numero: string, mensagem?: string) {
  const base = `https://wa.me/${numero}`;
  if (!mensagem) return base;
  return `${base}?text=${encodeURIComponent(mensagem)}`;
}

export function linkWhatsApp(mensagem?: string) {
  return linkWhatsAppPara(empresa.whatsapp.numero, mensagem);
}

/** Os grupos aparecem na ordem dos contatos, sem cadastro adicional na página. */
export const equipe = [
  { nome: "Thaby", papel: "Atendimento principal", numero: empresa.whatsapp.numero, exibicao: empresa.whatsapp.exibicao, grupo: "Contato principal" },
  { nome: "Laura", papel: "Consultora", numero: "5566999396797", exibicao: "(66) 99939-6797", grupo: "Consultoras" },
  { nome: "Raylde", papel: "Consultora", numero: "5566996350334", exibicao: "(66) 99635-0334", grupo: "Consultoras" },
  { nome: "Adriana", papel: "Consultora", numero: "5566992352711", exibicao: "(66) 99235-2711", grupo: "Consultoras" },
] as const;

export const mensagensPadrao = {
  geral: "Olá! Vim pelo site da Thaby Importados e gostaria de mais informações.",
  catalogo:
    "Olá! Vim pelo site e gostaria de receber o catálogo completo da Thaby Importados.",
  encomenda:
    "Olá! Vim pelo site e gostaria de fazer uma encomenda personalizada com a Thaby Importados.",
} as const;
