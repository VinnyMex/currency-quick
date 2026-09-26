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
      copyWidgetAsImage(parsed, conversions, ratesData, copyBtn);
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

  // ── Copiar widget como imagem PNG ──────────────────────────────────────────
  function copyWidgetAsImage(parsed, conversions, ratesData, btn) {
    // Paleta de cores idêntica ao CSS do widget
    var C = {
      bg:        '#0F172A',
      surface:   '#1E293B',
      surface2:  '#263347',
      border:    '#3B82F6',
      borderDim: '#1E293B',
      accent:    '#3B82F6',
      accentDim: 'rgba(59,130,246,0.15)',
      accentText:'#93C5FD',
      text:      '#F1F5F9',
      muted:     '#64748B',
      green:     '#22C55E',
      amber:     '#F59E0B',
      credit:    '#334155'
    };

    var DPR    = Math.min(window.devicePixelRatio || 1, 2); // max 2x
    var W      = 280;   // largura lógica
    var PAD    = 16;    // padding lateral
    var ROW_H  = 32;    // altura de cada linha de moeda
    var rows   = TARGET_CURRENCIES.filter(function(c){ return conversions[c] !== undefined; });
    var H      = 14 + 28 + 10 + 1 + 8 + rows.length * (ROW_H + 4) + 8 + 28 + 12 + 18 + 10;
    // H = topPad + title+original + sep + rates + footer + credit

    var canvas = document.createElement('canvas');
    canvas.width  = W  * DPR;
    canvas.height = H  * DPR;
    var ctx = canvas.getContext('2d');
    ctx.scale(DPR, DPR);

    // ── Fundo com bordas arredondadas ──────────────────────────────────────
    function roundRect(x, y, w, h, r) {
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

    // Fundo principal
    roundRect(0, 0, W, H, 14);
    ctx.fillStyle = C.bg;
    ctx.fill();
    // Borda azul
    ctx.strokeStyle = C.border;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    var y = 14;

    // ── Título ─────────────────────────────────────────────────────────────
    ctx.font = 'bold 10px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = C.accentText;
    ctx.letterSpacing = '0.05em';
    ctx.fillText('⇄ CURRENCY QUICK', PAD, y + 10);
    y += 18;

    // ── Valor original ──────────────────────────────────────────────────────
    ctx.font = 'bold 18px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = C.text;
    ctx.letterSpacing = '0';
    ctx.fillText(formatCurrency(parsed.value, parsed.currency), PAD, y + 14);
    y += 24;

    // ── Separador ───────────────────────────────────────────────────────────
    ctx.fillStyle = C.borderDim;
    ctx.fillRect(PAD, y, W - PAD * 2, 1);
    y += 9;

    // ── Linhas de moeda ─────────────────────────────────────────────────────
    rows.forEach(function(code) {
      var val      = conversions[code];
      var isSource = code === parsed.currency;

      // Fundo da linha
      roundRect(PAD, y, W - PAD * 2, ROW_H, 8);
      if (isSource) {
        ctx.fillStyle = 'rgba(59,130,246,0.12)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(59,130,246,0.25)';
        ctx.lineWidth = 1;
        ctx.stroke();
      } else {
        ctx.fillStyle = C.surface;
        ctx.fill();
      }

      // Label (moeda)
      ctx.font = 'bold 11px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = isSource ? C.accentText : C.muted;
      ctx.fillText(code, PAD + 10, y + ROW_H / 2 + 4);

      // Valor formatado (alinhado à direita)
      var formatted = formatCurrency(val, code);
      ctx.font = 'bold 14px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = isSource ? C.accentText : C.text;
      var tw = ctx.measureText(formatted).width;
      ctx.fillText(formatted, W - PAD - 10 - tw, y + ROW_H / 2 + 4);

      y += ROW_H + 4;
    });

    y += 4;

    // ── Linha separadora footer ─────────────────────────────────────────────
    ctx.fillStyle = C.borderDim;
    ctx.fillRect(PAD, y, W - PAD * 2, 1);
    y += 10;

    // ── Status (cache / ao vivo) ────────────────────────────────────────────
    ctx.font = '10px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = ratesData.fromCache ? C.amber : C.green;
    ctx.fillText(ratesData.fromCache ? '⚡ cache' : '● ao vivo', PAD, y + 10);
    y += 18;

    // ── Créditos ────────────────────────────────────────────────────────────
    ctx.fillStyle = C.credit;
    ctx.fillRect(0, y, W, 1);
    y += 1;

    // Fundo crédito levemente diferente
    ctx.fillStyle = '#0B1120';
    ctx.fillRect(0, y, W, H - y);
    // Arredondar canto inferior
    roundRect(0, H - 14, W, 14, 14);
    ctx.fillStyle = '#0B1120';
    ctx.fill();

    ctx.font = '9px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = C.credit;
    var creditText = 'Currency Quick • vWeb Marketing';
    var ctw = ctx.measureText(creditText).width;
    ctx.fillText(creditText, (W - ctw) / 2, y + 9);

    // ── Copiar para clipboard ────────────────────────────────────────────────
    canvas.toBlob(function(blob) {
      if (!blob) { fallbackCopyText(parsed, conversions); return; }
      try {
        var item = new ClipboardItem({ 'image/png': blob });
        navigator.clipboard.write([item]).then(function() {
          btn.textContent = '✓ Imagem copiada';
          setTimeout(function() { btn.textContent = 'Copiar'; }, 2000);
        }).catch(function() {
          fallbackCopyText(parsed, conversions);
          btn.textContent = '✓ Texto copiado';
          setTimeout(function() { btn.textContent = 'Copiar'; }, 2000);
        });
      } catch(e) {
        fallbackCopyText(parsed, conversions);
      }
    }, 'image/png');
  }

  function fallbackCopyText(parsed, conversions) {
    var lines = TARGET_CURRENCIES
      .filter(function(c) { return conversions[c] !== undefined; })
      .map(function(c) { return formatCurrency(conversions[c], c); });
    var text = formatCurrency(parsed.value, parsed.currency) + '\n' + lines.join(' | ') + '\nCurrency Quick • vWeb Marketing';
    fallbackCopy(text);
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
