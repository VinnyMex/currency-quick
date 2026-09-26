// popup.js — lógica do popup da extensão (sem módulos ESM)
(function () {
  'use strict';

  // ── Moedas ─────────────────────────────────────────────────────────────────
  var CURRENCIES = [
    { code: 'BRL', name: 'Real Brasileiro',    symbol: 'R$'   },
    { code: 'USD', name: 'Dólar Americano',     symbol: 'US$'  },
    { code: 'EUR', name: 'Euro',                symbol: '€'    },
    { code: 'GBP', name: 'Libra Esterlina',     symbol: '£'    },
    { code: 'JPY', name: 'Iene Japonês',        symbol: '¥'    },
    { code: 'CAD', name: 'Dólar Canadense',     symbol: 'CA$'  },
    { code: 'AUD', name: 'Dólar Australiano',   symbol: 'A$'   },
    { code: 'CHF', name: 'Franco Suíço',        symbol: 'CHF'  },
    { code: 'ARS', name: 'Peso Argentino',      symbol: 'AR$'  },
    { code: 'CLP', name: 'Peso Chileno',        symbol: 'CL$'  },
    { code: 'MXN', name: 'Peso Mexicano',       symbol: 'MX$'  },
    { code: 'CNY', name: 'Yuan Chinês',         symbol: '¥'    },
    { code: 'KRW', name: 'Won Sul-Coreano',     symbol: '₩'    },
    { code: 'INR', name: 'Rúpia Indiana',       symbol: '₹'    },
    { code: 'AED', name: 'Dirham dos EAU',      symbol: 'د.إ'  },
    { code: 'ZAR', name: 'Rand Sul-Africano',   symbol: 'R'    }
  ];

  var LOCALE_MAP = {
    BRL: 'pt-BR', USD: 'en-US', EUR: 'de-DE', GBP: 'en-GB',
    JPY: 'ja-JP', CAD: 'en-CA', AUD: 'en-AU', CHF: 'de-CH',
    ARS: 'es-AR', CLP: 'es-CL', MXN: 'es-MX', CNY: 'zh-CN',
    KRW: 'ko-KR', INR: 'hi-IN', ZAR: 'en-ZA', AED: 'ar-AE'
  };

  var STORAGE_KEY_HIST = 'cq_history';
  var MAX_HIST = 20;

  // ── Estado ─────────────────────────────────────────────────────────────────
  var state = {
    from: 'USD',
    to: 'BRL',
    theme: 'dark',
    ratesObj: null,
    recentPairs: [],
    history: []
  };

  // ── Refs DOM ───────────────────────────────────────────────────────────────
  var amountInput     = document.getElementById('amount');
  var fromSelect      = document.getElementById('from-currency');
  var toSelect        = document.getElementById('to-currency');
  var invertBtn       = document.getElementById('invert-btn');
  var convertBtn      = document.getElementById('convert-btn');
  var resultContainer = document.getElementById('result-container');
  var resultEl        = document.getElementById('result');
  var rateInfoEl      = document.getElementById('rate-info');
  var copyBtn         = document.getElementById('copy-btn');
  var statusDot       = document.getElementById('status-dot');
  var statusText      = document.getElementById('status-text');
  var refreshBtn      = document.getElementById('refresh-btn');
  var optionsLink     = document.getElementById('options-link');
  var themeBtn        = document.getElementById('theme-btn');
  var clearAllBtn     = document.getElementById('clear-all-btn');
  var donateBtn       = document.getElementById('donate-btn');
  var pixToast        = document.getElementById('pix-toast');

  var PIX_CODE = '85c23733-11e5-4ad5-801c-20ba99cb5f1d';
var MPAGO_LINK = 'https://mpago.la/28cELot';
  var PIX_QR   = 'data:image/png;base64,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';
  var pixToastTimer = null;

  // ── Init ───────────────────────────────────────────────────────────────────
  function init() {
    populateSelects();
    loadPrefs(function () {
      fromSelect.value = state.from;
      toSelect.value   = state.to;
      applyTheme(state.theme);
      renderShortcuts();
    });
    loadHistory(function () {
      renderHistory();
    });
    bindEvents();
    fetchRates(false);
  }

  // ── Tema ───────────────────────────────────────────────────────────────────
  function applyTheme(theme) {
    document.body.classList.toggle('theme-light', theme === 'light');
    if (themeBtn) themeBtn.textContent = theme === 'light' ? '☀️' : '🌙';
  }

  function toggleTheme() {
    state.theme = state.theme === 'dark' ? 'light' : 'dark';
    applyTheme(state.theme);
    savePrefs();
  }

  // ── Selects ────────────────────────────────────────────────────────────────
  function populateSelects() {
    [fromSelect, toSelect].forEach(function (sel) {
      CURRENCIES.forEach(function (c) {
        var opt = document.createElement('option');
        opt.value = c.code;
        opt.textContent = c.code + ' — ' + c.symbol + ' ' + c.name;
        sel.appendChild(opt);
      });
    });
  }

  // ── Eventos ────────────────────────────────────────────────────────────────
  function bindEvents() {
    fromSelect.addEventListener('change', function () {
      state.from = fromSelect.value;
      savePrefs();
      fetchRates(false);
    });

    toSelect.addEventListener('change', function () {
      state.to = toSelect.value;
      savePrefs();
    });

    invertBtn.addEventListener('click', function () {
      var tmp = state.from;
      state.from = state.to;
      state.to   = tmp;
      fromSelect.value = state.from;
      toSelect.value   = state.to;
      savePrefs();
      fetchRates(false);
    });

    convertBtn.addEventListener('click', handleConvert);

    amountInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') handleConvert();
    });

    refreshBtn.addEventListener('click', function () { fetchRates(true); });

    copyBtn.addEventListener('click', handleCopy);

    optionsLink.addEventListener('click', function () {
      chrome.runtime.openOptionsPage();
    });

    if (themeBtn) themeBtn.addEventListener('click', toggleTheme);

    if (clearAllBtn) {
      clearAllBtn.addEventListener('click', function () {
        state.history = [];
        saveHistory();
        renderHistory();
      });
    }

    if (donateBtn) {
      donateBtn.addEventListener('click', handleDonate);
    }
  }

  // ── Doação via Pix — abre janela centralizada ─────────────────────────────
  function handleDonate() {
    // Copia a chave
    if (navigator.clipboard) {
      navigator.clipboard.writeText(PIX_CODE).catch(function () { fallbackCopyPix(); });
    } else {
      fallbackCopyPix();
    }
    // Abre donate.html numa janela popup centralizada na tela do usuário
    // 380×560 garante que o card caiba sem scroll em qualquer resolução
    var w = 380, h = 560;
    chrome.windows.create({
      url: chrome.runtime.getURL('donate.html'),
      type: 'popup',
      width: w,
      height: h,
      left: Math.round((screen.width  - w) / 2),
      top:  Math.round((screen.height - h) / 2)
    });
  }

  function fallbackCopyPix() {
    var ta = document.createElement('textarea');
    ta.value = PIX_CODE;
    ta.style.cssText = 'position:fixed;opacity:0;top:0;left:0';
    document.body.appendChild(ta);
    ta.focus(); ta.select();
    try { document.execCommand('copy'); } catch (e) { /* ignore */ }
    document.body.removeChild(ta);
  }

  function showPixModal() {
    // Remove modal existente
    var existing = document.getElementById('pix-modal-overlay');
    if (existing) existing.parentNode.removeChild(existing);

    // Overlay
    var overlay = document.createElement('div');
    overlay.id = 'pix-modal-overlay';
    overlay.style.cssText = [
      'position:fixed;inset:0;z-index:99999',
      'background:rgba(0,0,0,0.75)',
      'display:flex;align-items:center;justify-content:center',
      'animation:cqFadeIn 0.18s ease'
    ].join(';');

    // Card
    var card = document.createElement('div');
    card.style.cssText = [
      'background:#0F172A;border:1.5px solid #3B82F6',
      'border-radius:16px;padding:20px;max-width:280px;width:90%',
      'display:flex;flex-direction:column;align-items:center;gap:12px',
      'box-shadow:0 20px 60px rgba(0,0,0,0.6)',
      'animation:cqSlideUp 0.2s ease'
    ].join(';');

    // Título
    var title = document.createElement('div');
    title.style.cssText = 'font-size:14px;font-weight:700;color:#F1F5F9;text-align:center';
    title.textContent = 'Apoiar vWeb Marketing ☕';

    // Sub
    var sub = document.createElement('div');
    sub.style.cssText = 'font-size:11px;color:#94A3B8;text-align:center;line-height:1.4';
    sub.textContent = 'Escaneie o QR code ou cole a chave Pix no seu banco';

    // QR code
    var qrWrap = document.createElement('div');
    qrWrap.style.cssText = [
      'background:#fff;border-radius:10px;padding:12px',
      'display:flex;align-items:center;justify-content:center'
    ].join(';');
    var qrImg = document.createElement('img');
    qrImg.src = PIX_QR;
    qrImg.alt = 'QR Code Pix vWeb Marketing';
    qrImg.style.cssText = 'width:200px;height:200px;display:block;image-rendering:pixelated';
    qrWrap.appendChild(qrImg);

    // Chave copiada
    var copiedBadge = document.createElement('div');
    copiedBadge.style.cssText = [
      'background:#064E3B;border:1px solid #10B981',
      'border-radius:8px;padding:8px 14px',
      'font-size:11px;color:#D1FAE5',
      'display:flex;align-items:center;gap:6px;width:100%'
    ].join(';');
    var checkIcon = document.createElement('span');
    checkIcon.style.cssText = [
      'background:#10B981;color:#fff;font-size:10px;font-weight:700',
      'width:16px;height:16px;border-radius:50%',
      'display:inline-flex;align-items:center;justify-content:center;flex-shrink:0'
    ].join(';');
    checkIcon.textContent = '✓';
    var copiedText = document.createElement('span');
    copiedText.textContent = 'Chave Pix copiada!';
    copiedBadge.appendChild(checkIcon);
    copiedBadge.appendChild(copiedText);

    // Chave legível (truncada)
    var keyBox = document.createElement('div');
    keyBox.style.cssText = [
      'background:#1E293B;border:1px solid #334155',
      'border-radius:8px;padding:8px 12px;width:100%',
      'font-size:10px;color:#64748B;font-family:monospace',
      'word-break:break-all;text-align:center'
    ].join(';');
    keyBox.textContent = PIX_CODE;

    // Botão Mercado Pago
    var mpagoBtn = document.createElement('a');
    mpagoBtn.href = MPAGO_LINK;
    mpagoBtn.target = '_blank';
    mpagoBtn.rel = 'noopener noreferrer';
    mpagoBtn.textContent = '💳 Pagar via Mercado Pago';
    mpagoBtn.style.cssText = [
      'display:block;width:100%;text-align:center;text-decoration:none',
      'background:linear-gradient(135deg,#009ee3,#0070ba)',
      'border:none;border-radius:8px;color:#fff',
      'font-size:13px;font-weight:700;padding:10px 16px;cursor:pointer',
      'box-shadow:0 2px 8px rgba(0,112,186,0.4)',
      'transition:opacity 0.15s'
    ].join(';');
    mpagoBtn.onmouseover = function () { mpagoBtn.style.opacity = '0.88'; };
    mpagoBtn.onmouseout  = function () { mpagoBtn.style.opacity = '1'; };

    // Botão fechar
    var closeBtn = document.createElement('button');
    closeBtn.textContent = 'Fechar';
    closeBtn.style.cssText = [
      'background:#1E293B;border:1px solid #334155',
      'border-radius:8px;color:#94A3B8',
      'font-size:12px;padding:8px 24px;cursor:pointer;width:100%',
      'transition:background 0.15s'
    ].join(';');
    closeBtn.onmouseover = function () { closeBtn.style.background = '#334155'; };
    closeBtn.onmouseout  = function () { closeBtn.style.background = '#1E293B'; };

    var closeModal = function () {
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
    };
    closeBtn.addEventListener('click', closeModal);
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) closeModal();
    });

    card.appendChild(title);
    card.appendChild(sub);
    card.appendChild(qrWrap);
    card.appendChild(copiedBadge);
    card.appendChild(keyBox);
    card.appendChild(mpagoBtn);
    card.appendChild(closeBtn);
    overlay.appendChild(card);
    document.body.appendChild(overlay);
  }

  // ── Pares recentes (shortcuts) ─────────────────────────────────────────────
  function recordPair(from, to) {
    if (from === to) return;
    var key = from + '→' + to;
    state.recentPairs = state.recentPairs.filter(function (p) { return p !== key; });
    state.recentPairs.unshift(key);
    if (state.recentPairs.length > 4) state.recentPairs = state.recentPairs.slice(0, 4);
    savePrefs();
    renderShortcuts();
  }

  function renderShortcuts() {
    var container = document.getElementById('shortcuts');
    if (!container) return;
    while (container.firstChild) container.removeChild(container.firstChild);

    var pairs = state.recentPairs.length > 0
      ? state.recentPairs
      : ['USD→BRL', 'BRL→USD', 'EUR→BRL', 'BRL→EUR'];

    pairs.forEach(function (key) {
      var parts = key.split('→');
      if (parts.length !== 2) return;
      var from = parts[0], to = parts[1];
      var btn = document.createElement('button');
      btn.className = 'shortcut-btn';
      btn.textContent = key;
      btn.addEventListener('click', function () {
        state.from = from;
        state.to   = to;
        fromSelect.value = from;
        toSelect.value   = to;
        savePrefs();
        fetchRates(false);
      });
      container.appendChild(btn);
    });
  }

  // ── Conversão ──────────────────────────────────────────────────────────────
  function handleConvert() {
    var amount = parseFloat(amountInput.value);
    if (!amount || isNaN(amount) || amount <= 0) {
      setStatus('error', 'Informe um valor válido');
      return;
    }
    if (!state.ratesObj) {
      setStatus('error', 'Aguarde a cotação ou clique em ↻');
      return;
    }
    doConvert(amount, state.from, state.to, true);
  }

  // from, to, amount → calcula e exibe. saveToHist=true ao converter pelo botão.
  function doConvert(amount, from, to, saveToHist) {
    try {
      var result = convertAmount(amount, from, to, state.ratesObj);
      var rate   = convertAmount(1, from, to, state.ratesObj);

      resultEl.textContent   = formatCurrency(result, to);
      rateInfoEl.textContent = '1 ' + from + ' = ' + formatCurrency(rate, to);
      resultContainer.classList.remove('hidden');

      if (saveToHist) {
        addToHistory({
          id: Date.now(),
          from: from,
          to: to,
          amount: amount,
          result: result,
          rate: rate,
          fetchedAt: state.ratesObj.fetchedAt || new Date().toISOString(),
          timestamp: new Date().toISOString()
        });
        recordPair(from, to);
      }
    } catch (e) {
      setStatus('error', 'Erro: ' + e.message);
    }
  }

  function convertAmount(amount, from, to, ratesObj) {
    if (!ratesObj || !ratesObj.rates) throw new Error('Rates indisponível');
    if (from === to) return amount;
    var base = ratesObj.base, rates = ratesObj.rates, inBase;
    if (from === base)       inBase = amount;
    else if (rates[from])    inBase = amount / rates[from];
    else throw new Error('Moeda não suportada: ' + from);
    if (to === base) return inBase;
    if (!rates[to]) throw new Error('Moeda não suportada: ' + to);
    return inBase * rates[to];
  }

  // ── Histórico ──────────────────────────────────────────────────────────────
  function addToHistory(entry) {
    state.history.unshift(entry);
    if (state.history.length > MAX_HIST) state.history = state.history.slice(0, MAX_HIST);
    saveHistory();
    renderHistory();
  }

  function deleteHistoryItem(id) {
    state.history = state.history.filter(function (e) { return e.id !== id; });
    saveHistory();
    renderHistory();
  }

  function reconvertItem(entry) {
    // Atualiza selects e valor, depois recalcula com câmbio atual
    state.from = entry.from;
    state.to   = entry.to;
    fromSelect.value = entry.from;
    toSelect.value   = entry.to;
    amountInput.value = entry.amount;

    if (state.ratesObj && state.ratesObj.base !== entry.from) {
      // Pede cotação atualizada para a moeda de origem
      fetchRates(false, function () {
        doConvert(entry.amount, entry.from, entry.to, true);
      });
    } else {
      doConvert(entry.amount, entry.from, entry.to, true);
    }
    savePrefs();
  }

  function renderHistory() {
    var list = document.getElementById('history-list');
    if (!list) return;
    while (list.firstChild) list.removeChild(list.firstChild);

    if (state.history.length === 0) {
      var empty = document.createElement('li');
      empty.className = 'history-empty';
      empty.textContent = 'Nenhuma conversão ainda.';
      list.appendChild(empty);
      return;
    }

    state.history.forEach(function (entry) {
      var li = document.createElement('li');
      li.className = 'history-item';

      // Coluna principal
      var main = document.createElement('div');
      main.className = 'hist-main';

      var conv = document.createElement('div');
      conv.className = 'hist-conversion';
      conv.textContent =
        formatCurrency(entry.amount, entry.from) + ' → ' +
        formatCurrency(entry.result, entry.to);

      var meta = document.createElement('div');
      meta.className = 'hist-meta';
      var rateStr = '1 ' + entry.from + ' = ' + formatCurrency(entry.rate, entry.to);
      var timeStr = new Date(entry.timestamp).toLocaleString('pt-BR', {
        day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
      });
      meta.textContent = rateStr + ' · ' + timeStr;

      main.appendChild(conv);
      main.appendChild(meta);

      // Ações
      var actions = document.createElement('div');
      actions.className = 'hist-actions';

      var reconvertBtn = document.createElement('button');
      reconvertBtn.className = 'hist-reconvert-btn';
      reconvertBtn.textContent = '↻';
      reconvertBtn.title = 'Reconverter com câmbio atual';
      reconvertBtn.addEventListener('click', function () {
        reconvertItem(entry);
      });

      var delBtn = document.createElement('button');
      delBtn.className = 'hist-delete-btn';
      delBtn.textContent = '×';
      delBtn.title = 'Remover';
      delBtn.addEventListener('click', function () {
        deleteHistoryItem(entry.id);
      });

      actions.appendChild(reconvertBtn);
      actions.appendChild(delBtn);

      li.appendChild(main);
      li.appendChild(actions);
      list.appendChild(li);
    });
  }

  // ── Storage — histórico ────────────────────────────────────────────────────
  function saveHistory() {
    chrome.storage.local.set({ cq_history: state.history });
  }

  function loadHistory(callback) {
    chrome.storage.local.get('cq_history', function (result) {
      state.history = result.cq_history || [];
      if (callback) callback();
    });
  }

  // ── Formatação ─────────────────────────────────────────────────────────────
  function formatCurrency(value, code) {
    var locale = LOCALE_MAP[code] || 'en-US';
    var decimals = (code === 'JPY' || code === 'KRW') ? 0 : 2;
    try {
      return new Intl.NumberFormat(locale, {
        style: 'currency', currency: code,
        minimumFractionDigits: decimals, maximumFractionDigits: decimals
      }).format(value);
    } catch (e) {
      return value.toFixed(decimals) + ' ' + code;
    }
  }

  // ── Copiar como imagem PNG ──────────────────────────────────────────────────
  // O popup roda no contexto da extensão — clipboard.write() funciona diretamente.
  function handleCopy() {
    var resultText = resultEl.textContent;
    var rateText   = rateInfoEl.textContent;
    if (!resultText || !resultText.trim()) return;

    var dark = state.theme !== 'light';
    var c = {
      bgCard:    dark ? '#0F172A' : '#FFFFFF',
      bgRow:     dark ? '#1E293B' : '#E2E8F0',
      bgCredit:  dark ? '#0B1120' : '#E2E8F0',
      border:    dark ? '#3B82F6' : '#2563EB',
      sep:       dark ? '#1E293B' : '#CBD5E1',
      accent:    dark ? '#93C5FD' : '#1D4ED8',
      text:      dark ? '#F1F5F9' : '#0F172A',
      textMuted: dark ? '#64748B' : '#94A3B8',
      textCredit:dark ? '#64748B' : '#94A3B8',
      srcBg:     dark ? 'rgba(59,130,246,0.12)' : 'rgba(37,99,235,0.10)',
      srcBorder: dark ? 'rgba(59,130,246,0.25)' : 'rgba(37,99,235,0.35)',
      success:   dark ? '#22C55E' : '#16A34A',
      warning:   dark ? '#F59E0B' : '#D97706'
    };

    var DPR    = 3;
    var W      = 300;
    var PAD_H  = 14;
    var PAD_W  = 16;
    var RADIUS = 14;
    var ROW_H  = 30;
    var ROW_R  = 8;

    // Duas rows: "from" (valor digitado) e "to" (resultado)
    var rows = [
      { label: state.from, value: formatCurrency(parseFloat(amountInput.value) || 0, state.from), isSource: true },
      { label: state.to,   value: resultText, isSource: false }
    ];

    var CR_H    = 24;
    var headerH = 14 + 10;
    var rowsH   = rows.length * ROW_H + Math.max(0, rows.length - 1) * 4 + 10;
    var rateH   = 12 + 10;
    var footerH = 1 + 8 + 12 + 10;
    var CARD_H  = PAD_H + headerH + rowsH + rateH + footerH + 1 + CR_H;

    var canvas = document.createElement('canvas');
    canvas.width  = W * DPR;
    canvas.height = CARD_H * DPR;
    var ctx = canvas.getContext('2d', { alpha: true });
    ctx.scale(DPR, DPR);

    function rrPath(x, y, w, h, r) {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + w - r, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + r);
      ctx.lineTo(x + w, y + h - r);
      ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      ctx.lineTo(x + r, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - r);
      ctx.lineTo(x, y + r);
      ctx.quadraticCurveTo(x, y, x + r, y);
      ctx.closePath();
    }

    function textRight(t, rx, ty) {
      ctx.fillText(t, rx - ctx.measureText(t).width, ty);
    }

    ctx.save();
    rrPath(0, 0, W, CARD_H, RADIUS);
    ctx.clip();

    ctx.fillStyle = c.bgCard;
    ctx.fillRect(0, 0, W, CARD_H);

    var cy = PAD_H;

    // Título
    ctx.font = 'bold 12px system-ui, -apple-system, "Segoe UI", sans-serif';
    ctx.fillStyle = c.accent;
    ctx.fillText('\u21C4 CURRENCY QUICK', PAD_W, cy + 12);
    cy += 14 + 10;

    // Rows from / to
    rows.forEach(function (row, i) {
      if (i > 0) cy += 4;
      rrPath(PAD_W, cy, W - PAD_W * 2, ROW_H, ROW_R);
      if (row.isSource) {
        ctx.fillStyle = c.srcBg; ctx.fill();
        ctx.strokeStyle = c.srcBorder; ctx.lineWidth = 1; ctx.stroke();
      } else {
        ctx.fillStyle = c.bgRow; ctx.fill();
      }
      ctx.font = '600 11px system-ui, -apple-system, "Segoe UI", sans-serif';
      ctx.fillStyle = row.isSource ? c.accent : c.textMuted;
      ctx.fillText(row.label, PAD_W + 10, cy + ROW_H / 2 + 4);
      ctx.font = 'bold 14px system-ui, -apple-system, "Segoe UI", sans-serif';
      ctx.fillStyle = row.isSource ? c.accent : c.text;
      textRight(row.value, W - PAD_W - 10, cy + ROW_H / 2 + 4);
      cy += ROW_H;
    });

    cy += 10;

    // Taxa de câmbio
    ctx.font = '11px system-ui, -apple-system, "Segoe UI", sans-serif';
    ctx.fillStyle = c.textMuted;
    ctx.fillText(rateText, PAD_W, cy + 11);
    cy += 14 + 6;

    // Footer sep + status
    ctx.fillStyle = c.sep;
    ctx.fillRect(0, cy, W, 1);
    cy += 1 + 8;

    ctx.font = '500 10px system-ui, -apple-system, "Segoe UI", sans-serif';
    ctx.fillStyle = (state.ratesObj && state.ratesObj.fromCache) ? c.warning : c.success;
    ctx.fillText(
      (state.ratesObj && state.ratesObj.fromCache) ? '\u26A1 cache' : '\u25CF ao vivo',
      PAD_W, cy + 10
    );
    cy += 12 + 10;

    // Faixa de créditos dentro do card
    ctx.fillStyle = c.sep;
    ctx.fillRect(0, cy, W, 1);
    cy += 1;
    ctx.fillStyle = c.bgCredit;
    ctx.fillRect(0, cy, W, CARD_H - cy);
    ctx.font = '9px system-ui, -apple-system, "Segoe UI", sans-serif';
    ctx.fillStyle = c.textCredit;
    var cr = 'Currency Quick  \u2022  vWeb Marketing';
    ctx.fillText(cr, (W - ctx.measureText(cr).width) / 2, cy + CR_H / 2 + 4);

    ctx.restore();

    // Borda
    rrPath(0, 0, W, CARD_H, RADIUS);
    ctx.strokeStyle = c.border;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    var blobP = new Promise(function (res, rej) {
      canvas.toBlob(function (b) { b ? res(b) : rej(new Error('toBlob')); }, 'image/png');
    });

    navigator.clipboard.write([new ClipboardItem({ 'image/png': blobP })])
      .then(function () {
        copyBtn.textContent = '\u2713 Imagem copiada!';
        setTimeout(function () { copyBtn.textContent = 'Copiar'; }, 2000);
      })
      .catch(function () {
        navigator.clipboard.writeText(resultText + ' \u2022 ' + rateText).catch(function () {});
        copyBtn.textContent = 'Copiado!';
        setTimeout(function () { copyBtn.textContent = 'Copiar'; }, 1500);
      });
  }

  // ── Fetch cotações ─────────────────────────────────────────────────────────
  function fetchRates(force, callback) {
    setStatus('loading', 'Buscando cotação...');
    var msgType = force ? 'FORCE_REFRESH_RATES' : 'GET_RATES';
    chrome.runtime.sendMessage({ type: msgType, base: state.from }, function (response) {
      if (chrome.runtime.lastError) { setStatus('error', 'Erro de comunicação'); return; }
      if (!response || !response.ok) {
        setStatus('error', 'Erro: ' + (response && response.error || 'desconhecido'));
        return;
      }
      state.ratesObj = response.data;
      var fetchedAt = response.data.fetchedAt
        ? new Date(response.data.fetchedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
        : '';
      setStatus(response.data.fromCache ? 'cache' : 'ok',
        response.data.fromCache ? 'Cache — ' + fetchedAt : 'Atualizado às ' + fetchedAt);
      if (callback) callback();
    });
  }

  // ── Status ─────────────────────────────────────────────────────────────────
  function setStatus(type, text) {
    statusDot.className = 'dot dot-' + type;
    statusText.textContent = text;
  }

  // ── Prefs ──────────────────────────────────────────────────────────────────
  function savePrefs() {
    chrome.storage.local.set({
      cq_prefs: { from: state.from, to: state.to, theme: state.theme, recentPairs: state.recentPairs }
    });
  }

  function loadPrefs(callback) {
    chrome.storage.local.get('cq_prefs', function (result) {
      if (result.cq_prefs) {
        state.from        = result.cq_prefs.from        || 'USD';
        state.to          = result.cq_prefs.to          || 'BRL';
        state.theme       = result.cq_prefs.theme       || 'dark';
        state.recentPairs = result.cq_prefs.recentPairs || [];
      }
      if (callback) callback();
    });
  }

  // ── Start ──────────────────────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', init);
})();
