# Extração do catálogo

Reconstrói `src/dados/catalogo-completo.json` a partir da API do catalogomobile.

## Passos

1. **Token de sessão** (expira em ~1h). No navegador, abra
   `https://thabyimportados.catalogomobile.com.br/c/produtos` e, no console:
   ```js
   localStorage.getItem('id_token')
   ```
   Salve o valor em `token.txt` nesta pasta.

2. **Baixar** os dados brutos (categorias + ~5.000 produtos paginados):
   ```bash
   node baixar-catalogo.mjs
   ```
   Gera `cat-super.json`, `cat-todas.json`, `produtos-todos.json`.

3. **Processar** para o formato do site:
   ```bash
   node gerar-dados.mjs
   ```
   Gera `catalogo-final.json`. Copie para `../../src/dados/catalogo-completo.json`.

Rode os passos com o working dir nesta pasta.
