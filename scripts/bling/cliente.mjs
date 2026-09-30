/**
 * Conexao com o Bling (API v3), SOMENTE LEITURA.
 *
 * - Credenciais e tokens ficam FORA do repositorio, em %USERPROFILE%\.thaby-bling\
 *   (nunca no Git, nunca no chat).
 * - A unica chamada que nao e GET e a troca/renovacao de token em /oauth/token.
 *   Qualquer outra tentativa de POST/PUT/PATCH/DELETE e recusada aqui, antes de
 *   sair do computador.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export const PASTA = path.join(os.homedir(), ".thaby-bling");
const ARQ_CRED = path.join(PASTA, "credenciais.json");
const ARQ_TOKEN = path.join(PASTA, "tokens.json");
const ARQ_LOG = path.join(PASTA, "chamadas.log");
const API = "https://api.bling.com.br/Api/v3";
export const PORTA = 8765;
export const REDIRECT = `http://localhost:${PORTA}/callback`;

fs.mkdirSync(PASTA, { recursive: true });

export function lerCredenciais() {
  if (!fs.existsSync(ARQ_CRED)) return null;
  return JSON.parse(fs.readFileSync(ARQ_CRED, "utf8"));
}
export function salvarCredenciais(c) {
  fs.writeFileSync(ARQ_CRED, JSON.stringify(c, null, 1), { mode: 0o600 });
}
function lerTokens() {
  if (!fs.existsSync(ARQ_TOKEN)) return null;
  return JSON.parse(fs.readFileSync(ARQ_TOKEN, "utf8"));
}
function salvarTokens(t) {
  const agora = Date.now();
  fs.writeFileSync(
    ARQ_TOKEN,
    JSON.stringify(
      { ...t, obtidoEm: agora, expiraEm: agora + (t.expires_in ?? 21600) * 1000 },
      null,
      1,
    ),
    { mode: 0o600 },
  );
}
function registrar(metodo, caminho, status) {
  fs.appendFileSync(ARQ_LOG, `${new Date().toISOString()} ${metodo} ${caminho} ${status}\n`);
}

async function pedirToken(corpo) {
  const c = lerCredenciais();
  if (!c) throw new Error("Credenciais do Bling nao configuradas. Rode autorizar.mjs.");
  const basic = Buffer.from(`${c.clientId}:${c.clientSecret}`).toString("base64");
  const r = await fetch(`${API}/oauth/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "1.0",
      Authorization: `Basic ${basic}`,
    },
    body: new URLSearchParams(corpo),
  });
  registrar("POST", "/oauth/token", r.status);
  const j = await r.json().catch(() => ({}));
  if (!r.ok) {
    throw new Error(
      `Bling recusou o token (${r.status}): ${j?.error?.description ?? j?.error?.message ?? "sem detalhe"}. ` +
        "Se passou de 30 dias sem uso, rode autorizar.mjs de novo.",
    );
  }
  salvarTokens(j);
  return j.access_token;
}

export function trocarCodigo(code) {
  return pedirToken({ grant_type: "authorization_code", code });
}

async function tokenValido() {
  const t = lerTokens();
  if (!t) throw new Error("Bling ainda nao autorizado. Rode autorizar.mjs.");
  if (Date.now() < t.expiraEm - 5 * 60 * 1000) return t.access_token;
  return pedirToken({ grant_type: "refresh_token", refresh_token: t.refresh_token });
}

let ultima = 0;
/** GET na API do Bling. Unico metodo exposto: leitura. */
export async function blingGet(caminho, params = {}) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (Array.isArray(v)) v.forEach((x) => qs.append(k, String(x)));
    else if (v != null) qs.append(k, String(v));
  }
  const url = `${API}${caminho}${qs.size ? `?${qs}` : ""}`;
  for (let tentativa = 1; ; tentativa++) {
    // Limite do Bling: 3 req/s. Mantemos ~2,5 req/s.
    const espera = ultima + 400 - Date.now();
    if (espera > 0) await new Promise((res) => setTimeout(res, espera));
    ultima = Date.now();
    const token = await tokenValido();
    const r = await fetch(url, { method: "GET", headers: { Authorization: `Bearer ${token}`, Accept: "application/json" } });
    registrar("GET", caminho, r.status);
    if (r.ok) return r.json();
    if ((r.status === 429 || r.status >= 500) && tentativa < 5) {
      await new Promise((res) => setTimeout(res, 1500 * tentativa));
      continue;
    }
    const txt = await r.text();
    throw new Error(`Bling GET ${caminho} falhou (${r.status}): ${txt.slice(0, 300)}`);
  }
}

/**
 * Baixa uma imagem de produto (GET simples). O link interno do Bling ja vem
 * assinado e expira, por isso vai sem token e so e usado na sincronizacao.
 */
export async function baixarImagem(url) {
  if (!/^https:\/\//i.test(url)) throw new Error(`Imagem recusada (link nao https): ${url.slice(0, 80)}`);
  for (let tentativa = 1; ; tentativa++) {
    const r = await fetch(url, { method: "GET" });
    registrar("GET", `imagem ${new URL(url).host}`, r.status);
    if (r.ok) return { dados: Buffer.from(await r.arrayBuffer()), tipo: r.headers.get("content-type") ?? "" };
    if ((r.status === 429 || r.status >= 500) && tentativa < 3) {
      await new Promise((res) => setTimeout(res, 1500 * tentativa));
      continue;
    }
    throw new Error(`Download da imagem falhou (${r.status}): ${new URL(url).host}${new URL(url).pathname}`);
  }
}

/** Trava de escrita: existe so para deixar explicito e testavel. */
export function blingEscrever() {
  throw new Error("Proibido: a integracao com o Bling e somente leitura.");
}
