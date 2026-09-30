/**
 * Autorizacao do Bling, feita UMA vez (ou de novo se passar 30 dias sem uso).
 *
 *   node scripts/bling/autorizar.mjs
 *
 * Abre http://localhost:8765 no navegador. Ali voce cola Client ID e Client
 * Secret (ficam so neste computador), e o site te leva ao Bling para clicar em
 * "Autorizar". O Bling volta para http://localhost:8765/callback e o token e salvo.
 */
import http from "node:http";
import { exec } from "node:child_process";
import crypto from "node:crypto";
import { PORTA, REDIRECT, PASTA, lerCredenciais, salvarCredenciais, trocarCodigo, blingGet } from "./cliente.mjs";

const estado = crypto.randomBytes(12).toString("hex");

const pagina = (corpo) => `<!doctype html><html lang="pt-BR"><meta charset="utf-8">
<title>Thaby: conectar Bling</title>
<style>body{font-family:system-ui;max-width:560px;margin:48px auto;padding:0 20px;color:#16244a;background:#fbf9f5}
input{width:100%;padding:10px;margin:6px 0 16px;border:1px solid #16244a55;border-radius:6px;font-size:15px}
button{background:#16244a;color:#fff;border:0;padding:12px 18px;border-radius:6px;font-size:15px;cursor:pointer}
.ok{color:#1b7a3a}.erro{color:#bb3c45}code{background:#16244a12;padding:2px 6px;border-radius:4px}</style>
<body>${corpo}</body></html>`;

const servidor = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORTA}`);
  res.setHeader("Content-Type", "text/html; charset=utf-8");

  if (req.method === "POST" && url.pathname === "/salvar") {
    let dados = "";
    for await (const parte of req) dados += parte;
    const f = new URLSearchParams(dados);
    const clientId = (f.get("clientId") ?? "").trim();
    const clientSecret = (f.get("clientSecret") ?? "").trim();
    if (!clientId || !clientSecret) {
      res.end(pagina(`<p class="erro">Preencha os dois campos.</p><a href="/">Voltar</a>`));
      return;
    }
    salvarCredenciais({ clientId, clientSecret });
    const auth = new URL("https://www.bling.com.br/Api/v3/oauth/authorize");
    auth.searchParams.set("response_type", "code");
    auth.searchParams.set("client_id", clientId);
    auth.searchParams.set("state", estado);
    res.writeHead(302, { Location: auth.toString() });
    res.end();
    return;
  }

  if (url.pathname === "/callback") {
    const code = url.searchParams.get("code");
    if (url.searchParams.get("state") !== estado || !code) {
      res.end(pagina(`<h2 class="erro">Autorizacao nao concluida.</h2><p>Feche esta aba e rode o comando de novo.</p>`));
      return;
    }
    try {
      await trocarCodigo(code);
      const teste = await blingGet("/produtos", { pagina: 1, limite: 1 });
      const n = Array.isArray(teste?.data) ? teste.data.length : 0;
      res.end(pagina(`<h2 class="ok">Bling conectado.</h2>
<p>Teste de leitura: ${n ? "ok, produtos acessiveis" : "conectou, mas a lista veio vazia"}.</p>
<p>Pode fechar esta aba e voltar ao Hermes.</p>`));
      console.log(`AUTORIZADO. Teste de leitura de produtos: ${n ? "ok" : "vazio"}`);
    } catch (e) {
      res.end(pagina(`<h2 class="erro">Erro ao conectar</h2><p>${String(e.message).replace(/</g, "&lt;")}</p>`));
      console.log("ERRO:", e.message);
    }
    setTimeout(() => servidor.close(() => process.exit(0)), 1500);
    return;
  }

  const ja = lerCredenciais();
  res.end(pagina(`<h2>Conectar o Bling ao site da Thaby</h2>
<p>Somente leitura. Nada no Bling e alterado.</p>
<p>Cole os dados da aba <b>Informacoes do app</b> do aplicativo que voce criou no Bling.
Eles ficam salvos so neste computador, em <code>${PASTA}</code>.</p>
<form method="post" action="/salvar">
<label>Client ID<input name="clientId" autocomplete="off" value="${ja?.clientId ?? ""}"></label>
<label>Client Secret<input name="clientSecret" type="password" autocomplete="off"></label>
<button>Salvar e autorizar no Bling</button></form>
<p style="margin-top:28px;font-size:13px">Link de redirecionamento cadastrado no app: <code>${REDIRECT}</code></p>`));
});

servidor.listen(PORTA, () => {
  console.log(`Abra http://localhost:${PORTA} (aguardando autorizacao...)`);
  exec(`cmd.exe /c start "" "http://localhost:${PORTA}"`);
});
