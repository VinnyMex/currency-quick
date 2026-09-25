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

// ── Mensagens ─────────────────────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'GET_RATES' || message.type === 'FORCE_REFRESH_RATES') {
    const requestedBase = (message.base || 'USD').toUpperCase();
    const force = message.type === 'FORCE_REFRESH_RATES';

    handleGetRates(requestedBase, force)
      .then((data) => sendResponse({ ok: true, data }))
      .catch((err) => sendResponse({ ok: false, error: err.message }));

    return true; // resposta assíncrona
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
