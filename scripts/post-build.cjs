// post-build.cjs — Pós-build para Vercel
// Move currency-quick-landing.html → dist/index.html (landing como raiz)
// Move dist/index.html (app PWA) → dist/app/index.html

const fs = require('fs');
const path = require('path');

const dist = path.join(__dirname, '..', 'dist');

// 1. Criar pasta dist/app/
const appDir = path.join(dist, 'app');
if (!fs.existsSync(appDir)) fs.mkdirSync(appDir, { recursive: true });

// 2. Mover app (index.html atual) para dist/app/index.html
const appHtml = path.join(dist, 'index.html');
const appDest = path.join(appDir, 'index.html');
if (fs.existsSync(appHtml)) {
  // Ajustar paths relativos do app para funcionar em /app/
  let appContent = fs.readFileSync(appHtml, 'utf8');
  appContent = appContent.replace(/href="\//g, 'href="/').replace(/src="\//g, 'src="/');
  fs.writeFileSync(appDest, appContent, 'utf8');
  fs.unlinkSync(appHtml);
  console.log('App moved to dist/app/index.html');
}

// 3. Mover landing page para dist/index.html (raiz)
const landingHtml = path.join(dist, 'currency-quick-landing.html');
const landingDest = path.join(dist, 'index.html');
if (fs.existsSync(landingHtml)) {
  fs.renameSync(landingHtml, landingDest);
  console.log('Landing page moved to dist/index.html');
}

// 4. Copiar ZIP da extensão para dist/ (para download direto)
const zipSrc = path.join(__dirname, '..', 'public', 'currency-quick.zip');
const zipDest = path.join(dist, 'currency-quick.zip');
if (fs.existsSync(zipSrc)) {
  fs.copyFileSync(zipSrc, zipDest);
  console.log('ZIP copied to dist/currency-quick.zip');
} else {
  console.warn('ZIP not found at public/currency-quick.zip — skipping');
}

console.log('Post-build complete!');
