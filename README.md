# Thaby Importados — site institucional e catálogo

Site de vitrine da **Thaby Importados** (Sorriso/MT). Não é loja com checkout:
a venda acontece no WhatsApp, então o site existe para apresentar a marca,
expor o acervo e entregar o cliente na conversa com a mensagem já escrita.

## Stack

| Camada    | Escolha                                     |
| --------- | ------------------------------------------- |
| Framework | Next.js 16 (App Router, Turbopack)          |
| Linguagem | TypeScript                                  |
| Estilo    | Tailwind CSS v4 (`@theme` em `globals.css`) |
| Movimento | Motion 12 + Lenis (scroll suave)            |
| Ícones    | lucide-react (+ SVGs próprios para redes)   |
| Imagens   | `next/image` sobre WebP gerado por Sharp    |

Tudo é pré-renderizado: `next build` gera 56 páginas estáticas. Não há banco,
API nem variável de ambiente obrigatória.

## Rodando

```bash
npm install
npm run dev
```

Scripts:

- `npm run dev` — servidor de desenvolvimento
- `npm run build` — build de produção (estático)
- `npm run typecheck` — `tsc --noEmit`
- `npm run lint` — ESLint
- `npm run assets` — regenera logo, ícones, OG image e fotos otimizadas

## Estrutura

```
src/
  app/                     rotas (App Router)
    catalogo/              vitrine com busca e filtros
    categorias/[slug]/     página por categoria
    produtos/[slug]/       página por produto
    sobre/  contato/       institucional
    sitemap.ts  robots.ts  SEO
  componentes/
    marca/                 logo, rota de voo, avião de papel, ícones sociais
    layout/                cabeçalho, rodapé, botão flutuante
    ui/                    botões, revelações, faixa, seção
    catalogo/              cartões de produto e categoria, vitrine
    orcamento/             store + contexto + gaveta lateral
    contato/               formulário que monta a mensagem do WhatsApp
    secoes/                seções da home
    seo/                   JSON-LD
  dados/
    empresa.ts             dados institucionais reais (CNPJ, WhatsApp, redes)
    catalogo.ts            categorias, produtos e consultas
  lib/                     utilidades (slug, classes, URL base)
dados-fonte/               matéria-prima do catálogo (JSON + imagens originais)
scripts/prepare-assets.mjs pipeline de imagens
```

## Decisões que valem contexto

**Cores nascem do logo.** `#3b548f` (azul) e `#bb3c45` (carmim) são as cores
oficiais cadastradas pela loja. A escala em `globals.css` foi derivada delas.
Não há dourado de propósito: o contraste frio/quente já é a assinatura.

**Fundo claro, azul como tinta.** O papel é `#fbf9f5` — branco quente, não
branco puro: a diferença é de poucos pontos, mas é o que separa "papel" de
"tela de escritório" e faz o azul assentar em vez de vibrar. Duas ilhas
permanecem escuras de propósito: a seção **Processo** (quebra de ritmo no meio
da página) e o **rodapé** (ancora a base e devolve a marca ao fim da leitura).

**Contraste foi medido, não estimado.** Inverter um tema não é trocar cores:
texto claro a 40% sobre marinho rende contraste alto, mas azul a 40% sobre
quase-branco despenca para ~2,4:1. Toda a escala de texto secundário foi
recalculada para o piso de 4,5:1 (3:1 em corpo grande), verificando a cor
composta real de cada elemento sobre o fundo do seu container.

**Os ladrilhos de foto têm filete.** Os packshots têm fundo branco; sem a
moldura de `1px` eles sangrariam direto na página.

**A rota tracejada é o motivo da marca.** O logo tem um laço pontilhado com um
avião de papel. Em `RotaDeVoo.tsx` esse traço atravessa a página, revelado por
máscara conforme a seção entra, com o avião correndo o caminho pelo scroll.

**Preço real, com âncora no WhatsApp.** Cada peça mostra o valor de referência
do acervo (vindo da API), mas todo CTA leva ao WhatsApp para confirmar
disponibilidade e condições — o estoque gira rápido. Produto sem preço cadastrado
cai para "sob consulta".

**A foto do produto morfa entre as páginas.** `<ViewTransition>` do React 19.2
pareia o ladrilho da grade com a foto do detalhe pelo mesmo `name` (ver
`lib/transicoes.ts`), então a imagem voa e cresce até a nova posição em vez de a
página trocar. O cabeçalho é ancorado para não deslizar junto, e a sobreposição
da transição libera cliques.

**Imagem entra por máscara, não por fade.** `RevelarImagem` descobre a foto de
baixo para cima com `clip-path` enquanto a própria imagem alivia de 1.08 para
1.0 — dois movimentos em direções diferentes, que é o que dá sensação de peso.

**A cortina de abertura tem duas travas de segurança.** `AberturaMarca` fica no
layout, logo nunca desmonta: a trava de scroll é desfeita dentro do próprio
encerramento, e não na limpeza do efeito (que jamais rodaria). Além disso a
cortina é `pointer-events: none` e some por uma animação CSS de 3,5s mesmo se o
JavaScript falhar — uma tela escura presa seria o pior desfecho possível.

**Lista de orçamento, não carrinho.** `componentes/orcamento` guarda a seleção
em `localStorage` via `useSyncExternalStore` (o que dá sincronia entre abas de
graça) e monta a mensagem final do WhatsApp.

**Fallback sem JS.** As entradas animadas começam em `opacity: 0`. Um bloco
`<noscript>` no layout devolve a visibilidade — sem ele, o site sumiria para
quem estiver sem script.

## Catálogo: acervo completo, extraído da fonte

O site carrega o **acervo real completo** da loja: **3.284 produtos ativos, 10
supercategorias, 43 subcategorias e 122 marcas**, com preço, código, EAN e fotos.
Os dados estão em `src/dados/catalogo-completo.json` (gerado; ~7 MB, fica no
servidor) e são consumidos por `src/dados/catalogo.ts`.

**Como os dados foram obtidos.** O app de vendas do catalogomobile abre uma
sessão pública automática (`/api/v2/auth/loginClient`) que destrava
`/api/v1/products` e `/api/v1/categories`. Os scripts em `scratchpad` do processo
paginaram os 5.165 registros, filtraram os ativos, montaram a hierarquia por
`parent_id`, normalizaram marcas e limparam o HTML das descrições.

**Para reprocessar** (quando o estoque mudar): rodar de novo a extração (precisa
de um token de sessão válido — expira em ~1h) e o gerador, que reescreve o JSON.
O procedimento está documentado nos scripts.

**Arquitetura de escala:**

- **Fotos** (2.232 no S3) via `next/image` + `remotePatterns` — otimizadas sob
  demanda, nada baixado no build. O repositório fica leve.
- **Páginas de produto**: `dynamicParams` renderiza sob demanda e cacheia; só os
  60 destaques são pré-renderizados no build (senão seriam 3.000+ páginas).
- **Vitrine**: o cliente recebe um índice enxuto (`vitrineResumo`, ~0.76 MB), não
  os produtos completos. Filtra por frente, busca e pagina em lotes de 48.

**Pendências para a loja revisar antes de publicar:**

1. Curadoria de destaques: hoje a home elege peças de marcas-âncora
   (`MARCAS_ANCORA` em `catalogo.ts`) com foto e preço. Revisável.
2. ~1.050 produtos ainda sem foto — caem no marcador de marca. Fotografia
   própria elevaria o acervo.
3. Preços vêm do cadastro do ERP; confirmar se são os de venda ao cliente final.
4. Domínio: definir `NEXT_PUBLIC_SITE_URL` na hospedagem (fallback em
   `src/lib/site.ts`).
5. Crédito do rodapé: há um `TODO` em `componentes/layout/Rodape.tsx`.

## Deploy

Projeto estático, pronto para Vercel sem configuração. Só defina:

```
NEXT_PUBLIC_SITE_URL=https://dominio-definitivo.com.br
```

Sem essa variável o build funciona, mas canonical, sitemap e Open Graph
apontam para o domínio de fallback.
