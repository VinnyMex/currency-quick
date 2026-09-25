// options.js — Página de opções da extensão (sem módulos ESM)
(function () {
  'use strict';

  // ── Moedas ─────────────────────────────────────────────────────────────────
  var CURRENCIES = [
    { code: 'BRL', name: 'Real Brasileiro',    symbol: 'R$'  },
    { code: 'USD', name: 'Dólar Americano',     symbol: 'US$' },
    { code: 'EUR', name: 'Euro',                symbol: '€'   },
    { code: 'GBP', name: 'Libra Esterlina',     symbol: '£'   },
    { code: 'JPY', name: 'Iene Japonês',        symbol: '¥'   },
    { code: 'CAD', name: 'Dólar Canadense',     symbol: 'CA$' },
    { code: 'AUD', name: 'Dólar Australiano',   symbol: 'A$'  },
    { code: 'CHF', name: 'Franco Suíço',        symbol: 'CHF' },
    { code: 'ARS', name: 'Peso Argentino',      symbol: 'AR$' },
    { code: 'CLP', name: 'Peso Chileno',        symbol: 'CL$' },
    { code: 'MXN', name: 'Peso Mexicano',       symbol: 'MX$' },
    { code: 'CNY', name: 'Yuan Chinês',         symbol: '¥'   },
    { code: 'KRW', name: 'Won Sul-Coreano',     symbol: '₩'   },
    { code: 'INR', name: 'Rúpia Indiana',       symbol: '₹'   },
    { code: 'AED', name: 'Dirham dos EAU',      symbol: 'د.إ' },
    { code: 'ZAR', name: 'Rand Sul-Africano',   symbol: 'R'   }
  ];

  // ── Defaults ───────────────────────────────────────────────────────────────
  var DEFAULTS = {
    defaultFrom:     'USD',
    defaultTo:       'BRL',
    provider:        'demo',
    apiUrl:          '',
    apiKey:          '',
    widgetEnabled:   true,
    widgetDelay:     350,
    cacheTtl:        5
  };

  // ── Refs ───────────────────────────────────────────────────────────────────
  var defaultFromSel    = document.getElementById('default-from');
  var defaultToSel      = document.getElementById('default-to');
  var providerSel       = document.getElementById('provider');
  var realFields        = document.getElementById('real-fields');
  var apiUrlInput       = document.getElementById('api-url');
  var apiKeyInput       = document.getElementById('api-key');
  var apiKeyHint        = document.getElementById('api-key-hint');
  var widgetEnabledChk  = document.getElementById('widget-enabled');
  var widgetDelayInput  = document.getElementById('widget-delay');
  var cacheTtlInput     = document.getElementById('cache-ttl');
  var clearCacheBtn     = document.getElementById('clear-cache-btn');
  var saveBtn           = document.getElementById('save-btn');
  var resetBtn          = document.getElementById('reset-btn');
  var form              = document.getElementById('options-form');

  // ── Init ───────────────────────────────────────────────────────────────────
  function init() {
    populateSelects();
    loadSettings(applyToForm);
    bindEvents();
  }

  function populateSelects() {
    [defaultFromSel, defaultToSel].forEach(function (sel) {
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
    providerSel.addEventListener('change', function () {
      toggleRealFields(providerSel.value === 'real');
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      saveSettings();
    });

    resetBtn.addEventListener('click', function () {
      if (confirm('Restaurar todas as configurações para os valores padrão?')) {
        applyToForm(DEFAULTS);
        showToast('Padrões restaurados. Clique em Salvar para confirmar.', 'success');
      }
    });

    clearCacheBtn.addEventListener('click', function () {
      chrome.storage.local.get(null, function (items) {
        var keysToRemove = Object.keys(items).filter(function (k) {
          return k.startsWith('cq_rates_');
        });
        if (keysToRemove.length === 0) {
          showToast('Cache já está vazio.', 'success');
          return;
        }
        chrome.storage.local.remove(keysToRemove, function () {
          showToast('Cache limpo (' + keysToRemove.length + ' entradas removidas).', 'success');
        });
      });
    });
  }

  // ── Carregar ───────────────────────────────────────────────────────────────
  function loadSettings(callback) {
    chrome.storage.local.get('cq_settings', function (result) {
      var settings = Object.assign({}, DEFAULTS, result.cq_settings || {});
      callback(settings);
    });
  }

  function applyToForm(settings) {
    defaultFromSel.value   = settings.defaultFrom   || DEFAULTS.defaultFrom;
    defaultToSel.value     = settings.defaultTo     || DEFAULTS.defaultTo;
    providerSel.value      = settings.provider      || DEFAULTS.provider;
    apiUrlInput.value      = settings.apiUrl        || '';
    widgetEnabledChk.checked = settings.widgetEnabled !== false;
    widgetDelayInput.value = settings.widgetDelay   || DEFAULTS.widgetDelay;
    cacheTtlInput.value    = settings.cacheTtl      || DEFAULTS.cacheTtl;

    // API key — mostrar apenas últimos 4 chars se existir
    if (settings.apiKey && settings.apiKey.length > 0) {
      apiKeyInput.value = '';
      apiKeyInput.placeholder = 'Chave salva — ' + maskKey(settings.apiKey);
      apiKeyHint.textContent = 'Chave atual: ' + maskKey(settings.apiKey) + ' (deixe em branco para manter)';
    } else {
      apiKeyInput.placeholder = 'Sua chave de API';
      apiKeyHint.textContent = '';
    }

    toggleRealFields(settings.provider === 'real');
  }

  function maskKey(key) {
    if (!key || key.length <= 4) return '****';
    return '****' + key.slice(-4);
  }

  function toggleRealFields(show) {
    realFields.classList.toggle('hidden', !show);
  }

  // ── Salvar ─────────────────────────────────────────────────────────────────
  function saveSettings() {
    saveBtn.disabled = true;
    saveBtn.textContent = 'Salvando...';

    // Ler configurações salvas para preservar a API key se o campo estiver vazio
    chrome.storage.local.get('cq_settings', function (result) {
      var existing = result.cq_settings || {};

      var newApiKey = apiKeyInput.value.trim();
      var finalApiKey = newApiKey.length > 0 ? newApiKey : (existing.apiKey || '');

      var settings = {
        defaultFrom:   defaultFromSel.value,
        defaultTo:     defaultToSel.value,
        provider:      providerSel.value,
        apiUrl:        apiUrlInput.value.trim(),
        apiKey:        finalApiKey,
        widgetEnabled: widgetEnabledChk.checked,
        widgetDelay:   parseInt(widgetDelayInput.value, 10) || 350,
        cacheTtl:      parseInt(cacheTtlInput.value, 10)   || 5
      };

      // Salvar preferências do popup também
      var prefs = { from: settings.defaultFrom, to: settings.defaultTo };

      chrome.storage.local.set({ cq_settings: settings, cq_prefs: prefs }, function () {
        saveBtn.disabled = false;
        saveBtn.textContent = 'Salvar Configurações';

        if (chrome.runtime.lastError) {
          showToast('Erro ao salvar: ' + chrome.runtime.lastError.message, 'error');
          return;
        }

        // Atualizar hint da API key
        if (finalApiKey) {
          apiKeyInput.value = '';
          apiKeyInput.placeholder = 'Chave salva — ' + maskKey(finalApiKey);
          apiKeyHint.textContent = 'Chave atual: ' + maskKey(finalApiKey);
        }

        showToast('Configurações salvas com sucesso!', 'success');
      });
    });
  }

  // ── Toast ──────────────────────────────────────────────────────────────────
  var toastTimer = null;

  function showToast(msg, type) {
    var toast = document.getElementById('toast');
    clearTimeout(toastTimer);
    toast.textContent = msg;
    toast.className = 'toast ' + (type || '');
    // Forçar reflow
    void toast.offsetWidth;
    toast.classList.add('show');
    toastTimer = setTimeout(function () {
      toast.classList.remove('show');
      setTimeout(function () { toast.classList.add('hidden'); }, 300);
    }, 3000);
  }

  // ── Arranque ───────────────────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', init);
})();
