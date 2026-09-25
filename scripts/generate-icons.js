import sharp from 'sharp';
import { mkdirSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

// ── Templates SVG ─────────────────────────────────────────────────────────────
const SVG_TEMPLATE = (size) => `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${Math.round(size * 0.2)}" fill="#2563EB"/>
  <text x="50%" y="45%" font-family="system-ui,sans-serif" font-size="${Math.round(size * 0.32)}px" font-weight="bold" fill="white" text-anchor="middle" dominant-baseline="middle">&#x21C4;</text>
  <text x="50%" y="75%" font-family="system-ui,sans-serif" font-size="${Math.round(size * 0.18)}px" font-weight="bold" fill="white" text-anchor="middle" dominant-baseline="middle">CQ</text>
</svg>`;

const MASKABLE_SVG = (size) => `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="#2563EB"/>
  <text x="50%" y="45%" font-family="system-ui,sans-serif" font-size="${Math.round(size * 0.28)}px" font-weight="bold" fill="white" text-anchor="middle" dominant-baseline="middle">&#x21C4;</text>
  <text x="50%" y="72%" font-family="system-ui,sans-serif" font-size="${Math.round(size * 0.16)}px" font-weight="bold" fill="white" text-anchor="middle" dominant-baseline="middle">CQ</text>
</svg>`;

const FAVICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="13" fill="#2563EB"/>
  <text x="50%" y="45%" font-family="system-ui,sans-serif" font-size="22px" font-weight="bold" fill="white" text-anchor="middle" dominant-baseline="middle">&#x21C4;</text>
  <text x="50%" y="76%" font-family="system-ui,sans-serif" font-size="12px" font-weight="bold" fill="white" text-anchor="middle" dominant-baseline="middle">CQ</text>
</svg>`;

// ── Alvos ─────────────────────────────────────────────────────────────────────
const TARGETS = [
  { path: 'extension/icons/icon16.png',  size: 16  },
  { path: 'extension/icons/icon32.png',  size: 32  },
  { path: 'extension/icons/icon48.png',  size: 48  },
  { path: 'extension/icons/icon128.png', size: 128 },
  { path: 'extension/icons/icon512.png', size: 512 },
  { path: 'public/icons/icon-192.png',   size: 192 },
  { path: 'public/icons/icon-512.png',   size: 512 },
];

// ── Criar diretórios ──────────────────────────────────────────────────────────
mkdirSync(join(ROOT, 'extension/icons'), { recursive: true });
mkdirSync(join(ROOT, 'public/icons'),    { recursive: true });

// ── Gerar ícones PNG ──────────────────────────────────────────────────────────
for (const target of TARGETS) {
  const svg = Buffer.from(SVG_TEMPLATE(target.size));
  await sharp(svg).png().toFile(join(ROOT, target.path));
  console.log(`Gerado: ${target.path}`);
}

// ── Maskable ──────────────────────────────────────────────────────────────────
const maskableSvg = Buffer.from(MASKABLE_SVG(512));
await sharp(maskableSvg).png().toFile(join(ROOT, 'public/icons/maskable-512.png'));
console.log('Gerado: public/icons/maskable-512.png');

// ── Favicon SVG ──────────────────────────────────────────────────────────────
writeFileSync(join(ROOT, 'public/favicon.svg'), FAVICON_SVG, 'utf-8');
console.log('Gerado: public/favicon.svg');

console.log('\nTodos os ícones foram gerados com sucesso!');
