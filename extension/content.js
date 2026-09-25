// content.js — Content Script autônomo (sem módulos ESM)

(function () {
  'use strict';

  var WIDGET_ID = 'cq-widget';
  var DEBOUNCE_MS = 400;
  var TARGET_CURRENCIES = ['BRL', 'USD', 'EUR'];

  // ── Padrões de parse ────────────────────────────────────────────────────────
  var DATE_PATTERN  = /\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/;
  var PHONE_PATTERN = /\(?\d{2}\)?\s*\d{4,5}[-.\s]?\d{4}/;

  var CURRENCY_PATTERNS = [
    { regex: /R\$\s*([\d.,]+)/i,  currency: 'BRL', sep: 'auto' },
    { regex: /US\$\s*([\d.,]+)/i, currency: 'USD', sep: 'auto' },
    { regex: /USD\s*([\d.,]+)/i,  currency: 'USD', sep: 'auto' },
    { regex: /€\s*([\d.,]+)/,     currency: 'EUR', sep: 'auto' },
    { regex: /EUR\s*([\d.,]+)/i,  currency: 'EUR', sep: 'auto' },
    { regex: /£\s*([\d.,]+)/,     currency: 'GBP', sep: 'auto' },
    { regex: /GBP\s*([\d.,]+)/i,  currency: 'GBP', sep: 'auto' },
    { regex: /¥\s*([\d.,]+)/,     currency: 'JPY', sep: 'auto' },
    { regex: /\$\s*([\d.,]+)/,    currency: 'USD', sep: 'auto', ambiguous: true }
  ];

  // ── Estado ──────────────────────────────────────────────────────────────────
  var debounceTimer = null;
  var currentWidget = null;

  // ── Parser ──────────────────────────────────────────────────────────────────
  function parseCurrencyString(str) {
    if (!str || typeof str !== 'string') return null;
    var clean = str.trim();
    if (DATE_PATTERN.test(clean))  return null;
    if (PHONE_PATTERN.test(clean)) return null;

    for (var i = 0; i < CURRENCY_PATTERNS.length; i++) {
      var p = CURRENCY_PATTERNS[i];
      var match = clean.match(p.regex);
      if (!match) continue;
      var value = parseNumericString(match[1]);
      if (value === null || isNaN(value) || value <= 0) continue;
      return { value: value, currency: p.currency, ambiguous: !!p.ambiguous };
    }
    return null;
  }

  // Detecta automaticamente se o número usa formato BR (1.234,56) ou US (1,234.56)
  // Regra: se tem vírgula E ponto, o último separador é o decimal.
  //        se tem só vírgula, é decimal BR (27,62) ou milhar US (1,000).
  //        se tem só ponto, é decimal US (27.62) ou milhar BR (1.000).
  function parseNumericString(str) {
    if (!str) return null;
    var s = str.trim();

    var hasDot   = s.indexOf('.') !== -1;
    var hasComma = s.indexOf(',') !== -1;

    if (hasDot && hasComma) {
      // Ambos presentes: o último é o decimal
      var lastDot   = s.lastIndexOf('.');
      var lastComma = s.lastIndexOf(',');
      if (lastComma > lastDot) {
        // formato BR: 1.234,56
        return parseFloat(s.replace(/\./g, '').replace(',', '.'));
      } else {
        // formato US: 1,234.56
        return parseFloat(s.replace(/,/g, ''));
      }
    }

    if (hasComma && !hasDot) {
      // Só vírgula
      var parts = s.split(',');
      var lastPart = parts[parts.length - 1];
      if (lastPart.length <= 2) {
        // vírgula é decimal: 27,62 → 27.62
        return parseFloat(s.replace(',', '.'));
      } else {
        // vírgula é milhar: 1,000 → 1000
        return parseFloat(s.replace(/,/g, ''));
      }
    }

    if (hasDot && !hasComma) {
      // Só ponto
      var dotParts = s.split('.');
      var lastDotPart = dotParts[dotParts.length - 1];
      if (lastDotPart.length <= 2) {
        // ponto é decimal: 27.62
        return parseFloat(s);
      } else {
        // ponto é milhar BR: 1.000
        return parseFloat(s.replace(/\./g, ''));
      }
    }

    // Só dígitos
    return parseFloat(s);
  }

  // ── Formatação ──────────────────────────────────────────────────────────────
  var LOCALE_MAP = {
    BRL: { locale: 'pt-BR', currency: 'BRL' },
    USD: { locale: 'en-US', currency: 'USD' },
    EUR: { locale: 'de-DE', currency: 'EUR' },
    GBP: { locale: 'en-GB', currency: 'GBP' },
    JPY: { locale: 'ja-JP', currency: 'JPY' }
  };

  function formatCurrency(value, code) {
    var opts = LOCALE_MAP[code] || { locale: 'en-US', currency: code };
    var decimals = (code === 'JPY' || code === 'KRW') ? 0 : 2;
    try {
      return new Intl.NumberFormat(opts.locale, {
        style: 'currency',
        currency: opts.currency,
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
      }).format(value);
    } catch (e) {
      return value.toFixed(decimals) + ' ' + code;
    }
  }

  // ── Conversão ───────────────────────────────────────────────────────────────
  // O background sempre retorna rates com a moeda da seleção como BASE.
  // Então: rates.base = fromCode, rates.rates = { USD: X, EUR: Y, BRL: Z, ... }
  // A moeda base em si não aparece nas rates — precisa ser tratada explicitamente.
  function computeConversions(amount, fromCode, ratesData) {
    if (!ratesData || !ratesData.rates) return null;

    var base  = ratesData.base;   // === fromCode (o background rebases)
    var table = ratesData.rates;
    var results = {};

    TARGET_CURRENCIES.forEach(function (code) {
      if (code === base) {
        // A moeda selecionada é a própria base — valor original
        results[code] = amount;
      } else if (table[code] !== undefined) {
        results[code] = amount * table[code];
      }
      // Se não tem a taxa, não exibe (ex: moeda não coberta pela API)
    });

    return results;
  }

  // ── Widget ──────────────────────────────────────────────────────────────────
  function removeWidget() {
    if (currentWidget && currentWidget.parentNode) {
      currentWidget.parentNode.removeChild(currentWidget);
    }
    currentWidget = null;
  }

  function el(tag, cls) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    return e;
  }

  function showWidget(parsed, ratesData, x, y) {
    removeWidget();

    var conversions = computeConversions(parsed.value, parsed.currency, ratesData);
    if (!conversions || Object.keys(conversions).length === 0) return;

    var widget = el('div', '');
    widget.id = WIDGET_ID;

    // ── Header
    var header = el('div', 'cq-header');
    var title = el('span', 'cq-title');
    title.textContent = '⇄ Currency Quick';
    var closeBtn = el('button', 'cq-close');
    closeBtn.textContent = '✕';
    closeBtn.type = 'button';
    closeBtn.setAttribute('aria-label', 'Fechar');
    closeBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      removeWidget();
    });
    header.appendChild(title);
    header.appendChild(closeBtn);

    // ── Valor original
    var originalEl = el('div', 'cq-original');
    originalEl.textContent = formatCurrency(parsed.value, parsed.currency);
    if (parsed.ambiguous) {
      var ambigNote = el('span', 'cq-ambig');
      ambigNote.textContent = ' (interpretado como USD)';
      originalEl.appendChild(ambigNote);
    }

    // ── Linha separadora fina
    var sep = el('div', 'cq-sep');

    // ── Linhas de conversão
    var ratesContainer = el('div', 'cq-rates');
    TARGET_CURRENCIES.forEach(function (code) {
      var val = conversions[code];
      if (val === undefined || val === null) return;

      var item = el('div', 'cq-rate-item');

      var flagLabel = el('span', 'cq-rate-label');
      flagLabel.textContent = code;

      var valueEl = el('span', 'cq-rate-value');
      valueEl.textContent = formatCurrency(val, code);

      // Destaca a moeda de origem
      if (code === parsed.currency) {
        item.classList.add('cq-rate-source');
      }

      item.appendChild(flagLabel);
      item.appendChild(valueEl);
      ratesContainer.appendChild(item);
    });

    // ── Footer
    var footer = el('div', 'cq-footer');

    var statusEl = el('span', 'cq-status-text');
    statusEl.textContent = ratesData.fromCache ? '⚡ cache' : '● ao vivo';
    statusEl.style.color = ratesData.fromCache ? '#F59E0B' : '#22C55E';

    var copyBtn = el('button', 'cq-copy-btn');
    copyBtn.type = 'button';
    copyBtn.textContent = 'Copiar';
    copyBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      var lines = TARGET_CURRENCIES
        .filter(function (c) { return conversions[c] !== undefined; })
        .map(function (c) { return formatCurrency(conversions[c], c); });
      var text = lines.join(' | ');
      if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(function () {
          copyBtn.textContent = '✓ Copiado';
          setTimeout(function () { copyBtn.textContent = 'Copiar'; }, 1500);
        }).catch(function () { fallbackCopy(text); });
      } else {
        fallbackCopy(text);
      }
    });

    footer.appendChild(statusEl);
    footer.appendChild(copyBtn);

    // ── Montar widget
    widget.appendChild(header);
    widget.appendChild(originalEl);
    widget.appendChild(sep);
    widget.appendChild(ratesContainer);
    widget.appendChild(footer);

    // Posicionar fora da tela primeiro para medir
    widget.style.position = 'fixed';
    widget.style.top = '-9999px';
    widget.style.left = '-9999px';
    widget.style.zIndex = '2147483647';

    document.body.appendChild(widget);
    currentWidget = widget;

    // Ajustar posição após render
    requestAnimationFrame(function () {
      var rect = widget.getBoundingClientRect();
      var vw = window.innerWidth;
      var vh = window.innerHeight;
      var px = x + 14;
      var py = y + 14;
      if (px + rect.width  > vw - 12) px = vw - rect.width  - 12;
      if (py + rect.height > vh - 12) py = vh - rect.height - 12;
      if (px < 8) px = 8;
      if (py < 8) py = 8;
      widget.style.left = px + 'px';
      widget.style.top  = py + 'px';
    });
  }

  function fallbackCopy(text) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;opacity:0;top:0;left:0;pointer-events:none';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    try { document.execCommand('copy'); } catch (e) { /* ignore */ }
    document.body.removeChild(ta);
  }

  // ── Verificação de contexto ─────────────────────────────────────────────────
  // No MV3 o service worker pode ser encerrado e reiniciado pelo Chrome.
  // Após o reinício, o content script antigo perde o contexto e qualquer
  // chamada a chrome.runtime lança "Extension context invalidated".
  function isContextValid() {
    try {
      // chrome.runtime.id é undefined quando o contexto foi invalidado
      return !!(chrome.runtime && chrome.runtime.id);
    } catch (e) {
      return false;
    }
  }

  // ── Fluxo principal ─────────────────────────────────────────────────────────
  function processText(text, x, y) {
    if (!isContextValid()) return;
    var parsed = parseCurrencyString(text);
    if (!parsed) return;

    try {
      chrome.runtime.sendMessage(
        { type: 'GET_RATES', base: parsed.currency },
        function (response) {
          if (chrome.runtime.lastError) return;
          if (!response || !response.ok || !response.data) return;
          showWidget(parsed, response.data, x, y);
        }
      );
    } catch (e) { /* contexto invalidado — ignorar silenciosamente */ }
  }

  // ── Event listeners ─────────────────────────────────────────────────────────
  document.addEventListener('mouseup', function (e) {
    // Ignorar cliques dentro do widget
    if (currentWidget && currentWidget.contains(e.target)) return;

    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(function () {
      var sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) return;
      var text = sel.toString().trim();
      if (!text || text.length < 3) return;
      processText(text, e.clientX, e.clientY);
    }, DEBOUNCE_MS);
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') removeWidget();
  });

  document.addEventListener('mousedown', function (e) {
    if (currentWidget && !currentWidget.contains(e.target)) {
      removeWidget();
    }
  });

  // Mensagem do background (menu de contexto)
  // Envolto em try/catch pois o próprio addListener pode lançar se o contexto
  // já estiver invalidado no momento em que a página tenta registrar o listener.
  try {
    chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
      if (!isContextValid()) return;
      if (message.type === 'CONVERT_SELECTION' && message.text) {
        var sel = window.getSelection();
        var x = window.innerWidth  / 2;
        var y = window.innerHeight / 3;

        if (sel && sel.rangeCount > 0) {
          try {
            var rect = sel.getRangeAt(0).getBoundingClientRect();
            if (rect.width > 0 || rect.height > 0) {
              x = rect.left + rect.width / 2;
              y = rect.bottom + 8;
            }
          } catch (ex) { /* ignore */ }
        }

        processText(message.text, x, y);
        sendResponse({ ok: true });
        return true;
      }
    });
  } catch (e) { /* contexto já invalidado na inicialização — ignorar */ }

})();
