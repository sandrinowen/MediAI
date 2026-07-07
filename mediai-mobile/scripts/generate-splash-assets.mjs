// scripts/generate-splash-assets.mjs
// Construit le splash + le logo MediAI À PARTIR de l'icône existante (assets/icon.png,
// double hélice ADN sur fond vert #2d6a4f), via @resvg/resvg-js.
// Ne modifie PAS assets/icon.png. Usage : node scripts/generate-splash-assets.mjs
import { Resvg } from '@resvg/resvg-js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const ASSETS = path.join(ROOT, 'assets');

const GREEN = '#2d6a4f';
const MINT = '#b7e4c7';
const WHITE = '#ffffff';

// Icône existante réutilisée telle quelle (fond déjà #2d6a4f → raccord parfait).
const ICON_DATA = 'data:image/png;base64,' + fs.readFileSync(path.join(ASSETS, 'icon.png')).toString('base64');

// Police garantie (fournie avec dompdf côté backend) pour le wordmark.
const FONT = path.resolve(ROOT, '..', 'backend-app', 'vendor', 'dompdf', 'dompdf', 'lib', 'fonts', 'DejaVuSans-Bold.ttf');
const FONT_FAMILY = 'DejaVu Sans';

const img = (x, y, w) => `<image href="${ICON_DATA}" x="${x}" y="${y}" width="${w}" height="${w}"/>`;
const word = (cx, y, size) =>
  `<text x="${cx}" y="${y}" font-family="${FONT_FAMILY}" font-size="${size}" font-weight="bold" fill="${WHITE}" text-anchor="middle" letter-spacing="${size * 0.02}">MediAI</text>`;

// Logo de marque : icône ADN + wordmark sur carré vert arrondi.
const logoSvg = (S) => {
  const w = S * 0.6;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}" viewBox="0 0 ${S} ${S}">
  <rect width="${S}" height="${S}" rx="${S * 0.22}" fill="${GREEN}"/>
  ${img((S - w) / 2, S * 0.12, w)}
  ${word(S / 2, S * 0.86, S * 0.13)}
</svg>`;
};

// Splash plein écran : fond vert + icône centrée + wordmark + tagline.
const splashSvg = (W, H) => {
  const w = W * 0.6;
  const iy = H * 0.30;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="${GREEN}"/>
  ${img((W - w) / 2, iy, w)}
  ${word(W / 2, iy + w + W * 0.11, W * 0.11)}
  <text x="${W / 2}" y="${iy + w + W * 0.17}" font-family="${FONT_FAMILY}" font-size="${W * 0.038}" fill="${MINT}" text-anchor="middle">Votre santé, assistée par l'IA</text>
</svg>`;
};

// Logo pour le plugin expo-splash-screen : icône + wordmark, fond transparent.
const splashIconSvg = (S) => {
  const w = S * 0.72;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}" viewBox="0 0 ${S} ${S}">
  ${img((S - w) / 2, S * 0.06, w)}
  ${word(S / 2, S * 0.94, S * 0.14)}
</svg>`;
};

// Icône Android adaptative (foreground) : icône centrée dans la zone sûre (~62%), transparent.
const adaptiveSvg = (S) => {
  const w = S * 0.6;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}" viewBox="0 0 ${S} ${S}">
  ${img((S - w) / 2, (S - w) / 2, w)}
</svg>`;
};

const render = (svg, w, out) => {
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: w },
    font: { fontFiles: fs.existsSync(FONT) ? [FONT] : [], loadSystemFonts: true, defaultFontFamily: FONT_FAMILY },
    background: 'rgba(0,0,0,0)',
  });
  fs.writeFileSync(out, resvg.render().asPng());
  console.log('✓', path.relative(ROOT, out));
};

fs.writeFileSync(path.join(ASSETS, 'logo.svg'), logoSvg(512));
console.log('✓ assets/logo.svg');

render(splashSvg(1284, 2778), 1284, path.join(ASSETS, 'splash.png'));
render(splashIconSvg(1024), 1024, path.join(ASSETS, 'splash-icon.png'));
render(adaptiveSvg(1024), 1024, path.join(ASSETS, 'adaptive-icon.png'));

console.log('Terminé (icon.png conservé tel quel).');
