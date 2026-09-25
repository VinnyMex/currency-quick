import { mkdirSync, existsSync, readdirSync, copyFileSync, createWriteStream } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import archiver from 'archiver';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const DIST = join(ROOT, 'dist-extension');

// ── Limpar e recriar ──────────────────────────────────────────────────────────
mkdirSync(DIST,                   { recursive: true });
mkdirSync(join(DIST, 'icons'),    { recursive: true });

// ── Arquivos da extensão ──────────────────────────────────────────────────────
const EXT_FILES = [
  'manifest.json',
  'background.js',
  'content.js',
  'content.css',
  'popup.html',
  'popup.css',
  'popup.js',
  'options.html',
  'options.css',
  'options.js'
];

for (const file of EXT_FILES) {
  const src = join(ROOT, 'extension', file);
  if (existsSync(src)) {
    copyFileSync(src, join(DIST, file));
    console.log(`Copiado: ${file}`);
  } else {
    console.warn(`Aviso: arquivo não encontrado — ${file}`);
  }
}

// ── Ícones ────────────────────────────────────────────────────────────────────
const iconsDir = join(ROOT, 'extension/icons');
if (existsSync(iconsDir)) {
  for (const icon of readdirSync(iconsDir)) {
    copyFileSync(join(iconsDir, icon), join(DIST, 'icons', icon));
    console.log(`Copiado ícone: icons/${icon}`);
  }
} else {
  console.warn('Pasta extension/icons não encontrada. Execute: npm run icons');
}

console.log(`\nExtensão montada em: ${DIST}`);
console.log('Para instalar no Chrome:');
console.log('  1. Abra chrome://extensions');
console.log('  2. Ative "Modo desenvolvedor" (canto superior direito)');
console.log('  3. Clique em "Carregar sem compactação"');
console.log('  4. Selecione a pasta: dist-extension/');

// ── Criar ZIP para publicação ─────────────────────────────────────────────────
const zipPath = join(ROOT, 'currency-quick-extension.zip');
const output  = createWriteStream(zipPath);
const archive = archiver('zip', { zlib: { level: 9 } });

output.on('close', () => {
  console.log(`\nZIP criado: currency-quick-extension.zip`);
  console.log(`Tamanho: ${(archive.pointer() / 1024).toFixed(1)} KB`);
  console.log('Pronto para envio ao Chrome Web Store.');
});

archive.on('error', (err) => { throw err; });

archive.pipe(output);
archive.directory(DIST, false);
await archive.finalize();
