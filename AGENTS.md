<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

<!-- BEGIN:estrutura-vitor -->

## Memoria do projeto (Obsidian)

A nota `03 - Projetos/Thaby Importados.md` no vault do Obsidian e a fonte oficial de
estrategia, estado e decisoes deste projeto. Acesse pelo MCP `obsidian`, vault id
`organizacao-ai`. Linear: projeto "Thaby Importados" (PROJ-83..88).

- Antes de comecar: leia a nota com `obsidian_read_note`.
- Ao terminar o ciclo: escreva o resultado com `obsidian_edit_note`. Substitua o estado antigo, nao empilhe.
- Aprendizado que vale para outro cliente: nota atomica em `02 - Conhecimento`.

## Divisao de agentes

| Tarefa | Agente |
|---|---|
| Implementacao complexa, arquitetura, feature inteira | Claude Code (Opus) |
| Revisao, testes, seguranca, regressao | Codex |
| Edicao cirurgica, rename, typo, ajuste de copy, varredura de repo | Cursor CLI |

Push na master publica o site (GitHub Pages via Actions): so com ok do Vitor.
Regras completas em `.cursor/rules/estrutura.mdc`.

<!-- END:estrutura-vitor -->
