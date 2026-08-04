/**
 * Pipeline de assets da marca.
 *
 * - Converte o logo original (JPG com fundo branco) em PNG com canal alfa,
 *   usando "unmultiply" sobre branco para preservar o antialiasing das curvas.
 * - Otimiza as fotos de categoria e de produto para WebP/AVIF.
 *
 * Uso: node scripts/prepare-assets.mjs <pasta-de-origem>
 */
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const SRC = process.argv[2];
if (!SRC) {
  console.error('Informe a pasta de origem dos assets.');
  process.exit(1);
}

const ROOT = process.cwd();
const OUT = path.join(ROOT, 'public');

const dirs = {
  brand: path.join(OUT, 'marca'),
  categorias: path.join(OUT, 'categorias'),
  produtos: path.join(OUT, 'produtos'),
};
for (const d of Object.values(dirs)) fs.mkdirSync(d, { recursive: true });

/** Remove o fundo branco preservando as bordas suaves (unmultiply alpha). */
async function removeWhite(inputPath, outputPath, size = 1024) {
  const img = sharp(inputPath).ensureAlpha();
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
  const out = Buffer.alloc(data.length);

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    // Alfa derivado da distância até o branco puro.
    const a = 255 - Math.min(r, g, b);

    if (a === 0) {
      out[i] = out[i + 1] = out[i + 2] = out[i + 3] = 0;
      continue;
    }

    const k = 255 / a;
    out[i] = Math.max(0, Math.min(255, Math.round((r - (255 - a)) * k)));
    out[i + 1] = Math.max(0, Math.min(255, Math.round((g - (255 - a)) * k)));
    out[i + 2] = Math.max(0, Math.min(255, Math.round((b - (255 - a)) * k)));
    out[i + 3] = a;
  }

  await sharp(out, { raw: { width: info.width, height: info.height, channels: 4 } })
    .trim({ threshold: 1 })
    .resize({ width: size, height: size, fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ compressionLevel: 9 })
    .toFile(outputPath);
}

/** Versão monocromática do logo, para usos sobre fundo escuro/claro. */
async function tintLogo(inputPath, outputPath, hex) {
  const { data, info } = await sharp(inputPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const out = Buffer.alloc(data.length);
  for (let i = 0; i < data.length; i += 4) {
    out[i] = r;
    out[i + 1] = g;
    out[i + 2] = b;
    out[i + 3] = data[i + 3];
  }
  await sharp(out, { raw: { width: info.width, height: info.height, channels: 4 } })
    .png({ compressionLevel: 9 })
    .toFile(outputPath);
}

async function optimize(inputPath, outDir, slug, width) {
  const base = sharp(inputPath).resize({ width, withoutEnlargement: true });
  await base.clone().webp({ quality: 82, effort: 6 }).toFile(path.join(outDir, `${slug}.webp`));
}

const logoSrc = path.join(SRC, 'assets', 'logo-original.jpg');
await removeWhite(logoSrc, path.join(dirs.brand, 'logo.png'));
await tintLogo(path.join(dirs.brand, 'logo.png'), path.join(dirs.brand, 'logo-ivory.png'), '#F5F2EC');
console.log('logo processado');

/* ---------------------------------------------------------------- */
/* Ícones e imagem de compartilhamento                               */
/* ---------------------------------------------------------------- */

const APP = path.join(ROOT, 'src', 'app');
const MARFIM = { r: 0xfd, g: 0xfb, b: 0xf7, alpha: 1 };
const logoTransparente = path.join(dirs.brand, 'logo.png');

/** Favicon / touch icon: arte original sobre o marfim da marca. */
async function gerarIcone(lado, destino, margem = 0.1) {
  const interno = Math.round(lado * (1 - margem * 2));
  const arte = await sharp(logoTransparente)
    .resize(interno, interno, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();

  await sharp({
    create: { width: lado, height: lado, channels: 4, background: MARFIM },
  })
    .composite([{ input: arte, gravity: 'center' }])
    .png({ compressionLevel: 9 })
    .toFile(destino);
}

await gerarIcone(512, path.join(APP, 'icon.png'));
await gerarIcone(180, path.join(APP, 'apple-icon.png'), 0.08);

/**
 * Card de compartilhamento (1200×630). Sem texto renderizado: o logo já traz
 * o nome, e depender de fonte instalada no sistema quebraria o build noutra máquina.
 */
async function gerarOpenGraph(destino) {
  const largura = 1200;
  const altura = 630;

  const arte = await sharp(logoTransparente)
    .resize(430, 430, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();

  const fundo = Buffer.from(
    `<svg width="${largura}" height="${altura}" xmlns="http://www.w3.org/2000/svg">
       <defs>
         <radialGradient id="brilho" cx="50%" cy="42%" r="62%">
           <stop offset="0%" stop-color="#ffffff"/>
           <stop offset="100%" stop-color="#efe9df"/>
         </radialGradient>
       </defs>
       <rect width="${largura}" height="${altura}" fill="url(#brilho)"/>
       <rect x="26" y="26" width="${largura - 52}" height="${altura - 52}" fill="none" stroke="#3b548f" stroke-opacity="0.28" stroke-width="1"/>
       <rect x="${largura / 2 - 46}" y="${altura - 118}" width="92" height="2" fill="#bb3c45"/>
     </svg>`,
  );

  await sharp(fundo)
    .composite([{ input: arte, top: 78, left: Math.round(largura / 2 - 215) }])
    .png({ compressionLevel: 9 })
    .toFile(destino);
}

await gerarOpenGraph(path.join(APP, 'opengraph-image.png'));
console.log('ícones e open graph gerados');

const manifest = JSON.parse(fs.readFileSync(path.join(SRC, 'catalogo.json'), 'utf8'));
const slugify = (s) =>
  s
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

for (const c of manifest.categorias) {
  const file = path.join(SRC, 'assets', 'categorias', `${c.id}${path.extname(c.image)}`);
  if (!fs.existsSync(file)) continue;
  await optimize(file, dirs.categorias, slugify(c.name), 1400);
}
console.log('categorias processadas');

for (const p of manifest.produtos) {
  if (!p.foto1) continue;
  const file = path.join(SRC, 'assets', 'produtos', `${p.id}${path.extname(p.foto1)}`);
  if (!fs.existsSync(file)) continue;
  await optimize(file, dirs.produtos, String(p.id), 1000);
}
console.log('produtos processados');
