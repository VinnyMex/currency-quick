import './styles.css';
import { CURRENCIES } from './shared/currencies.js';
import { convert } from './shared/converter.js';
import { formatCurrency } from './shared/formatter.js';

// ── Estado global ──────────────────────────────────────────────────────────────
const state = {
  from: 'USD',
  to: 'BRL',
  ratesObj: null,
  rateStatus: 'idle',
  history: [],
  theme: 'dark',
  recentPairs: [] // últimos 4 pares usados
};

const MAX_HISTORY = 10;
const STORAGE_KEY_HISTORY = 'cq_history';
const STORAGE_KEY_PREFS   = 'cq_prefs';

// ── Utilitários de storage (sem depender do shared para não impactar o bundle SW)
function lsGet(key) {
  try { return JSON.parse(localStorage.getItem(key)); } catch { return null; }
}
function lsSet(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /**/ }
}

// ── Inicialização ──────────────────────────────────────────────────────────────
function init() {
  loadPrefs();
  renderApp();
  loadHistory();
  renderHistory();
  renderShortcuts();
  fetchAndUpdateRates();
  registerSW();
}

function loadPrefs() {
  const prefs = lsGet(STORAGE_KEY_PREFS);
  if (prefs) {
    state.from        = prefs.from        || 'USD';
    state.to          = prefs.to          || 'BRL';
    state.theme       = prefs.theme       || 'dark';
    state.recentPairs = prefs.recentPairs || [];
  }
  applyTheme(state.theme);
}

function savePrefs() {
  lsSet(STORAGE_KEY_PREFS, { from: state.from, to: state.to, theme: state.theme, recentPairs: state.recentPairs });
}

function loadHistory() {
  state.history = lsGet(STORAGE_KEY_HISTORY) || [];
}

function saveHistory() {
  lsSet(STORAGE_KEY_HISTORY, state.history.slice(0, MAX_HISTORY));
}

function applyTheme(theme) {
  document.body.classList.toggle('theme-light', theme === 'light');
  const btn = document.getElementById('theme-btn');
  if (btn) btn.textContent = theme === 'light' ? '☀️' : '🌙';
}

// ── Render principal ───────────────────────────────────────────────────────────
function renderApp() {
  const app = document.getElementById('app');
  app.innerHTML = '';

  // Header
  const header = createElement('header', 'app-header');
  const logoSpan = createElement('span', 'logo-icon');
  logoSpan.textContent = '⇄';
  const titleEl = createElement('h1', 'app-title');
  titleEl.textContent = 'Currency Quick';
  const themeBtn = createButton('🌙', 'theme-btn', toggleTheme);
  themeBtn.setAttribute('title', 'Alternar tema');
  themeBtn.id = 'theme-btn';
  header.append(logoSpan, titleEl, themeBtn);

  // Card principal
  const card = createElement('section', 'converter-card');

  // Input de valor
  const amountGroup = createElement('div', 'form-group');
  const amountLabel = createElement('label', 'input-label');
  amountLabel.textContent = 'Valor';
  amountLabel.setAttribute('for', 'amount');
  const amountInput = document.createElement('input');
  amountInput.type = 'number';
  amountInput.id = 'amount';
  amountInput.placeholder = '0.00';
  amountInput.min = '0';
  amountInput.step = '0.01';
  amountInput.className = 'amount-input';
  amountInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') handleConvert(); });
  amountGroup.append(amountLabel, amountInput);

  // Linha de moedas
  const currencyRow = createElement('div', 'currency-row');
  const fromSelect = createCurrencySelect('from-currency', state.from);
  fromSelect.addEventListener('change', (e) => {
    state.from = e.target.value;
    savePrefs();
    // Tenta rebasear do cache antes de buscar
    const cached = lsGet('cq_rates_usd_base');
    if (cached && cached.expiresAt && Date.now() < cached.expiresAt) {
      state.ratesObj = rebaseRates(cached.data, state.from);
      const dt = new Date(cached.fetchedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      setStatus('cache', `Cache — ${dt}`);
    } else {
      fetchAndUpdateRates();
    }
  });
  const invertBtn = createButton('⇄', 'invert-btn', handleInvert);
  invertBtn.setAttribute('title', 'Inverter moedas');
  const toSelect = createCurrencySelect('to-currency', state.to);
  toSelect.addEventListener('change', (e) => {
    state.to = e.target.value;
    savePrefs();
  });
  currencyRow.append(fromSelect, invertBtn, toSelect);

  // Botão converter
  const convertBtn = createButton('Converter', 'convert-btn', handleConvert);
  convertBtn.id = 'convert-btn';

  // Área de resultado
  const resultContainer = createElement('div', 'result-container hidden');
  resultContainer.id = 'result-container';
  const resultEl = createElement('div', 'result-value');
  resultEl.id = 'result-value';
  const rateInfoEl = createElement('div', 'rate-info');
  rateInfoEl.id = 'rate-info';
  const resultActions = createElement('div', 'result-actions');
  const copyBtn = createButton('Copiar', 'copy-btn', handleCopy);
  copyBtn.id = 'copy-btn';
  const shareBtn = createButton('Compartilhar', 'share-btn', handleShare);
  shareBtn.id = 'share-btn';
  if (!navigator.share) shareBtn.classList.add('hidden');
  resultActions.append(copyBtn, shareBtn);
  resultContainer.append(resultEl, rateInfoEl, resultActions);

  // Barra de status
  const statusBar = createElement('div', 'status-bar');
  const statusIcon = createElement('span', 'status-icon');
  statusIcon.id = 'status-icon';
  statusIcon.textContent = '●';
  const statusText = createElement('span', 'status-text');
  statusText.id = 'status-text';
  statusText.textContent = 'Carregando cotação...';
  const refreshBtn = createButton('↻', 'refresh-btn', () => fetchAndUpdateRates(true));
  refreshBtn.setAttribute('title', 'Atualizar cotação');
  statusBar.append(statusIcon, statusText, refreshBtn);

  card.append(amountGroup, currencyRow, convertBtn, resultContainer, statusBar);

  // Atalhos rápidos — container vazio, preenchido por renderShortcuts()
  const shortcuts = createElement('div', 'shortcuts');
  shortcuts.id = 'shortcuts';

  // Histórico
  const histSection = createElement('section', 'history-section');
  const histTitle = createElement('h2', 'section-title');
  histTitle.textContent = 'Histórico';
  const clearHistBtn = createButton('Limpar', 'clear-hist-btn', handleClearHistory);
  clearHistBtn.id = 'clear-hist-btn';
  const histHeader = createElement('div', 'hist-header');
  histHeader.append(histTitle, clearHistBtn);
  const histList = createElement('ul', 'history-list');
  histList.id = 'history-list';
  histSection.append(histHeader, histList);

  // Rodapé de doação
  const footer = createElement('footer', 'app-footer');
  const donateBtn = createElement('button', 'donate-btn');
  donateBtn.textContent = '☕ Apoiar vWeb Marketing via Pix';
  donateBtn.title = 'Copiar chave Pix e apoiar o criador';
  donateBtn.addEventListener('click', handleDonate);
  const donateToast = createElement('div', 'donate-toast hidden');
  donateToast.id = 'donate-toast';
  const toastIcon = createElement('span', 'donate-toast-icon');
  toastIcon.textContent = '✓';
  const toastMsg = createElement('span', '');
  toastMsg.textContent = 'Chave Pix copiada! Cole no seu app de pagamento. Obrigado 💙';
  donateToast.append(toastIcon, toastMsg);
  footer.append(donateBtn, donateToast);

  app.append(header, card, shortcuts, histSection, footer);
}

// ── Helpers de criação de elementos ───────────────────────────────────────────
function createElement(tag, className) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  return el;
}

function createButton(text, className, onClick) {
  const btn = document.createElement('button');
  btn.textContent = text;
  btn.className = className;
  if (onClick) btn.addEventListener('click', onClick);
  return btn;
}

function createCurrencySelect(id, selectedCode) {
  const select = document.createElement('select');
  select.id = id;
  select.className = 'currency-select';
  CURRENCIES.forEach(({ code, name, symbol }) => {
    const opt = document.createElement('option');
    opt.value = code;
    opt.textContent = `${code} — ${symbol} ${name}`;
    if (code === selectedCode) opt.selected = true;
    select.appendChild(opt);
  });
  return select;
}

// ── Cotações ───────────────────────────────────────────────────────────────────
async function fetchAndUpdateRates(force = false) {
  setStatus('loading', 'Buscando cotação...');

  // Checar cache no localStorage (5 min TTL)
  const cacheKey = `cq_rates_usd_base`; // sempre base USD
  if (!force) {
    const cached = lsGet(cacheKey);
    if (cached && cached.expiresAt && Date.now() < cached.expiresAt) {
      state.ratesObj = rebaseRates(cached.data, state.from);
      const dt = new Date(cached.fetchedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      setStatus('cache', `Cache — ${dt}`);
      return;
    }
  }

  try {
    // Em dev usa proxy /api/rates para evitar CORS; em produção chama direto
    const isDev = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
    const url = isDev
      ? '/api/rates?base=USD'
      : 'https://api.frankfurter.app/latest?base=USD';

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    let response;
    try {
      response = await fetch(url, { signal: controller.signal });
    } finally {
      clearTimeout(timer);
    }

    if (!response.ok) throw new Error('API retornou ' + response.status);
    const json = await response.json();
    if (!json.rates) throw new Error('Resposta inválida');

    const baseData = {
      base: 'USD',
      rates: json.rates,
      provider: 'Frankfurter (demo)',
      fetchedAt: new Date().toISOString()
    };

    // Salvar cache (sempre base USD)
    lsSet(cacheKey, {
      data: baseData,
      fetchedAt: baseData.fetchedAt,
      expiresAt: Date.now() + 5 * 60 * 1000
    });

    state.ratesObj = rebaseRates(baseData, state.from);
    const dt = new Date(baseData.fetchedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    setStatus('ok', `Atualizado às ${dt}`);
  } catch (err) {
    console.warn('Erro ao buscar cotação:', err.message);
    const cached = lsGet(cacheKey);
    if (cached) {
      state.ratesObj = rebaseRates(cached.data, state.from);
      setStatus('cache', 'Sem conexão — usando cache');
    } else {
      state.ratesObj = null;
      setStatus('error', 'Sem conexão — sem cache');
    }
  }
}

// Recalcula rates para outra moeda base
function rebaseRates(data, targetBase) {
  if (!data || !data.rates) return data;
  if (targetBase === 'USD') return data;

  const usdRates = data.rates;
  const targetInUSD = usdRates[targetBase];
  if (!targetInUSD) return data; // moeda não coberta — usa USD

  const newRates = { USD: 1 / targetInUSD };
  Object.keys(usdRates).forEach((code) => {
    if (code !== targetBase) newRates[code] = usdRates[code] / targetInUSD;
  });

  return { base: targetBase, rates: newRates, provider: data.provider, fetchedAt: data.fetchedAt };
}

function setStatus(type, text) {
  const icon = document.getElementById('status-icon');
  const textEl = document.getElementById('status-text');
  if (!icon || !textEl) return;
  icon.className = 'status-icon status-' + type;
  textEl.textContent = text;
}

// ── Conversão ──────────────────────────────────────────────────────────────────
function handleConvert() {
  const amountInput = document.getElementById('amount');
  const amount = parseFloat(amountInput?.value);

  if (!amount || isNaN(amount) || amount <= 0) {
    showAlert('Informe um valor válido maior que zero.');
    return;
  }
  if (!state.ratesObj) {
    showAlert('Cotação não disponível. Aguarde ou verifique sua conexão.');
    return;
  }

  let result;
  try {
    result = convert(amount, state.from, state.to, state.ratesObj);
  } catch (err) {
    showAlert(`Erro na conversão: ${err.message}`);
    return;
  }

  const formatted = formatCurrency(result, state.to);
  const formattedFrom = formatCurrency(amount, state.from);

  // Atualizar display
  const resultEl = document.getElementById('result-value');
  const rateInfoEl = document.getElementById('rate-info');
  const container = document.getElementById('result-container');

  if (resultEl) resultEl.textContent = formatted;
  if (rateInfoEl) {
    const rate = convert(1, state.from, state.to, state.ratesObj);
    rateInfoEl.textContent = `1 ${state.from} = ${formatCurrency(rate, state.to)}`;
  }
  if (container) container.classList.remove('hidden');

  // Guardar no histórico
  const entry = {
    id: Date.now(),
    from: state.from,
    to: state.to,
    amount,
    result,
    formattedFrom,
    formattedResult: formatted,
    timestamp: new Date().toISOString()
  };
  state.history.unshift(entry);
  if (state.history.length > MAX_HISTORY) state.history = state.history.slice(0, MAX_HISTORY);
  saveHistory();
  renderHistory();

  // Registrar par usado
  recordPair(state.from, state.to);
}

// ── Histórico ──────────────────────────────────────────────────────────────────
function renderHistory() {
  const list = document.getElementById('history-list');
  if (!list) return;
  while (list.firstChild) list.removeChild(list.firstChild);

  if (state.history.length === 0) {
    const empty = document.createElement('li');
    empty.className = 'history-empty';
    empty.textContent = 'Nenhuma conversão ainda.';
    list.appendChild(empty);
    return;
  }

  state.history.forEach((entry) => {
    const li = document.createElement('li');
    li.className = 'history-item';

    const left = createElement('div', 'hist-left');
    const pairEl = createElement('span', 'hist-pair');
    pairEl.textContent = `${entry.from} → ${entry.to}`;
    const timeEl = createElement('span', 'hist-time');
    const dt = new Date(entry.timestamp);
    timeEl.textContent = dt.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
    left.append(pairEl, timeEl);

    const right = createElement('div', 'hist-right');
    const fromEl = createElement('span', 'hist-from');
    fromEl.textContent = entry.formattedFrom;
    const arrow = createElement('span', 'hist-arrow');
    arrow.textContent = ' → ';
    const toEl = createElement('span', 'hist-to');
    toEl.textContent = entry.formattedResult;
    right.append(fromEl, arrow, toEl);

    li.append(left, right);
    list.appendChild(li);
  });
}

function handleClearHistory() {
  state.history = [];
  saveHistory();
  renderHistory();
  // Esconder resultado
  const container = document.getElementById('result-container');
  if (container) container.classList.add('hidden');
}

// ── Ações de resultado ────────────────────────────────────────────────────────
function handleCopy() {
  const resultEl = document.getElementById('result-value');
  if (!resultEl) return;
  const text = resultEl.textContent;
  navigator.clipboard.writeText(text).then(() => {
    const btn = document.getElementById('copy-btn');
    if (btn) {
      const original = btn.textContent;
      btn.textContent = 'Copiado!';
      setTimeout(() => { btn.textContent = original; }, 1500);
    }
  }).catch(() => {
    // fallback
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
  });
}

async function handleShare() {
  const resultEl   = document.getElementById('result-value');
  const amountInput = document.getElementById('amount');
  if (!resultEl || !amountInput) return;
  const text = `${formatCurrency(parseFloat(amountInput.value), state.from)} = ${resultEl.textContent} — Currency Quick`;
  if (navigator.share) {
    try {
      await navigator.share({ title: 'Currency Quick', text });
    } catch { /* cancelado */ }
  }
}

// ── Inversão e atalhos ────────────────────────────────────────────────────────
function handleInvert() {
  const tmp = state.from;
  state.from = state.to;
  state.to = tmp;
  savePrefs();

  const fromSel = document.getElementById('from-currency');
  const toSel   = document.getElementById('to-currency');
  if (fromSel) fromSel.value = state.from;
  if (toSel)   toSel.value   = state.to;

  fetchAndUpdateRates();
}

function applyShortcut(from, to) {
  state.from = from;
  state.to   = to;
  savePrefs();

  const fromSel = document.getElementById('from-currency');
  const toSel   = document.getElementById('to-currency');
  if (fromSel) fromSel.value = from;
  if (toSel)   toSel.value   = to;

  fetchAndUpdateRates();
}

// ── Pares recentes ────────────────────────────────────────────────────────────
function recordPair(from, to) {
  if (from === to) return;
  const key = `${from}→${to}`;
  state.recentPairs = state.recentPairs.filter((p) => p !== key);
  state.recentPairs.unshift(key);
  if (state.recentPairs.length > 4) state.recentPairs = state.recentPairs.slice(0, 4);
  savePrefs();
  renderShortcuts();
}

function renderShortcuts() {
  const container = document.getElementById('shortcuts');
  if (!container) return;
  while (container.firstChild) container.removeChild(container.firstChild);

  const pairs = state.recentPairs.length > 0
    ? state.recentPairs
    : ['USD→BRL', 'BRL→USD', 'EUR→BRL', 'BRL→EUR'];

  pairs.forEach((key) => {
    const [from, to] = key.split('→');
    const btn = createButton(key, 'shortcut-btn', () => applyShortcut(from, to));
    container.appendChild(btn);
  });
}

// ── Tema ──────────────────────────────────────────────────────────────────────
function toggleTheme() {
  state.theme = state.theme === 'dark' ? 'light' : 'dark';
  applyTheme(state.theme);
  savePrefs();
  const btn = document.getElementById('theme-btn');
  if (btn) btn.textContent = state.theme === 'dark' ? '🌙' : '☀️';
}

// ── Alerta amigável ───────────────────────────────────────────────────────────
function showAlert(msg) {
  // Cria um toast em vez de usar alert()
  const existing = document.getElementById('cq-toast');
  if (existing) existing.remove();
  const toast = createElement('div', 'cq-toast');
  toast.id = 'cq-toast';
  toast.textContent = msg;
  document.body.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('cq-toast--visible'));
  setTimeout(() => {
    toast.classList.remove('cq-toast--visible');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// ── Service Worker ────────────────────────────────────────────────────────────
// ── Doação Pix ────────────────────────────────────────────────────────────────
const PIX_CODE = '85c23733-11e5-4ad5-801c-20ba99cb5f1d';
const MPAGO_LINK = 'https://mpago.la/28cELot';
const PIX_QR   = 'data:image/png;base64,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';

function handleDonate() {
  // Copia a chave
  if (navigator.clipboard) {
    navigator.clipboard.writeText(PIX_CODE).catch(() => fallbackCopyPix());
  } else {
    fallbackCopyPix();
  }
  showPixModal();
}

function fallbackCopyPix() {
  const ta = document.createElement('textarea');
  ta.value = PIX_CODE;
  ta.style.cssText = 'position:fixed;opacity:0;top:0;left:0';
  document.body.appendChild(ta);
  ta.focus(); ta.select();
  try { document.execCommand('copy'); } catch { /* ignore */ }
  document.body.removeChild(ta);
}

function showPixModal() {
  const existing = document.getElementById('pix-modal-overlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = 'pix-modal-overlay';
  overlay.className = 'pix-overlay';

  const card = document.createElement('div');
  card.className = 'pix-modal-card';

  // Fechar ao clicar fora
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });

  // Título
  const title = createElement('div', 'pix-modal-title');
  title.textContent = 'Apoiar vWeb Marketing ☕';

  // Sub
  const sub = createElement('div', 'pix-modal-sub');
  sub.textContent = 'Escaneie o QR code ou cole a chave Pix no seu banco';

  // QR code
  const qrWrap = createElement('div', 'pix-qr-wrap');
  const qrImg = document.createElement('img');
  qrImg.src = PIX_QR;
  qrImg.alt = 'QR Code Pix vWeb Marketing';
  qrImg.className = 'pix-qr-img';
  qrWrap.appendChild(qrImg);

  // Badge copiado
  const badge = createElement('div', 'pix-copied-badge');
  const badgeIcon = createElement('span', 'pix-badge-icon');
  badgeIcon.textContent = '✓';
  const badgeText = createElement('span', '');
  badgeText.textContent = 'Chave Pix copiada! Cole no seu banco';
  badge.append(badgeIcon, badgeText);

  // Chave legível
  const keyBox = createElement('div', 'pix-key-box');
  keyBox.textContent = PIX_CODE;

  // Botão Mercado Pago
  const mpagoBtn = document.createElement('a');
  mpagoBtn.href = MPAGO_LINK;
  mpagoBtn.target = '_blank';
  mpagoBtn.rel = 'noopener noreferrer';
  mpagoBtn.textContent = '💳 Pagar via Mercado Pago';
  mpagoBtn.className = 'pix-mpago-btn';

  // Botão fechar
  const closeBtn = createElement('button', 'pix-close-btn');
  closeBtn.textContent = 'Fechar';
  closeBtn.addEventListener('click', () => overlay.remove());

  card.append(title, sub, qrWrap, badge, keyBox, mpagoBtn, closeBtn);
  overlay.appendChild(card);
  document.body.appendChild(overlay);
}

function registerSW() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.warn('SW não registrado:', err);
    });
  }
}

// ── Arranque ──────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', init);
