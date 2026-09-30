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

/*
 * Ritmo. Na 1a leitura real, 400 ms entre chamadas deu 1.084 respostas 429 em
 * 54 min. Agora: no minimo 700 ms; cada 429 alarga o intervalo em 25% (teto
 * 2 s) e 50 respostas ok seguidas o estreitam de novo, aos poucos.
 */
export const INTERVALO_MIN_MS = 700;
export const INTERVALO_MAX_MS = 2000;
export const FATOR_429 = 1.25;
export const OK_PARA_REDUZIR = 50;
/** Tentativas por chamada (a 1a + 7 repeticoes) em 429 ou 5xx. */
export const MAX_TENTATIVAS = 8;
export const TETO_ESPERA_MS = 30_000;

const dormir = (ms) => new Promise((res) => setTimeout(res, ms));

/** Intervalo adaptativo entre chamadas. `agora`/`esperar` trocaveis nos testes. */
export function criarRitmo({ agora = Date.now, esperar = dormir } = {}) {
  let intervalo = INTERVALO_MIN_MS;
  let ultima = -Infinity;
  let seguidas = 0;
  return {
    intervalo: () => intervalo,
    async aguardarVez() {
      const espera = ultima + intervalo - agora();
      if (espera > 0) await esperar(espera);
      ultima = agora();
    },
    sucesso() {
      if (++seguidas < OK_PARA_REDUZIR) return;
      seguidas = 0;
      intervalo = Math.max(INTERVALO_MIN_MS, intervalo / FATOR_429);
    },
    limitado() {
      seguidas = 0;
      intervalo = Math.min(INTERVALO_MAX_MS, intervalo * FATOR_429);
    },
  };
}

/** Espera antes de repetir: Retry-After (segundos ou data HTTP) se vier; senao 1 s, 2 s, 4 s... ate 30 s. */
export function esperaAposRecusa(tentativa, retryAfter, agora = Date.now()) {
  const valor = String(retryAfter ?? "").trim();
  if (/^\d+(\.\d+)?$/.test(valor)) return Number(valor) * 1000;
  const quando = valor ? Date.parse(valor) : NaN;
  if (Number.isFinite(quando)) return Math.max(0, quando - agora);
  return Math.min(TETO_ESPERA_MS, 1000 * 2 ** (tentativa - 1));
}

/**
 * Faz `pedir()` no ritmo; em 429 ou 5xx espera e repete, ate MAX_TENTATIVAS.
 * Devolve a resposta ok ou a ultima recusada (quem chama monta o erro).
 */
export async function pedirNoRitmo(ritmo, pedir, { agora = Date.now, esperar = dormir } = {}) {
  for (let tentativa = 1; ; tentativa++) {
    await ritmo.aguardarVez();
    const r = await pedir();
    if (r.ok) {
      ritmo.sucesso();
      return r;
    }
    if (r.status === 429) ritmo.limitado();
    if ((r.status !== 429 && r.status < 500) || tentativa >= MAX_TENTATIVAS) return r;
    await r.body?.cancel();
    await esperar(esperaAposRecusa(tentativa, r.headers.get("retry-after"), agora()));
  }
}

const ritmoBling = criarRitmo();

/** GET na API do Bling. Unico metodo exposto: leitura. */
export async function blingGet(caminho, params = {}) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (Array.isArray(v)) v.forEach((x) => qs.append(k, String(x)));
    else if (v != null) qs.append(k, String(v));
  }
  const url = `${API}${caminho}${qs.size ? `?${qs}` : ""}`;
  const r = await pedirNoRitmo(ritmoBling, async () => {
    const token = await tokenValido();
    const resposta = await fetch(url, { method: "GET", headers: { Authorization: `Bearer ${token}`, Accept: "application/json" } });
    registrar("GET", caminho, resposta.status);
    return resposta;
  });
  if (r.ok) return r.json();
  const txt = await r.text();
  throw new Error(`Bling GET ${caminho} falhou (${r.status}): ${txt.slice(0, 300)}`);
}

/** Teto de uma imagem baixada e tempo maximo do download (resposta + corpo). */
export const MAX_BYTES = 10 * 1024 * 1024;
export const TIMEOUT_IMAGEM_MS = 30_000;

/** Erro de uma imagem especifica: a sincronizacao pula a foto em vez de abortar. */
function imagemRecusada(msg) {
  const e = new Error(msg);
  e.imagemRecusada = true;
  return e;
}

/**
 * Le o corpo contando bytes em streaming: recusa Content-Length acima do teto
 * sem ler nada e cancela a leitura assim que passar do teto (mesmo sem header).
 */
export async function lerCorpoLimitado(r, max = MAX_BYTES) {
  const declarado = Number(r.headers.get("content-length"));
  if (Number.isFinite(declarado) && declarado > max) {
    await r.body?.cancel();
    throw imagemRecusada(`Imagem acima do teto de ${max} bytes (Content-Length ${declarado}).`);
  }
  if (!r.body) return Buffer.alloc(0);
  const leitor = r.body.getReader();
  const partes = [];
  let total = 0;
  for (;;) {
    const { done, value } = await leitor.read();
    if (done) break;
    total += value.byteLength;
    if (total > max) {
      await leitor.cancel();
      throw imagemRecusada(`Imagem acima do teto de ${max} bytes (leitura interrompida).`);
    }
    partes.push(value);
  }
  return Buffer.concat(partes);
}

/**
 * Baixa uma imagem de produto (GET simples). O link interno do Bling ja vem
 * assinado e expira, por isso vai sem token e so e usado na sincronizacao.
 * Aceita http porque imagem externa http e copiada para public/produtos (o site
 * so serve https).
 */
export async function baixarImagem(url) {
  if (!/^https?:\/\//i.test(url)) throw new Error(`Imagem recusada (link nao http/https): ${url.slice(0, 80)}`);
  for (let tentativa = 1; ; tentativa++) {
    const r = await fetch(url, { method: "GET", signal: AbortSignal.timeout(TIMEOUT_IMAGEM_MS) });
    registrar("GET", `imagem ${new URL(url).host}`, r.status);
    if (r.ok) return { dados: await lerCorpoLimitado(r), tipo: r.headers.get("content-type") ?? "" };
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
