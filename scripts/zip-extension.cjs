// zip-extension.cjs — Gera public/currency-quick.zip a partir de extension/
// Uso: node scripts/zip-extension.cjs
//      npm run zip

const fs   = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT      = path.join(__dirname, '..');
const EXT_DIR   = path.join(ROOT, 'extension');
const OUT_DIR   = path.join(ROOT, 'public');
const OUT_FILE  = path.join(OUT_DIR, 'currency-quick.zip');

if (!fs.existsSync(EXT_DIR)) {
  console.error('Pasta extension/ não encontrada.');
  process.exit(1);
}

fs.mkdirSync(OUT_DIR, { recursive: true });

// Remove ZIP anterior
if (fs.existsSync(OUT_FILE)) fs.unlinkSync(OUT_FILE);

// Usa PowerShell no Windows, zip no Unix
if (process.platform === 'win32') {
  execSync(
    `powershell -Command "Compress-Archive -Path '${EXT_DIR}\\*' -DestinationPath '${OUT_FILE}'"`,
    { stdio: 'inherit' }
  );
} else {
  execSync(`cd "${EXT_DIR}" && zip -r "${OUT_FILE}" .`, { stdio: 'inherit' });
}

console.log(`ZIP gerado: public/currency-quick.zip`);
