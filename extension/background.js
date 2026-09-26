// background.js — Service Worker da extensão (Manifest V3)

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos
const FRANKFURTER_BASE = 'https://api.frankfurter.app/latest';

// Frankfurter não suporta BRL, ARS, CLP como base.
// Sempre buscamos com base USD e convertemos internamente.
const FETCH_BASE = 'USD';

// ── Criação do menu de contexto ───────────────────────────────────────────────
function createContextMenu() {
  // Remove antes de criar para evitar duplicatas quando o SW reinicia
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: 'cq-convert',
      title: 'Converter com Currency Quick',
      contexts: ['selection']
    });
  });
}

// Cria no install e no startup (service worker pode ser encerrado pelo Chrome)
chrome.runtime.onInstalled.addListener(createContextMenu);
chrome.runtime.onStartup.addListener(createContextMenu);

// ── Menu de contexto ──────────────────────────────────────────────────────────
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId !== 'cq-convert') return;
  if (!info.selectionText || !tab || !tab.id) return;

  chrome.tabs.sendMessage(tab.id, {
    type: 'CONVERT_SELECTION',
    text: info.selectionText
  }, () => {
    if (chrome.runtime.lastError) { /* content script pode não estar ativo */ }
  });
});

// ── Geração de PNG e cópia via scripting.executeScript ───────────────────────
// Injeta uma função no tab atual que desenha o canvas e chama clipboard.write().
// Roda no mundo ISOLATED da extensão → tem clipboardWrite sem restrições da página.
async function copyWidgetImageInTab(tabId, payload) {
  await chrome.scripting.executeScript({
    target: { tabId },
    world: 'ISOLATED',
    func: drawAndCopyToClipboard,
    args: [payload]
  });
}

// Esta função é serializada e injetada no tab — não pode referenciar closures externas
function drawAndCopyToClipboard(data) {
  var DPR=2, W=280, PAD=16, ROW_H=32;
  var rows = data.rows;
  var H = PAD+12+6+22+10+1+8 + rows.length*(ROW_H+4) + 4+1+10+14+10+1+20+PAD/2;

  var canvas = document.createElement('canvas');
  canvas.width=W*DPR; canvas.height=H*DPR;
  var ctx=canvas.getContext('2d');
  ctx.scale(DPR,DPR);

  function rr(x,y,w,h,r){
    ctx.beginPath();
    ctx.moveTo(x+r,y);ctx.lineTo(x+w-r,y);ctx.quadraticCurveTo(x+w,y,x+w,y+r);
    ctx.lineTo(x+w,y+h-r);ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
    ctx.lineTo(x+r,y+h);ctx.quadraticCurveTo(x,y+h,x,y+h-r);
    ctx.lineTo(x,y+r);ctx.quadraticCurveTo(x,y,x+r,y);
    ctx.closePath();
  }
  function tr(t,rx,y){ctx.fillText(t,rx-ctx.measureText(t).width,y);}

  rr(0,0,W,H,14); ctx.fillStyle='#0F172A'; ctx.fill();
  ctx.strokeStyle='#3B82F6'; ctx.lineWidth=1.5; ctx.stroke();

  var y=PAD;
  ctx.font='bold 10px system-ui,sans-serif'; ctx.fillStyle='#93C5FD';
  ctx.fillText('\u21C4 CURRENCY QUICK',PAD,y+10); y+=18;

  ctx.font='bold 18px system-ui,sans-serif'; ctx.fillStyle='#F1F5F9';
  ctx.fillText(data.original,PAD,y+16); y+=22;

  ctx.fillStyle='#1E293B'; ctx.fillRect(PAD,y,W-PAD*2,1); y+=9;

  rows.forEach(function(row){
    rr(PAD,y,W-PAD*2,ROW_H,8);
    if(row.isSource){
      ctx.fillStyle='rgba(59,130,246,0.12)';ctx.fill();
      ctx.strokeStyle='rgba(59,130,246,0.3)';ctx.lineWidth=1;ctx.stroke();
    } else {ctx.fillStyle='#1E293B';ctx.fill();}
    ctx.font='bold 11px system-ui,sans-serif';
    ctx.fillStyle=row.isSource?'#93C5FD':'#64748B';
    ctx.fillText(row.code,PAD+10,y+ROW_H/2+4);
    ctx.font='bold 13px system-ui,sans-serif';
    ctx.fillStyle=row.isSource?'#93C5FD':'#F1F5F9';
    tr(row.value,W-PAD-10,y+ROW_H/2+4);
    y+=ROW_H+4;
  });

  y+=4;
  ctx.fillStyle='#1E293B'; ctx.fillRect(PAD,y,W-PAD*2,1); y+=10;
  ctx.font='10px system-ui,sans-serif';
  ctx.fillStyle=data.fromCache?'#F59E0B':'#22C55E';
  ctx.fillText(data.fromCache?'\u26A1 cache':'\u25CF ao vivo',PAD,y+10); y+=20;

  ctx.fillStyle='#334155'; ctx.fillRect(0,y,W,1); y+=1;
  ctx.fillStyle='#0B1120'; ctx.fillRect(0,y,W,H-y);
  rr(0,H-14,W,14,14); ctx.fillStyle='#0B1120'; ctx.fill();
  ctx.font='9px system-ui,sans-serif'; ctx.fillStyle='#475569';
  var cr='Currency Quick  \u2022  vWeb Marketing';
  ctx.fillText(cr,(W-ctx.measureText(cr).width)/2,y+13);

  return new Promise(function(resolve,reject){
    var bp=new Promise(function(res,rej){
      canvas.toBlob(function(b){b?res(b):rej(new Error('toBlob'));}, 'image/png');
    });
    navigator.clipboard.write([new ClipboardItem({'image/png':bp})])
      .then(resolve).catch(reject);
  });
}

// ── Mensagens ─────────────────────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Ignorar mensagens destinadas ao offscreen (evitar loop)
  if (message.target === 'offscreen') return;

  if (message.type === 'GET_RATES' || message.type === 'FORCE_REFRESH_RATES') {
    const requestedBase = (message.base || 'USD').toUpperCase();
    const force = message.type === 'FORCE_REFRESH_RATES';

    handleGetRates(requestedBase, force)
      .then((data) => sendResponse({ ok: true, data }))
      .catch((err) => sendResponse({ ok: false, error: err.message }));

    return true;
  }

  if (message.type === 'COPY_WIDGET_IMAGE') {
    const tabId = sender && sender.tab && sender.tab.id;
    if (!tabId) { sendResponse({ ok: false, error: 'sem tabId' }); return; }

    copyWidgetImageInTab(tabId, message.payload)
      .then(() => sendResponse({ ok: true }))
      .catch((err) => sendResponse({ ok: false, error: err.message }));

    return true;
  }
});

// ── Lógica de cache e fetch ───────────────────────────────────────────────────
async function handleGetRates(requestedBase, force) {
  const cacheKey = 'cq_rates_usd_base'; // sempre armazenamos com base USD

  if (!force) {
    const cached = await storageGet(cacheKey);
    if (cached && cached.expiresAt && Date.now() < cached.expiresAt) {
      return rebaseRates(cached.data, requestedBase, true);
    }
  }

  // Busca sempre com base USD
  const data = await fetchRates(FETCH_BASE);

  await storageSet(cacheKey, {
    data,
    fetchedAt: Date.now(),
    expiresAt: Date.now() + CACHE_TTL_MS
  });

  return rebaseRates(data, requestedBase, false);
}

/**
 * A API retorna taxas com base USD.
 * Se o usuário quer base BRL, convertemos:
 *   rates[X] relativo a BRL = rates[X] / rates[BRL]
 */
function rebaseRates(data, targetBase, fromCache) {
  if (!data || !data.rates) throw new Error('Dados de cotação inválidos');

  const usdRates = data.rates; // taxas relativas a USD

  if (targetBase === 'USD') {
    return Object.assign({}, data, { fromCache });
  }

  // taxa de BRL em USD
  const targetInUSD = usdRates[targetBase];
  if (!targetInUSD) {
    // moeda não suportada pela API — retorna com base USD mesmo
    return Object.assign({}, data, { fromCache });
  }

  // Recalcular todas as taxas com nova base
  const newRates = { USD: 1 / targetInUSD };
  Object.keys(usdRates).forEach((code) => {
    if (code !== targetBase) {
      newRates[code] = usdRates[code] / targetInUSD;
    }
  });

  return {
    base: targetBase,
    rates: newRates,
    provider: 'demo (Frankfurter)',
    fetchedAt: data.fetchedAt,
    fromCache
  };
}

// ── Fetch da API ──────────────────────────────────────────────────────────────
async function fetchRates(base) {
  const url = FRANKFURTER_BASE + '?base=' + encodeURIComponent(base);
  const response = await fetchWithTimeout(url, {}, 10000);
  if (!response.ok) throw new Error('API retornou status ' + response.status);
  const json = await response.json();
  if (!json.rates) throw new Error('Resposta inválida da API');
  return {
    base: json.base || base,
    rates: json.rates,
    provider: 'demo (Frankfurter)',
    fetchedAt: new Date().toISOString(),
    fromCache: false
  };
}

// ── Fetch com timeout ─────────────────────────────────────────────────────────
async function fetchWithTimeout(url, options, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, Object.assign({}, options, { signal: controller.signal }));
  } finally {
    clearTimeout(timer);
  }
}

// ── Storage helpers ───────────────────────────────────────────────────────────
function storageGet(key) {
  return new Promise((resolve) => {
    chrome.storage.local.get(key, (result) => {
      resolve(result[key] !== undefined ? result[key] : null);
    });
  });
}

function storageSet(key, value) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [key]: value }, resolve);
  });
}
